import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; session: Session | null; isAdmin: boolean; loading: boolean };
const AuthContext = createContext<AuthState>({ user: null, session: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, isAdmin: false, loading: true });

  useEffect(() => {
    const load = async (session: Session | null) => {
      let isAdmin = false;
      if (session?.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        isAdmin = !!data?.some((r) => r.role === "admin");
      }
      setState({ user: session?.user ?? null, session, isAdmin, loading: false });
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => load(session), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
