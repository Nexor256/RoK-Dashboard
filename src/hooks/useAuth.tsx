import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  governorId: string | null;
  isAdmin: boolean;
  isR4: boolean;
  isPrivileged: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  governorId: null,
  isAdmin: false,
  isR4: false,
  isPrivileged: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isR4, setIsR4] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string, userEmail?: string, userMeta?: any) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    let profileData = profileRes.data as Profile | null;

    // Auto-create profile if it doesn't exist
    if (!profileData) {
      const displayName = userMeta?.display_name || userMeta?.full_name || userMeta?.name || userEmail?.split("@")[0] || "User";
      const avatarUrl = userMeta?.avatar_url || null;
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ user_id: userId, display_name: displayName, avatar_url: avatarUrl })
        .select()
        .single();
      profileData = (newProfile as Profile) || null;
    }

    setProfile(profileData);

    const roles = (rolesRes.data || []).map((r: { role: string }) => r.role);
    setIsAdmin(roles.includes("admin"));
    setIsR4(roles.includes("r4"));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          fetchProfileAndRole(session.user.id, session.user.email, session.user.user_metadata);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsR4(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfileAndRole(session.user.id, session.user.email, session.user.user_metadata);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, governorId: session?.user?.email?.split("@")[0] ?? null, isAdmin, isR4, isPrivileged: isAdmin || isR4, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
