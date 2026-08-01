import React, { useState, useEffect } from 'react';
import { ClipboardCheck, LayoutDashboard, Plus, LogOut } from 'lucide-react';
import { AppRole } from '../utils/supabaseAuth';
import pmPoshanLogo from '../assets/images/pm_poshan_logo.png';

interface HeaderProps {
  activeTab: 'inspection' | 'dashboard';
  setActiveTab: (tab: 'inspection' | 'dashboard') => void;
  role: AppRole;
  onLogout: () => void;
}

export function Header({ activeTab, setActiveTab, role, onLogout }: HeaderProps) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const c = {
    ink: "#111827",
    forest: "#0F4C3A",
    forestHover: "#0B3C2E",
    surface: "#FFFFFF",
    cardBg: "#F1F5F3",
    line: "#E2E8F0",
    textSecondary: "#4B5563",
    mint: "#E8F5E9",
    mintDark: "#1B5E20",
  };

  return (
    <header style={{
      background: c.surface,
      borderBottom: `1px solid ${c.line}`,
      padding: isMobile ? "12px 14px" : "0 28px",
      minHeight: isMobile ? "auto" : 68,
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "stretch" : "center",
      justifyContent: "space-between",
      gap: isMobile ? 10 : 16,
      position: "sticky",
      top: 0,
      zIndex: 50,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      boxSizing: "border-box",
      width: "100%"
    }}>
      {/* Brand & Top Info */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: isMobile ? 36 : 40,
            height: isMobile ? 36 : 40,
            borderRadius: 10,
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 10px rgba(15,76,58,0.15)",
            flexShrink: 0,
            overflow: "hidden",
            padding: 4,
            boxSizing: "border-box"
          }}>
            <img src={pmPoshanLogo} alt="PM POSHAN" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
                PM POSHAN <span style={{ color: c.forest, fontWeight: 600 }}>Audit</span>
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                background: c.mint,
                color: c.mintDark,
                border: `1px solid #C8E6C9`,
                padding: "1px 6px",
                borderRadius: 5,
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                Meghalaya
              </span>
            </div>
            {!isMobile && (
              <p style={{ fontSize: 11, color: c.textSecondary, margin: "2px 0 0 0", fontWeight: 500 }}>
                East Khasi Hills • School Mid-Day Meal Audit Portal
              </p>
            )}
          </div>
        </div>

        {/* Right Quick Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {role !== 'admin' && activeTab !== 'inspection' && (
            <button
              onClick={() => setActiveTab('inspection')}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: isMobile ? "5px 10px" : "9px 18px",
                background: c.forest,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: isMobile ? 12 : 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(15,76,58,0.22)",
                whiteSpace: "nowrap"
              }}
            >
              <Plus size={isMobile ? 14 : 16} />
              <span>Form</span>
            </button>
          )}
          <button
            onClick={onLogout}
            title={role === 'admin' ? 'Log out (admin)' : 'Log out (officer)'}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: isMobile ? "5px 8px" : "9px 14px",
              background: "transparent",
              color: c.textSecondary,
              border: `1px solid ${c.line}`,
              borderRadius: 8,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <LogOut size={isMobile ? 14 : 15} />
            {!isMobile && <span>Log out</span>}
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Full Width on Mobile, Centered on Desktop) */}
      <div style={{
        display: "flex",
        gap: 4,
        background: c.cardBg,
        padding: 4,
        borderRadius: 10,
        border: `1px solid ${c.line}`,
        width: isMobile ? "100%" : "auto",
        boxSizing: "border-box"
      }}>
        {[
          ...(role === 'admin' ? [] : [{ id: "inspection", label: isMobile ? "Inspect" : "Inspect Form", icon: ClipboardCheck }]),
          ...(role === 'admin' ? [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] : [])
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: isMobile ? 1 : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? 5 : 8,
                padding: isMobile ? "8px 4px" : "8px 18px",
                borderRadius: 8,
                cursor: "pointer",
                background: isActive ? c.forest : "transparent",
                border: "none",
                color: isActive ? "#FFFFFF" : c.textSecondary,
                fontWeight: isActive ? 700 : 600,
                fontSize: isMobile ? 12 : 13,
                transition: "all 0.18s ease",
                boxShadow: isActive ? "0 2px 8px rgba(15,76,58,0.22)" : "none",
                textAlign: "center",
                whiteSpace: "nowrap"
              }}
            >
              <tab.icon size={isMobile ? 14 : 15} color={isActive ? "#FFFFFF" : c.textSecondary} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
