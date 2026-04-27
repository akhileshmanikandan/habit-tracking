"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuth, useGroup } from "@/lib/hooks/useAuth";
import { daysUntil } from "@/lib/utils/pace-calculator";
import { Timer, TrendUp, Users, Ghost } from "@phosphor-icons/react";
import type { MarathonGoal, Profile } from "@/lib/supabase/types";

interface MemberDistance {
  member: Profile;
  totalKm: number;
  avgPace: number | null;
}

export default function MarathonPage() {
  const { userId } = useAuth();
  const { group, members } = useGroup();
  const [goal, setGoal] = useState<MarathonGoal | null>(null);
  const [memberDistances, setMemberDistances] = useState<MemberDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  // Setup form state
  const [goalTitle, setGoalTitle] = useState("Half Marathon Training");
  const [targetKm, setTargetKm] = useState("21.1");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!group) return;

    const fetchMarathonData = async () => {
      const supabase = createClient();
      // Get marathon goal
      const { data: goals } = await supabase
        .from("marathon_goals")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (goals && goals.length > 0) {
        setGoal(goals[0]);

        // Get running logs within goal period
        const { data: logs } = await supabase
          .from("logs")
          .select("*, habits!inner(category)")
          .gte("created_at", goals[0].start_date)
          .lte("created_at", goals[0].end_date + "T23:59:59")
          .eq("habits.category", "running");

        const distances: MemberDistance[] = members.map((member) => {
          const memberLogs = (logs || []).filter((l) => l.user_id === member.id);
          const totalKm = memberLogs.reduce((sum, l) => sum + (l.value || 0), 0);
          const paces = memberLogs
            .filter((l) => l.value && l.duration_minutes && l.value > 0)
            .map((l) => l.duration_minutes! / l.value!);
          const avgPace = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null;
          return { member, totalKm, avgPace };
        });

        setMemberDistances(distances);
      }
      setLoading(false);
    };

    fetchMarathonData();
  }, [group, members]);

  const totalGroupKm = memberDistances.reduce((sum, m) => sum + m.totalKm, 0);
  const progress = goal ? Math.min(100, (totalGroupKm / goal.target_km) * 100) : 0;
  const ghostPace = useMemo(() => {
    const paces = memberDistances.filter((m) => m.avgPace !== null).map((m) => m.avgPace!);
    return paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null;
  }, [memberDistances]);

  const handleCreateGoal = async () => {
    if (!group || !targetKm) return;
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("marathon_goals").insert({
      group_id: group.id,
      title: goalTitle,
      target_km: parseFloat(targetKm),
      start_date: today,
      end_date: endDate || today,
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-40 bg-white/40 rounded animate-pulse" />
        <div className="h-32 bg-white/40 rounded-2xl animate-pulse" />
        <div className="h-48 bg-white/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-moss">Marathon Tracker</h1>
        {!showSetup ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <TrendUp weight="light" className="w-12 h-12 text-sage" />
            <p className="text-sm text-earth-light text-center max-w-xs">
              Set up a group distance goal to track your training together.
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSetup(true)}
              className="px-5 py-2.5 rounded-xl bg-moss text-cream text-sm font-semibold"
            >
              Set Up Goal
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4 max-w-sm mx-auto">
            <div>
              <label className="text-xs font-medium text-earth-light mb-1 block">Goal Title</label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-earth-light mb-1 block">
                Target Distance (km per person)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={targetKm}
                onChange={(e) => setTargetKm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-earth-light mb-1 block">
                Race Day / End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateGoal}
              className="w-full py-3.5 rounded-xl bg-moss text-cream font-semibold"
            >
              Start Training 🏃
            </motion.button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-moss">{goal.title}</h1>

      {/* Countdown */}
      <div className="bg-white/60 rounded-2xl border border-white/40 p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-sunset/20 flex items-center justify-center">
          <Timer weight="fill" className="w-6 h-6 text-sunset" />
        </div>
        <div>
          <p className="text-2xl font-bold text-moss">{daysUntil(goal.end_date)}</p>
          <p className="text-xs text-earth-light">days until race day</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white/60 rounded-2xl border border-white/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-moss">Group Distance</span>
          <span className="text-sm font-bold text-moss">
            {totalGroupKm.toFixed(1)} / {goal.target_km} km
          </span>
        </div>
        <div className="h-4 bg-cream-dark rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-sage to-moss rounded-full"
          />
          {/* Milestone markers */}
          {[25, 50, 75].map((m) => (
            <div
              key={m}
              className="absolute top-0 bottom-0 w-px bg-earth-light/30"
              style={{ left: `${m}%` }}
            />
          ))}
        </div>
        {/* Ghost pace */}
        {ghostPace && (
          <div className="flex items-center gap-2 text-xs text-earth-light">
            <Ghost weight="fill" className="w-4 h-4" />
            <span>
              Group avg pace: {Math.floor(ghostPace)}:
              {String(Math.round((ghostPace % 1) * 60)).padStart(2, "0")} /km
            </span>
          </div>
        )}
      </div>

      {/* Per-member breakdown */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-moss flex items-center gap-2">
          <Users weight="fill" className="w-4 h-4" />
          Individual Progress
        </h2>
        {memberDistances
          .sort((a, b) => b.totalKm - a.totalKm)
          .map((md) => {
            const memberProgress = Math.min(100, (md.totalKm / goal.target_km) * 100);
            const isBeatingGhost = ghostPace && md.avgPace && md.avgPace < ghostPace;
            return (
              <div
                key={md.member.id}
                className="bg-white/60 rounded-xl border border-white/40 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-sage/20 flex items-center justify-center text-xs font-bold text-moss">
                      {md.member.username[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-moss">{md.member.username}</span>
                    {isBeatingGhost && <span className="text-xs">⚡</span>}
                  </div>
                  <span className="text-sm font-bold text-moss">{md.totalKm.toFixed(1)} km</span>
                </div>
                <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${memberProgress}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${
                      isBeatingGhost
                        ? "bg-gradient-to-r from-sunset to-yellow-400"
                        : "bg-gradient-to-r from-sage to-moss"
                    }`}
                  />
                </div>
                {md.avgPace && (
                  <p className="text-[10px] text-earth-light mt-1">
                    Avg pace: {Math.floor(md.avgPace)}:
                    {String(Math.round((md.avgPace % 1) * 60)).padStart(2, "0")} /km
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
