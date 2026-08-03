import React, { useState, useMemo } from 'react';
import { X, Search, Filter, Download, Inbox, ChevronRight } from 'lucide-react';
import { exportRowsXLSX } from '../utils/storage';

const c = {
  ink: "#111827",
  forest: "#0F4C3A",
  surface: "#FFFFFF",
  line: "#E2E8F0",
  textSecondary: "#4B5563",
  textFaint: "#9CA3AF",
  paper: "#F8FAF8",
  terracotta: "#DC2626",
};

export interface SchoolRankRow {
  schoolName: string;
  block: string;
  metricValue: number;   // used for sorting only
  metricLabel: string;   // display string, e.g. "42%" or "3 of 4 issues"
  recordCount: number;
}

interface SchoolRankModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  metricColumnLabel: string;
  rows: SchoolRankRow[]; // already sorted worst-first by the caller
  onSelectSchool: (schoolName: string) => void;
  exportFilenameBase: string;
  accentColor?: string;
}

export function SchoolRankModal({ open, onClose, title, subtitle, metricColumnLabel, rows, onSelectSchool, exportFilenameBase, accentColor = c.terracotta }: SchoolRankModalProps) {
  const [search, setSearch] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('All');

  const blocks = useMemo(() => Array.from(new Set(rows.map(r => r.block))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (selectedBlock !== 'All' && r.block !== selectedBlock) return false;
      if (search && !r.schoolName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, selectedBlock, search]);

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="pop"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 820, maxHeight: "85vh", background: c.surface, borderRadius: 20, boxShadow: "0 20px 48px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${c.line}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: c.ink, margin: 0 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: c.textSecondary, margin: "4px 0 0" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: c.paper, border: `1px solid ${c.line}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={16} color={c.textSecondary} />
          </button>
        </div>

        <div style={{ padding: "14px 22px", borderBottom: `1px solid ${c.line}`, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: c.paper, padding: "8px 12px", borderRadius: 10, border: `1px solid ${c.line}`, minWidth: 200, flex: "1 1 200px" }}>
            <Search size={14} color={c.textFaint} />
            <input type="text" placeholder="Search school..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", color: c.ink }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.paper, padding: "8px 12px", borderRadius: 10, border: `1px solid ${c.line}` }}>
            <Filter size={13} color={accentColor} />
            <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: c.ink, outline: "none", cursor: "pointer" }}>
              <option value="All">All Blocks</option>
              {blocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <button
            onClick={() => exportRowsXLSX(
              filtered,
              [
                { header: 'School Name', width: 28, value: (r: SchoolRankRow) => r.schoolName },
                { header: 'Block', width: 16, value: (r: SchoolRankRow) => r.block },
                { header: metricColumnLabel, width: 20, value: (r: SchoolRankRow) => r.metricLabel },
                { header: 'Inspection Records', width: 16, value: (r: SchoolRankRow) => r.recordCount },
              ],
              exportFilenameBase
            )}
            disabled={filtered.length === 0}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: accentColor, color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: filtered.length === 0 ? "not-allowed" : "pointer", opacity: filtered.length === 0 ? 0.5 : 1, whiteSpace: "nowrap" }}
          >
            <Download size={13} /> Export Excel
          </button>
        </div>

        <div style={{ overflow: "auto", flex: 1, padding: "10px 22px 20px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: c.textSecondary }}>
              <Inbox size={32} color={c.textFaint} style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: c.ink, margin: 0 }}>No schools match your filters.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((r, idx) => (
                <button
                  key={r.schoolName}
                  onClick={() => onSelectSchool(r.schoolName)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${c.line}`, background: c.paper, cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "#FFFFFF", border: `1px solid ${c.line}`, fontSize: 11, fontWeight: 800, color: c.textSecondary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>{r.schoolName}</div>
                    <div style={{ fontSize: 11, color: c.textSecondary }}>{r.block} Block • {r.recordCount} inspection{r.recordCount === 1 ? '' : 's'} in period</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: accentColor, whiteSpace: "nowrap" }}>{r.metricLabel}</div>
                  <ChevronRight size={16} color={c.textFaint} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
