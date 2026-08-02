import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck, Download,
  Filter, Search, X, Calendar,
  Building2, Camera, ShieldCheck, FolderDown, LayoutGrid,
  UserCheck, AlertTriangle, AlertCircle, BarChart3, ChevronRight,
  Droplets, Wheat, UtensilsCrossed, Flame, ImageOff, FileText
} from 'lucide-react';
import { InspectionRecord, BlockName, ExportLogEntry, ExportType } from '../types';
import { INITIAL_BLOCKS } from '../data/mockData';
import { exportInspectionsXLSX, downloadInspectionPhoto, exportPhotosZip, getExportLog } from '../utils/storage';
import { exportInspectionsPDF } from '../utils/pdfReport';
import { SchoolDirectory } from './SchoolDirectory';
import { DrillDownModal, DrillDownColumn } from './DrillDownModal';
import { SchoolRankModal, SchoolRankRow } from './SchoolRankModal';

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

export function Dashboard({ inspections, onDataChanged }: DashboardProps) {
  const [dashboardView, setDashboardView] = useState<'overview' | 'schools'>('overview');
  const [selectedBlock, setSelectedBlock] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionRecord | null>(null);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | '12m' | 'all' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [exportLog, setExportLog] = useState<ExportLogEntry[]>([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Drill-down modal: generic record-list view used by "Schools Inspected" and
  // each of the 4 "Action Required" categories.
  type DrillDownKey = 'all' | 'kitchen' | 'water' | 'foodgrain' | 'meals';
  const [openDrillDown, setOpenDrillDown] = useState<DrillDownKey | null>(null);

  // School-rank modal: generic ranked-school view used by the 3 "Top 5" cards.
  type RankKey = 'aadhaar' | 'reporting' | 'issues';
  const [openRankList, setOpenRankList] = useState<RankKey | null>(null);
  // When someone clicks a school inside a rank list, drop into that school's own records.
  const [rankSchoolFocus, setRankSchoolFocus] = useState<string | null>(null);

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

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [selectedPhoto?.id]);

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

  // Filter inspections (search/block/status, applied on top of the period filter)
  const filteredInspections = periodInspections.filter(i => {
    const matchesBlock = selectedBlock === "All" || i.block === selectedBlock;
    const matchesSearch = searchQuery === ""
      || i.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
      || i.block.toLowerCase().includes(searchQuery.toLowerCase())
      || (i.remarks && i.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesBlock && matchesSearch;
  });

  // Inspection coverage per block (period-aware) — how many inspections have
  // actually been logged in each block, which is real data straight off the
  // submitted form (unlike a "compliance rate," which has no source field yet).
  const blockStats = INITIAL_BLOCKS.map(blockName => ({
    name: blockName,
    total: periodInspections.filter(i => i.block === blockName).length,
  }));
  const maxBlockTotal = Math.max(1, ...blockStats.map(b => b.total));

  // ---- Data behind the new "Schools Inspected" / "Action Required" / "Top 5" cards ----

  // The 4 critical-issue categories, period-scoped
  const kitchenNotFunctional = periodInspections.filter(i => i.kitchenShed === 'no');
  const waterUnavailable = periodInspections.filter(i => i.waterSupply === 'no');
  const foodgrainNotDelivered = periodInspections.filter(i => i.foodgrainsDelivered === 'no');
  const mealsNotServed = periodInspections.filter(i => i.mealsServedAllFiveDays === 'no');

  // Per-school snapshot, using each school's most recent inspection within the
  // selected period as its "current state" for ranking purposes.
  const schoolLatest = (() => {
    const map = new Map<string, { record: InspectionRecord; block: string; recordCount: number }>();
    periodInspections.forEach(i => {
      const existing = map.get(i.schoolName);
      if (!existing) {
        map.set(i.schoolName, { record: i, block: i.block, recordCount: 1 });
      } else {
        existing.recordCount += 1;
        if (new Date(i.timestamp) > new Date(existing.record.timestamp)) {
          existing.record = i;
        }
      }
    });
    return map;
  })();

  const REPORTING_FIELDS: (keyof InspectionRecord)[] = ['submittedSDSEO', 'meghSimsDaily', 'foodgrainsReportedSDSEO'];
  const ISSUE_FIELDS: { field: keyof InspectionRecord }[] = [
    { field: 'kitchenShed' }, { field: 'waterSupply' }, { field: 'foodgrainsDelivered' }, { field: 'mealsServedAllFiveDays' }
  ];

  const aadhaarRanked: SchoolRankRow[] = [];
  const reportingRanked: SchoolRankRow[] = [];
  const issuesRanked: SchoolRankRow[] = [];

  schoolLatest.forEach(({ record, block, recordCount }, schoolName) => {
    const attendanceTotal = (record.attendanceBoys || 0) + (record.attendanceGirls || 0);
    const aadhaarTotal = (record.aadhaarBoys || 0) + (record.aadhaarGirls || 0);
    if (attendanceTotal > 0) {
      const pct = Math.round((aadhaarTotal / attendanceTotal) * 100);
      aadhaarRanked.push({ schoolName, block, metricValue: pct, metricLabel: `${pct}%`, recordCount });
    }

    const answered = REPORTING_FIELDS.filter(f => record[f] === 'yes' || record[f] === 'no');
    if (answered.length > 0) {
      const yes = answered.filter(f => record[f] === 'yes').length;
      const pct = Math.round((yes / answered.length) * 100);
      reportingRanked.push({ schoolName, block, metricValue: pct, metricLabel: `${pct}%`, recordCount });
    }

    const issueCount = ISSUE_FIELDS.filter(({ field }) => record[field] === 'no').length;
    if (issueCount > 0) {
      issuesRanked.push({ schoolName, block, metricValue: issueCount, metricLabel: `${issueCount} of 4 issues`, recordCount });
    }
  });

  aadhaarRanked.sort((a, b) => a.metricValue - b.metricValue); // lowest coverage first
  reportingRanked.sort((a, b) => a.metricValue - b.metricValue); // lowest compliance first
  issuesRanked.sort((a, b) => b.metricValue - a.metricValue); // most issues first

  // Column sets for each drill-down modal (on-screen table + xlsx export, kept in sync)
  const baseDrillDownColumns: DrillDownColumn[] = [
    { header: 'School Name', width: 26, value: (r: InspectionRecord) => r.schoolName },
    { header: 'Block', width: 16, value: (r: InspectionRecord) => r.block },
    { header: 'Date', width: 14, value: (r: InspectionRecord) => new Date(r.timestamp).toLocaleDateString() },
    { header: 'Inspector', width: 18, value: (r: InspectionRecord) => r.inspectorName || '' },
  ];
  const mealsNotServedColumns: DrillDownColumn[] = [
    ...baseDrillDownColumns,
    { header: 'Days Missed', width: 12, value: (r: InspectionRecord) => r.missedMealDaysCount ?? '' },
    { header: 'Reason', width: 30, value: (r: InspectionRecord) => r.missedMealDaysReason || '' },
  ];

  const DRILL_DOWN_CONFIG: Record<DrillDownKey, { title: string; subtitle: string; records: InspectionRecord[]; columns: DrillDownColumn[]; filename: string; accent: string }> = {
    all: { title: 'Schools Inspected', subtitle: PERIOD_LABELS[periodFilter], records: periodInspections, columns: baseDrillDownColumns, filename: 'Schools_Inspected', accent: c.forest },
    kitchen: { title: 'Kitchen Not Functional', subtitle: PERIOD_LABELS[periodFilter], records: kitchenNotFunctional, columns: baseDrillDownColumns, filename: 'Kitchen_Not_Functional', accent: c.terracotta },
    water: { title: 'Water Supply Unavailable', subtitle: PERIOD_LABELS[periodFilter], records: waterUnavailable, columns: baseDrillDownColumns, filename: 'Water_Supply_Unavailable', accent: c.terracotta },
    foodgrain: { title: 'Foodgrain Not Delivered', subtitle: PERIOD_LABELS[periodFilter], records: foodgrainNotDelivered, columns: baseDrillDownColumns, filename: 'Foodgrain_Not_Delivered', accent: c.terracotta },
    meals: { title: 'Meals Not Served (All 5 Days)', subtitle: PERIOD_LABELS[periodFilter], records: mealsNotServed, columns: mealsNotServedColumns, filename: 'Meals_Not_Served', accent: c.terracotta },
  };

  const RANK_CONFIG: Record<RankKey, { title: string; subtitle: string; metricColumnLabel: string; rows: SchoolRankRow[]; filename: string }> = {
    aadhaar: { title: 'Lowest Aadhaar Coverage', subtitle: `${PERIOD_LABELS[periodFilter]} • (Aadhaar-linked ÷ attendance) at each school's latest inspection`, metricColumnLabel: 'Aadhaar Coverage', rows: aadhaarRanked, filename: 'Lowest_Aadhaar_Coverage' },
    reporting: { title: 'Lowest Reporting Compliance', subtitle: `${PERIOD_LABELS[periodFilter]} • SDSEO / MeghSIMS / foodgrain reporting`, metricColumnLabel: 'Reporting Compliance', rows: reportingRanked, filename: 'Lowest_Reporting_Compliance' },
    issues: { title: 'Most Critical Issues', subtitle: `${PERIOD_LABELS[periodFilter]} • Kitchen / Water / Foodgrain / Meals flags`, metricColumnLabel: 'Critical Issues', rows: issuesRanked, filename: 'Most_Critical_Issues' },
  };

  // Records for a single school in the current period, used when someone drills
  // from a rank list into one specific school.
  const rankSchoolRecords = rankSchoolFocus ? periodInspections.filter(i => i.schoolName === rankSchoolFocus) : [];

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
              exportInspectionsXLSX(filteredInspections, { start: periodRangeStartISO, end: periodRangeEndISO });
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
            <Download size={15} /> Export Excel
          </button>

          <button
            onClick={async () => {
              const rangeText = periodRangeStartISO || periodRangeEndISO
                ? `from ${periodRangeStartISO || 'the beginning'} to ${periodRangeEndISO || 'now'}`
                : 'for all time';
              const blockText = selectedBlock !== 'All' ? `, Block: ${selectedBlock}` : '';
              const proceed = window.confirm(
                `Export ${filteredInspections.length} inspections as a PDF report ${rangeText}${blockText}?`
              );
              if (!proceed) return;
              setExportingPDF(true);
              try {
                await exportInspectionsPDF(
                  filteredInspections,
                  { start: periodRangeStartISO, end: periodRangeEndISO },
                  selectedBlock !== 'All' ? `${selectedBlock} Block` : undefined
                );
                getExportLog().then(setExportLog).catch(() => {});
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Could not generate the PDF report. Please try again.');
              } finally {
                setExportingPDF(false);
              }
            }}
            disabled={exportingPDF}
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
              cursor: exportingPDF ? "wait" : "pointer",
              boxShadow: shadows.sm,
              color: c.ink,
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: "nowrap"
            }}
          >
            <FileText size={15} /> {exportingPDF ? "Generating PDF..." : "Export PDF"}
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
        <SchoolDirectory />
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

      {/* Schools Inspected + Action Required */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) 2fr",
        gap: isMobile ? 12 : 16,
        marginBottom: isMobile ? 14 : 18
      }}>
        {/* Schools Inspected */}
        <button
          onClick={() => setOpenDrillDown('all')}
          style={{
            background: c.surface, borderRadius: 16, padding: isMobile ? 16 : 22, border: `1px solid ${c.line}`, boxShadow: shadows.sm,
            cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, background: c.mint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardCheck size={isMobile ? 17 : 20} color={c.forest} />
            </div>
            <ChevronRight size={16} color={c.textFaint} />
          </div>
          <div>
            <div style={{ fontSize: isMobile ? 12 : 13, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>Schools Inspected</div>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>{totalInspections}</div>
            <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2 }}>{PERIOD_LABELS[periodFilter]} • Tap for details</div>
          </div>
        </button>

        {/* Action Required */}
        <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 16 : 22, border: `1px solid ${c.line}`, boxShadow: shadows.sm }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} color={c.terracotta} />
              <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: c.ink }}>Action Required</span>
            </div>
            <span style={{ fontSize: 10, color: c.textFaint }}>{PERIOD_LABELS[periodFilter]}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 8 }}>
            {([
              { key: 'kitchen' as const, label: 'Kitchen Not Functional', icon: Flame, count: kitchenNotFunctional.length },
              { key: 'water' as const, label: 'Water Supply Unavailable', icon: Droplets, count: waterUnavailable.length },
              { key: 'foodgrain' as const, label: 'Foodgrain Not Delivered', icon: Wheat, count: foodgrainNotDelivered.length },
              { key: 'meals' as const, label: 'Meals Not Served', icon: UtensilsCrossed, count: mealsNotServed.length },
            ]).map(item => (
              <button
                key={item.key}
                onClick={() => setOpenDrillDown(item.key)}
                disabled={item.count === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
                  border: `1px solid ${item.count > 0 ? '#FCA5A5' : c.line}`,
                  background: item.count > 0 ? c.terracottaSoft : c.paper,
                  cursor: item.count > 0 ? "pointer" : "default", textAlign: "left", width: "100%"
                }}
              >
                <item.icon size={16} color={item.count > 0 ? c.terracotta : c.textFaint} />
                <span style={{ fontSize: 12, fontWeight: 600, color: item.count > 0 ? c.ink : c.textFaint, flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: item.count > 0 ? c.terracotta : c.textFaint }}>{item.count}</span>
                {item.count > 0 && <ChevronRight size={14} color={c.terracotta} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 — Requiring Attention (3 independently-ranked lists) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
        gap: isMobile ? 12 : 16,
        marginBottom: isMobile ? 20 : 28
      }}>
        {([
          { key: 'aadhaar' as const, title: 'Top 5 — Lowest Aadhaar Coverage', icon: UserCheck, rows: aadhaarRanked },
          { key: 'reporting' as const, title: 'Top 5 — Lowest Reporting Compliance', icon: ShieldCheck, rows: reportingRanked },
          { key: 'issues' as const, title: 'Top 5 — Most Critical Issues', icon: AlertCircle, rows: issuesRanked },
        ]).map(panel => (
          <div key={panel.key} style={{ background: c.surface, padding: isMobile ? 14 : 18, borderRadius: 16, border: `1px solid ${c.line}`, boxShadow: shadows.sm, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <panel.icon size={15} color={c.terracotta} />
                <span style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>{panel.title}</span>
              </div>
            </div>
            {panel.rows.length === 0 ? (
              <div style={{ fontSize: 12, color: c.textFaint, padding: "10px 0" }}>No schools flagged for this period.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {panel.rows.slice(0, 5).map((r, idx) => (
                  <button
                    key={r.schoolName}
                    onClick={() => setRankSchoolFocus(r.schoolName)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 9, border: `1px solid ${c.line}`, background: c.paper, cursor: "pointer", textAlign: "left", width: "100%" }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: "#FFFFFF", border: `1px solid ${c.line}`, fontSize: 10, fontWeight: 800, color: c.textSecondary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.schoolName}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.terracotta, whiteSpace: "nowrap" }}>{r.metricLabel}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setOpenRankList(panel.key)}
              disabled={panel.rows.length === 0}
              style={{ marginTop: "auto", padding: "8px 12px", borderRadius: 9, border: `1px solid ${c.line}`, background: "transparent", color: panel.rows.length === 0 ? c.textFaint : c.forest, fontWeight: 700, fontSize: 12, cursor: panel.rows.length === 0 ? "default" : "pointer" }}
            >
              View All
            </button>
          </div>
        ))}
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
              <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: c.ink, margin: 0 }}>Inspections Logged by Block</h3>
              <p style={{ fontSize: 12, color: c.textSecondary, margin: 0 }}>{PERIOD_LABELS[periodFilter]}</p>
            </div>
            <Building2 size={18} color={c.forest} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {blockStats.map((block) => (
              <div key={block.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: c.ink }}>{block.name} Block</span>
                  <span style={{ color: block.total === 0 ? c.textFaint : c.forest, fontWeight: 700 }}>
                    {block.total === 0 ? "No inspections yet" : `${block.total} logged`}
                  </span>
                </div>
                <div style={{ width: "100%", height: 8, background: c.mint, borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: block.total === 0 ? "0%" : `${Math.round((block.total / maxBlockTotal) * 100)}%`,
                      height: "100%",
                      background: block.total === 0 ? c.line : c.forest,
                      borderRadius: 4,
                      transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Facilities & Reporting Compliance / Trend */}
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
                    background: c.mint,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <ClipboardCheck size={isMobile ? 18 : 22} color={c.forest} />
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
                    <div style={{ fontSize: 10, color: c.textFaint, fontWeight: 500 }}>Students Present</div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: c.forest
                    }}>
                      {insp.studentCount}
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
            {photoLoadFailed ? (
              <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: c.paper }}>
                <ImageOff size={32} color={c.textFaint} />
                <span style={{ fontSize: 12, fontWeight: 600, color: c.textSecondary }}>Photo no longer available</span>
                <span style={{ fontSize: 11, color: c.textFaint, padding: "0 20px", textAlign: "center" }}>It may have been removed from storage. The inspection record itself is unaffected.</span>
              </div>
            ) : (
              <img
                src={selectedPhoto.photoUrl}
                alt="Inspection proof"
                style={{ width: "100%", height: "auto", display: "block" }}
                onError={() => setPhotoLoadFailed(true)}
              />
            )}
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

      {/* Schools Inspected / Action Required drill-down */}
      {openDrillDown && (
        <DrillDownModal
          open={!!openDrillDown}
          onClose={() => setOpenDrillDown(null)}
          title={DRILL_DOWN_CONFIG[openDrillDown].title}
          subtitle={DRILL_DOWN_CONFIG[openDrillDown].subtitle}
          records={DRILL_DOWN_CONFIG[openDrillDown].records}
          columns={DRILL_DOWN_CONFIG[openDrillDown].columns}
          exportFilenameBase={DRILL_DOWN_CONFIG[openDrillDown].filename}
          accentColor={DRILL_DOWN_CONFIG[openDrillDown].accent}
        />
      )}

      {/* Top 5 — full ranked list */}
      {openRankList && (
        <SchoolRankModal
          open={!!openRankList}
          onClose={() => setOpenRankList(null)}
          title={RANK_CONFIG[openRankList].title}
          subtitle={RANK_CONFIG[openRankList].subtitle}
          metricColumnLabel={RANK_CONFIG[openRankList].metricColumnLabel}
          rows={RANK_CONFIG[openRankList].rows}
          exportFilenameBase={RANK_CONFIG[openRankList].filename}
          onSelectSchool={(schoolName) => { setOpenRankList(null); setRankSchoolFocus(schoolName); }}
        />
      )}

      {/* One school's records, reached by clicking into a Top 5 rank list */}
      {rankSchoolFocus && (
        <DrillDownModal
          open={!!rankSchoolFocus}
          onClose={() => setRankSchoolFocus(null)}
          title={rankSchoolFocus}
          subtitle={`${PERIOD_LABELS[periodFilter]} • ${rankSchoolRecords.length} inspection${rankSchoolRecords.length === 1 ? '' : 's'}`}
          records={rankSchoolRecords}
          columns={mealsNotServedColumns}
          exportFilenameBase={`School_${rankSchoolFocus.replace(/[^a-zA-Z0-9]+/g, '_')}`}
        />
      )}

    </div>
  );
}
