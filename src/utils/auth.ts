// Dashboard access control.
//
// IMPORTANT — read this: this app has no backend/server, so this is a
// client-side deterrent, not real security. Anyone who opens the browser
// dev tools and reads the built JS can technically find this hash and
// brute-force weak passwords offline. It stops casual snooping (a teacher,
// a student, someone glancing at your phone) but it is NOT a substitute for
// real authentication. When you're ready to go live for real, move this
// check to a backend (e.g. Firebase Auth) so the password never ships to
// the browser at all — happy to wire that up when you are.
//
// TO CHANGE THE PASSWORD: run this in any browser console (or Node):
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourNewPassword'))
//     .then(buf => console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')))
// then paste the resulting 64-character hex string below.

const DASHBOARD_PASSWORD_HASH = "552531aad9163057725f280386580d91a6616eb505b337a2695e2ac1f5aa3583";
// Default password is: PMPoshan@EKH2026  — change it before real use.

const SESSION_KEY = 'pm_poshan_admin_unlocked_v1';

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkDashboardPassword(input: string): Promise<boolean> {
  if (!input) return false;
  const hash = await sha256Hex(input);
  return hash === DASHBOARD_PASSWORD_HASH;
}

export function isDashboardUnlocked(): boolean {
  return typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function unlockDashboard() {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function lockDashboard() {
  sessionStorage.removeItem(SESSION_KEY);
}
