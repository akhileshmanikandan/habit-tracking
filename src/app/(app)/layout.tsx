"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { GroupProvider, useGroupContext } from "@/lib/hooks/useGroupContext";
import { GroupPicker } from "@/components/groups/GroupPicker";
import { useAuth } from "@/lib/hooks/useAuth";
import { TreeEvergreen } from "@phosphor-icons/react";

function GroupGate({ children }: { children: React.ReactNode }) {
  const { activeGroup, loading: groupLoading } = useGroupContext();

  if (groupLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <TreeEvergreen weight="fill" className="w-10 h-10 text-sage animate-pulse" />
        <p className="text-sm text-earth-light">Loading groups...</p>
      </div>
    );
  }

  // No group selected → show group picker
  if (!activeGroup) {
    return <GroupPicker />;
  }

  // Group selected → show app with bottom nav
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <TreeEvergreen weight="fill" className="w-10 h-10 text-sage animate-pulse" />
        <p className="text-sm text-earth-light">Loading...</p>
      </div>
    );
  }

  return (
    <GroupProvider userId={userId}>
      <GroupGate>{children}</GroupGate>
    </GroupProvider>
  );
}
