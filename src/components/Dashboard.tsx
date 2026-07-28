import React, { useState, useEffect } from 'react';
import {
  Utensils, Users, ClipboardCheck, AlertCircle, TrendingUp, Download,
  Filter, Search, MapPin, CheckCircle2, X, Calendar, Trash2,
  Building2, Camera, ArrowUpRight, ShieldCheck, FolderDown, LogOut, LayoutGrid
} from 'lucide-react';
import { InspectionRecord, BlockName } from '../types';
import { INITIAL_BLOCKS } from '../data/mockData';
import { exportInspectionsCSV, clearAllData, downloadInspectionPhoto, exportPhotosZip } from '../utils/storage';
import { isDashboardUnlocked, lockDashboard } from '../utils/auth';
import { PasswordGate } from './PasswordGate';
import { SchoolDirectory } from './SchoolDirectory';

import pmPoshanBanner from "../assets/images/poshan_minimal_hero_1785183621105.jpg";

const c = {
  ink: "#111827",
  forest: "#0F4C3A",
  forestSoft: "rgba(15, 76, 58, 0.08)",
  olive: "#4B5563",
  mint: "#E8F5E9",
  mintDark: "#1B5E20",
  paper: "#F8FAF8",
  surface: "#FFFFFF",
  line: "#E2E8F0",
  textSecondary: "#4B5563",
  textFaint: "#9CA3AF",
  terracotta: "#DC2626",
  terracottaSoft: "#FEE2E2",
  gold: "#D97706",
};

const shadows = {
  sm: "0 1px 3px rgba(0,0,0,0.05)",
  md: "0 4px 14px rgba(0,0,0,0.06)",
};

interface DashboardProps {
  inspections: InspectionRecord[];
  onNewInspectionRequested: () => void;
}

export function Dashboard({ inspections, onNewInspectionRequested }: DashboardProps) {
  const [unlocked, setUnlocked] = useState(() => isDashboardUnlocked());
  const [dashboardView, setDashboardView] = useState<'overview' | 'schools'>('overview');
  const [selectedBlock, setSelectedBlock] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionRecord | null>(null);
  const [exportingZip, setExportingZip] = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Compute live KPIs
  const totalInspections = inspections.length;
  const mealsServedCount = inspections.filter(i => i.mealServed === 'yes').length;
  const missedMealsCount = inspections.filter(i => i.mealServed === 'no').length;
  const totalStudentsServed = inspections
    .filter(i => i.mealServed === 'yes')
    .reduce((acc, curr) => acc + (curr.studentCount || 0), 0);

  const complianceRate = totalInspections > 0
    ? Math.round((mealsServedCount / totalInspections) * 100)
    : 100;

  // Filter inspections
  const filteredInspections = inspections.filter(i => {
    const matchesBlock = selectedBlock === "All" || i.block === selectedBlock;
    const matchesStatus = statusFilter === "All"
      || (statusFilter === "Served" && i.mealServed === 'yes')
      || (statusFilter === "Missed" && i.mealServed === 'no');
    const matchesSearch = searchQuery === ""
      || i.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
      || i.block.toLowerCase().includes(searchQuery.toLowerCase())
      || (i.remarks && i.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesBlock && matchesStatus && matchesSearch;
  });

  // Calculate block compliance breakdown from real inspection data only
  const blockStats = INITIAL_BLOCKS.map(blockName => {
    const blockInspections = inspections.filter(i => i.block === blockName);
    const served = blockInspections.filter(i => i.mealServed === 'yes').length;
    const rate = blockInspections.length > 0
      ? Math.round((served / blockInspections.length) * 100)
      : null;

    return {
      name: blockName,
      total: blockInspections.length,
      served,
      rate
    };
  });

  return (
    <div className="fade-in" style={{ padding: isMobile ? "16px 12px" : "32px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      
      {/* Header Bar */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "stretch" : "center",
        gap: 14,
        marginBottom: isMobile ? 20 : 28
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>
            PM Poshan Monitoring Dashboard
          </h1>
          <p style={{ fontSize: isMobile ? 12 : 14, color: c.textSecondary, margin: 0, lineHeight: 1.4 }}>
            Real-time inspection coverage and meal compliance analytics for East Khasi Hills district.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
          <button
            onClick={() => exportInspectionsCSV(inspections)}
            style={{
              flex: isMobile ? 1 : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: isMobile ? "10px 12px" : "10px 16px",
              background: c.surface,
              border: `1px solid ${c.line}`,
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: shadows.sm,
              color: c.ink,
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: "nowrap"
            }}
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            onClick={async () => {
              setExportingZip(true);
              try {
                await exportPhotosZip(inspections);
              } finally {
                setExportingZip(false);
              }
            }}
            disabled={exportingZip}
            style={{
              flex: isMobile ? 1 : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: isMobile ? "10px 12px" : "10px 16px",
              background: c.forest,
              border: "none",
              borderRadius: 10,
              cursor: exportingZip ? "wait" : "pointer",
              boxShadow: shadows.sm,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: "nowrap"
            }}
          >
            <FolderDown size={15} /> {exportingZip ? "Zipping..." : "Export Photos"}
          </button>

          <button
            onClick={() => clearAllData()}
            title="Clear all data"
            style={{
              padding: "10px 14px",
              background: c.paper,
              border: `1px solid ${c.line}`,
              borderRadius: 10,
              cursor: "pointer",
              color: c.terracotta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Trash2 size={15} />
          </button>

          <button
            onClick={() => { lockDashboard(); setUnlocked(false); }}
            title="Lock dashboard"
            style={{
              padding: "10px 14px",
              background: c.paper,
              border: `1px solid ${c.line}`,
              borderRadius: 10,
              cursor: "pointer",
              color: c.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Overview / School Directory Sub-Tabs */}
      <div style={{
        display: "inline-flex",
        gap: 4,
        background: c.surface,
        padding: 4,
        borderRadius: 10,
        border: `1px solid ${c.line}`,
        marginBottom: isMobile ? 20 : 28,
        boxShadow: shadows.sm
      }}>
        {[
          { id: "overview", label: "Overview", icon: LayoutGrid },
          { id: "schools", label: "School Directory", icon: Building2 }
        ].map(tab => {
          const isActive = dashboardView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setDashboardView(tab.id as 'overview' | 'schools')}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                background: isActive ? c.forest : "transparent",
                border: "none",
                color: isActive ? "#FFFFFF" : c.textSecondary,
                fontWeight: isActive ? 700 : 600,
                fontSize: 13
              }}
            >
              <tab.icon size={14} color={isActive ? "#FFFFFF" : c.textSecondary} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {dashboardView === 'schools' ? (
        <SchoolDirectory onInspectSchool={() => onNewInspectionRequested()} />
      ) : (
      <>
      {/* KPI Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(220px, 1fr))",
        gap: isMobile ? 10 : 16,
        marginBottom: isMobile ? 20 : 28
      }}>
        <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 14 : 20, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: c.mint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Utensils size={isMobile ? 17 : 20} color={c.forest} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, background: c.mint, padding: "2px 6px", borderRadius: 20 }}>
              <TrendingUp size={11} color={c.forest} />
              <span style={{ fontSize: 10, fontWeight: 700, color: c.forest }}>{complianceRate}%</span>
            </div>
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Total Students Served</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
            {totalStudentsServed.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>Across all logged inspections</div>
        </div>

        <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 14 : 20, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: "rgba(124,135,112,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardCheck size={isMobile ? 17 : 20} color={c.olive} />
            </div>
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Inspections Logged</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
            {totalInspections}
          </div>
          <div style={{ fontSize: 10, color: c.forest, marginTop: 2, fontWeight: 600 }}>
            {mealsServedCount} Served • {missedMealsCount} Missed
          </div>
        </div>

        <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 14 : 20, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: c.terracottaSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={isMobile ? 17 : 20} color={c.terracotta} />
            </div>
            {missedMealsCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, background: c.terracotta, color: "#fff", padding: "2px 6px", borderRadius: 12 }}>
                Alert
              </span>
            )}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Quality & Missed</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: missedMealsCount > 0 ? c.terracotta : c.ink, letterSpacing: "-0.02em" }}>
            {missedMealsCount}
          </div>
          <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>Supply or cook delays</div>
        </div>

        <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 14 : 20, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: "rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={isMobile ? 17 : 20} color={c.gold} />
            </div>
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Blocks Monitored</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
            6 / 6
          </div>
          <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>East Khasi Hills</div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
        gap: isMobile ? 14 : 20,
        marginBottom: isMobile ? 20 : 32
      }}>

        {/* Block Performance Bars */}
        <div style={{ background: c.surface, padding: isMobile ? 16 : 24, borderRadius: 18, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: c.ink, margin: 0 }}>Block Meal Compliance</h3>
              <p style={{ fontSize: 12, color: c.textSecondary, margin: 0 }}>Active coverage percentage</p>
            </div>
            <Building2 size={18} color={c.forest} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {blockStats.map((block) => (
              <div key={block.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: c.ink }}>{block.name} Block</span>
                  <span style={{ color: block.rate === null ? c.textFaint : c.forest, fontWeight: 700 }}>
                    {block.rate === null ? "No inspections yet" : `${block.rate}% compliance (${block.total} logged)`}
                  </span>
                </div>
                <div style={{ width: "100%", height: 8, background: c.mint, borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: block.rate === null ? "0%" : `${block.rate}%`,
                      height: "100%",
                      background: block.rate === null ? c.line : block.rate >= 90 ? c.forest : block.rate >= 75 ? c.gold : c.terracotta,
                      borderRadius: 4,
                      transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Inspection Prompt Card */}
        <div style={{
          background: "linear-gradient(135deg, #0F4C3A 0%, #082C22 100%)",
          border: "1px solid #082C22",
          padding: isMobile ? 18 : 24,
          borderRadius: 18,
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 6px 20px rgba(15,76,58,0.22)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14
            }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255, 255, 255, 0.18)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#FFFFFF",
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em"
              }}>
                <CheckCircle2 size={12} color="#FFFFFF" /> PM Poshan Inspector
              </div>

              <div style={{
                width: 48,
                height: 38,
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>
                <img src={pmPoshanBanner} alt="Kitchen illustration" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </div>

            <h3 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
              Conduct a New Mid-Day Meal Audit
            </h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45, marginBottom: 16 }}>
              Log food preparation, take photo evidence, record student headcount, and report supply issues directly.
            </p>
          </div>

          <button
            onClick={onNewInspectionRequested}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#FFFFFF",
              color: "#0F4C3A",
              border: "none",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: shadows.sm,
              width: "100%"
            }}
          >
            Launch Form <ArrowUpRight size={16} />
          </button>
        </div>

      </div>

      {/* Filter & Search Bar for Inspections Log */}
      <div style={{
        background: c.surface,
        borderRadius: 18,
        padding: isMobile ? 16 : 24,
        border: `1px solid ${c.line}`,
        boxShadow: shadows.sm,
        marginBottom: 24
      }}>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: 14,
          marginBottom: 16
        }}>
          <div>
            <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: c.ink, margin: 0 }}>Official Inspection Logs</h3>
            <p style={{ fontSize: 12, color: c.textSecondary, margin: "2px 0 0 0" }}>
              Showing {filteredInspections.length} of {inspections.length} total entries
            </p>
          </div>

          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 10,
            alignItems: isMobile ? "stretch" : "center",
            width: isMobile ? "100%" : "auto"
          }}>
            {/* Search Input */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: c.paper,
              padding: "9px 12px",
              borderRadius: 10,
              border: `1px solid ${c.line}`,
              width: isMobile ? "100%" : 220,
              boxSizing: "border-box"
            }}>
              <Search size={15} color={c.textFaint} />
              <input
                type="text"
                placeholder="Search school or remark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", color: c.ink }}
              />
            </div>

            {/* Block Filter */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: c.paper,
              padding: "9px 12px",
              borderRadius: 10,
              border: `1px solid ${c.line}`,
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box"
            }}>
              <Filter size={14} color={c.forest} />
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                style={{ border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: c.ink, outline: "none", cursor: "pointer", width: "100%" }}
              >
                <option value="All" style={{ background: "#FFFFFF", color: "#111827" }}>All Blocks</option>
                {INITIAL_BLOCKS.map(b => <option key={b} value={b} style={{ background: "#FFFFFF", color: "#111827" }}>{b}</option>)}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{
              display: "flex",
              gap: 4,
              background: c.paper,
              padding: 4,
              borderRadius: 10,
              border: `1px solid ${c.line}`,
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box"
            }}>
              {["All", "Served", "Missed"].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    flex: isMobile ? 1 : "none",
                    padding: "6px 12px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: statusFilter === st ? c.surface : "transparent",
                    color: statusFilter === st ? c.forest : c.textSecondary,
                    boxShadow: statusFilter === st ? shadows.sm : "none",
                    textAlign: "center"
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inspections Table / Cards */}
        {filteredInspections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: c.textSecondary }}>
            <ClipboardCheck size={36} color={c.textFaint} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: c.ink, margin: 0 }}>No inspection records match your filters.</p>
            <p style={{ fontSize: 12, color: c.textFaint, marginTop: 4 }}>Try adjusting search terms or clearing block filter.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredInspections.map((insp) => (
              <div
                key={insp.id}
                style={{
                  background: c.paper,
                  borderRadius: 14,
                  padding: isMobile ? "12px 14px" : "16px 20px",
                  border: `1px solid ${c.line}`,
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  gap: isMobile ? 10 : 16
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%" }}>
                  <div style={{
                    width: isMobile ? 36 : 42,
                    height: isMobile ? 36 : 42,
                    borderRadius: 10,
                    background: insp.mealServed === 'yes' ? c.mint : c.terracottaSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {insp.mealServed === 'yes' ? <CheckCircle2 size={isMobile ? 18 : 22} color={c.forest} /> : <X size={isMobile ? 18 : 22} color={c.terracotta} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: c.ink, wordBreak: "break-word" }}>{insp.schoolName}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, background: c.surface, color: c.forest, padding: "2px 6px", borderRadius: 4, border: `1px solid ${c.line}` }}>
                        {insp.schoolCategory}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: c.textSecondary, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{insp.block} Block</span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={11} /> {new Date(insp.timestamp).toLocaleDateString()} {new Date(insp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Headcount */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: isMobile ? "100%" : "auto",
                  borderTop: isMobile ? `1px solid ${c.line}` : "none",
                  paddingTop: isMobile ? 8 : 0,
                  gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: c.textFaint, fontWeight: 500 }}>Meal Status</div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: insp.mealServed === 'yes' ? c.forest : c.terracotta
                    }}>
                      {insp.mealServed === 'yes' ? `${insp.studentCount} Served` : `Missed (${insp.issueCategory || 'Supply'})`}
                    </div>
                  </div>

                  {insp.photoUrl && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setSelectedPhoto(insp)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "5px 10px",
                          borderRadius: 8,
                          background: c.surface,
                          border: `1px solid ${c.line}`,
                          fontSize: 11,
                          fontWeight: 600,
                          color: c.forest,
                          cursor: "pointer"
                        }}
                      >
                        <Camera size={13} /> Photo
                      </button>
                      <button
                        onClick={() => downloadInspectionPhoto(insp).catch(e => console.error(e))}
                        title="Download this photo"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "5px 10px",
                          borderRadius: 8,
                          background: c.surface,
                          border: `1px solid ${c.line}`,
                          fontSize: 11,
                          fontWeight: 600,
                          color: c.textSecondary,
                          cursor: "pointer"
                        }}
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16
        }}>
          <div style={{ position: "relative", maxWidth: 600, width: "100%", background: "#FFFFFF", border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden", boxShadow: shadows.md }}>
            <img src={selectedPhoto.photoUrl} alt="Inspection proof" style={{ width: "100%", height: "auto", display: "block" }} />
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${c.line}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>{selectedPhoto.schoolName}</div>
                <div style={{ fontSize: 11, color: c.textSecondary }}>{selectedPhoto.block} Block • {new Date(selectedPhoto.timestamp).toLocaleDateString()}</div>
              </div>
              <button
                onClick={() => downloadInspectionPhoto(selectedPhoto).catch(e => console.error(e))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: c.forest,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  cursor: "pointer"
                }}
              >
                <Download size={14} /> Download
              </button>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
