"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useGroup } from "@/lib/hooks/useAuth";
import { Trophy, TrendUp, Lightning, Fire, Crown } from "@phosphor-icons/react";

const supabase = createClient();

interface RecapAward {
  title: string;
  emoji: string;
  icon: React.ReactNode;
  winner: string;
  detail: string;
  color: string;
}

export default function RecapPage() {
  const { group, members } = useGroup();
  const [awards, setAwards] = useState<RecapAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekLabel, setWeekLabel] = useState("");

  useEffect(() => {
    if (!group || members.length === 0) return;

    const generateRecap = async () => {
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      setWeekLabel(
        `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      );

      // Fetch this week's data
      const { data: logs } = await supabase
        .from("logs")
        .select("*, habits!inner(title, category, group_id)")
        .eq("habits.group_id", group.id)
        .gte("created_at", weekAgo.toISOString());

      const { data: streaks } = await supabase
        .from("streaks")
        .select("*")
        .in(
          "user_id",
          members.map((m) => m.id)
        );

      const { data: reactions } = await supabase
        .from("reactions")
        .select("*")
        .in(
          "from_user_id",
          members.map((m) => m.id)
        )
        .gte("created_at", weekAgo.toISOString());

      const generatedAwards: RecapAward[] = [];

      // Most Consistent — highest streak
      const streakByUser = new Map<string, number>();
      for (const s of streaks || []) {
        const current = streakByUser.get(s.user_id) || 0;
        streakByUser.set(s.user_id, Math.max(current, s.current_streak));
      }
      const mostConsistent = [...streakByUser.entries()].sort((a, b) => b[1] - a[1])[0];
      if (mostConsistent) {
        const member = members.find((m) => m.id === mostConsistent[0]);
        if (member) {
          generatedAwards.push({
            title: "Most Consistent",
            emoji: "🏆",
            icon: <Trophy weight="fill" className="w-6 h-6" />,
            winner: member.username,
            detail: `${mostConsistent[1]} day streak`,
            color: "bg-yellow-100/60 border-yellow-200/60",
          });
        }
      }

      // Biggest Mover — most logs
      const logsByUser = new Map<string, number>();
      for (const log of logs || []) {
        logsByUser.set(log.user_id, (logsByUser.get(log.user_id) || 0) + 1);
      }
      const biggestMover = [...logsByUser.entries()].sort((a, b) => b[1] - a[1])[0];
      if (biggestMover) {
        const member = members.find((m) => m.id === biggestMover[0]);
        if (member) {
          generatedAwards.push({
            title: "Biggest Mover",
            emoji: "📈",
            icon: <TrendUp weight="fill" className="w-6 h-6" />,
            winner: member.username,
            detail: `${biggestMover[1]} logs this week`,
            color: "bg-green-100/60 border-green-200/60",
          });
        }
      }

      // Speed Demon — fastest avg pace (running only)
      const paceByUser = new Map<string, number[]>();
      for (const log of logs || []) {
        if (
          (log.habits as Record<string, unknown>).category === "running" &&
          log.value &&
          log.duration_minutes &&
          log.value > 0
        ) {
          const pace = log.duration_minutes / log.value;
          const paces = paceByUser.get(log.user_id) || [];
          paces.push(pace);
          paceByUser.set(log.user_id, paces);
        }
      }
      const avgPaces = [...paceByUser.entries()].map(([uid, paces]) => ({
        uid,
        avg: paces.reduce((a, b) => a + b, 0) / paces.length,
      }));
      const speedDemon = avgPaces.sort((a, b) => a.avg - b.avg)[0];
      if (speedDemon) {
        const member = members.find((m) => m.id === speedDemon.uid);
        if (member) {
          const mins = Math.floor(speedDemon.avg);
          const secs = Math.round((speedDemon.avg % 1) * 60);
          generatedAwards.push({
            title: "Speed Demon",
            emoji: "⚡",
            icon: <Lightning weight="fill" className="w-6 h-6" />,
            winner: member.username,
            detail: `${mins}:${String(secs).padStart(2, "0")} /km avg`,
            color: "bg-orange-100/60 border-orange-200/60",
          });
        }
      }

      // Hype Machine — most reactions given
      const reactionsByUser = new Map<string, number>();
      for (const r of reactions || []) {
        reactionsByUser.set(r.from_user_id, (reactionsByUser.get(r.from_user_id) || 0) + 1);
      }
      const hypeMachine = [...reactionsByUser.entries()].sort((a, b) => b[1] - a[1])[0];
      if (hypeMachine) {
        const member = members.find((m) => m.id === hypeMachine[0]);
        if (member) {
          generatedAwards.push({
            title: "Hype Machine",
            emoji: "🔥",
            icon: <Fire weight="fill" className="w-6 h-6" />,
            winner: member.username,
            detail: `${hypeMachine[1]} reactions sent`,
            color: "bg-red-100/60 border-red-200/60",
          });
        }
      }

      // Comeback King — went from 0 logs prev week to 3+ this week
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { data: prevLogs } = await supabase
        .from("logs")
        .select("user_id, habits!inner(group_id)")
        .eq("habits.group_id", group.id)
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", weekAgo.toISOString());

      const prevByUser = new Map<string, number>();
      for (const log of prevLogs || []) {
        prevByUser.set(log.user_id, (prevByUser.get(log.user_id) || 0) + 1);
      }
      for (const [uid, thisWeekCount] of logsByUser.entries()) {
        const prevCount = prevByUser.get(uid) || 0;
        if (prevCount === 0 && thisWeekCount >= 3) {
          const member = members.find((m) => m.id === uid);
          if (member) {
            generatedAwards.push({
              title: "Comeback King",
              emoji: "👑",
              icon: <Crown weight="fill" className="w-6 h-6" />,
              winner: member.username,
              detail: `Back with ${thisWeekCount} logs!`,
              color: "bg-purple-100/60 border-purple-200/60",
            });
            break;
          }
        }
      }

      setAwards(generatedAwards);
      setLoading(false);
    };

    generateRecap();
  }, [group, members]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-white/40 rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/40 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-moss">Weekly Recap</h1>
        <p className="text-xs text-earth-light">{weekLabel}</p>
      </div>

      {awards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Trophy weight="light" className="w-12 h-12 text-sage" />
          <p className="text-sm text-earth-light text-center">
            Not enough data yet. Keep logging to unlock weekly awards!
          </p>
        </div>
      ) : (
        <div className="space-y-3" id="recap-card">
          {awards.map((award, idx) => (
            <motion.div
              key={award.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-2xl border p-4 ${award.color}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
                  <span className="text-2xl">{award.emoji}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-earth-light">{award.title}</p>
                  <p className="text-lg font-bold text-moss">{award.winner}</p>
                  <p className="text-xs text-earth-light">{award.detail}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
