"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";
import { PersonSimpleRun, Barbell, CheckCircle, Moon } from "@phosphor-icons/react";
import { haptics } from "@/lib/utils/haptics";
import { calculatePace } from "@/lib/utils/pace-calculator";
import type { Habit, HabitCategory } from "@/lib/supabase/types";

interface LogDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: Habit[];
  userId: string;
  onLog: (log: {
    habit_id: string;
    user_id: string;
    value: number | null;
    duration_minutes: number | null;
    notes: string | null;
    is_rest_day: boolean;
  }) => Promise<void>;
}

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

export function LogDrawer({ open, onOpenChange, habits, userId, onLog }: LogDrawerProps) {
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [notes, setNotes] = useState("");
  const [isRestDay, setIsRestDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const reset = () => {
    setSelectedHabit(null);
    setDistance("");
    setMinutes("");
    setSeconds("");
    setExercise("");
    setWeight("");
    setReps("");
    setSets("");
    setNotes("");
    setIsRestDay(false);
    setShowSuccess(false);
  };

  const handleSubmit = async () => {
    if (!selectedHabit) return;
    setSubmitting(true);

    let value: number | null = null;
    let durationMinutes: number | null = null;
    let logNotes: string | null = notes || null;

    if (isRestDay) {
      // Rest day — no values needed
    } else if (selectedHabit.category === "running") {
      value = parseFloat(distance) || null;
      durationMinutes = (parseInt(minutes) || 0) * 1 + (parseInt(seconds) || 0) / 60;
      if (durationMinutes === 0) durationMinutes = null;
    } else if (selectedHabit.category === "gym") {
      value = parseFloat(weight) || null;
      logNotes = [exercise, `${reps} reps`, `${sets} sets`, notes].filter(Boolean).join(" · ");
    } else {
      value = 1; // Simple checkmark
    }

    await onLog({
      habit_id: selectedHabit.id,
      user_id: userId,
      value,
      duration_minutes: durationMinutes ? Math.round(durationMinutes) : null,
      notes: logNotes,
      is_rest_day: isRestDay,
    });

    haptics.medium();
    setShowSuccess(true);
    setSubmitting(false);

    setTimeout(() => {
      reset();
      onOpenChange(false);
    }, 1200);
  };

  const pace =
    selectedHabit?.category === "running" && distance && minutes
      ? calculatePace(
          parseFloat(distance),
          (parseInt(minutes) || 0) + (parseInt(seconds) || 0) / 60
        )
      : null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} onClose={reset}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-cream max-h-[85vh]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-earth/20 mt-3 mb-2" />

          <div className="flex-1 overflow-y-auto px-6 pb-8">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-sage/20 flex items-center justify-center"
                  >
                    <CheckCircle weight="fill" className="w-10 h-10 text-sage-dark" />
                  </motion.div>
                  <p className="text-lg font-semibold text-moss">
                    {isRestDay ? "Rest day logged 🌙" : "Tree planted! 🌱"}
                  </p>
                </motion.div>
              ) : !selectedHabit ? (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-lg font-bold text-moss mb-4">Log a Habit</h2>
                  <div className="space-y-2">
                    {habits.map((habit) => (
                      <motion.button
                        key={habit.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSelectedHabit(habit);
                          haptics.light();
                        }}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-white/40 text-left transition-colors hover:bg-white/80"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            CATEGORY_COLORS[habit.category]
                          }`}
                        >
                          {CATEGORY_ICONS[habit.category]}
                        </div>
                        <div>
                          <p className="font-semibold text-moss">{habit.title}</p>
                          <p className="text-xs text-earth-light capitalize">{habit.category}</p>
                        </div>
                        {habit.is_private && (
                          <span className="ml-auto text-[10px] bg-earth/10 text-earth-light px-2 py-0.5 rounded-full">
                            Private
                          </span>
                        )}
                      </motion.button>
                    ))}
                    {habits.length === 0 && (
                      <p className="text-center text-earth-light py-8">
                        No habits yet. Create one from the Habits tab!
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setSelectedHabit(null)}
                      className="text-earth-light text-sm"
                    >
                      ← Back
                    </button>
                    <h2 className="text-lg font-bold text-moss">{selectedHabit.title}</h2>
                  </div>

                  {/* Rest day toggle */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setIsRestDay(!isRestDay);
                      haptics.light();
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl mb-4 border transition-colors ${
                      isRestDay
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white/40 border-white/40 text-earth-light"
                    }`}
                  >
                    <Moon weight={isRestDay ? "fill" : "regular"} className="w-5 h-5" />
                    <span className="text-sm font-medium">Rest Day</span>
                  </motion.button>

                  {!isRestDay && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4"
                    >
                      {selectedHabit.category === "running" && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-earth-light mb-1 block">
                              Distance (km)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              value={distance}
                              onChange={(e) => setDistance(e.target.value)}
                              placeholder="5.00"
                              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-earth-light mb-1 block">
                                Minutes
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                placeholder="28"
                                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-earth-light mb-1 block">
                                Seconds
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={seconds}
                                onChange={(e) => setSeconds(e.target.value)}
                                placeholder="30"
                                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                              />
                            </div>
                          </div>
                          {pace && (
                            <div className="text-center py-2 rounded-xl bg-sage/10">
                              <span className="text-xs text-earth-light">Pace: </span>
                              <span className="font-bold text-moss">{pace}</span>
                            </div>
                          )}
                        </>
                      )}

                      {selectedHabit.category === "gym" && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-earth-light mb-1 block">
                              Exercise
                            </label>
                            <input
                              type="text"
                              value={exercise}
                              onChange={(e) => setExercise(e.target.value)}
                              placeholder="Bench Press"
                              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-earth-light mb-1 block">
                                Weight (kg)
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="60"
                                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-earth-light mb-1 block">
                                Reps
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                placeholder="8"
                                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-earth-light mb-1 block">
                                Sets
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={sets}
                                onChange={(e) => setSets(e.target.value)}
                                placeholder="4"
                                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {selectedHabit.category === "general" && (
                        <div className="py-4 text-center">
                          <p className="text-sm text-earth-light">
                            Tap &quot;Log It&quot; to complete this habit ✅
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="text-xs font-medium text-earth-light mb-1 block">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Felt great today..."
                      className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>

                  {/* Submit */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full mt-6 py-4 rounded-2xl bg-moss text-cream font-bold text-lg shadow-lg shadow-moss/20 disabled:opacity-50"
                  >
                    {submitting ? "Planting..." : isRestDay ? "Log Rest Day 🌙" : "Log It 🌱"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
