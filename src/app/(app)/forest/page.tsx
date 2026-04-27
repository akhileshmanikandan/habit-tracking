"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ForestCanvas } from "@/components/forest/ForestCanvas";
import { buildPlotLayouts, type PlotLayout } from "@/lib/forest/isometric-grid";
import { LogDrawer } from "@/components/logging/LogDrawer";
import { useAuth } from "@/lib/hooks/useAuth";
import { useGroupContext } from "@/lib/hooks/useGroupContext";
import type { Habit, Log, Streak } from "@/lib/supabase/types";
import { useHabits } from "@/lib/hooks/useHabits";
import { useRealtimeReactions } from "@/lib/hooks/useRealtime";
import { haptics } from "@/lib/utils/haptics";
import { Droplets } from "lucide-react";
import { Tree } from "@phosphor-icons/react";

export default function ForestPage() {
  const { user, userId } = useAuth();
  const { activeGroup: group, members } = useGroupContext();
  const { habits } = useHabits(group?.id);

  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [waterToast, setWaterToast] = useState<string | null>(null);
  const [forestData, setForestData] = useState<{
    habitsByUser: Map<string, { habitId: string; category: string; logsThisWeek: number; isDormant: boolean; isGlowing: boolean }[]>;
    streaksByUser: Map<string, number>;
    allLoggedToday: boolean;
    groupStreakDays: number;
  }>({
    habitsByUser: new Map(),
    streaksByUser: new Map(),
    allLoggedToday: false,
    groupStreakDays: 0,
  });

  // Fetch forest data: logs per habit per user for the past week
  useEffect(() => {
    if (!group || members.length === 0) return;

    const fetchForestData = async () => {
      const supabase = createClient();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const today = new Date().toISOString().split("T")[0];

      // Get all visible habits in the group
      const { data: groupHabits } = await supabase
        .from("habits")
        .select("*")
        .eq("group_id", group.id) as { data: Habit[] | null };

      if (!groupHabits) return;

      // Get logs for the past week
      const habitIds = groupHabits.map((h) => h.id);
      const { data: recentLogs } = await supabase
        .from("logs")
        .select("*")
        .in("habit_id", habitIds)
        .gte("created_at", weekAgo.toISOString()) as { data: Log[] | null };

      // Get streaks
      const memberIds = members.map((m) => m.id);
      const { data: streaks } = await supabase
        .from("streaks")
        .select("*")
        .in("user_id", memberIds) as { data: Streak[] | null };

      // Build data
      const habitsByUser = new Map<string, { habitId: string; category: string; logsThisWeek: number; isDormant: boolean; isGlowing: boolean }[]>();
      const streaksByUser = new Map<string, number>();

      // Calculate average running pace for ghost
      let totalPaceMinutes = 0;
      let paceCount = 0;
      for (const log of recentLogs || []) {
        if (log.value && log.duration_minutes && log.value > 0) {
          totalPaceMinutes += log.duration_minutes / log.value;
          paceCount++;
        }
      }
      const avgPace = paceCount > 0 ? totalPaceMinutes / paceCount : 0;

      for (const member of members) {
        const userHabits = groupHabits.filter(
          (h) => h.creator_id === member.id && (!h.is_private || member.id === userId)
        );

        const habitsWithData = userHabits.map((habit) => {
          const habitLogs = (recentLogs || []).filter(
            (l) => l.habit_id === habit.id && l.user_id === member.id
          );
          const logsThisWeek = habitLogs.length;

          // Check if dormant: no logs in the past 3 days
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const recentActivityLogs = habitLogs.filter(
            (l) => new Date(l.created_at) > threeDaysAgo
          );
          const isDormant = recentActivityLogs.length === 0 && logsThisWeek > 0;

          // Glow: running habit with pace faster than group average
          let isGlowing = false;
          if (habit.category === "running" && avgPace > 0) {
            const userRunLogs = habitLogs.filter((l) => l.value && l.duration_minutes);
            if (userRunLogs.length > 0) {
              const lastRun = userRunLogs[0];
              if (lastRun.value && lastRun.duration_minutes) {
                const userPace = lastRun.duration_minutes / lastRun.value;
                isGlowing = userPace < avgPace;
              }
            }
          }

          return {
            habitId: habit.id,
            category: habit.category,
            logsThisWeek,
            isDormant,
            isGlowing,
          };
        });

        habitsByUser.set(member.id, habitsWithData);

        // Max streak
        const userStreaks = (streaks || []).filter((s) => s.user_id === member.id);
        const maxStreak = Math.max(0, ...userStreaks.map((s) => s.current_streak));
        streaksByUser.set(member.id, maxStreak);
      }

      // Check if all members logged today
      const allLoggedToday = members.every((member) => {
        const memberHabits = habitsByUser.get(member.id) || [];
        return memberHabits.some((h) => {
          const logs = (recentLogs || []).filter(
            (l) =>
              l.habit_id === h.habitId &&
              l.user_id === member.id &&
              l.created_at.startsWith(today)
          );
          return logs.length > 0;
        });
      });

      // Group streak: minimum streak across members
      const groupStreakDays = Math.min(
        ...Array.from(streaksByUser.values()).map((s) => s || 0)
      );

      setForestData({
        habitsByUser,
        streaksByUser,
        allLoggedToday,
        groupStreakDays: isFinite(groupStreakDays) ? groupStreakDays : 0,
      });
    };

    fetchForestData();
  }, [group, members, userId]);

  // Build plot layouts
  const plots = useMemo<PlotLayout[]>(() => {
    if (members.length === 0) return [];
    return buildPlotLayouts(
      members.map((m) => ({ id: m.id, username: m.username, avatar_url: m.avatar_url })),
      forestData.habitsByUser
    );
  }, [members, forestData.habitsByUser]);

  // Realtime reactions
  const handleReaction = useCallback(
    (reaction: Record<string, unknown>) => {
      if (reaction.type === "water") {
        const fromUser = members.find((m) => m.id === reaction.from_user_id);
        setWaterToast(`${fromUser?.username || "Someone"} watered your forest! 🌧️`);
        haptics.double();
        setTimeout(() => setWaterToast(null), 3000);
      }
    },
    [members]
  );

  useRealtimeReactions(userId, handleReaction);

  // Water a friend's plot
  const handleWater = async (targetUserId: string) => {
    if (!userId || targetUserId === userId) return;
    const supabase = createClient();
    await supabase.from("reactions").insert({
      from_user_id: userId,
      to_user_id: targetUserId,
      type: "water",
    });
    haptics.light();
  };

  // Log handler
  const handleLog = async (log: {
    habit_id: string;
    user_id: string;
    value: number | null;
    duration_minutes: number | null;
    notes: string | null;
    is_rest_day: boolean;
  }) => {
    const supabase = createClient();
    const { error: logError } = await supabase.from("logs").insert(log);
    if (logError) {
      console.error("Failed to insert log:", logError);
      return;
    }
    await supabase.rpc("update_streak", {
      p_user_id: log.user_id,
      p_habit_id: log.habit_id,
    });
  };

  const myHabits = habits.filter((h) => h.creator_id === userId);

  // Group exists but no habits yet — prompt to create
  if (group && !habits.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
        <Tree weight="fill" className="w-12 h-12 text-sage" />
        <h1 className="text-2xl font-bold text-moss">Your forest is empty</h1>
        <p className="text-sm text-earth-light text-center max-w-xs">
          Create your first habit to start planting trees in your forest!
        </p>
        <motion.a
          href="/habits"
          whileTap={{ scale: 0.95 }}
          className="py-3.5 px-8 rounded-xl bg-moss text-cream font-semibold"
        >
          Create a Habit
        </motion.a>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative">
      {/* Forest Canvas */}
      <div className="flex-1">
        <ForestCanvas
          plots={plots}
          groupStreakDays={forestData.groupStreakDays}
          allLoggedToday={forestData.allLoggedToday}
          streaksByUser={forestData.streaksByUser}
          onPlotTap={(uid) => {
            if (uid !== userId) handleWater(uid);
          }}
        />
      </div>

      {/* Status bar overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tree weight="fill" className="w-5 h-5 text-sage" />
            <span className="text-sm font-bold text-moss">
              {group?.name || "Lock In"}
            </span>
          </div>
          {forestData.groupStreakDays > 0 && (
            <div className="glass rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="text-xs">🔥</span>
              <span className="text-xs font-bold text-moss">
                {forestData.groupStreakDays}d streak
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Campfire banner */}
      <AnimatePresence>
        {forestData.allLoggedToday && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 left-4 right-4 safe-area-top"
          >
            <div className="glass rounded-xl p-2.5 text-center">
              <span className="text-xs font-medium text-moss">
                🔥 Everyone logged today! The campfire is lit!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Water toast */}
      <AnimatePresence>
        {waterToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-28 left-4 right-4"
          >
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-moss">{waterToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick log FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setLogDrawerOpen(true)}
        className="absolute bottom-28 right-4 w-14 h-14 rounded-2xl bg-moss text-cream shadow-lg shadow-moss/30 flex items-center justify-center"
      >
        <span className="text-2xl">+</span>
      </motion.button>

      {/* Log Drawer */}
      <LogDrawer
        open={logDrawerOpen}
        onOpenChange={setLogDrawerOpen}
        habits={myHabits}
        userId={userId || ""}
        onLog={handleLog}
      />
    </div>
  );
}
