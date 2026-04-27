import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // In production, env vars are baked in at build time.
    // If they're missing, the build didn't have them configured.
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "These must be set in Vercel Environment Variables and a new deployment triggered."
    );
    // Return a dummy client that won't crash the app but won't work either.
    // This prevents white screens on Vercel when env vars aren't configured.
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
