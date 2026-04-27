"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Group } from "@/lib/supabase/types";

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          setUserId(authUser.id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();
          if (profile) setUser(profile);
        }
      } catch (err) {
        console.error("[useAuth] Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: { user: { id: string } } | null) => {
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profile) setUser(profile);
      } else {
        setUser(null);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserId(null);
    window.location.href = "/login";
  };

  return { user, userId, loading, signOut };
}

export function useGroup() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchGroup = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: membership } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (membership) {
          const { data: groupData } = await supabase
            .from("groups")
            .select("*")
            .eq("id", membership.group_id)
            .single();
          if (groupData) setGroup(groupData);

          const { data: memberRows } = await supabase
            .from("group_members")
            .select("user_id")
            .eq("group_id", membership.group_id);

          if (memberRows) {
            const userIds = memberRows.map((m: { user_id: string }) => m.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("*")
              .in("id", userIds);
            if (profiles) setMembers(profiles);
          }
        }
      } catch (err) {
        console.error("Failed to fetch group:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, []);

  const createGroup = async (name: string): Promise<{ data: Group | null; error: Error | null }> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    // Insert group
    const { data: newGroup, error } = await supabase
      .from("groups")
      .insert({ name })
      .select()
      .single();

    if (error || !newGroup) return { data: null, error: error ? new Error(error.message) : new Error("Failed to create group") };

    // Add self as member
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: newGroup.id, user_id: user.id });

    if (memberError) return { data: null, error: new Error(memberError.message) };

    // Fetch own profile to populate members
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setGroup(newGroup);
    if (profile) setMembers([profile]);
    return { data: newGroup, error: null };
  };

  const joinGroup = async (inviteCode: string): Promise<{ data: Group | null; error: Error | null }> => {
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

    if (findError || !foundGroup) return { data: null, error: new Error("Group not found. Check the invite code and try again.") };

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

    // Fetch all members of the group
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", foundGroup.id);
    if (memberRows) {
      const userIds = memberRows.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
      if (profiles) setMembers(profiles);
    }
    setGroup(foundGroup);
    return { data: foundGroup, error: null };
  };

  return { group, members, loading, createGroup, joinGroup };
}
