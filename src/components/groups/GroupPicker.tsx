"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGroupContext } from "@/lib/hooks/useGroupContext";
import { Users, Plus, ArrowRight, TreeEvergreen } from "@phosphor-icons/react";
import { haptics } from "@/lib/utils/haptics";

export function GroupPicker() {
  const { groups, selectGroup, createGroup, joinGroup } = useGroupContext();
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const result = await createGroup(name.trim());
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    }
    haptics.light();
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const result = await joinGroup(code.trim());
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    }
    haptics.light();
  };

  const handleSelect = async (groupId: string) => {
    haptics.light();
    await selectGroup(groupId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <TreeEvergreen weight="fill" className="w-12 h-12 text-sage mx-auto" />
          <h1 className="text-2xl font-bold text-moss">Lock In</h1>
          <p className="text-sm text-earth-light">
            {groups.length > 0
              ? "Choose a group to view your forest"
              : "Create or join a group to get started"}
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        {/* Existing Groups */}
        {mode === "list" && (
          <div className="space-y-3">
            {groups.map((group) => (
              <motion.button
                key={group.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(group.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/60 border border-white/40 text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-sage/20 flex items-center justify-center">
                  <Users weight="fill" className="w-5 h-5 text-sage-dark" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-moss">{group.name}</p>
                  <p className="text-xs text-earth-light">
                    Code: {group.invite_code}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-earth-light" />
              </motion.button>
            ))}

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMode("create"); setError(null); }}
                className="w-full py-3.5 rounded-xl bg-moss text-cream font-semibold flex items-center justify-center gap-2"
              >
                <Plus weight="bold" className="w-4 h-4" />
                Create a Group
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMode("join"); setError(null); }}
                className="w-full py-3.5 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold"
              >
                Join with Code
              </motion.button>
            </div>
          </div>
        )}

        {/* Create Group */}
        {mode === "create" && (
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name (e.g. Team Sprinters)"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              autoFocus
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full py-3.5 rounded-xl bg-moss text-cream font-semibold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </motion.button>
            <button
              onClick={() => { setMode("list"); setError(null); }}
              className="w-full text-sm text-earth-light text-center"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Join Group */}
        {mode === "join" && (
          <div className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-moss font-semibold focus:outline-none focus:ring-2 focus:ring-sage uppercase tracking-wider text-center"
              autoFocus
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleJoin}
              disabled={!code.trim() || loading}
              className="w-full py-3.5 rounded-xl bg-moss text-cream font-semibold disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Group"}
            </motion.button>
            <button
              onClick={() => { setMode("list"); setError(null); }}
              className="w-full text-sm text-earth-light text-center"
            >
              ← Back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
