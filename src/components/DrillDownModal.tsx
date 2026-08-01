import React, { useState, useMemo } from 'react';
import { X, Search, Filter, Download, Calendar, Inbox } from 'lucide-react';
import { InspectionRecord } from '../types';
import { exportRowsXLSX, XlsxColumn } from '../utils/storage';

const c = {
  ink: "#111827",
  forest: "#0F4C3A",
  surface: "#FFFFFF",
  line: "#E2E8F0",
  textSecondary: "#4B5563",
  textFaint: "#9CA3AF",
  paper: "#F8FAF8",
  mint: "#E8F5E9",
  terracotta: "#DC2626",
  terracottaSoft: "#FEE2E2",
};

// A display column doubles as the xlsx export column definition, so the on-screen
// table and the exported spreadsheet are always in sync.
export interface DrillDownColumn extends XlsxColumn {
  // Optional custom on-screen renderer; falls back to the raw `value()` as text.
  render?: (row: InspectionRecord) => React.ReactNode;
}

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  records: InspectionRecord[];
  columns: DrillDownColumn[];
  exportFilenameBase: string;
  accentColor?: string;
}

export function DrillDownModal({ open, onClose, title, subtitle, records, columns, exportFilenameBase, accentColor = c.forest }: DrillDownModalProps) {
  const [search, setSearch] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedInspector, setSelectedInspector] = useState('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const blocks = useMemo(() => Array.from(new Set(records.map(r => r.block))).sort(), [records]);
  const inspectors = useMemo(() => Array.from(new Set(records.map(r => (r.inspectorName || '').trim()).filter(Boolean))).sort(), [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (selectedBlock !== 'All' && r.block !== selectedBlock) return false;
      if (selectedInspector !== 'All' && (r.inspectorName || '').trim() !== selectedInspector) return false;
      if (dateStart && new Date(r.timestamp) < new Date(`${dateStart}T00:00:00`)) return false;
      if (dateEnd && new Date(r.timestamp) > new Date(`${dateEnd}T23:59:59`)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.schoolName} ${r.block} ${r.inspectorName || ''} ${r.remarks || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, selectedBlock, selectedInspector, dateStart, dateEnd, search]);

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="pop"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 1100, maxHeight: "88vh", background: c.surface, borderRadius: 20, boxShadow: "0 20px 48px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${c.line}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: c.ink, margin: 0 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: c.textSecondary, margin: "4px 0 0" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: c.paper, border: `1px solid ${c.line}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={16} color={c.textSecondary} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: "14px 22px", borderBottom: `1px solid ${c.line}`, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: c.paper, padding: "8px 12px", borderRadius: 10, border: `1px solid ${c.line}`, minWidth: 200, flex: "1 1 200px" }}>
            <Search size={14} color={c.textFaint} />
            <input
              type="text"
              placeholder="Search school, block, inspector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", color: c.ink }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.paper, padding: "8px 12px", borderRadius: 10, border: `1px solid ${c.line}` }}>
            <Filter size={13} color={accentColor} />
            <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: c.ink, outline: "none", cursor: "pointer" }}>
              <option value="All">All Blocks</option>
              {blocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.paper, padding: "8px 12px", borderRadius: 10, border: `1px solid ${c.line}` }}>
            <select value={selectedInspector} onChange={(e) => setSelectedInspector(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: c.ink, outline: "none", cursor: "pointer" }}>
              <option value="All">All Inspectors</option>
              {inspectors.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.paper, padding: "8px 12px", borderRadius: 10, border: `1px solid ${c.line}` }}>
            <Calendar size={13} color={c.textFaint} />
            <input type="date" value={dateStart} max={dateEnd || undefined} onChange={(e) => setDateStart(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 12, color: c.ink, outline: "none" }} />
            <span style={{ fontSize: 11, color: c.textFaint }}>to</span>
            <input type="date" value={dateEnd} min={dateStart || undefined} onChange={(e) => setDateEnd(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 12, color: c.ink, outline: "none" }} />
          </div>

          <button
            onClick={() => exportRowsXLSX(filtered, columns, exportFilenameBase)}
            disabled={filtered.length === 0}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: accentColor, color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: filtered.length === 0 ? "not-allowed" : "pointer", opacity: filtered.length === 0 ? 0.5 : 1, whiteSpace: "nowrap" }}
          >
            <Download size={13} /> Export Excel
          </button>
        </div>

        <div style={{ padding: "6px 22px", fontSize: 11, color: c.textFaint, flexShrink: 0 }}>
          Showing {filtered.length} of {records.length} records
        </div>

        {/* Table */}
        <div style={{ overflow: "auto", flex: 1, padding: "0 22px 20px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: c.textSecondary }}>
              <Inbox size={32} color={c.textFaint} style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: c.ink, margin: 0 }}>No records match your filters.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.header} style={{ textAlign: "left", padding: "8px 10px", color: c.textSecondary, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `2px solid ${c.line}`, position: "sticky", top: 0, background: c.surface, whiteSpace: "nowrap" }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${c.line}` }}>
                    {columns.map(col => (
                      <td key={col.header} style={{ padding: "9px 10px", color: c.ink, verticalAlign: "top" }}>
                        {col.render ? col.render(row) : String(col.value(row) ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
