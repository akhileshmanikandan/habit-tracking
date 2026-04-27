"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trees, ListChecks, Trophy, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/forest", label: "Forest", icon: Trees },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/marathon", label: "Marathon", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-3 mb-3 rounded-2xl glass border border-white/20 shadow-xl">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 px-4 py-2"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="relative"
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-moss" : "text-earth-light/60"
                    }`}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-moss" : "text-earth-light/60"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
