import React, { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { Header } from "./components/Header";
import { InspectionFlow } from "./components/InspectionFlow";
import { Dashboard } from "./components/Dashboard";
import { LoginGate } from "./components/LoginGate";
import { InspectionRecord } from "./types";
import { getInspections, saveInspection } from "./utils/storage";
import { AppRole, getCurrentRole, onAuthChange, signOut } from "./utils/supabaseAuth";
import { useSessionTimeout, clearActivity } from "./utils/sessionTimeout";

import bgVeggiesArt from "./assets/images/poshan_bg_veggies_art_1785184273778.jpg";
import bgThaliArt from "./assets/images/poshan_bg_thali_art_1785184288690.jpg";

export default function App() {
  const [activeTab, setActiveTab] = useState<'inspection' | 'dashboard'>('inspection');
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(true);
  const [inspectionsError, setInspectionsError] = useState<string | null>(null);

  // Auth state — nothing renders (and no data is fetched) until this resolves.
  const [role, setRole] = useState<AppRole>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const reloadInspections = () => {
    setInspectionsLoading(true);
    setInspectionsError(null);
    getInspections()
      .then(setInspections)
      .catch((e) => { console.error('Could not load inspections', e); setInspectionsError('Could not load inspections. Please check your connection and try again.'); })
      .finally(() => setInspectionsLoading(false));
  };

  // Resolve auth state first. Only fetch inspection data for admins — officers
  // never need the list, and holding off avoids pulling it into the browser
  // for anyone who isn't actually authorized to see it.
  useEffect(() => {
    getCurrentRole().then((r) => {
      setRole(r);
      setAuthChecked(true);
      // Admins have no inspection form in their nav, so they should land on
      // the dashboard rather than a tab they can no longer reach.
      if (r === 'admin') setActiveTab('dashboard');
    });
    const unsubscribe = onAuthChange((r) => {
      setRole(r);
      setAuthChecked(true);
      if (r === 'admin') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('inspection');
        setInspections([]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      reloadInspections();
    }
  }, [role]);

  const handleSaveInspection = async (recordData: Omit<InspectionRecord, 'id' | 'timestamp'>) => {
    const saved = await saveInspection(recordData);
    setInspections(prev => [saved, ...prev]);
  };

  const handleLogout = useCallback(async () => {
    await signOut();
    clearActivity();
    setRole(null);
  }, []);

  // Signs out after a stretch of inactivity, warning the person first. The
  // hook also persists activity to localStorage, so it catches sessions that
  // went stale while the app/tab was closed, not just while it's open.
  const { showWarning, secondsLeft, stayLoggedIn } = useSessionTimeout(!!role, handleLogout);

  // Nothing renders until we know whether there's a session.
  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAF8", color: "#4B5563", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13 }}>
        Loading...
      </div>
    );
  }

  if (!role) {
    return <LoginGate onSignedIn={() => { /* onAuthChange listener updates role */ }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAF8", color: "#111827", fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", position: "relative", overflow: "hidden" }}>
      
      {/* Minimalist Background Watermark Art */}
      <div
        style={{
          position: "fixed",
          top: -20,
          right: -20,
          width: 440,
          height: 440,
          backgroundImage: `url(${bgVeggiesArt})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          opacity: 0.22,
          mixBlendMode: "multiply",
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: "50%"
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: -20,
          left: -20,
          width: 400,
          height: 400,
          backgroundImage: `url(${bgThaliArt})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          opacity: 0.22,
          mixBlendMode: "multiply",
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: "50%"
        }}
      />

      {/* Global CSS for transitions and keyframe animations */}
      <style>{`
        * { box-sizing: border-box; }
        @keyframes stepIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes ringExpand { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes driftA { 0% { transform: rotate(0deg) translate(0px, 0px); } 50% { transform: rotate(10deg) translate(20px, 20px); } 100% { transform: rotate(0deg) translate(0px, 0px); } }
        @keyframes driftB { 0% { transform: rotate(0deg) translate(0px, 0px); } 50% { transform: rotate(-5deg) translate(-15px, -15px); } 100% { transform: rotate(0deg) translate(0px, 0px); } }
        @keyframes breatheSlow { 0%, 100% { transform: scale(1) translate(0px, 0px) rotate(0deg); } 50% { transform: scale(1.06) translate(-8px, -6px) rotate(2deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .spin { animation: spin 0.9s linear infinite; }
        .step-in { animation: stepIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-in { animation: fadeIn 0.35s ease both; }
        .pop { animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .ring { animation: ringExpand 1.5s ease-out infinite; }
        .backdrop-layer { position: absolute; inset: 0; transition: opacity 0.6s ease; pointer-events: none; overflow: hidden; }
        .hover-scale { transition: transform 0.15s ease; }
        .hover-scale:active { transform: scale(0.97); }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main>
        {activeTab === 'inspection' && (
          <InspectionFlow
            onSave={handleSaveInspection}
          />
        )}

        {activeTab === 'dashboard' && role === 'admin' && (
          <>
            {inspectionsLoading && !inspectionsError && (
              <div style={{ margin: "16px auto 0", maxWidth: 1200, padding: "0 20px", fontSize: 13, color: "#4B5563", position: "relative", zIndex: 1 }}>
                Loading inspections from the shared database...
              </div>
            )}
            {inspectionsError && (
              <div style={{
                margin: "16px auto 0", maxWidth: 1200, padding: "12px 20px",
                background: "#FEE2E2", color: "#DC2626", borderRadius: 10,
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 12, position: "relative", zIndex: 1
              }}>
                <span>Could not load inspections from the shared database: {inspectionsError}</span>
                <button
                  onClick={reloadInspections}
                  style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  Retry
                </button>
              </div>
            )}
            <Dashboard
              inspections={inspections}
              onNewInspectionRequested={() => setActiveTab('inspection')}
              onDataChanged={reloadInspections}
            />
          </>
        )}
      </main>

      {/* Inactivity warning — appears a couple of minutes before auto-logout */}
      {showWarning && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(17,24,39,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, zIndex: 1000
          }}
        >
          <div
            className="pop"
            style={{
              width: "100%", maxWidth: 380, background: "#FFFFFF", borderRadius: 20,
              padding: 28, textAlign: "center", boxShadow: "0 20px 48px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#FEF3C7",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px"
            }}>
              <Clock size={26} color="#D97706" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
              Still there?
            </h3>
            <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.5, margin: "0 0 22px" }}>
              You've been inactive for a while. For security, you'll be signed out in{" "}
              <strong>{secondsLeft}s</strong> unless you stay logged in.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #E2E8F0",
                  background: "#FFFFFF", color: "#4B5563", fontWeight: 700, fontSize: 13, cursor: "pointer"
                }}
              >
                Log Out Now
              </button>
              <button
                type="button"
                onClick={stayLoggedIn}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: "none",
                  background: "#0F4C3A", color: "#FFFFFF", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(15,76,58,0.25)"
                }}
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
