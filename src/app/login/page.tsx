"use client";

import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Trees } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient - forest at dusk */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A4018] via-[#1A2412] to-[#0D1508]" />

      {/* Forest silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3">
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full opacity-30"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* Tree silhouettes */}
          <path d="M0,150 L0,100 L20,40 L40,100 L40,150 Z" fill="#1a3010" />
          <path d="M50,150 L50,80 L65,20 L80,80 L80,150 Z" fill="#142808" />
          <path d="M90,150 L90,90 L110,30 L130,90 L130,150 Z" fill="#1a3010" />
          <path d="M140,150 L140,70 L160,15 L180,70 L180,150 Z" fill="#0f2005" />
          <path d="M190,150 L190,85 L210,25 L230,85 L230,150 Z" fill="#1a3010" />
          <path d="M240,150 L240,75 L260,20 L280,75 L280,150 Z" fill="#142808" />
          <path d="M290,150 L290,90 L310,35 L330,90 L330,150 Z" fill="#1a3010" />
          <path d="M340,150 L340,80 L360,25 L380,80 L380,150 Z" fill="#0f2005" />
          <path d="M380,150 L380,95 L395,45 L400,95 L400,150 Z" fill="#1a3010" />
        </svg>
      </div>

      {/* Fireflies */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-yellow-200/60"
            style={{
              left: `${15 + Math.random() * 70}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.5],
              x: [0, (Math.random() - 0.5) * 30],
              y: [0, (Math.random() - 0.5) * 20],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <div className="w-14 h-14 rounded-2xl bg-sage/20 backdrop-blur-sm border border-sage/30 flex items-center justify-center">
            <Trees className="w-8 h-8 text-sage-light" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-cream">Lock In</h1>
            <p className="text-sm text-sage-light/70">Grow together</p>
          </div>
        </motion.div>

        {/* Tagline */}
        <p className="text-cream/60 text-center max-w-xs text-sm">
          Track habits with friends. Every log plants a tree. Watch your shared
          forest thrive.
        </p>

        {/* Login button */}
        <motion.button
          onClick={handleGoogleLogin}
          className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-cream text-moss font-semibold shadow-lg shadow-black/20 hover:bg-cream-dark transition-colors"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </motion.button>
      </motion.div>
    </div>
  );
}
