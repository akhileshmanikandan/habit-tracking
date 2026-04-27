"use client";

import { motion } from "framer-motion";
import { useAuth, useGroup } from "@/lib/hooks/useAuth";
import { useStreaks } from "@/lib/hooks/useHabits";
import { SignOut, Copy, Users, Shield, Fire, TreeEvergreen } from "@phosphor-icons/react";
import { haptics } from "@/lib/utils/haptics";

export default function ProfilePage() {
  const { user, userId, signOut } = useAuth();
  const { group, members } = useGroup();
  const { streaks } = useStreaks(userId || undefined);

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

      {/* Grove info */}
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
