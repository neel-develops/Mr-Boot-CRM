"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Access control is enforced on the server (src/middleware.ts + requireUser in actions).
// This only reacts to sign-out / expired sessions in an open tab.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        window.location.assign("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
