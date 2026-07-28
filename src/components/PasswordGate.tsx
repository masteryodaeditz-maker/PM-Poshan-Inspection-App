import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { checkDashboardPassword, unlockDashboard } from '../utils/auth';

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

interface PasswordGateProps {
  onUnlock: () => void;
}

export function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || checking) return;
    setChecking(true);
    setError(false);
    const ok = await checkDashboardPassword(password);
    setChecking(false);
    if (ok) {
      unlockDashboard();
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 420);
    }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)",
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
          Restricted Access
        </h2>
        <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
          The Dashboard and School Directory are only visible to authorized PM Poshan program staff. Enter the access password to continue.
        </p>

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
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Enter password"
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
            Incorrect password. Please try again.
          </div>
        )}

        <button
          type="submit"
          disabled={!password || checking}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            background: !password || checking ? c.line : c.forest,
            color: !password || checking ? c.textSecondary : "#FFFFFF",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            cursor: !password || checking ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: !password || checking ? "none" : "0 4px 12px rgba(15,76,58,0.2)",
            transition: "all 0.2s ease"
          }}
        >
          <ShieldCheck size={17} />
          {checking ? "Verifying..." : "Unlock Dashboard"}
        </button>
      </form>
    </div>
  );
}
