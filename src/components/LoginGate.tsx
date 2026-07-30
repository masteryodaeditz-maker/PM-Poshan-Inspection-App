import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import { signInOfficer, signInAdmin } from '../utils/supabaseAuth';

const c = {
  ink: "#111827",
  forest: "#0F4C3A",
  mint: "#E8F5E9",
  mintDark: "#1B5E20",
  paper: "#F8FAF8",
  surface: "#FFFFFF",
  line: "#E2E8F0",
  textSecondary: "#4B5563",
  terracotta: "#DC2626",
  terracottaSoft: "#FEE2E2",
};

interface LoginGateProps {
  onSignedIn: () => void;
}

export function LoginGate({ onSignedIn }: LoginGateProps) {
  const [role, setRole] = useState<'officer' | 'admin'>('officer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || checking) return;
    if (role === 'admin' && !email) return;
    setChecking(true);
    setError(null);

    const { error: authError } =
      role === 'officer' ? await signInOfficer(password) : await signInAdmin(email, password);

    setChecking(false);
    if (!authError) {
      onSignedIn();
    } else {
      setError('Incorrect password. Please try again.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 420);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: c.paper
    }}>
      <style>{`
        @keyframes shakeX { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }
        .shake { animation: shakeX 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      <form
        onSubmit={handleSubmit}
        className={shake ? "shake" : ""}
        style={{
          width: "100%",
          maxWidth: 400,
          background: c.surface,
          borderRadius: 24,
          padding: 36,
          border: `1px solid ${c.line}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center"
        }}
      >
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0F4C3A 0%, #082C22 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          boxShadow: "0 6px 18px rgba(15,76,58,0.25)"
        }}>
          <Lock size={28} color="#FFFFFF" />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: c.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
          PM Poshan Audit Portal
        </h2>
        <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 20, lineHeight: 1.5 }}>
          Sign in to continue. Officers can submit inspections; admins get full dashboard access.
        </p>

        {/* Role toggle */}
        <div style={{
          display: "flex",
          gap: 4,
          background: c.mint,
          padding: 4,
          borderRadius: 10,
          width: "100%",
          marginBottom: 20,
          boxSizing: "border-box"
        }}>
          {[
            { id: 'officer', label: 'Officer', icon: ClipboardCheck },
            { id: 'admin', label: 'Admin', icon: LayoutDashboard },
          ].map(opt => {
            const isActive = role === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setRole(opt.id as 'officer' | 'admin'); setError(null); }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "9px 4px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isActive ? c.forest : "transparent",
                  border: "none",
                  color: isActive ? "#FFFFFF" : c.mintDark,
                  fontWeight: 700,
                  fontSize: 13
                }}
              >
                <opt.icon size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {role === 'admin' && (
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="Admin email"
            autoComplete="username"
            style={{
              width: "100%",
              border: `1.5px solid ${c.line}`,
              borderRadius: 14,
              background: c.paper,
              padding: "12px 14px",
              marginBottom: 12,
              fontSize: 14,
              fontWeight: 600,
              color: c.ink,
              boxSizing: "border-box",
              outline: "none"
            }}
          />
        )}

        <div style={{
          width: "100%",
          position: "relative",
          border: error ? `1.5px solid ${c.terracotta}` : `1.5px solid ${c.line}`,
          borderRadius: 14,
          background: c.paper,
          display: "flex",
          alignItems: "center",
          padding: "12px 14px",
          marginBottom: error ? 8 : 20,
          boxSizing: "border-box"
        }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            placeholder={role === 'officer' ? 'Officer password' : 'Admin password'}
            autoComplete="current-password"
            autoFocus
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              fontWeight: 600,
              color: c.ink
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", padding: 2 }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} color={c.textSecondary} /> : <Eye size={17} color={c.textSecondary} />}
          </button>
        </div>

        {error && (
          <div style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: c.terracottaSoft,
            color: c.terracotta,
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 10px",
            borderRadius: 8,
            marginBottom: 16,
            boxSizing: "border-box"
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!password || checking || (role === 'admin' && !email)}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            background: (!password || checking || (role === 'admin' && !email)) ? c.line : c.forest,
            color: (!password || checking || (role === 'admin' && !email)) ? c.textSecondary : "#FFFFFF",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            cursor: (!password || checking) ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: (!password || checking) ? "none" : "0 4px 12px rgba(15,76,58,0.2)",
            transition: "all 0.2s ease"
          }}
        >
          <ShieldCheck size={17} />
          {checking ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
