"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Group, Profile } from "@/lib/supabase/types";

interface GroupContextValue {
  /** All groups the user belongs to */
  groups: Group[];
  /** Currently active group */
  activeGroup: Group | null;
  /** Members of the active group */
  members: Profile[];
  /** True while initial data is loading */
  loading: boolean;
  /** Select an existing group */
  selectGroup: (groupId: string) => Promise<void>;
  /** Create a new group and select it */
  createGroup: (name: string) => Promise<{ data: Group | null; error: Error | null }>;
  /** Join a group by invite code and select it */
  joinGroup: (inviteCode: string) => Promise<{ data: Group | null; error: Error | null }>;
  /** Clear active group (go back to picker) */
  clearGroup: () => void;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch members for a given group
  const fetchMembers = useCallback(async (groupId: string) => {
    try {
      const supabase = createClient();
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      if (memberRows) {
        const userIds = memberRows.map((m: { user_id: string }) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);
        if (profiles) setMembers(profiles);
      }
    } catch (err) {
      console.error("[GroupContext] fetchMembers error:", err);
    }
  }, []);

  // Fetch groups once userId is available (no duplicate getUser call)
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchGroups = async () => {
      try {
        const supabase = createClient();

        // Get all group memberships
        const { data: memberships } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId);
        if (cancelled) return;

        if (memberships && memberships.length > 0) {
          const groupIds = memberships.map((m: { group_id: string }) => m.group_id);
          const { data: groupsData } = await supabase
            .from("groups")
            .select("*")
            .in("id", groupIds) as { data: Group[] | null };
          if (cancelled) return;

          if (groupsData) {
            setGroups(groupsData);

            // Restore last selected group from localStorage
            let savedGroupId: string | null = null;
            try { savedGroupId = localStorage.getItem("activeGroupId"); } catch {}
            const savedGroup = groupsData.find((g: Group) => g.id === savedGroupId);
            if (savedGroup) {
              setActiveGroup(savedGroup);
              await fetchMembers(savedGroup.id);
            }
          }
        }
      } catch (err) {
        console.error("[GroupContext] fetchGroups error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchGroups();

    return () => { cancelled = true; };
  }, [userId, fetchMembers]);

  const selectGroup = useCallback(
    async (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        setActiveGroup(group);
        localStorage.setItem("activeGroupId", groupId);
        await fetchMembers(groupId);
      }
    },
    [groups, fetchMembers]
  );

  const clearGroup = useCallback(() => {
    setActiveGroup(null);
    setMembers([]);
    localStorage.removeItem("activeGroupId");
  }, []);

  const createGroup = useCallback(
    async (name: string): Promise<{ data: Group | null; error: Error | null }> => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };

      const supabase = createClient();

      const { data: newGroup, error } = await supabase
        .from("groups")
        .insert({ name })
        .select()
        .single();

      if (error || !newGroup)
        return { data: null, error: error ? new Error(error.message) : new Error("Failed to create group") };

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: newGroup.id, user_id: userId });

      if (memberError) return { data: null, error: new Error(memberError.message) };

      // Update local state
      setGroups((prev) => [...prev, newGroup]);
      setActiveGroup(newGroup);
      localStorage.setItem("activeGroupId", newGroup.id);

      // Fetch members (just self)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (profile) setMembers([profile]);

      return { data: newGroup, error: null };
    },
    [userId]
  );

  const joinGroup = useCallback(
    async (inviteCode: string): Promise<{ data: Group | null; error: Error | null }> => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };

      const supabase = createClient();

      const { data: foundGroup, error: findError } = await supabase
        .from("groups")
        .select("*")
        .eq("invite_code", inviteCode)
        .single();

      if (findError || !foundGroup)
        return { data: null, error: new Error("Group not found. Check the invite code and try again.") };

      // Check if already a member
      const { data: existing } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", foundGroup.id)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        const { error: joinError } = await supabase
          .from("group_members")
          .insert({ group_id: foundGroup.id, user_id: userId });
        if (joinError) return { data: null, error: new Error(joinError.message) };
      }

      // Update local state
      setGroups((prev) => {
        if (prev.find((g) => g.id === foundGroup.id)) return prev;
        return [...prev, foundGroup];
      });
      setActiveGroup(foundGroup);
      localStorage.setItem("activeGroupId", foundGroup.id);
      await fetchMembers(foundGroup.id);

      return { data: foundGroup, error: null };
    },
    [userId, fetchMembers]
  );

  return (
    <GroupContext.Provider
      value={{ groups, activeGroup, members, loading, selectGroup, createGroup, joinGroup, clearGroup }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroupContext must be used within a GroupProvider");
  return ctx;
}
