import { useState, useEffect } from "react";
import App from "./App.jsx";
import Auth from "./Auth.jsx";
import { supabase } from "./supabase.js";

export default function Root() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Token refresh updates the Supabase client internally — avoid re-rendering
      // the whole app (which briefly clears tasks/projects from memory).
      setSession((prev) => {
        if (
          event === "TOKEN_REFRESHED" &&
          prev?.user?.id &&
          prev.user.id === nextSession?.user?.id
        ) {
          return prev;
        }
        return nextSession;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return session ? <App session={session} /> : <Auth />;
}
