import React, { useState, useEffect } from 'react';
import {
  Utensils, Users, ClipboardCheck, AlertCircle, TrendingUp, Download,
  Filter, Search, MapPin, CheckCircle2, X, Calendar, Trash2,
  Building2, Camera, ArrowUpRight, ShieldCheck, FolderDown, LayoutGrid,
  UserCheck, AlertTriangle, BarChart3
} from 'lucide-react';
import { InspectionRecord, BlockName, ExportLogEntry, ExportType } from '../types';
import { INITIAL_BLOCKS } from '../data/mockData';
import { exportInspectionsCSV, clearAllData, clearPhotosInRange, clearDataInRange, downloadInspectionPhoto, exportPhotosZip, getExportLog } from '../utils/storage';
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
  onDataChanged: () => void;
}

export function Dashboard({ inspections, onNewInspectionRequested, onDataChanged }: DashboardProps) {
  const [dashboardView, setDashboardView] = useState<'overview' | 'schools'>('overview');
  const [selectedBlock, setSelectedBlock] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionRecord | null>(null);
  const [exportingZip, setExportingZip] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | '12m' | 'all' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [exportLog, setExportLog] = useState<ExportLogEntry[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearMode, setClearMode] = useState<'photos' | 'all'>('photos');
  const [clearStart, setClearStart] = useState<string>('');
  const [clearEnd, setClearEnd] = useState<string>('');
  const [clearing, setClearing] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    getExportLog().then(setExportLog).catch((e) => console.error('Error loading export log', e));
  }, []);

  // ---- Period filter (dashboard-wide) ----
  const PERIOD_LABELS: Record<typeof periodFilter, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '12m': 'Last 12 Months',
    'all': 'All Time',
    'custom': 'Custom Range',
  };
  const periodStartDate: Date | null = (() => {
    if (periodFilter === 'all') return null;
    if (periodFilter === 'custom') return customStart ? new Date(`${customStart}T00:00:00`) : null;
    const days = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : periodFilter === '90d' ? 90 : 365;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  })();
  const periodEndDate: Date | null = periodFilter === 'custom' && customEnd ? new Date(`${customEnd}T23:59:59`) : null;
  const periodInspections = inspections.filter(i => {
    const t = new Date(i.timestamp);
    if (periodStartDate && t < periodStartDate) return false;
    if (periodEndDate && t > periodEndDate) return false;
    return true;
  });
  // ISO date strings used for export filenames, the export log, and the on-screen range label
  const periodRangeStartISO = periodFilter === 'all' ? null : periodFilter === 'custom' ? (customStart || null) : (periodStartDate ? periodStartDate.toISOString().split('T')[0] : null);
  const periodRangeEndISO = periodFilter === 'all' ? null : periodFilter === 'custom' ? (customEnd || null) : new Date().toISOString().split('T')[0];

  // Compute live KPIs (period-aware)
  const totalInspections = periodInspections.length;
  const mealsServedCount = periodInspections.filter(i => i.mealServed === 'yes').length;
  const missedMealsCount = periodInspections.filter(i => i.mealServed === 'no').length;
  const totalStudentsServed = periodInspections
    .filter(i => i.mealServed === 'yes')
    .reduce((acc, curr) => acc + (curr.studentCount || 0), 0);

  const complianceRate = totalInspections > 0
    ? Math.round((mealsServedCount / totalInspections) * 100)
    : 100;

  const blocksMonitoredCount = new Set(periodInspections.map(i => i.block)).size;

  const activeInspectorsCount = new Set(
    periodInspections.map(i => (i.inspectorName || '').trim().toLowerCase()).filter(Boolean)
  ).size;

  const reportingGapSchools = new Set(
    periodInspections
      .filter(i => i.submittedSDSEO === 'no' || i.meghSimsDaily === 'no')
      .map(i => i.schoolName)
  ).size;

  // "This Week at a Glance" — always trailing 7 days, independent of the period selector,
  // so it stays meaningful even when someone has "All Time" selected.
  const last7DaysCutoff = new Date();
  last7DaysCutoff.setDate(last7DaysCutoff.getDate() - 7);
  const last7DaysInspections = inspections.filter(i => new Date(i.timestamp) >= last7DaysCutoff);
  const submissionsLast7Days = last7DaysInspections.length;
  const photosLast7Days = last7DaysInspections.filter(i => !!i.photoUrl).length;

  // Facilities & reporting compliance percentages (period-aware, only counts inspections
  // where the field was actually answered, since older records may not have it)
  const pctYes = (field: keyof InspectionRecord) => {
    const answered = periodInspections.filter(i => i[field] === 'yes' || i[field] === 'no');
    if (answered.length === 0) return null;
    const yes = answered.filter(i => i[field] === 'yes').length;
    return Math.round((yes / answered.length) * 100);
  };
  const facilitiesReporting = [
    { label: 'Kitchen Shed Functional', pct: pctYes('kitchenShed') },
    { label: 'Water Supply Functional', pct: pctYes('waterSupply') },
    { label: 'Kitchen Garden Present', pct: pctYes('kitchenGarden') },
    { label: 'SDSEO Monthly Form Submitted', pct: pctYes('submittedSDSEO') },
    { label: 'MeghSIMS Daily Reporting Done', pct: pctYes('meghSimsDaily') },
  ];

  // Top issue reasons this period
  const topIssues = (() => {
    const counts = new Map<string, number>();
    periodInspections.forEach(i => {
      if (i.issueCategory) counts.set(i.issueCategory, (counts.get(i.issueCategory) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  // Inspections trend — last 8 weeks, always fixed regardless of the period selector
  const weeklyTrend = (() => {
    const weeks: { label: string; count: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const count = inspections.filter(i => {
        const t = new Date(i.timestamp);
        return t >= weekStart && t < weekEnd;
      }).length;
      weeks.push({ label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`, count });
    }
    return weeks;
  })();
  const maxWeeklyCount = Math.max(1, ...weeklyTrend.map(w => w.count));

  // Weekly Export Tracker — "was this week's data exported yet?" for the last 8 weeks
  const findLatestExport = (type: ExportType, weekStart: Date, weekEnd: Date): ExportLogEntry | null => {
    const matches = exportLog.filter(e => {
      if (e.exportType !== type) return false;
      if (!e.rangeStart && !e.rangeEnd) return true; // an "All Time" export covers every week
      const eStart = e.rangeStart ? new Date(`${e.rangeStart}T00:00:00`) : new Date(0);
      const eEnd = e.rangeEnd ? new Date(`${e.rangeEnd}T23:59:59`) : new Date();
      return eStart <= weekEnd && eEnd >= weekStart;
    });
    if (matches.length === 0) return null;
    return matches.reduce((latest, e) => (new Date(e.exportedAt) > new Date(latest.exportedAt) ? e : latest));
  };
  const weeklyExportTracker = (() => {
    const weeks: {
      label: string; weekStart: Date; weekEnd: Date; count: number;
      csvExport: ExportLogEntry | null; photosExport: ExportLogEntry | null;
    }[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const count = inspections.filter(i => {
        const t = new Date(i.timestamp);
        return t >= weekStart && t < weekEnd;
      }).length;
      const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      weeks.push({
        label: `${fmt(weekStart)} – ${fmt(weekEnd)}`,
        weekStart, weekEnd, count,
        csvExport: findLatestExport('csv', weekStart, weekEnd),
        photosExport: findLatestExport('photos', weekStart, weekEnd),
      });
    }
    return weeks.reverse(); // most recent week first
  })();

  // Filter inspections (search/block/status, applied on top of the period filter)
  const filteredInspections = periodInspections.filter(i => {
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

  // Calculate block compliance breakdown from real inspection data only (period-aware)
  const blockStats = INITIAL_BLOCKS.map(blockName => {
    const blockInspections = periodInspections.filter(i => i.block === blockName);
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
            onClick={() => {
              const rangeText = periodRangeStartISO || periodRangeEndISO
                ? `from ${periodRangeStartISO || 'the beginning'} to ${periodRangeEndISO || 'now'}`
                : 'for all time';
              const blockText = selectedBlock !== 'All' ? `, Block: ${selectedBlock}` : '';
              const proceed = window.confirm(
                `Export ${filteredInspections.length} inspections ${rangeText}${blockText}?`
              );
              if (!proceed) return;
              exportInspectionsCSV(filteredInspections, { start: periodRangeStartISO, end: periodRangeEndISO });
              getExportLog().then(setExportLog).catch(() => {});
            }}
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
              const photoCount = filteredInspections.filter(i => !!i.photoUrl).length;
              const rangeText = periodRangeStartISO || periodRangeEndISO
                ? `from ${periodRangeStartISO || 'the beginning'} to ${periodRangeEndISO || 'now'}`
                : 'for all time';
              const blockText = selectedBlock !== 'All' ? `, Block: ${selectedBlock}` : '';
              const proceed = window.confirm(
                `Export ${photoCount} photo${photoCount === 1 ? '' : 's'} ${rangeText}${blockText}?`
              );
              if (!proceed) return;
              setExportingZip(true);
              try {
                await exportPhotosZip(filteredInspections, { start: periodRangeStartISO, end: periodRangeEndISO });
                getExportLog().then(setExportLog).catch(() => {});
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
            onClick={() => setShowClearModal(true)}
            title="Manage / clear data"
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
      {/* Period Filter */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: isMobile ? 14 : 18,
        flexWrap: "wrap"
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, display: "flex", alignItems: "center", gap: 5 }}>
          <Calendar size={13} color={c.textSecondary} /> Period:
        </span>
        <div style={{ display: "flex", gap: 4, background: c.paper, padding: 4, borderRadius: 10, border: `1px solid ${c.line}`, flexWrap: "wrap" }}>
          {(['7d', '30d', '90d', '12m', 'all', 'custom'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              style={{
                padding: "6px 12px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: periodFilter === p ? c.surface : "transparent",
                color: periodFilter === p ? c.forest : c.textSecondary,
                boxShadow: periodFilter === p ? shadows.sm : "none",
                whiteSpace: "nowrap"
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {periodFilter === 'custom' && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${c.line}`, fontSize: 12, color: c.ink, background: c.surface }}
            />
            <span style={{ fontSize: 12, color: c.textFaint }}>to</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${c.line}`, fontSize: 12, color: c.ink, background: c.surface }}
            />
            {(!customStart || !customEnd) && (
              <span style={{ fontSize: 11, color: c.textFaint }}>Pick both dates</span>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(220px, 1fr))",
        gap: isMobile ? 10 : 16,
        marginBottom: isMobile ? 14 : 18
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
          <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>{PERIOD_LABELS[periodFilter]}</div>
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
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: "rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={isMobile ? 17 : 20} color={c.gold} />
            </div>
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Blocks Monitored</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
            {blocksMonitoredCount} / {INITIAL_BLOCKS.length}
          </div>
          <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>East Khasi Hills</div>
        </div>

        <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 14 : 20, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: "rgba(15,76,58,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserCheck size={isMobile ? 17 : 20} color={c.forest} />
            </div>
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Active Inspectors</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
            {activeInspectorsCount}
          </div>
          <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>{PERIOD_LABELS[periodFilter]}</div>
        </div>

        <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 14 : 20, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: c.terracottaSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={isMobile ? 17 : 20} color={c.terracotta} />
            </div>
            {reportingGapSchools > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, background: c.terracotta, color: "#fff", padding: "2px 6px", borderRadius: 12 }}>
                Alert
              </span>
            )}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Reporting Compliance Gap</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: reportingGapSchools > 0 ? c.terracotta : c.ink, letterSpacing: "-0.02em" }}>
            {reportingGapSchools}
          </div>
          <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>Schools missing SDSEO/MeghSIMS</div>
        </div>
      </div>

      {/* This Week at a Glance — always trailing 7 days, independent of the period filter above */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(220px, 1fr))",
        gap: isMobile ? 10 : 16,
        marginBottom: isMobile ? 20 : 28
      }}>
        <div style={{ background: c.forestSoft, borderRadius: 16, padding: isMobile ? 12 : 16, border: `1px solid ${c.line}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: c.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardCheck size={17} color={c.forest} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.ink, lineHeight: 1.1 }}>{submissionsLast7Days}</div>
            <div style={{ fontSize: 11, color: c.textSecondary, fontWeight: 600 }}>Submissions, Last 7 Days</div>
          </div>
        </div>
        <div style={{ background: c.forestSoft, borderRadius: 16, padding: isMobile ? 12 : 16, border: `1px solid ${c.line}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: c.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Camera size={17} color={c.forest} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.ink, lineHeight: 1.1 }}>{photosLast7Days}</div>
            <div style={{ fontSize: 11, color: c.textSecondary, fontWeight: 600 }}>Photos Captured, Last 7 Days</div>
          </div>
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

      {/* Facilities & Reporting Compliance / Top Issues / Trend */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
        gap: isMobile ? 14 : 20,
        marginBottom: isMobile ? 20 : 32
      }}>
        {/* Facilities & Reporting Compliance */}
        <div style={{ background: c.surface, padding: isMobile ? 16 : 24, borderRadius: 18, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: c.ink, margin: 0 }}>Facilities & Reporting Compliance</h3>
              <p style={{ fontSize: 12, color: c.textSecondary, margin: 0 }}>{PERIOD_LABELS[periodFilter]} • % of answered inspections</p>
            </div>
            <ShieldCheck size={18} color={c.forest} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {facilitiesReporting.map((item) => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: c.ink }}>{item.label}</span>
                  <span style={{ color: item.pct === null ? c.textFaint : c.forest, fontWeight: 700 }}>
                    {item.pct === null ? "No data yet" : `${item.pct}%`}
                  </span>
                </div>
                <div style={{ width: "100%", height: 8, background: c.mint, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: item.pct === null ? "0%" : `${item.pct}%`,
                    height: "100%",
                    background: item.pct === null ? c.line : item.pct >= 90 ? c.forest : item.pct >= 75 ? c.gold : c.terracotta,
                    borderRadius: 4,
                    transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Issues This Period */}
        <div style={{ background: c.surface, padding: isMobile ? 16 : 24, borderRadius: 18, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: c.ink, margin: 0 }}>Top Issues This Period</h3>
              <p style={{ fontSize: 12, color: c.textSecondary, margin: 0 }}>{PERIOD_LABELS[periodFilter]}</p>
            </div>
            <AlertTriangle size={18} color={c.terracotta} />
          </div>
          {topIssues.length === 0 ? (
            <div style={{ fontSize: 13, color: c.textFaint, padding: "12px 0" }}>No issues flagged in this period.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topIssues.map(([issue, count], idx) => (
                <div key={issue} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, background: c.terracottaSoft, color: c.terracotta,
                    fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.ink, flex: 1 }}>{issue}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inspections Trend — last 8 weeks */}
        <div style={{ background: c.surface, padding: isMobile ? 16 : 24, borderRadius: 18, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: c.ink, margin: 0 }}>Inspections Trend</h3>
              <p style={{ fontSize: 12, color: c.textSecondary, margin: 0 }}>Last 8 weeks, week-start date shown</p>
            </div>
            <BarChart3 size={18} color={c.forest} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 6 : 10, height: 100 }}>
            {weeklyTrend.map((w, idx) => (
              <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.textSecondary }}>{w.count}</span>
                <div style={{
                  width: "100%",
                  height: `${Math.max(4, (w.count / maxWeeklyCount) * 70)}px`,
                  background: idx === weeklyTrend.length - 1 ? c.forest : c.mint,
                  borderRadius: 4,
                  transition: "height 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                }} />
                <span style={{ fontSize: 9, color: c.textFaint }}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Export Tracker */}
      <div style={{ background: c.surface, padding: isMobile ? 16 : 24, borderRadius: 18, border: `1px solid ${c.line}`, boxShadow: shadows.sm, marginBottom: isMobile ? 20 : 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: c.ink, margin: 0 }}>Weekly Export Tracker</h3>
            <p style={{ fontSize: 12, color: c.textSecondary, margin: 0 }}>Last 8 weeks — what's been downloaded so far</p>
          </div>
          <FolderDown size={18} color={c.forest} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {weeklyExportTracker.map((wk, idx) => (
            <div key={idx} style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              gap: isMobile ? 6 : 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: idx === 0 ? c.forestSoft : c.paper,
              border: `1px solid ${c.line}`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: isMobile ? "auto" : 220 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>{wk.label}</span>
                <span style={{ fontSize: 11, color: c.textSecondary }}>{wk.count} inspection{wk.count === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: wk.csvExport ? c.mint : c.line,
                  color: wk.csvExport ? c.forest : c.textFaint
                }}>
                  {wk.csvExport ? <CheckCircle2 size={11} /> : <X size={11} />}
                  CSV {wk.csvExport ? `– ${new Date(wk.csvExport.exportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'not exported'}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: wk.photosExport ? c.mint : c.line,
                  color: wk.photosExport ? c.forest : c.textFaint
                }}>
                  {wk.photosExport ? <CheckCircle2 size={11} /> : <X size={11} />}
                  Photos {wk.photosExport ? `– ${new Date(wk.photosExport.exportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'not exported'}
                </span>
              </div>
            </div>
          ))}
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
              Showing {filteredInspections.length} of {periodInspections.length} entries ({PERIOD_LABELS[periodFilter]})
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

      {/* Manage / Clear Data Modal */}
      {showClearModal && (
        <div
          onClick={() => !clearing && setShowClearModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: c.surface, borderRadius: 18, padding: isMobile ? 20 : 28,
              maxWidth: 460, width: "100%", boxShadow: shadows.md
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: c.ink, margin: "0 0 4px" }}>Manage Data</h3>
            <p style={{ fontSize: 12, color: c.textSecondary, margin: "0 0 18px" }}>
              This affects the shared Supabase project for everyone. Export first if you haven't already.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: 10, borderRadius: 10, border: `1px solid ${clearMode === 'photos' ? c.forest : c.line}`, background: clearMode === 'photos' ? c.forestSoft : c.paper }}>
                <input type="radio" checked={clearMode === 'photos'} onChange={() => setClearMode('photos')} style={{ marginTop: 3 }} />
                <span>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 13, color: c.ink }}>Delete Photos Only</span>
                  <span style={{ display: "block", fontSize: 12, color: c.textSecondary }}>Frees up storage. Inspection records, checklist answers, and CSV history all stay intact — just the photo files are removed.</span>
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: 10, borderRadius: 10, border: `1px solid ${clearMode === 'all' ? c.terracotta : c.line}`, background: clearMode === 'all' ? c.terracottaSoft : c.paper }}>
                <input type="radio" checked={clearMode === 'all'} onChange={() => setClearMode('all')} style={{ marginTop: 3 }} />
                <span>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 13, color: c.ink }}>Delete Everything</span>
                  <span style={{ display: "block", fontSize: 12, color: c.textSecondary }}>Removes inspection records and photos in the range below. This also affects Month/Quarter/Year filters and trend charts for that period.</span>
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, marginBottom: 8 }}>Date range (leave blank for all time)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={clearStart}
                  max={clearEnd || undefined}
                  onChange={(e) => setClearStart(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${c.line}`, fontSize: 12, color: c.ink, background: c.paper, flex: 1, minWidth: 130 }}
                />
                <span style={{ fontSize: 12, color: c.textFaint }}>to</span>
                <input
                  type="date"
                  value={clearEnd}
                  min={clearStart || undefined}
                  onChange={(e) => setClearEnd(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${c.line}`, fontSize: 12, color: c.ink, background: c.paper, flex: 1, minWidth: 130 }}
                />
              </div>
              {!clearStart && !clearEnd && (
                <div style={{ fontSize: 11, color: c.terracotta, marginTop: 8, fontWeight: 600 }}>
                  No dates selected — this will affect ALL {clearMode === 'photos' ? 'photos' : 'inspections and photos'}, for all time.
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, marginBottom: 8 }}>Delete password</div>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(null); }}
                placeholder="Enter delete password to confirm"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  border: `1.5px solid ${deletePasswordError ? c.terracotta : c.line}`,
                  fontSize: 13, color: c.ink, background: c.paper, boxSizing: "border-box"
                }}
              />
              {deletePasswordError && (
                <div style={{ fontSize: 11, color: c.terracotta, marginTop: 6, fontWeight: 600 }}>{deletePasswordError}</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowClearModal(false); setDeletePassword(''); setDeletePasswordError(null); }}
                disabled={clearing}
                style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${c.line}`, background: c.paper, color: c.ink, fontWeight: 600, cursor: clearing ? "wait" : "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!deletePassword) {
                    setDeletePasswordError('Delete password is required.');
                    return;
                  }
                  const rangeText = clearStart || clearEnd
                    ? `from ${clearStart || 'the beginning'} to ${clearEnd || 'now'}`
                    : 'for ALL TIME';
                  const what = clearMode === 'photos' ? 'photo files' : 'inspection records AND photo files';
                  const proceed = window.confirm(`Delete ${what} ${rangeText}? This cannot be undone.`);
                  if (!proceed) return;

                  setClearing(true);
                  setDeletePasswordError(null);
                  try {
                    const startISO = clearStart || null;
                    const endISO = clearEnd || null;
                    let count = 0;
                    if (clearMode === 'photos') {
                      count = await clearPhotosInRange(startISO, endISO, deletePassword);
                    } else if (!startISO && !endISO) {
                      // Full wipe, all time — reuses the original full-reset behavior (also clears schools + reloads)
                      await clearAllData(deletePassword);
                      return; // clearAllData reloads the page itself
                    } else {
                      count = await clearDataInRange(startISO, endISO, deletePassword);
                    }
                    setShowClearModal(false);
                    setDeletePassword('');
                    onDataChanged();
                    alert(`Done — ${count} item${count === 1 ? '' : 's'} deleted.`);
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Could not delete. Please try again.';
                    if (msg.toLowerCase().includes('incorrect delete password')) {
                      setDeletePasswordError(msg);
                    } else {
                      alert(msg);
                    }
                  } finally {
                    setClearing(false);
                  }
                }}
                disabled={clearing}
                style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: c.terracotta, color: "#fff", fontWeight: 700, cursor: clearing ? "wait" : "pointer" }}
              >
                {clearing ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
