"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Habit, Log, Streak } from "@/lib/supabase/types";

function getSupabase() {
  return createClient();
}

export function useHabits(groupId?: string) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    const supabase = getSupabase();
    setLoading(true);
    let query = supabase.from("habits").select("*").order("created_at", { ascending: false });
    if (groupId) {
      query = query.eq("group_id", groupId);
    }
    const { data, error } = await query;
    if (!error && data) setHabits(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const createHabit = async (habit: Omit<Habit, "id" | "created_at">) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("habits").insert(habit).select().single();
    if (!error && data) {
      setHabits((prev) => [data, ...prev]);
    }
    return { data, error };
  };

  const deleteHabit = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (!error) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
    }
    return { error };
  };

  return { habits, loading, createHabit, deleteHabit, refetch: fetchHabits };
}

export function useLogs(habitId?: string) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const supabase = getSupabase();
    setLoading(true);
    let query = supabase.from("logs").select("*").order("created_at", { ascending: false }).limit(50);
    if (habitId) {
      query = query.eq("habit_id", habitId);
    }
    const { data, error } = await query;
    if (!error && data) setLogs(data);
    setLoading(false);
  }, [habitId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const createLog = async (log: Omit<Log, "id" | "created_at" | "pace">) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("logs").insert(log).select().single();
    if (!error && data) {
      setLogs((prev) => [data, ...prev]);
      // Update streak
      await supabase.rpc("update_streak", {
        p_user_id: log.user_id,
        p_habit_id: log.habit_id,
      });
    }
    return { data, error };
  };

  return { logs, loading, createLog, refetch: fetchLogs };
}

export function useStreaks(userId?: string) {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchStreaks = async () => {
      setLoading(true);
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId);
      if (!error && data) setStreaks(data);
      setLoading(false);
    };
    fetchStreaks();
  }, [userId]);

  return { streaks, loading };
}

export function useGroupLogs(groupId?: string) {
  const [logs, setLogs] = useState<(Log & { profiles: { username: string; avatar_url: string | null }; habits: { title: string; category: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("logs")
      .select(`
        *,
        profiles:user_id(username, avatar_url),
        habits:habit_id(title, category)
      `)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setLogs(data as typeof logs);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}
