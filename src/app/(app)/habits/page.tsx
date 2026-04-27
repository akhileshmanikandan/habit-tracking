"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, PersonSimpleRun, Barbell, CheckCircle, Trash } from "@phosphor-icons/react";
import { Shield } from "lucide-react";
import { useAuth, useGroup } from "@/lib/hooks/useAuth";
import { useHabits, useStreaks } from "@/lib/hooks/useHabits";
import { CreateHabitModal } from "@/components/habits/CreateHabitModal";
import { haptics } from "@/lib/utils/haptics";
import type { HabitCategory } from "@/lib/supabase/types";

const CATEGORY_ICONS: Record<HabitCategory, React.ReactNode> = {
  running: <PersonSimpleRun weight="fill" className="w-5 h-5" />,
  gym: <Barbell weight="fill" className="w-5 h-5" />,
  general: <CheckCircle weight="fill" className="w-5 h-5" />,
};

const CATEGORY_COLORS: Record<HabitCategory, string> = {
  running: "bg-sunset/20 text-sunset",
  gym: "bg-earth/20 text-earth",
  general: "bg-sage/20 text-sage-dark",
};

export default function HabitsPage() {
  const { userId } = useAuth();
  const { group } = useGroup();
  const { habits, createHabit, deleteHabit, loading } = useHabits(group?.id);
  const { streaks } = useStreaks(userId || undefined);
  const [showCreate, setShowCreate] = useState(false);

  const myHabits = habits.filter((h) => h.creator_id === userId);

  const getStreak = (habitId: string) => {
    return streaks.find((s) => s.habit_id === habitId);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-moss">My Habits</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setShowCreate(true);
            haptics.light();
          }}
          className="w-10 h-10 rounded-xl bg-moss text-cream flex items-center justify-center shadow-md shadow-moss/20"
        >
          <Plus weight="bold" className="w-5 h-5" />
        </motion.button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/40 animate-pulse" />
          ))}
        </div>
      ) : myHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center">
            <Plus weight="light" className="w-8 h-8 text-sage" />
          </div>
          <p className="text-sm text-earth-light text-center max-w-xs">
            No habits yet. Create your first habit to start planting trees!
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl bg-moss text-cream text-sm font-semibold"
          >
            Create First Habit
          </motion.button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {myHabits.map((habit) => {
              const streak = getStreak(habit.id);
              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white/60 rounded-xl border border-white/40 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        CATEGORY_COLORS[habit.category]
                      }`}
                    >
                      {CATEGORY_ICONS[habit.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-moss truncate">{habit.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-earth-light capitalize">
                          {habit.category}
                        </span>
                        {habit.is_private && (
                          <span className="text-[10px] bg-earth/10 text-earth-light px-1.5 py-0.5 rounded-full">
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {streak && streak.current_streak > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">🔥</span>
                          <span className="text-sm font-bold text-moss">
                            {streak.current_streak}
                          </span>
                        </div>
                      )}
                      {streak && streak.shields > 0 && (
                        <div className="flex items-center gap-0.5">
                          <Shield className="w-3 h-3 text-blue-400" />
                          <span className="text-[10px] text-blue-500 font-medium">
                            {streak.shields}
                          </span>
                        </div>
                      )}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={async () => {
                        haptics.light();
                        await deleteHabit(habit.id);
                      }}
                      className="p-2 text-earth-light/40 hover:text-destructive transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {habit.goal_value && (
                    <div className="mt-2 text-xs text-earth-light">
                      Goal: {habit.goal_value} {habit.unit || ""}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateHabitModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreate={async (habit) => {
              if (!userId || !group) return;
              await createHabit({
                ...habit,
                creator_id: userId,
                group_id: group.id,
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
