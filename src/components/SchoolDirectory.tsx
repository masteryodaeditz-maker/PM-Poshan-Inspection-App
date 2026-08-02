import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Calendar, Plus } from 'lucide-react';
import { SchoolRecord } from '../types';
import { getSchools } from '../utils/storage';
import { INITIAL_BLOCKS } from '../data/mockData';

const c = {
  ink: "#111827",
  forest: "#0F4C3A",
  surface: "#FFFFFF",
  line: "#E2E8F0",
  textSecondary: "#4B5563",
  paper: "#F8FAF8",
  mint: "#E8F5E9",
  mintDark: "#1B5E20",
  terracotta: "#DC2626"
};

export function SchoolDirectory() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<string>("All");

  useEffect(() => {
    setLoading(true);
    getSchools()
      .then(setSchools)
      .catch((e) => console.error('Error loading schools', e))
      .finally(() => setLoading(false));
  }, []);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filtered = schools.filter(s => {
    const matchBlock = selectedBlock === "All" || s.block === selectedBlock;
    const matchSearch = search === ""
      || s.name.toLowerCase().includes(search.toLowerCase())
      || s.category.toLowerCase().includes(search.toLowerCase());
    return matchBlock && matchSearch;
  });

  return (
    <div className="fade-in" style={{ padding: isMobile ? "16px 12px" : "32px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
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
            East Khasi Hills PM Poshan School Directory
          </h1>
          <p style={{ fontSize: isMobile ? 12 : 14, color: c.textSecondary, margin: 0, lineHeight: 1.4 }}>
            Master school list, student enrolment, and historical compliance logs.
          </p>
        </div>

        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 10,
          width: isMobile ? "100%" : "auto"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: c.surface,
            padding: "9px 12px",
            borderRadius: 10,
            border: `1px solid ${c.line}`,
            width: isMobile ? "100%" : "auto",
            boxSizing: "border-box"
          }}>
            <Search size={16} color={c.textSecondary} />
            <input
              type="text"
              placeholder="Search school name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: c.ink, width: "100%" }}
            />
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: c.surface,
            padding: "9px 12px",
            borderRadius: 10,
            border: `1px solid ${c.line}`,
            width: isMobile ? "100%" : "auto",
            boxSizing: "border-box"
          }}>
            <Filter size={14} color={c.forest} />
            <select
              value={selectedBlock}
              onChange={e => setSelectedBlock(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: c.ink, outline: "none", cursor: "pointer", width: "100%" }}
            >
              <option value="All" style={{ background: "#FFFFFF", color: "#111827" }}>All Blocks</option>
              {INITIAL_BLOCKS.map(b => <option key={b} value={b} style={{ background: "#FFFFFF", color: "#111827" }}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: c.textSecondary, fontSize: 14 }}>
          Loading schools...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center", color: c.textSecondary, fontSize: 14 }}>
          No schools yet — they're added automatically the first time each one is inspected.
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
        gap: isMobile ? 12 : 18
      }}>
        {!loading && filtered.map(school => (
          <div
            key={school.id}
            style={{
              background: c.surface,
              borderRadius: 16,
              padding: isMobile ? 16 : 20,
              border: `1px solid ${c.line}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.forest, background: c.mint, padding: "3px 8px", borderRadius: 6 }}>
                  {school.block} Block
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.textSecondary, border: `1px solid ${c.line}`, padding: "2px 8px", borderRadius: 6 }}>
                  {school.category}
                </span>
              </div>

              <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: c.ink, marginBottom: 10, lineHeight: 1.3 }}>
                {school.name}
              </h3>

            </div>

            <div style={{ borderTop: `1px solid ${c.line}`, paddingTop: 12 }}>
              <span style={{ fontSize: 11, color: c.textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={12} /> Last: {school.lastInspected ? new Date(school.lastInspected).toLocaleDateString() : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
