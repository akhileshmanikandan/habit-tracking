import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/forest";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure a profile exists for this user (the DB trigger may not have fired)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          const meta = user.user_metadata ?? {};
          await supabase.from("profiles").insert({
            id: user.id,
            username:
              (meta.name || meta.full_name || "user") +
              "_" +
              user.id.slice(0, 4),
            avatar_url: meta.avatar_url || meta.picture || null,
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to login if something went wrong
  return NextResponse.redirect(`${origin}/login`);
}
