import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { InspectionFlow } from "./components/InspectionFlow";
import { Dashboard } from "./components/Dashboard";
import { InspectionRecord } from "./types";
import { getInspections, saveInspection } from "./utils/storage";

import bgVeggiesArt from "./assets/images/poshan_bg_veggies_art_1785184273778.jpg";
import bgThaliArt from "./assets/images/poshan_bg_thali_art_1785184288690.jpg";

export default function App() {
  const [activeTab, setActiveTab] = useState<'inspection' | 'dashboard'>('inspection');
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(true);
  const [inspectionsError, setInspectionsError] = useState<string | null>(null);

  const reloadInspections = () => {
    setInspectionsLoading(true);
    setInspectionsError(null);
    getInspections()
      .then(setInspections)
      .catch((e) => setInspectionsError(e.message || 'Could not load inspections'))
      .finally(() => setInspectionsLoading(false));
  };

  // Load inspections on initial mount
  useEffect(() => {
    reloadInspections();
  }, []);

  const handleSaveInspection = async (recordData: Omit<InspectionRecord, 'id' | 'timestamp'>) => {
    const saved = await saveInspection(recordData);
    setInspections(prev => [saved, ...prev]);
  };

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
      />

      {/* Main Content Area */}
      <main>
        {activeTab === 'inspection' && (
          <InspectionFlow
            onSave={handleSaveInspection}
            onDoneViewDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'dashboard' && (
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

    </div>
  );
}
