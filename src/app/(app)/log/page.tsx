"use client";

import { useState } from "react";
import { useAuth, useGroup } from "@/lib/hooks/useAuth";
import { useHabits } from "@/lib/hooks/useHabits";
import { LogDrawer } from "@/components/logging/LogDrawer";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function LogPage() {
  const { userId } = useAuth();
  const { group } = useGroup();
  const { habits } = useHabits(group?.id);
  const myHabits = habits.filter((h) => h.creator_id === userId);

  const handleLog = async (log: {
    habit_id: string;
    user_id: string;
    value: number | null;
    duration_minutes: number | null;
    notes: string | null;
    is_rest_day: boolean;
  }) => {
    await supabase.from("logs").insert(log);
    await supabase.rpc("update_streak", {
      p_user_id: log.user_id,
      p_habit_id: log.habit_id,
    });
  };

  return (
    <div className="min-h-screen">
      <LogDrawer
        open={true}
        onOpenChange={() => {}}
        habits={myHabits}
        userId={userId || ""}
        onLog={handleLog}
      />
      {/* Fallback content behind the drawer */}
      <div className="flex flex-col items-center justify-center h-full pt-20 gap-4 px-6">
        <p className="text-sm text-earth-light text-center">
          Select a habit above to log your progress.
        </p>
      </div>
    </div>
  );
}
