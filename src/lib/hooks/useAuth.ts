"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    if (profile) setUser(profile);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Use getSession() — fast local read from cookies, no network call.
    // The proxy already validated the session server-side.
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user: { id: string } } | null } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUserId(session.user.id);
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: { id: string } } | null) => {
      if (!mounted) return;
      if (session?.user) {
        setUserId(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setUserId(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserId(null);
    window.location.href = "/login";
  };

  return { user, userId, loading, signOut };
}
