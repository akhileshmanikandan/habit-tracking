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

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch members for a given group
  const fetchMembers = useCallback(async (groupId: string) => {
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
  }, []);

  // Initial load: fetch all groups user belongs to
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get all group memberships
        const { data: memberships } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id);

        if (memberships && memberships.length > 0) {
          const groupIds = memberships.map((m) => m.group_id);
          const { data: groupsData } = await supabase
            .from("groups")
            .select("*")
            .in("id", groupIds);
          if (groupsData) setGroups(groupsData);

          // Restore last selected group from localStorage
          const savedGroupId = localStorage.getItem("activeGroupId");
          const savedGroup = groupsData?.find((g) => g.id === savedGroupId);
          if (savedGroup) {
            setActiveGroup(savedGroup);
            await fetchMembers(savedGroup.id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [fetchMembers]);

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error("Not authenticated") };

      const { data: newGroup, error } = await supabase
        .from("groups")
        .insert({ name })
        .select()
        .single();

      if (error || !newGroup)
        return { data: null, error: error ? new Error(error.message) : new Error("Failed to create group") };

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: newGroup.id, user_id: user.id });

      if (memberError) return { data: null, error: new Error(memberError.message) };

      // Update local state
      setGroups((prev) => [...prev, newGroup]);
      setActiveGroup(newGroup);
      localStorage.setItem("activeGroupId", newGroup.id);

      // Fetch members (just self)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profile) setMembers([profile]);

      return { data: newGroup, error: null };
    },
    []
  );

  const joinGroup = useCallback(
    async (inviteCode: string): Promise<{ data: Group | null; error: Error | null }> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error("Not authenticated") };

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
        .eq("user_id", user.id)
        .single();

      if (!existing) {
        const { error: joinError } = await supabase
          .from("group_members")
          .insert({ group_id: foundGroup.id, user_id: user.id });
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
    [fetchMembers]
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
