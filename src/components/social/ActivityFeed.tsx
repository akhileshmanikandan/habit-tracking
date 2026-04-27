"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuth, useGroup } from "@/lib/hooks/useAuth";
import { haptics } from "@/lib/utils/haptics";
import { Fire, HandFist, SmileyAngry, Drop } from "@phosphor-icons/react";

const REACTION_OPTIONS = [
  { type: "fire", icon: <Fire weight="fill" className="w-5 h-5" />, label: "🔥" },
  { type: "flex", icon: <HandFist weight="fill" className="w-5 h-5" />, label: "💪" },
  { type: "rage", icon: <SmileyAngry weight="fill" className="w-5 h-5" />, label: "😤" },
  { type: "water", icon: <Drop weight="fill" className="w-5 h-5" />, label: "🌧️" },
] as const;

interface FeedEntry {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  habit_title: string;
  habit_category: string;
  value: number | null;
  pace: string | null;
  notes: string | null;
  is_rest_day: boolean;
  created_at: string;
}

export function ActivityFeed() {
  const { userId } = useAuth();
  const { group } = useGroup();
  const [entries, setEntries] = useState<FeedEntry[]>([]);

  useEffect(() => {
    if (!group) return;

    const fetchFeed = async () => {
      const supabase = createClient();
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data } = await supabase
        .from("logs")
        .select(
          `
          id, user_id, value, pace, notes, is_rest_day, created_at,
          profiles:user_id(username, avatar_url),
          habits:habit_id(title, category, is_private, group_id)
        `
        )
        .gte("created_at", oneDayAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        const feed: FeedEntry[] = data
          .filter((d: Record<string, unknown>) => {
            const habits = d.habits as Record<string, unknown> | null;
            return habits && !habits.is_private && habits.group_id === group.id;
          })
          .map((d: Record<string, unknown>) => {
            const profiles = d.profiles as Record<string, unknown>;
            const habits = d.habits as Record<string, unknown>;
            return {
              id: d.id as string,
              user_id: d.user_id as string,
              username: profiles.username as string,
              avatar_url: profiles.avatar_url as string | null,
              habit_title: habits.title as string,
              habit_category: habits.category as string,
              value: d.value as number | null,
              pace: d.pace as string | null,
              notes: d.notes as string | null,
              is_rest_day: d.is_rest_day as boolean,
              created_at: d.created_at as string,
            };
          });
        setEntries(feed);
      }
    };

    fetchFeed();
  }, [group]);

  const sendReaction = async (toUserId: string, logId: string, type: string) => {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("reactions").insert({
      from_user_id: userId,
      to_user_id: toUserId,
      log_id: logId,
      type,
    });
    haptics.light();
  };

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-earth-light uppercase tracking-wider px-1">
        Recent Activity
      </h3>
      {entries.map((entry) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 rounded-xl border border-white/40 p-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={entry.username}
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs font-bold text-moss">
                  {entry.username[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-moss">
                <span className="font-semibold">{entry.username}</span>{" "}
                {entry.is_rest_day
                  ? "took a rest day 🌙"
                  : `completed ${entry.habit_title}`}
              </p>
              {entry.value && !entry.is_rest_day && (
                <p className="text-xs text-earth-light mt-0.5">
                  {entry.habit_category === "running"
                    ? `${entry.value} km${entry.pace ? ` · ${entry.pace}` : ""}`
                    : `${entry.value}${entry.notes ? ` · ${entry.notes}` : ""}`}
                </p>
              )}
              <p className="text-[10px] text-earth-light/60 mt-1">
                {formatTimeAgo(entry.created_at)}
              </p>
            </div>
          </div>

          {/* Reaction bar */}
          {entry.user_id !== userId && (
            <div className="flex gap-1.5 mt-2 ml-11">
              {REACTION_OPTIONS.map((r) => (
                <motion.button
                  key={r.type}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => sendReaction(entry.user_id, entry.id, r.type)}
                  className="px-2 py-1 rounded-lg bg-white/40 text-earth-light hover:bg-sage/20 transition-colors"
                >
                  <span className="text-sm">{r.label}</span>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
