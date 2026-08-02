import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck, Download,
  Filter, Search, X, Calendar,
  Camera, ShieldCheck, FolderDown,
  UserCheck, AlertTriangle, ChevronRight, Building2,
  Droplets, Wheat, UtensilsCrossed, Flame, ImageOff, FileText
} from 'lucide-react';
import { InspectionRecord } from '../types';
import { INITIAL_BLOCKS } from '../data/mockData';
import { exportInspectionsXLSX, downloadInspectionPhoto, exportPhotosZip } from '../utils/storage';
import { exportInspectionsPDF } from '../utils/pdfReport';
import { DrillDownModal, DrillDownColumn } from './DrillDownModal';
import { SchoolRankModal, SchoolRankRow } from './SchoolRankModal';

const c = {
  ink: "#111827",
  forest: "#0F4C3A",
  mint: "#E8F5E9",
  paper: "#F8FAF8",
  surface: "#FFFFFF",
  line: "#E2E8F0",
  textSecondary: "#4B5563",
  textFaint: "#9CA3AF",
  terracotta: "#DC2626",
  terracottaSoft: "#FEE2E2",
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

// ---- Shared period-filter type + helpers, used independently by the overview
// section and by the inspection log section (each keeps its own state, but
// both compute their date range the same way, so there's one place to fix
// bugs instead of two copies of the same logic). ----
type PeriodFilter = 'today' | '7d' | '30d' | '90d' | '12m' | 'all' | 'custom';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  '12m': 'Last 12 Months',
  all: 'All Time',
  custom: 'Custom Range',
};

const PERIOD_OPTIONS: PeriodFilter[] = ['today', '7d', '30d', '90d', '12m', 'all', 'custom'];

function computePeriodRange(period: PeriodFilter, customStart: string, customEnd: string) {
  if (period === 'all') return { start: null as Date | null, end: null as Date | null, startISO: null as string | null, endISO: null as string | null };
  if (period === 'custom') {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null;
    return { start, end, startISO: customStart || null, endISO: customEnd || null };
  }
  const todayISO = new Date().toISOString().split('T')[0];
  if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start, end: null as Date | null, startISO: start.toISOString().split('T')[0], endISO: todayISO };
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end: null as Date | null, startISO: start.toISOString().split('T')[0], endISO: todayISO };
}

function filterByRange(records: InspectionRecord[], range: { start: Date | null; end: Date | null }) {
  return records.filter(i => {
    const t = new Date(i.timestamp);
    if (range.start && t < range.start) return false;
    if (range.end && t > range.end) return false;
    return true;
  });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Builds the "Week 1 / Week 2..." breakdown (7-day chunks from the 1st) for
// one calendar month, from the full unfiltered inspections list -- the trend
// card's month picker is intentionally independent of every other filter on
// the page.
function weeksForMonth(records: InspectionRecord[], year: number, monthIndex: number) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeks: { label: string; startLabel: string; start: Date; end: Date; records: InspectionRecord[] }[] = [];
  let day = 1;
  let weekNum = 1;
  while (day <= daysInMonth) {
    const start = new Date(year, monthIndex, day, 0, 0, 0);
    const chunkEndDay = Math.min(day + 6, daysInMonth);
    const end = new Date(year, monthIndex, chunkEndDay, 23, 59, 59);
    const weekRecords = records.filter(r => {
      const t = new Date(r.timestamp);
      return t >= start && t <= end;
    });
    weeks.push({
      label: `Week ${weekNum}`,
      startLabel: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      start,
      end,
      records: weekRecords,
    });
    day += 7;
    weekNum += 1;
  }
  return weeks;
}

export function Dashboard({ inspections, onDataChanged }: DashboardProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionRecord | null>(null);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Overview section's own period control -- governs Schools Inspected,
  // Action Required, Inspections by Block, and both leaderboards.
  const [overviewPeriod, setOverviewPeriod] = useState<PeriodFilter>('all');
  const [overviewCustomStart, setOverviewCustomStart] = useState('');
  const [overviewCustomEnd, setOverviewCustomEnd] = useState('');

  // Inspections Trend's own month picker -- fully independent of the period
  // controls above and below it.
  const now = new Date();
  const [trendYear, setTrendYear] = useState(now.getFullYear());
  const [trendMonth, setTrendMonth] = useState(now.getMonth());

  // Official Inspection Logs is the "master" section: its own period control,
  // its own search/block filter, and it's the only place with export buttons.
  const [logPeriod, setLogPeriod] = useState<PeriodFilter>('all');
  const [logCustomStart, setLogCustomStart] = useState('');
  const [logCustomEnd, setLogCustomEnd] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Drill-down modal: generic record-list view used by "Schools Inspected" and
  // each of the 4 "Action Required" categories.
  type DrillDownKey = 'all' | 'kitchen' | 'water' | 'foodgrain' | 'meals';
  const [openDrillDown, setOpenDrillDown] = useState<DrillDownKey | null>(null);

  // A single week clicked on the Inspections Trend chart -- dynamic, so it
  // isn't part of the fixed DRILL_DOWN_CONFIG map above.
  const [openWeekDrillDown, setOpenWeekDrillDown] = useState<{ label: string; startLabel: string; records: InspectionRecord[] } | null>(null);

  // School-rank modal: generic ranked-school view used by the 2 leaderboards.
  type RankKey = 'aadhaar' | 'reporting';
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
    setPhotoLoadFailed(false);
  }, [selectedPhoto?.id]);

  // ---- Overview section data (driven by overviewPeriod) ----
  const overviewRange = useMemo(
    () => computePeriodRange(overviewPeriod, overviewCustomStart, overviewCustomEnd),
    [overviewPeriod, overviewCustomStart, overviewCustomEnd]
  );
  const overviewInspections = useMemo(
    () => filterByRange(inspections, overviewRange),
    [inspections, overviewRange]
  );

  const schoolsInspectedCount = useMemo(
    () => new Set(overviewInspections.map(i => i.schoolName)).size,
    [overviewInspections]
  );

  const kitchenNotFunctional = useMemo(() => overviewInspections.filter(i => i.kitchenShed === 'no'), [overviewInspections]);
  const waterUnavailable = useMemo(() => overviewInspections.filter(i => i.waterSupply === 'no'), [overviewInspections]);
  const foodgrainNotDelivered = useMemo(() => overviewInspections.filter(i => i.foodgrainsDelivered === 'no'), [overviewInspections]);
  const mealsNotServed = useMemo(() => overviewInspections.filter(i => i.mealsServedAllFiveDays === 'no'), [overviewInspections]);

  const blockStats = useMemo(() => INITIAL_BLOCKS.map(blockName => ({
    name: blockName,
    total: overviewInspections.filter(i => i.block === blockName).length,
  })), [overviewInspections]);
  const maxBlockTotal = Math.max(1, ...blockStats.map(b => b.total));

  // Per-school snapshot, using each school's most recent inspection within the
  // overview period as its "current state" for the two leaderboards.
  const REPORTING_FIELDS: (keyof InspectionRecord)[] = ['submittedSDSEO', 'meghSimsDaily', 'foodgrainsReportedSDSEO'];
  const { aadhaarRanked, reportingRanked } = useMemo(() => {
    const schoolLatest = new Map<string, { record: InspectionRecord; block: string; recordCount: number }>();
    overviewInspections.forEach(i => {
      const existing = schoolLatest.get(i.schoolName);
      if (!existing) {
        schoolLatest.set(i.schoolName, { record: i, block: i.block, recordCount: 1 });
      } else {
        existing.recordCount += 1;
        if (new Date(i.timestamp) > new Date(existing.record.timestamp)) {
          existing.record = i;
        }
      }
    });

    const aadhaar: SchoolRankRow[] = [];
    const reporting: SchoolRankRow[] = [];
    schoolLatest.forEach(({ record, block, recordCount }, schoolName) => {
      const attendanceTotal = (record.attendanceBoys || 0) + (record.attendanceGirls || 0);
      const aadhaarTotal = (record.aadhaarBoys || 0) + (record.aadhaarGirls || 0);
      if (attendanceTotal > 0) {
        const pct = Math.round((aadhaarTotal / attendanceTotal) * 100);
        aadhaar.push({ schoolName, block, metricValue: pct, metricLabel: `${pct}%`, recordCount });
      }
      const answered = REPORTING_FIELDS.filter(f => record[f] === 'yes' || record[f] === 'no');
      if (answered.length > 0) {
        const yes = answered.filter(f => record[f] === 'yes').length;
        const pct = Math.round((yes / answered.length) * 100);
        reporting.push({ schoolName, block, metricValue: pct, metricLabel: `${pct}%`, recordCount });
      }
    });
    aadhaar.sort((a, b) => a.metricValue - b.metricValue);
    reporting.sort((a, b) => a.metricValue - b.metricValue);
    return { aadhaarRanked: aadhaar, reportingRanked: reporting };
  }, [overviewInspections]);

  // ---- Inspections Trend data (driven by its own trendYear/trendMonth, not overviewPeriod) ----
  const trendWeeks = useMemo(() => weeksForMonth(inspections, trendYear, trendMonth), [inspections, trendYear, trendMonth]);
  const maxTrendCount = Math.max(1, ...trendWeeks.map(w => w.records.length));
  const monthOptions = useMemo(() => {
    const opts: { year: number; month: number; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({ year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Recent Submissions -- always the 5 most recent inspections, independent of every filter ----
  const recentSubmissions = useMemo(
    () => [...inspections].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5),
    [inspections]
  );

  // ---- Official Inspection Logs data (the "master" section -- its own period + search + block) ----
  const logRange = useMemo(() => computePeriodRange(logPeriod, logCustomStart, logCustomEnd), [logPeriod, logCustomStart, logCustomEnd]);
  const logPeriodInspections = useMemo(() => filterByRange(inspections, logRange), [inspections, logRange]);
  const filteredInspections = useMemo(() => logPeriodInspections.filter(i => {
    const matchesBlock = selectedBlock === "All" || i.block === selectedBlock;
    const matchesSearch = searchQuery === ""
      || i.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
      || i.block.toLowerCase().includes(searchQuery.toLowerCase())
      || (i.remarks && i.remarks.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBlock && matchesSearch;
  }), [logPeriodInspections, selectedBlock, searchQuery]);

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
    all: { title: 'Schools Inspected', subtitle: PERIOD_LABELS[overviewPeriod], records: overviewInspections, columns: baseDrillDownColumns, filename: 'Schools_Inspected', accent: c.forest },
    kitchen: { title: 'Kitchen Not Functional', subtitle: PERIOD_LABELS[overviewPeriod], records: kitchenNotFunctional, columns: baseDrillDownColumns, filename: 'Kitchen_Not_Functional', accent: c.terracotta },
    water: { title: 'Water Supply Unavailable', subtitle: PERIOD_LABELS[overviewPeriod], records: waterUnavailable, columns: baseDrillDownColumns, filename: 'Water_Supply_Unavailable', accent: c.terracotta },
    foodgrain: { title: 'Foodgrain Not Delivered', subtitle: PERIOD_LABELS[overviewPeriod], records: foodgrainNotDelivered, columns: baseDrillDownColumns, filename: 'Foodgrain_Not_Delivered', accent: c.terracotta },
    meals: { title: 'Meals Not Served (All 5 Days)', subtitle: PERIOD_LABELS[overviewPeriod], records: mealsNotServed, columns: mealsNotServedColumns, filename: 'Meals_Not_Served', accent: c.terracotta },
  };

  const RANK_CONFIG: Record<RankKey, { title: string; subtitle: string; metricColumnLabel: string; rows: SchoolRankRow[]; filename: string }> = {
    aadhaar: { title: 'Lowest Aadhaar Coverage', subtitle: `${PERIOD_LABELS[overviewPeriod]} \u2022 (Aadhaar-linked \u00f7 attendance) at each school's latest inspection`, metricColumnLabel: 'Aadhaar Coverage', rows: aadhaarRanked, filename: 'Lowest_Aadhaar_Coverage' },
    reporting: { title: 'Lowest Reporting Compliance', subtitle: `${PERIOD_LABELS[overviewPeriod]} \u2022 SDSEO / MeghSIMS / foodgrain reporting`, metricColumnLabel: 'Reporting Compliance', rows: reportingRanked, filename: 'Lowest_Reporting_Compliance' },
  };

  // Records for a single school in the current overview period, used when
  // someone drills from a rank list into one specific school.
  const rankSchoolRecords = rankSchoolFocus ? overviewInspections.filter(i => i.schoolName === rankSchoolFocus) : [];

  // Small reusable period-picker row, used by both the overview section and
  // the inspection log section (each passes its own state in/out).
  function PeriodPicker({ value, onChange, customStart, customEnd, onCustomStartChange, onCustomEndChange }: {
    value: PeriodFilter; onChange: (p: PeriodFilter) => void;
    customStart: string; customEnd: string; onCustomStartChange: (v: string) => void; onCustomEndChange: (v: string) => void;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, display: "flex", alignItems: "center", gap: 5 }}>
          <Calendar size={13} color={c.textSecondary} /> Period:
        </span>
        <div style={{ display: "flex", gap: 4, background: c.paper, padding: 4, borderRadius: 10, border: `1px solid ${c.line}`, flexWrap: "wrap" }}>
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                background: value === p ? c.surface : "transparent",
                color: value === p ? c.forest : c.textSecondary,
                boxShadow: value === p ? shadows.sm : "none",
                whiteSpace: "nowrap"
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {value === 'custom' && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input type="date" value={customStart} max={customEnd || undefined} onChange={(e) => onCustomStartChange(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${c.line}`, fontSize: 12, color: c.ink, background: c.surface }} />
            <span style={{ fontSize: 12, color: c.textFaint }}>to</span>
            <input type="date" value={customEnd} min={customStart || undefined} onChange={(e) => onCustomEndChange(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${c.line}`, fontSize: 12, color: c.ink, background: c.surface }} />
            {(!customStart || !customEnd) && <span style={{ fontSize: 11, color: c.textFaint }}>Pick both dates</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: isMobile ? "16px 12px" : "32px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

      {/* Header Bar */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>
          PM Poshan Monitoring Dashboard
        </h1>
        <p style={{ fontSize: isMobile ? 12 : 14, color: c.textSecondary, margin: 0, lineHeight: 1.4 }}>
          Real-time inspection coverage and meal compliance analytics for East Khasi Hills district.
        </p>
      </div>

      {/* ===== Overview section (shared overviewPeriod) ===== */}
      <div style={{ marginBottom: isMobile ? 14 : 18 }}>
        <PeriodPicker
          value={overviewPeriod} onChange={setOverviewPeriod}
          customStart={overviewCustomStart} customEnd={overviewCustomEnd}
          onCustomStartChange={setOverviewCustomStart} onCustomEndChange={setOverviewCustomEnd}
        />
      </div>

      {/* Schools Inspected */}
      <button
        onClick={() => setOpenDrillDown('all')}
        style={{
          background: c.surface, borderRadius: 16, padding: isMobile ? 16 : 22, border: `1px solid ${c.line}`, boxShadow: shadows.sm,
          cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, width: "100%",
          marginBottom: isMobile ? 14 : 18
        }}
      >
        <div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: 10, background: c.mint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ClipboardCheck size={isMobile ? 18 : 21} color={c.forest} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>{schoolsInspectedCount}</div>
          <div style={{ fontSize: 12, color: c.textSecondary, fontWeight: 500 }}>Schools inspected \u2022 For: {PERIOD_LABELS[overviewPeriod]} \u2022 Tap for details</div>
        </div>
        <ChevronRight size={16} color={c.textFaint} />
      </button>

      {/* Action Required */}
      <div style={{ background: c.surface, borderRadius: 16, padding: isMobile ? 16 : 22, border: `1px solid ${c.line}`, boxShadow: shadows.sm, marginBottom: isMobile ? 14 : 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} color={c.terracotta} />
            <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: c.ink }}>Action Required</span>
          </div>
          <span style={{ fontSize: 10, color: c.textFaint }}>For: {PERIOD_LABELS[overviewPeriod]}</span>
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

      {/* Inspections by Block */}
      <div style={{ background: c.surface, padding: isMobile ? 16 : 22, borderRadius: 16, border: `1px solid ${c.line}`, boxShadow: shadows.sm, marginBottom: isMobile ? 14 : 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: c.ink }}>Inspections by Block</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: c.textFaint }}>For: {PERIOD_LABELS[overviewPeriod]}</span>
            <Building2 size={16} color={c.forest} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {blockStats.map((block) => (
            <div key={block.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: block.total === 0 ? c.textFaint : c.ink, width: isMobile ? 82 : 110, flexShrink: 0 }}>{block.name}</span>
              <div style={{ flex: 1, height: 8, background: c.mint, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: block.total === 0 ? "0%" : `${Math.round((block.total / maxBlockTotal) * 100)}%`,
                  height: "100%", background: block.total === 0 ? c.line : c.forest, borderRadius: 4,
                  transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: block.total === 0 ? c.textFaint : c.forest, width: 18, textAlign: "right" }}>{block.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inspections Trend -- its own month picker, independent of the period above */}
      <div style={{ background: c.surface, padding: isMobile ? 16 : 22, borderRadius: 16, border: `1px solid ${c.line}`, boxShadow: shadows.sm, marginBottom: isMobile ? 14 : 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: c.ink }}>Inspections Trend</span>
          <select
            value={`${trendYear}-${trendMonth}`}
            onChange={(e) => { const [y, m] = e.target.value.split('-').map(Number); setTrendYear(y); setTrendMonth(m); }}
            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${c.line}`, fontSize: 12, fontWeight: 700, color: c.forest, background: c.paper, cursor: "pointer" }}
          >
            {monthOptions.map(o => <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>{o.label}</option>)}
          </select>
        </div>
        <p style={{ fontSize: 11, color: c.textFaint, margin: "0 0 14px" }}>Independent of the period filter above \u2022 tap a week to see who submitted</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 6 : 10, height: 90, marginBottom: 6 }}>
          {trendWeeks.map((w, idx) => (
            <button
              key={idx}
              onClick={() => setOpenWeekDrillDown({ label: w.label, startLabel: w.startLabel, records: w.records })}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: c.textSecondary }}>{w.records.length}</span>
              <div style={{
                width: "100%",
                height: `${Math.max(4, (w.records.length / maxTrendCount) * 60)}px`,
                background: c.mint, borderRadius: 4, transition: "height 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
              }} />
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: isMobile ? 6 : 10 }}>
          {trendWeeks.map((w, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: c.ink }}>{w.label}</div>
              <div style={{ fontSize: 9, color: c.textFaint }}>{w.startLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Submissions -- always the latest 5, regardless of any filter on the page */}
      <div style={{ background: c.surface, padding: isMobile ? 16 : 22, borderRadius: 16, border: `1px solid ${c.line}`, boxShadow: shadows.sm, marginBottom: isMobile ? 14 : 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: c.ink }}>Recent Submissions</span>
          <Camera size={16} color={c.forest} />
        </div>
        <p style={{ fontSize: 11, color: c.textFaint, margin: "0 0 12px" }}>Latest 5, always \u2014 not affected by filters on this page</p>
        {recentSubmissions.length === 0 ? (
          <div style={{ fontSize: 12, color: c.textFaint, padding: "10px 0" }}>No inspections submitted yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentSubmissions.map(insp => (
              <button
                key={insp.id}
                onClick={() => insp.photoUrl && setSelectedPhoto(insp)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10,
                  border: `1px solid ${c.line}`, background: c.paper, width: "100%", textAlign: "left",
                  cursor: insp.photoUrl ? "pointer" : "default"
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: c.mint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {insp.photoUrl ? <Camera size={14} color={c.forest} /> : <ClipboardCheck size={14} color={c.forest} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{insp.schoolName}</div>
                  <div style={{ fontSize: 10, color: c.textSecondary }}>{insp.block} Block \u2022 {new Date(insp.timestamp).toLocaleDateString()} {new Date(insp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {insp.photoUrl && <ChevronRight size={14} color={c.textFaint} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
        gap: isMobile ? 12 : 16,
        marginBottom: isMobile ? 20 : 28
      }}>
        {([
          { key: 'aadhaar' as const, title: 'Lowest Aadhaar Coverage', icon: UserCheck, rows: aadhaarRanked, explainer: "Of students present, % with Aadhaar linked, at each school's latest inspection." },
          { key: 'reporting' as const, title: 'Lowest Reporting Compliance', icon: ShieldCheck, rows: reportingRanked, explainer: "% of 3 required reports done (SDSEO form, MeghSIMS daily, foodgrain) at each school's latest inspection." },
        ]).map(panel => (
          <div key={panel.key} style={{ background: c.surface, padding: isMobile ? 14 : 18, borderRadius: 16, border: `1px solid ${c.line}`, boxShadow: shadows.sm, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <panel.icon size={15} color={c.terracotta} />
                <span style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>{panel.title}</span>
              </div>
              <span style={{ fontSize: 10, color: c.textFaint, whiteSpace: "nowrap" }}>For: {PERIOD_LABELS[overviewPeriod]}</span>
            </div>
            <p style={{ fontSize: 11, color: c.textFaint, margin: "0 0 12px" }}>{panel.explainer}</p>
            {panel.rows.length === 0 ? (
              <div style={{ fontSize: 12, color: c.textFaint, padding: "10px 0" }}>No schools flagged for this period.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {panel.rows.slice(0, 2).map((r, idx) => (
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
              See all
            </button>
          </div>
        ))}
      </div>

      {/* ===== Official Inspection Logs -- the "master" section: its own period, search, block filter, and the only exports ===== */}
      <div style={{
        background: c.surface,
        borderRadius: 18,
        padding: isMobile ? 16 : 24,
        border: `1px solid ${c.line}`,
        boxShadow: shadows.sm,
        marginBottom: 24
      }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: c.ink, margin: 0 }}>Official Inspection Logs</h3>
          <p style={{ fontSize: 12, color: c.textSecondary, margin: "2px 0 0 0" }}>
            Showing {filteredInspections.length} of {logPeriodInspections.length} entries \u2022 Its own period, filters, and exports \u2014 independent of the sections above
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <PeriodPicker
            value={logPeriod} onChange={setLogPeriod}
            customStart={logCustomStart} customEnd={logCustomEnd}
            onCustomStartChange={setLogCustomStart} onCustomEndChange={setLogCustomEnd}
          />
        </div>

        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 10,
          alignItems: isMobile ? "stretch" : "center",
          width: "100%",
          marginBottom: 16,
          flexWrap: "wrap"
        }}>
          {/* Search Input */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, background: c.paper, padding: "9px 12px", borderRadius: 10,
            border: `1px solid ${c.line}`, width: isMobile ? "100%" : 220, boxSizing: "border-box"
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
            display: "flex", alignItems: "center", gap: 6, background: c.paper, padding: "9px 12px", borderRadius: 10,
            border: `1px solid ${c.line}`, width: isMobile ? "100%" : "auto", boxSizing: "border-box"
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: isMobile ? 0 : "auto", width: isMobile ? "100%" : "auto" }}>
            <button
              onClick={() => {
                const rangeText = logRange.startISO || logRange.endISO
                  ? `from ${logRange.startISO || 'the beginning'} to ${logRange.endISO || 'now'}`
                  : 'for all time';
                const blockText = selectedBlock !== 'All' ? `, Block: ${selectedBlock}` : '';
                const proceed = window.confirm(`Export ${filteredInspections.length} inspections ${rangeText}${blockText}?`);
                if (!proceed) return;
                exportInspectionsXLSX(filteredInspections, { start: logRange.startISO, end: logRange.endISO });
              }}
              style={{
                flex: isMobile ? 1 : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: isMobile ? "10px 12px" : "10px 16px", background: c.surface, border: `1px solid ${c.line}`, borderRadius: 10,
                cursor: "pointer", boxShadow: shadows.sm, color: c.ink, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap"
              }}
            >
              <Download size={15} /> Export Excel
            </button>

            <button
              onClick={async () => {
                const rangeText = logRange.startISO || logRange.endISO
                  ? `from ${logRange.startISO || 'the beginning'} to ${logRange.endISO || 'now'}`
                  : 'for all time';
                const blockText = selectedBlock !== 'All' ? `, Block: ${selectedBlock}` : '';
                const proceed = window.confirm(`Export ${filteredInspections.length} inspections as a PDF report ${rangeText}${blockText}?`);
                if (!proceed) return;
                setExportingPDF(true);
                try {
                  await exportInspectionsPDF(filteredInspections, { start: logRange.startISO, end: logRange.endISO }, selectedBlock !== 'All' ? `${selectedBlock} Block` : undefined);
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Could not generate the PDF report. Please try again.');
                } finally {
                  setExportingPDF(false);
                }
              }}
              disabled={exportingPDF}
              style={{
                flex: isMobile ? 1 : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: isMobile ? "10px 12px" : "10px 16px", background: c.surface, border: `1px solid ${c.line}`, borderRadius: 10,
                cursor: exportingPDF ? "wait" : "pointer", boxShadow: shadows.sm, color: c.ink, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap"
              }}
            >
              <FileText size={15} /> {exportingPDF ? "Generating PDF..." : "Export PDF"}
            </button>

            <button
              onClick={async () => {
                const photoCount = filteredInspections.filter(i => !!i.photoUrl).length;
                const rangeText = logRange.startISO || logRange.endISO
                  ? `from ${logRange.startISO || 'the beginning'} to ${logRange.endISO || 'now'}`
                  : 'for all time';
                const blockText = selectedBlock !== 'All' ? `, Block: ${selectedBlock}` : '';
                const proceed = window.confirm(`Export ${photoCount} photo${photoCount === 1 ? '' : 's'} ${rangeText}${blockText}?`);
                if (!proceed) return;
                setExportingZip(true);
                try {
                  await exportPhotosZip(filteredInspections, { start: logRange.startISO, end: logRange.endISO });
                } finally {
                  setExportingZip(false);
                }
              }}
              disabled={exportingZip}
              style={{
                flex: isMobile ? 1 : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: isMobile ? "10px 12px" : "10px 16px", background: c.forest, border: "none", borderRadius: 10,
                cursor: exportingZip ? "wait" : "pointer", boxShadow: shadows.sm, color: "#FFFFFF", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap"
              }}
            >
              <FolderDown size={15} /> {exportingZip ? "Zipping..." : "Export Photos"}
            </button>
          </div>
        </div>

        {/* Inspections Table / Cards */}
        {filteredInspections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: c.textSecondary }}>
            <ClipboardCheck size={36} color={c.textFaint} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: c.ink, margin: 0 }}>No inspection records match your filters.</p>
            <p style={{ fontSize: 12, color: c.textFaint, marginTop: 4 }}>Try adjusting search terms, the block filter, or the period above.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredInspections.map((insp) => (
              <div
                key={insp.id}
                style={{
                  background: c.paper, borderRadius: 14, padding: isMobile ? "12px 14px" : "16px 20px", border: `1px solid ${c.line}`,
                  display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "space-between", gap: isMobile ? 10 : 16
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%" }}>
                  <div style={{
                    width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: 10, background: c.mint,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
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
                      <span>\u2022</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={11} /> {new Date(insp.timestamp).toLocaleDateString()} {new Date(insp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: isMobile ? "100%" : "auto",
                  borderTop: isMobile ? `1px solid ${c.line}` : "none", paddingTop: isMobile ? 8 : 0, gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: c.textFaint, fontWeight: 500 }}>Students Present</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c.forest }}>{insp.studentCount}</div>
                  </div>

                  {insp.photoUrl && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setSelectedPhoto(insp)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: c.surface,
                          border: `1px solid ${c.line}`, fontSize: 11, fontWeight: 600, color: c.forest, cursor: "pointer"
                        }}
                      >
                        <Camera size={13} /> Photo
                      </button>
                      <button
                        onClick={() => downloadInspectionPhoto(insp).catch(e => console.error(e))}
                        title="Download this photo"
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: c.surface,
                          border: `1px solid ${c.line}`, fontSize: 11, fontWeight: 600, color: c.textSecondary, cursor: "pointer"
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

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
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
                <div style={{ fontSize: 11, color: c.textSecondary }}>{selectedPhoto.block} Block \u2022 {new Date(selectedPhoto.timestamp).toLocaleDateString()}</div>
              </div>
              <button
                onClick={() => downloadInspectionPhoto(selectedPhoto).catch(e => console.error(e))}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: c.forest,
                  border: "none", fontSize: 12, fontWeight: 700, color: "#FFFFFF", cursor: "pointer"
                }}
              >
                <Download size={14} /> Download
              </button>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
                width: 36, height: 36, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
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

      {/* Inspections Trend -- one clicked week */}
      {openWeekDrillDown && (
        <DrillDownModal
          open={!!openWeekDrillDown}
          onClose={() => setOpenWeekDrillDown(null)}
          title={`${openWeekDrillDown.label} \u2014 ${MONTH_NAMES[trendMonth]} ${trendYear}`}
          subtitle={`Starts ${openWeekDrillDown.startLabel} \u2022 ${openWeekDrillDown.records.length} submission${openWeekDrillDown.records.length === 1 ? '' : 's'}`}
          records={openWeekDrillDown.records}
          columns={baseDrillDownColumns}
          exportFilenameBase={`Inspections_${openWeekDrillDown.label.replace(' ', '_')}_${MONTH_NAMES[trendMonth]}_${trendYear}`}
          accentColor={c.forest}
        />
      )}

      {/* Leaderboards -- full ranked list */}
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

      {/* One school's records, reached by clicking into a leaderboard */}
      {rankSchoolFocus && (
        <DrillDownModal
          open={!!rankSchoolFocus}
          onClose={() => setRankSchoolFocus(null)}
          title={rankSchoolFocus}
          subtitle={`${PERIOD_LABELS[overviewPeriod]} \u2022 ${rankSchoolRecords.length} inspection${rankSchoolRecords.length === 1 ? '' : 's'}`}
          records={rankSchoolRecords}
          columns={mealsNotServedColumns}
          exportFilenameBase={`School_${rankSchoolFocus.replace(/[^a-zA-Z0-9]+/g, '_')}`}
        />
      )}

    </div>
  );
}
