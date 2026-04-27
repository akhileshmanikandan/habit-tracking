"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth, useGroup } from "@/lib/hooks/useAuth";
import { useStreaks } from "@/lib/hooks/useHabits";
import { SignOut, Copy, Users, Shield, Fire, TreeEvergreen, Plus, ArrowRight } from "@phosphor-icons/react";
import { haptics } from "@/lib/utils/haptics";

export default function ProfilePage() {
  const { user, userId, signOut } = useAuth();
  const { group, members, createGroup, joinGroup } = useGroup();
  const { streaks } = useStreaks(userId || undefined);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setGroupLoading(true);
    setGroupError(null);
    const { error } = await createGroup(groupName.trim());
    if (error) setGroupError(error.message);
    setGroupLoading(false);
    haptics.light();
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    setGroupLoading(true);
    setGroupError(null);
    const { error } = await joinGroup(inviteCode.trim());
    if (error) setGroupError(error.message);
    setGroupLoading(false);
    haptics.light();
  };

  const totalStreak = streaks.reduce((max, s) => Math.max(max, s.current_streak), 0);
  const totalShields = streaks.reduce((sum, s) => sum + s.shields, 0);
  const longestStreak = streaks.reduce((max, s) => Math.max(max, s.longest_streak), 0);

  const copyInviteCode = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      haptics.light();
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Profile header */}
      <div className="bg-white/60 rounded-2xl border border-white/40 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-sage/20 flex items-center justify-center">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-14 h-14 rounded-2xl object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xl font-bold text-moss">
              {user?.username?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-moss">{user?.username || "Loading..."}</p>
          <p className="text-xs text-earth-light">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "..."}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/60 rounded-xl border border-white/40 p-3 text-center">
          <Fire weight="fill" className="w-5 h-5 text-sunset mx-auto mb-1" />
          <p className="text-lg font-bold text-moss">{totalStreak}</p>
          <p className="text-[10px] text-earth-light">Current</p>
        </div>
        <div className="bg-white/60 rounded-xl border border-white/40 p-3 text-center">
          <TreeEvergreen weight="fill" className="w-5 h-5 text-sage mx-auto mb-1" />
          <p className="text-lg font-bold text-moss">{longestStreak}</p>
          <p className="text-[10px] text-earth-light">Longest</p>
        </div>
        <div className="bg-white/60 rounded-xl border border-white/40 p-3 text-center">
          <Shield weight="fill" className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-moss">{totalShields}</p>
          <p className="text-[10px] text-earth-light">Shields</p>
        </div>
      </div>

      {/* Create / Join group */}
      {!group && (
        <div className="bg-white/60 rounded-2xl border border-white/40 p-4 space-y-4">
          <h2 className="text-sm font-bold text-moss flex items-center gap-2">
            <Users weight="fill" className="w-4 h-4" />
            Get Started with a Group
          </h2>

          {groupError && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{groupError}</p>
          )}

          {/* Create */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-earth-light">Create a new group</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className="flex-1 px-3 py-2 rounded-xl bg-white/80 border border-white/60 text-sm text-moss placeholder:text-earth-light/50 focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCreateGroup}
                disabled={groupLoading || !groupName.trim()}
                className="px-3 py-2 rounded-xl bg-moss text-white text-sm font-medium disabled:opacity-40"
              >
                <Plus weight="bold" className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-earth-light/20" />
            <span className="text-[10px] text-earth-light uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-earth-light/20" />
          </div>

          {/* Join */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-earth-light">Join with invite code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                className="flex-1 px-3 py-2 rounded-xl bg-white/80 border border-white/60 text-sm text-moss placeholder:text-earth-light/50 focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleJoinGroup}
                disabled={groupLoading || !inviteCode.trim()}
                className="px-3 py-2 rounded-xl bg-moss text-white text-sm font-medium disabled:opacity-40"
              >
                <ArrowRight weight="bold" className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Group info */}
      {group && (
        <div className="bg-white/60 rounded-2xl border border-white/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-moss flex items-center gap-2">
              <Users weight="fill" className="w-4 h-4" />
              {group.name}
            </h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={copyInviteCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage/10 text-moss text-xs font-medium"
            >
              <Copy weight="bold" className="w-3.5 h-3.5" />
              {group.invite_code}
            </motion.button>
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center overflow-hidden">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.username}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-xs font-bold text-moss">
                      {member.username[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm text-moss font-medium">{member.username}</span>
                {member.id === userId && (
                  <span className="text-[10px] bg-sage/20 text-sage-dark px-1.5 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign out */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={signOut}
        className="w-full py-3 rounded-xl bg-white/40 border border-white/40 text-earth-light font-medium flex items-center justify-center gap-2"
      >
        <SignOut weight="bold" className="w-4 h-4" />
        Sign Out
      </motion.button>
    </div>
  );
}
