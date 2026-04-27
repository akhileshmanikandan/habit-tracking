"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

function getSupabase() {
  return createClient();
}

export function useRealtime(
  table: string,
  filter: string | undefined,
  onInsert: (payload: Record<string, unknown>) => void
) {
  const callbackRef = useRef(onInsert);
  callbackRef.current = onInsert;

  useEffect(() => {
    const supabase = getSupabase();
    let channelConfig = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: { new: Record<string, unknown> }) => {
          callbackRef.current(payload.new);
        }
      );

    const channel = channelConfig.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}

export function useRealtimeReactions(
  userId: string | null,
  onReaction: (reaction: Record<string, unknown>) => void
) {
  const handleInsert = useCallback(
    (payload: Record<string, unknown>) => {
      onReaction(payload);
    },
    [onReaction]
  );

  useRealtime(
    "reactions",
    userId ? `to_user_id=eq.${userId}` : undefined,
    handleInsert
  );
}
