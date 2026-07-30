// Real authentication, backed by Supabase Auth. Replaces the old client-side
// SHA-256 hash gate — the browser never holds a password check that can be
// lifted from the JS bundle; every login goes to Supabase and comes back with
// a signed session token that Postgres itself verifies via RLS.
//
// Two fixed accounts exist (see SECURITY_SETUP.md for how to create/change them
// in the Supabase dashboard):
//   - Officer: shared login, can only submit inspections
//   - Admin:   masteryodaeditz@gmail.com, full dashboard + delete access
//
// There is no public sign-up flow. Officers all share one Supabase Auth user
// under the hood (a fixed internal email) — that's a deliberate simplicity
// tradeoff, not a per-person audit trail. If you later want to know *which*
// officer submitted what, that needs individual accounts (a bigger change).

import { supabase } from './supabaseClient';

export type AppRole = 'officer' | 'admin' | null;

// Fixed internal email the shared officer password maps to. Officers never see
// this — the login screen just asks for a role + password.
const OFFICER_EMAIL = 'officer@pmposhan.internal';

export async function signInOfficer(password: string) {
  return supabase.auth.signInWithPassword({ email: OFFICER_EMAIL, password });
}

export async function signInAdmin(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentRole(): Promise<AppRole> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as AppRole;
}

export function onAuthChange(callback: (role: AppRole) => void) {
  const { data: listener } = supabase.auth.onAuthStateChange(async (_event, _session) => {
    const role = await getCurrentRole();
    callback(role);
  });
  return () => listener.subscription.unsubscribe();
}
