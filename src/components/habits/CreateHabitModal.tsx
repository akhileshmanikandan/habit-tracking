"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Eye, EyeSlash, PersonSimpleRun, Barbell, CheckCircle } from "@phosphor-icons/react";
import { haptics } from "@/lib/utils/haptics";
import type { HabitCategory } from "@/lib/supabase/types";

interface CreateHabitModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (habit: {
    title: string;
    category: HabitCategory;
    is_private: boolean;
    goal_value: number | null;
    unit: string | null;
  }) => Promise<void>;
}

const CATEGORIES: { value: HabitCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "running", label: "Running", icon: <PersonSimpleRun weight="fill" className="w-6 h-6" />, color: "bg-sunset/20 text-sunset border-sunset/30" },
  { value: "gym", label: "Gym", icon: <Barbell weight="fill" className="w-6 h-6" />, color: "bg-earth/20 text-earth border-earth/30" },
  { value: "general", label: "General", icon: <CheckCircle weight="fill" className="w-6 h-6" />, color: "bg-sage/20 text-sage-dark border-sage/30" },
];

export function CreateHabitModal({ open, onClose, onCreate }: CreateHabitModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HabitCategory>("general");
  const [isPrivate, setIsPrivate] = useState(false);
  const [goalValue, setGoalValue] = useState("");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    await onCreate({
      title: title.trim(),
      category,
      is_private: isPrivate,
      goal_value: goalValue ? parseFloat(goalValue) : null,
      unit: unit || null,
    });
    haptics.medium();
    setTitle("");
    setCategory("general");
    setIsPrivate(false);
    setGoalValue("");
    setUnit("");
    setSubmitting(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-cream p-6 pb-10 space-y-5"
      >
        <div className="mx-auto w-12 h-1.5 rounded-full bg-earth/20 mb-2" />
        <h2 className="text-lg font-bold text-moss">New Habit</h2>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-earth-light mb-1 block">Habit Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning Run, Read 20 mins..."
            className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
            autoFocus
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-earth-light mb-2 block">Category</label>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCategory(cat.value);
                  haptics.light();
                }}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                  category === cat.value ? cat.color : "bg-white/30 border-transparent text-earth-light"
                }`}
              >
                {cat.icon}
                <span className="text-xs font-medium">{cat.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setIsPrivate(!isPrivate);
            haptics.light();
          }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
            isPrivate
              ? "bg-earth/10 border-earth/20 text-earth"
              : "bg-white/40 border-white/40 text-earth-light"
          }`}
        >
          {isPrivate ? (
            <EyeSlash weight="fill" className="w-5 h-5" />
          ) : (
            <Eye weight="regular" className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {isPrivate ? "Private — only you can see" : "Shared — visible to group"}
          </span>
        </motion.button>

        {/* Goal (optional) */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-earth-light mb-1 block">Goal (optional)</label>
            <input
              type="number"
              inputMode="decimal"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              placeholder="e.g. 5"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-earth-light mb-1 block">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="km, reps, mins..."
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="w-full py-4 rounded-2xl bg-moss text-cream font-bold text-lg shadow-lg shadow-moss/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus weight="bold" className="w-5 h-5" />
          {submitting ? "Creating..." : "Create Habit"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
