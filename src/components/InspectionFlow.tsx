import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Building2, GraduationCap, Users,
  Camera, MapPin, MessageSquare, CheckCircle2, Utensils, X,
  Leaf, Wheat, Carrot, Soup, AlertTriangle, Sparkles, Image, Check, ClipboardList, FileText, Upload
} from "lucide-react";
import { BlockName, SchoolCategory, QualityIssueCategory, InspectionRecord, SchoolRecord } from "../types";
import { INITIAL_BLOCKS, SCHOOL_TYPES, ISSUE_CATEGORIES } from "../data/mockData";
import { getSchools } from "../utils/storage";
import pmPoshanBanner from "../assets/images/poshan_minimal_hero_1785183621105.jpg";
import bgNutrition from "../assets/images/poshan_bg_nutrition_1785183996328.jpg";
import bgEvidence from "../assets/images/poshan_bg_evidence_1785184009911.jpg";
import bgReview from "../assets/images/poshan_bg_review_1785184023077.jpg";
import attendanceBanner from "../assets/images/attendance_art_style_1785262331458.jpg";
import facilitiesArt from "../assets/images/kitchen_facilities_art_1785262461601.jpg";
import reportingComplianceArt from "../assets/images/reporting_cool_light_art_1785262077530.jpg";
import evidenceArt from "../assets/images/evidence_art_style_1785262642729.jpg";
import auditSummaryArt from "../assets/images/audit_summary_art_1785263846431.jpg";

// Design Tokens (PM Poshan Official Minimalist Editorial Light Theme)
const c = {
  ink: "#111827",
  forest: "#0F4C3A",
  forestHover: "#0B3C2E",
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
  sm: "0 1px 3px rgba(0,0,0,0.04)",
  md: "0 4px 16px rgba(0,0,0,0.05)",
  float: "0 12px 32px rgba(15,76,58,0.12)"
};

const STEP_THEME = [
  { color: "rgba(15,76,58,0.04)", icon: MapPin, deco: Leaf },
  { color: "rgba(217,119,6,0.04)", icon: Utensils, deco: Wheat },
  { color: "rgba(220,38,38,0.03)", icon: Camera, deco: Carrot },
  { color: "rgba(15,76,58,0.04)", icon: CheckCircle2, deco: Soup },
];

const STEPS = ["Location", "Attendance", "Facilities", "Reporting", "Evidence", "Review"];

function FloatingField({ icon: Icon, label, children, active, filled, rightElement }: {
  icon: any;
  label: string;
  children: React.ReactNode;
  active: boolean;
  filled: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: active ? `2px solid ${c.forest}` : filled ? `1.5px solid #4CAF50` : `1.5px solid ${c.line}`,
        borderRadius: 14,
        background: c.surface,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        transition: "all 0.2s ease",
        boxShadow: active ? "0 0 0 3px rgba(15,76,58,0.08)" : shadows.sm,
      }}
    >
      <Icon size={18} color={active ? c.forest : filled ? "#2E7D32" : c.textFaint} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", gap: 2 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: active ? c.forest : filled ? "#2E7D32" : c.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.08em"
          }}
        >
          {label}
        </span>
        {children}
      </div>
      {rightElement}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 14,
  fontWeight: 600,
  color: c.ink,
  padding: "2px 0 0 0",
  fontFamily: "inherit"
};

interface InspectionFlowProps {
  onSave: (record: Omit<InspectionRecord, 'id' | 'timestamp'>) => Promise<void>;
  onDoneViewDashboard?: () => void;
}

export function InspectionFlow({ onSave, onDoneViewDashboard }: InspectionFlowProps) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Form State
  const [block, setBlock] = useState<BlockName | "">("Mawphlang");
  const [schoolName, setSchoolName] = useState("Mawphlang Govt. LP School");
  const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>(["LP"]);
  const [managementType, setManagementType] = useState<string>("Government");

  const toggleSchoolCategory = (cat: SchoolCategory) => {
    setSchoolCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };
  const [attendanceBoys, setAttendanceBoys] = useState<string>("0");
  const [attendanceGirls, setAttendanceGirls] = useState<string>("0");
  const [aadhaarBoys, setAadhaarBoys] = useState<string>("0");
  const [aadhaarGirls, setAadhaarGirls] = useState<string>("0");
  const [kitchenShed, setKitchenShed] = useState<"yes" | "no">("yes");
  const [kitchenShedReason, setKitchenShedReason] = useState<string>("");
  const [foodgrainsDelivered, setFoodgrainsDelivered] = useState<"yes" | "no">("yes");
  const [foodgrainsReportedSDSEO, setFoodgrainsReportedSDSEO] = useState<"yes" | "no">("no");
  const [waterSupply, setWaterSupply] = useState<"yes" | "no">("yes");
  const [waterSupplyReason, setWaterSupplyReason] = useState<string>("");
  const [kitchenGarden, setKitchenGarden] = useState<"yes" | "no">("yes");
  const [kitchenGardenType, setKitchenGardenType] = useState<string>("Open Garden");
  const [kitchenGardenReason, setKitchenGardenReason] = useState<string>("");
  const [monthlyFormMonth, setMonthlyFormMonth] = useState<string>("");
  const [utilizationCertMonth, setUtilizationCertMonth] = useState<string>("");
  const [submittedSDSEO, setSubmittedSDSEO] = useState<"yes" | "no">("yes");
  const [sdseoNonSubmissionReason, setSdseoNonSubmissionReason] = useState<string>("");
  const [foodgrainsNoReportReason, setFoodgrainsNoReportReason] = useState<string>("");
  const [meghSimsDaily, setMeghSimsDaily] = useState<"yes" | "no">("yes");
  const [meghSimsNoReason, setMeghSimsNoReason] = useState<string>("");
  const [mealsServedAllFiveDays, setMealsServedAllFiveDays] = useState<"yes" | "no">("yes");
  const [missedMealDaysCount, setMissedMealDaysCount] = useState<string>("");
  const [missedMealDaysReason, setMissedMealDaysReason] = useState<string>("");
  const [mealServed, setMealServed] = useState<"yes" | "no" | null>("yes");
  const [studentCount, setStudentCount] = useState<string>("");
  const [expectedCount, setExpectedCount] = useState<string>("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: string; lng: string } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [issueCategory, setIssueCategory] = useState<QualityIssueCategory | "">("");
  const [inspectorName, setInspectorName] = useState("Bah K. Lyngdoh (Block Officer)");

  // Registered schools list for dropdown suggestion
  const [registeredSchools, setRegisteredSchools] = useState<SchoolRecord[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<string[]>([]);

  useEffect(() => {
    getSchools().then(setRegisteredSchools).catch((e) => console.error('Error loading schools', e));
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (block) {
      const match = registeredSchools.filter(s => s.block === block).map(s => s.name);
      setFilteredSchools(match);
    } else {
      setFilteredSchools(registeredSchools.map(s => s.name));
    }
  }, [block]);

  const fetchGeolocation = () => {
    if (!navigator.geolocation) {
      setGeo({ lat: "25.5138", lng: "91.8933" });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4)
        });
        setGeoLoading(false);
      },
      () => {
        // Fallback East Khasi Hills coordinates
        setGeo({ lat: "25.5138", lng: "91.8933" });
        setGeoLoading(false);
      },
      { timeout: 5000 }
    );
  };

  const canContinue = () => {
    if (step === 0) return block !== "" && schoolName.trim().length > 0 && schoolCategories.length > 0;
    if (step === 1) return attendanceBoys !== "" && attendanceGirls !== "";
    if (step === 2) return true;
    return true;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (!geo) fetchGeolocation();
  };

  const handleSubmit = async () => {
    const totalAtt = (parseInt(attendanceBoys, 10) || 0) + (parseInt(attendanceGirls, 10) || 0);
    const record: Omit<InspectionRecord, 'id' | 'timestamp'> = {
      block: block as BlockName,
      schoolName: schoolName.trim(),
      schoolCategory: (schoolCategories.length > 0 ? schoolCategories.join(", ") : "LP") as SchoolCategory,
      managementType: managementType || undefined,
      mealServed: "yes",
      studentCount: totalAtt,
      expectedStudentCount: parseInt(expectedCount, 10) || 120,
      attendanceBoys: parseInt(attendanceBoys, 10) || 0,
      attendanceGirls: parseInt(attendanceGirls, 10) || 0,
      aadhaarBoys: parseInt(aadhaarBoys, 10) || 0,
      aadhaarGirls: parseInt(aadhaarGirls, 10) || 0,
      photoUrl: photo || undefined,
      latitude: geo?.lat,
      longitude: geo?.lng,
      remarks: remarks.trim() || undefined,
      issueCategory: issueCategory || undefined,
      inspectorName: inspectorName.trim() || "Field Inspector",
      mealsServedAllFiveDays: mealsServedAllFiveDays,
      missedMealDaysCount: mealsServedAllFiveDays === "no" ? (parseInt(missedMealDaysCount, 10) || 0) : undefined,
      missedMealDaysReason: mealsServedAllFiveDays === "no" ? (missedMealDaysReason.trim() || undefined) : undefined,

      // Facilities checklist
      kitchenShed,
      kitchenShedReason: kitchenShed === "no" ? (kitchenShedReason.trim() || undefined) : undefined,
      foodgrainsDelivered,
      foodgrainsReportedSDSEO: foodgrainsDelivered === "no" ? foodgrainsReportedSDSEO : undefined,
      foodgrainsNoReportReason: foodgrainsDelivered === "no" && foodgrainsReportedSDSEO === "no" ? (foodgrainsNoReportReason.trim() || undefined) : undefined,
      waterSupply,
      waterSupplyReason: waterSupply === "no" ? (waterSupplyReason.trim() || undefined) : undefined,
      kitchenGarden,
      kitchenGardenType: kitchenGarden === "yes" ? kitchenGardenType : undefined,
      kitchenGardenReason: kitchenGarden === "no" ? (kitchenGardenReason.trim() || undefined) : undefined,

      // Reporting compliance
      monthlyFormMonth: submittedSDSEO === "yes" ? (monthlyFormMonth || undefined) : undefined,
      utilizationCertMonth: submittedSDSEO === "yes" ? (utilizationCertMonth || undefined) : undefined,
      submittedSDSEO,
      sdseoNonSubmissionReason: submittedSDSEO === "no" ? (sdseoNonSubmissionReason.trim() || undefined) : undefined,
      meghSimsDaily,
      meghSimsNoReason: meghSimsDaily === "no" ? (meghSimsNoReason.trim() || undefined) : undefined
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(record);
      setSubmitted(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save this inspection. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(0);
    setMealServed(null);
    setStudentCount("");
    setPhoto(null);
    setGeo(null);
    setRemarks("");
    setIssueCategory("");
    setSchoolName("");
    setSchoolCategories(["LP"]);
    setMealsServedAllFiveDays("yes");
    setMissedMealDaysCount("");
    setMissedMealDaysReason("");
  };

  if (submitted) {
    return (
      <div className="fade-in" style={{
        minHeight: "calc(100vh - 64px)",
        width: "100%",
        background: c.paper,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: 440,
          background: c.surface,
          borderRadius: 24,
          padding: 36,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          border: `1px solid ${c.line}`,
          boxShadow: shadows.md
        }}>
          <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <div className="ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${c.forest}` }} />
            <div className="pop" style={{ width: 72, height: 72, borderRadius: "50%", background: c.forest, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadows.float }}>
              <CheckCircle2 size={36} color="#fff" strokeWidth={2} />
            </div>
          </div>

          <h2 className="pop" style={{ fontSize: 24, fontWeight: 700, color: c.ink, letterSpacing: "-0.02em", marginBottom: 12 }}>
            Inspection Logged Successfully!
          </h2>

          <p className="pop" style={{ fontSize: 14, color: c.textSecondary, lineHeight: 1.6, marginBottom: 28 }}>
            Report for <strong style={{ color: c.ink }}>{schoolName}</strong> ({block} Block) has been stored with encrypted coordinates and timestamp.
          </p>

          <div style={{
            width: "100%",
            background: c.mint,
            borderRadius: 14,
            padding: "16px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13
          }}>
            <span style={{ color: c.textSecondary, fontWeight: 500 }}>Meal Status:</span>
            <span style={{
              fontWeight: 700,
              color: mealServed === "yes" ? c.forest : c.terracotta,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}>
              {mealServed === "yes" ? <CheckCircle2 size={15} /> : <X size={15} />}
              {mealServed === "yes" ? `Served (${studentCount} students)` : `Missed (${issueCategory})`}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            <button
              onClick={handleReset}
              style={{
                width: "100%",
                padding: 15,
                borderRadius: 12,
                background: c.forest,
                color: "#fff",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: shadows.sm
              }}
            >
              Log Another School Inspection
            </button>

            {onDoneViewDashboard && (
              <button
                onClick={onDoneViewDashboard}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  background: c.surface,
                  color: c.ink,
                  border: `1px solid ${c.line}`,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                View Analytics Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", width: "100%", display: "flex", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, padding: isMobile ? "16px 12px" : "32px 20px", boxSizing: "border-box" }}>

        {/* Step Indicator Bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                border: `1px solid ${c.line}`,
                background: c.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: step === 0 ? "default" : "pointer",
                boxShadow: shadows.sm,
                opacity: step === 0 ? 0.3 : 1,
                transition: "all 0.2s"
              }}
              disabled={step === 0}
            >
              <ChevronLeft size={20} color={c.ink} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Leaf size={14} color={c.forest} />
              <span style={{ fontSize: 12, fontWeight: 700, color: c.forest, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                STEP {step + 1} OF {STEPS.length}: {
                  step === 0 ? "LOCATION" :
                  step === 1 ? "ATTENDANCE" :
                  step === 2 ? "KITCHEN & FACILITIES" :
                  step === 3 ? "REPORTING COMPLIANCE" :
                  step === 4 ? "EVIDENCE" : "REVIEW"
                }
              </span>
            </div>

            <div style={{ width: 38 }} />
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i <= step ? c.forest : c.line,
                  transition: "background 0.4s ease"
                }}
              />
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em", marginBottom: 6 }}>
            {step === 0 && "School & Location"}
            {step === 1 && "Attendance & Aadhaar"}
            {step === 2 && "Kitchen & Facilities Checklist"}
            {step === 3 && "Reporting Compliance"}
            {step === 4 && "Photographic & GPS Evidence"}
            {step === 5 && "Review & Submit Inspection"}
          </h2>
          <p style={{ fontSize: 13, color: c.textSecondary, margin: 0 }}>
            {step === 0 && "Select block, category, and management type."}
            {step === 1 && "Boys/girls attendance and Aadhaar-linked counts."}
            {step === 2 && "Kitchen shed, foodgrains, water supply, kitchen garden."}
            {step === 3 && "Monthly Form, Utilization Certificate, MeghSIMS reporting."}
            {step === 4 && "Capture or upload kitchen & meal photographs."}
            {step === 5 && "Verify details before official database entry."}
          </p>
        </div>

        {/* Step Contents */}
        <div style={{ flex: 1 }}>
          <div key={step} className="step-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* STEP 0: LOCATION */}
            {step === 0 && (
              <>
                {/* PM Poshan Scheme Banner Card */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  border: `1px solid ${c.line}`,
                  padding: "16px",
                  boxShadow: shadows.sm,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 4
                }}>
                  <div style={{
                    width: "100%",
                    height: 140,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: `1px solid ${c.line}`,
                    background: "#F4F8F3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img
                      src={pmPoshanBanner}
                      alt="PM Poshan School Audit Illustration"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: c.forest,
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8
                    }}>
                      <Leaf size={11} /> PM POSHAN SCHEME
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: c.ink, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
                      School Nutrition & Food Audit
                    </h3>
                    <p style={{ fontSize: 12, color: c.textSecondary, margin: 0, lineHeight: 1.45 }}>
                      Real-time compliance tracking for mid-day meals in East Khasi Hills district.
                    </p>
                  </div>
                </div>

                <FloatingField
                  icon={Building2}
                  label="BLOCK / ADMINISTRATIVE DIVISION"
                  active={focusedField === "block"}
                  filled={!!block}
                  rightElement={<ChevronDown size={20} color={c.ink} />}
                >
                  <select
                    value={block}
                    onChange={(e) => {
                      setBlock(e.target.value as BlockName);
                      setSchoolName("");
                    }}
                    onFocus={() => setFocusedField("block")}
                    onBlur={() => setFocusedField(null)}
                    style={{ ...inputBase, cursor: "pointer", appearance: "none" }}
                  >
                    <option value="" disabled style={{ background: "#FFFFFF", color: "#111827" }}>Select Block...</option>
                    {INITIAL_BLOCKS.map((b) => <option key={b} value={b} style={{ background: "#FFFFFF", color: "#111827" }}>{b} Block</option>)}
                  </select>
                </FloatingField>

                <FloatingField
                  icon={Building2}
                  label="SCHOOL NAME"
                  active={focusedField === "school"}
                  filled={!!schoolName}
                >
                  <input
                    type="text"
                    placeholder="Search or enter school name..."
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    onFocus={() => setFocusedField("school")}
                    onBlur={() => setFocusedField(null)}
                    style={inputBase}
                    list="registered-schools-list"
                  />
                  <datalist id="registered-schools-list">
                    {filteredSchools.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </FloatingField>

                {/* School Category */}
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.ink, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>School Category</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: c.textSecondary }}>Select one or more</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {SCHOOL_TYPES.map((cat) => {
                      const isSelected = schoolCategories.includes(cat as SchoolCategory);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleSchoolCategory(cat as SchoolCategory)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 16px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: isSelected ? 700 : 600,
                            cursor: "pointer",
                            background: isSelected ? "#E8F5E9" : "#FFFFFF",
                            color: isSelected ? c.forest : c.ink,
                            border: isSelected ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                            boxShadow: isSelected ? "0 2px 6px rgba(15,76,58,0.1)" : "none",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {isSelected && <Check size={14} color={c.forest} strokeWidth={2.5} />}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Management Type */}
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.ink, marginBottom: 8 }}>Management Type</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {["Government", "Deficit", "Adhoc", "SSA"].map((type) => {
                      const isSelected = managementType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setManagementType(type)}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: isSelected ? 700 : 600,
                            cursor: "pointer",
                            background: isSelected ? "#E8F5E9" : "#FFFFFF",
                            color: isSelected ? c.forest : c.ink,
                            border: isSelected ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                            transition: "all 0.15s ease"
                          }}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inspector Name */}
                <FloatingField
                  icon={Users}
                  label="INSPECTOR NAME"
                  active={focusedField === "inspector"}
                  filled={!!inspectorName}
                >
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    onFocus={() => setFocusedField("inspector")}
                    onBlur={() => setFocusedField(null)}
                    style={inputBase}
                  />
                </FloatingField>
              </>
            )}

            {/* STEP 1: ATTENDANCE & AADHAAR */}
            {step === 1 && (
              <>
                {/* Step 2 Hero Banner Card */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  border: `1px solid ${c.line}`,
                  padding: "16px",
                  boxShadow: shadows.sm,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 4
                }}>
                  <div style={{
                    width: "100%",
                    height: 150,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: `1px solid ${c.line}`,
                    background: "#FFFDF5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img
                      src={attendanceBanner}
                      alt="Student Attendance Roll Call Illustration"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: c.forest,
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8
                    }}>
                      <Users size={11} /> ATTENDANCE RECORD
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: c.ink, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
                      Attendance & Aadhaar Coverage
                    </h3>
                    <p style={{ fontSize: 12, color: c.textSecondary, margin: 0, lineHeight: 1.45 }}>
                      Record student attendance and Aadhaar-linked counts on the date of inspection.
                    </p>
                  </div>
                </div>

                {/* Student Attendance Today Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>
                    Student Attendance Today
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FloatingField
                      icon={Users}
                      label="BOYS"
                      active={focusedField === "attBoys"}
                      filled={attendanceBoys !== "" && attendanceBoys !== "0"}
                    >
                      <input
                        type="number"
                        min="0"
                        value={attendanceBoys}
                        onChange={(e) => setAttendanceBoys(e.target.value)}
                        onFocus={() => setFocusedField("attBoys")}
                        onBlur={() => setFocusedField(null)}
                        style={{ ...inputBase, fontSize: 16, fontWeight: 700 }}
                      />
                    </FloatingField>

                    <FloatingField
                      icon={Users}
                      label="GIRLS"
                      active={focusedField === "attGirls"}
                      filled={attendanceGirls !== "" && attendanceGirls !== "0"}
                    >
                      <input
                        type="number"
                        min="0"
                        value={attendanceGirls}
                        onChange={(e) => setAttendanceGirls(e.target.value)}
                        onFocus={() => setFocusedField("attGirls")}
                        onBlur={() => setFocusedField(null)}
                        style={{ ...inputBase, fontSize: 16, fontWeight: 700 }}
                      />
                    </FloatingField>
                  </div>
                </div>

                {/* Students with Aadhaar Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>
                    Students with Aadhaar
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FloatingField
                      icon={Users}
                      label="BOYS"
                      active={focusedField === "aadhBoys"}
                      filled={aadhaarBoys !== "" && aadhaarBoys !== "0"}
                    >
                      <input
                        type="number"
                        min="0"
                        value={aadhaarBoys}
                        onChange={(e) => setAadhaarBoys(e.target.value)}
                        onFocus={() => setFocusedField("aadhBoys")}
                        onBlur={() => setFocusedField(null)}
                        style={{ ...inputBase, fontSize: 16, fontWeight: 700 }}
                      />
                    </FloatingField>

                    <FloatingField
                      icon={Users}
                      label="GIRLS"
                      active={focusedField === "aadhGirls"}
                      filled={aadhaarGirls !== "" && aadhaarGirls !== "0"}
                    >
                      <input
                        type="number"
                        min="0"
                        value={aadhaarGirls}
                        onChange={(e) => setAadhaarGirls(e.target.value)}
                        onFocus={() => setFocusedField("aadhGirls")}
                        onBlur={() => setFocusedField(null)}
                        style={{ ...inputBase, fontSize: 16, fontWeight: 700 }}
                      />
                    </FloatingField>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: KITCHEN & FACILITIES CHECKLIST */}
            {step === 2 && (
              <>
                {/* Hero Banner Card */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  border: `1px solid ${c.line}`,
                  padding: "16px",
                  boxShadow: shadows.sm,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 4
                }}>
                  <div style={{
                    width: "100%",
                    height: 150,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: `1px solid ${c.line}`,
                    background: "#FFFDF5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img
                      src={facilitiesArt}
                      alt="Kitchen & Facilities Checklist Illustration"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "#E05A12",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8
                    }}>
                      <ClipboardList size={11} /> FACILITIES CHECKLIST
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: c.ink, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
                      Kitchen & Facilities Checklist
                    </h3>
                    <p style={{ fontSize: 12, color: c.textSecondary, margin: 0, lineHeight: 1.45 }}>
                      Kitchen shed, foodgrain delivery, water supply, and kitchen garden status.
                    </p>
                  </div>
                </div>

                {/* Question 1: Kitchen Shed */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>
                    Is the Kitchen Shed functional? If no state the reason
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setKitchenShed("yes");
                        setKitchenShedReason("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: kitchenShed === "yes" ? "#E8F5E9" : "#FFFFFF",
                        color: kitchenShed === "yes" ? c.forest : c.ink,
                        border: kitchenShed === "yes" ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setKitchenShed("no")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: kitchenShed === "no" ? "#FEE2E2" : "#FFFFFF",
                        color: kitchenShed === "no" ? c.terracotta : c.ink,
                        border: kitchenShed === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      No
                    </button>
                  </div>

                  {/* If NO: Show reason text input */}
                  {kitchenShed === "no" && (
                    <div style={{ marginTop: 6 }}>
                      <FloatingField
                        icon={MessageSquare}
                        label="Specify Reason for Non-Functional Kitchen Shed"
                        active={focusedField === "kitchenShedReason"}
                        filled={kitchenShedReason.trim().length > 0}
                      >
                        <input
                          type="text"
                          placeholder="e.g., Roof damaged, under repair, dilapidated structure..."
                          value={kitchenShedReason}
                          onChange={(e) => setKitchenShedReason(e.target.value)}
                          onFocus={() => setFocusedField("kitchenShedReason")}
                          onBlur={() => setFocusedField(null)}
                          style={inputBase}
                        />
                      </FloatingField>
                    </div>
                  )}
                </div>

                {/* Question 2: Foodgrain Delivery */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>
                    Are foodgrains delivered directly to the school?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setFoodgrainsDelivered("yes")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: foodgrainsDelivered === "yes" ? "#E8F5E9" : "#FFFFFF",
                        color: foodgrainsDelivered === "yes" ? c.forest : c.ink,
                        border: foodgrainsDelivered === "yes" ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFoodgrainsDelivered("no")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: foodgrainsDelivered === "no" ? "#FEE2E2" : "#FFFFFF",
                        color: foodgrainsDelivered === "no" ? c.terracotta : c.ink,
                        border: foodgrainsDelivered === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      No
                    </button>
                  </div>

                  {/* If NO: Sub-question about writing to SDSEO office */}
                  {foodgrainsDelivered === "no" && (
                    <div style={{ marginTop: 8, padding: "12px 14px", background: "#FFFBF0", borderRadius: 14, border: "1px solid #FFE8B8", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: c.ink, lineHeight: 1.4 }}>
                        Has the matter been reported in writing to the office of the SDSEO (Shillong/Sohra)?
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setFoodgrainsReportedSDSEO("yes")}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            background: foodgrainsReportedSDSEO === "yes" ? c.forest : "#FFFFFF",
                            color: foodgrainsReportedSDSEO === "yes" ? "#FFFFFF" : c.ink,
                            border: foodgrainsReportedSDSEO === "yes" ? `1px solid ${c.forest}` : `1px solid ${c.line}`,
                            transition: "all 0.15s ease"
                          }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFoodgrainsReportedSDSEO("no");
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            background: foodgrainsReportedSDSEO === "no" ? c.terracotta : "#FFFFFF",
                            color: foodgrainsReportedSDSEO === "no" ? "#FFFFFF" : c.ink,
                            border: foodgrainsReportedSDSEO === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                            transition: "all 0.15s ease"
                          }}
                        >
                          No
                        </button>
                      </div>

                      {foodgrainsReportedSDSEO === "no" && (
                        <div style={{ marginTop: 4 }}>
                          <FloatingField
                            icon={MessageSquare}
                            label="Specify Reason for Not Reporting to SDSEO Office"
                            active={focusedField === "foodgrainsNotReportedReason"}
                            filled={foodgrainsNoReportReason.trim().length > 0}
                          >
                            <input
                              type="text"
                              placeholder="e.g. Complaint draft under preparation, pending signature..."
                              value={foodgrainsNoReportReason}
                              onChange={(e) => setFoodgrainsNoReportReason(e.target.value)}
                              onFocus={() => setFocusedField("foodgrainsNotReportedReason")}
                              onBlur={() => setFocusedField(null)}
                              style={inputBase}
                            />
                          </FloatingField>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Question 3: Functional Water Supply */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>
                    Is a functional water supply available for cooking and cleaning?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setWaterSupply("yes");
                        setWaterSupplyReason("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: waterSupply === "yes" ? "#E8F5E9" : "#FFFFFF",
                        color: waterSupply === "yes" ? c.forest : c.ink,
                        border: waterSupply === "yes" ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaterSupply("no")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: waterSupply === "no" ? "#FEE2E2" : "#FFFFFF",
                        color: waterSupply === "no" ? c.terracotta : c.ink,
                        border: waterSupply === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      No
                    </button>
                  </div>

                  {/* If NO selected, show option to write details */}
                  {waterSupply === "no" && (
                    <div style={{ marginTop: 6 }}>
                      <FloatingField
                        icon={MessageSquare}
                        label="Specify Water Issue / Alternate Source"
                        active={focusedField === "waterReason"}
                        filled={waterSupplyReason.trim().length > 0}
                      >
                        <input
                          type="text"
                          placeholder="e.g., Tap pipeline broken, fetching water from public stream..."
                          value={waterSupplyReason}
                          onChange={(e) => setWaterSupplyReason(e.target.value)}
                          onFocus={() => setFocusedField("waterReason")}
                          onBlur={() => setFocusedField(null)}
                          style={inputBase}
                        />
                      </FloatingField>
                    </div>
                  )}
                </div>

                {/* Question 4: Kitchen Garden */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>
                    Has a Kitchen Garden been set up within the school premises?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setKitchenGarden("yes");
                        setKitchenGardenReason("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: kitchenGarden === "yes" ? "#E8F5E9" : "#FFFFFF",
                        color: kitchenGarden === "yes" ? c.forest : c.ink,
                        border: kitchenGarden === "yes" ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setKitchenGarden("no")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: kitchenGarden === "no" ? "#FEE2E2" : "#FFFFFF",
                        color: kitchenGarden === "no" ? c.terracotta : c.ink,
                        border: kitchenGarden === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      No
                    </button>
                  </div>

                  {/* If YES: Show Garden Type Options */}
                  {kitchenGarden === "yes" && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.textSecondary }}>
                        Select Garden Setup Type:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {[
                          { id: "Open Garden", label: "Open Garden" },
                          { id: "Pots", label: "Pots" },
                          { id: "Fence Garden", label: "Fence Garden" },
                        ].map((opt) => {
                          const isSel = kitchenGardenType === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setKitchenGardenType(opt.id)}
                              style={{
                                padding: "10px 8px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                textAlign: "center",
                                background: isSel ? c.forest : c.paper,
                                color: isSel ? "#FFFFFF" : c.ink,
                                border: isSel ? `1px solid ${c.forest}` : `1px solid ${c.line}`,
                                transition: "all 0.15s ease"
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* If NO: Show Reason text input */}
                  {kitchenGarden === "no" && (
                    <div style={{ marginTop: 6 }}>
                      <FloatingField
                        icon={MessageSquare}
                        label="Specify Reason for No Kitchen Garden"
                        active={focusedField === "gardenReason"}
                        filled={kitchenGardenReason.trim().length > 0}
                      >
                        <input
                          type="text"
                          placeholder="e.g., Lack of space, water shortage, no boundary wall..."
                          value={kitchenGardenReason}
                          onChange={(e) => setKitchenGardenReason(e.target.value)}
                          onFocus={() => setFocusedField("gardenReason")}
                          onBlur={() => setFocusedField(null)}
                          style={inputBase}
                        />
                      </FloatingField>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* STEP 3: REPORTING COMPLIANCE */}
            {step === 3 && (
              <>
                {/* Hero Banner Card */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  border: `1px solid ${c.line}`,
                  padding: "16px",
                  boxShadow: shadows.sm,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 4
                }}>
                  <div style={{
                    width: "100%",
                    height: 160,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: `1px solid ${c.line}`,
                    background: "#FAFCFA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img
                      src={reportingComplianceArt}
                      alt="Reporting Compliance Checklist Illustration"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "#E05A12",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8
                    }}>
                      <FileText size={11} /> REPORTING COMPLIANCE
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: c.ink, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
                      Monthly Reporting & MeghSIMS
                    </h3>
                    <p style={{ fontSize: 12, color: c.textSecondary, margin: 0, lineHeight: 1.45 }}>
                      Monthly Form, Utilization Certificate, and daily app reporting status.
                    </p>
                  </div>
                </div>

                {/* Question 1: Has the school submitted Monthly Form/UC to SDSEO */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink, lineHeight: 1.4 }}>
                    HAS THE SCHOOL SUBMITTED ITS MONTHLY FORM/ UTILIZATION CERTIFICATE TO THE OFFICE OF THE SDSEO (SHILLONG/SOHRA)?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setSubmittedSDSEO("yes")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: submittedSDSEO === "yes" ? "#E8F5E9" : "#FFFFFF",
                        color: submittedSDSEO === "yes" ? c.forest : c.ink,
                        border: submittedSDSEO === "yes" ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedSDSEO("no");
                        setMonthlyFormMonth("");
                        setUtilizationCertMonth("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: submittedSDSEO === "no" ? "#FEE2E2" : "#FFFFFF",
                        color: submittedSDSEO === "no" ? c.terracotta : c.ink,
                        border: submittedSDSEO === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Conditional Month Input Boxes if submitted to SDSEO is Yes */}
                {submittedSDSEO === "yes" && (
                  <>
                    {/* Field 1: Monthly Form Submitted Upto Month */}
                    <FloatingField
                      icon={FileText}
                      label="MONTHLY FORM SUBMITTED UPTO WHICH MONTH"
                      active={focusedField === "monthlyFormMonth"}
                      filled={monthlyFormMonth.trim().length > 0}
                    >
                      <input
                        type="text"
                        placeholder="e.g. June 2026"
                        value={monthlyFormMonth}
                        onChange={(e) => setMonthlyFormMonth(e.target.value)}
                        onFocus={() => setFocusedField("monthlyFormMonth")}
                        onBlur={() => setFocusedField(null)}
                        style={inputBase}
                      />
                    </FloatingField>

                    {/* Field 2: Utilization Certificate Submitted Upto Month */}
                    <FloatingField
                      icon={FileText}
                      label="UTILIZATION CERTIFICATE SUBMITTED UPTO WHICH MONTH"
                      active={focusedField === "utilizationCertMonth"}
                      filled={utilizationCertMonth.trim().length > 0}
                    >
                      <input
                        type="text"
                        placeholder="e.g. May 2026"
                        value={utilizationCertMonth}
                        onChange={(e) => setUtilizationCertMonth(e.target.value)}
                        onFocus={() => setFocusedField("utilizationCertMonth")}
                        onBlur={() => setFocusedField(null)}
                        style={inputBase}
                      />
                    </FloatingField>
                  </>
                )}

                {/* Conditional Reason Box if submitted to SDSEO is No */}
                {submittedSDSEO === "no" && (
                  <div style={{ marginTop: 4 }}>
                    <FloatingField
                      icon={MessageSquare}
                      label="Specify Reason for Non-Submission to SDSEO Office"
                      active={focusedField === "sdseoReason"}
                      filled={sdseoNonSubmissionReason.trim().length > 0}
                    >
                      <input
                        type="text"
                        placeholder="e.g. Accounts under audit, pending bank statement verification..."
                        value={sdseoNonSubmissionReason}
                        onChange={(e) => setSdseoNonSubmissionReason(e.target.value)}
                        onFocus={() => setFocusedField("sdseoReason")}
                        onBlur={() => setFocusedField(null)}
                        style={inputBase}
                      />
                    </FloatingField>
                  </div>
                )}

                {/* Question 3: MeghSIMS (PM POSHAN) Daily App Reporting */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink, lineHeight: 1.4 }}>
                    Does the school report daily meal data through the MeghSIMS (PM POSHAN) App daily?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setMeghSimsDaily("yes")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: meghSimsDaily === "yes" ? "#E8F5E9" : "#FFFFFF",
                        color: meghSimsDaily === "yes" ? c.forest : c.ink,
                        border: meghSimsDaily === "yes" ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeghSimsDaily("no")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: meghSimsDaily === "no" ? "#FEE2E2" : "#FFFFFF",
                        color: meghSimsDaily === "no" ? c.terracotta : c.ink,
                        border: meghSimsDaily === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      No
                    </button>
                  </div>

                  {/* Conditional Reason Box if MeghSIMS reporting is No */}
                  {meghSimsDaily === "no" && (
                    <div style={{ marginTop: 4 }}>
                      <FloatingField
                        icon={MessageSquare}
                        label="Specify Reason for No Daily MeghSIMS Reporting"
                        active={focusedField === "meghSimsReason"}
                        filled={meghSimsNoReason.trim().length > 0}
                      >
                        <input
                          type="text"
                          placeholder="e.g. Network connectivity issue, mobile device damaged..."
                          value={meghSimsNoReason}
                          onChange={(e) => setMeghSimsNoReason(e.target.value)}
                          onFocus={() => setFocusedField("meghSimsReason")}
                          onBlur={() => setFocusedField(null)}
                          style={inputBase}
                        />
                      </FloatingField>
                    </div>
                  )}
                </div>

                {/* Question 4: Meals Served on All Five School Working Days */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink, lineHeight: 1.4 }}>
                    ARE PM POSHAN MEALS SERVED ON ALL FIVE SCHOOL WORKING DAYS EVERY WEEK? IF NO, INDICATE THE NUMBER OF SCHOOL DAYS DURING WHICH MEALS WERE NOT SERVED AND STATE THE REASON FOR THE INTERRUPTION.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMealsServedAllFiveDays("yes");
                        setMissedMealDaysCount("");
                        setMissedMealDaysReason("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: mealsServedAllFiveDays === "yes" ? "#E8F5E9" : "#FFFFFF",
                        color: mealsServedAllFiveDays === "yes" ? c.forest : c.ink,
                        border: mealsServedAllFiveDays === "yes" ? `2px solid ${c.forest}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setMealsServedAllFiveDays("no")}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: mealsServedAllFiveDays === "no" ? "#FEE2E2" : "#FFFFFF",
                        color: mealsServedAllFiveDays === "no" ? c.terracotta : c.ink,
                        border: mealsServedAllFiveDays === "no" ? `2px solid ${c.terracotta}` : `1px solid ${c.line}`,
                        transition: "all 0.15s ease"
                      }}
                    >
                      No
                    </button>
                  </div>

                  {/* Conditional Fields if meals were NOT served all five days */}
                  {mealsServedAllFiveDays === "no" && (
                    <>
                      <FloatingField
                        icon={FileText}
                        label="NUMBER OF SCHOOL DAYS MEALS WERE NOT SERVED"
                        active={focusedField === "missedMealDaysCount"}
                        filled={missedMealDaysCount.trim().length > 0}
                      >
                        <input
                          type="number"
                          min="0"
                          max="5"
                          placeholder="e.g. 2"
                          value={missedMealDaysCount}
                          onChange={(e) => setMissedMealDaysCount(e.target.value)}
                          onFocus={() => setFocusedField("missedMealDaysCount")}
                          onBlur={() => setFocusedField(null)}
                          style={inputBase}
                        />
                      </FloatingField>

                      <div style={{ marginTop: 4 }}>
                        <FloatingField
                          icon={MessageSquare}
                          label="Reason for Interruption"
                          active={focusedField === "missedMealDaysReason"}
                          filled={missedMealDaysReason.trim().length > 0}
                        >
                          <input
                            type="text"
                            placeholder="e.g. Foodgrain stock delay, cook-cum-helper unavailable, school closed..."
                            value={missedMealDaysReason}
                            onChange={(e) => setMissedMealDaysReason(e.target.value)}
                            onFocus={() => setFocusedField("missedMealDaysReason")}
                            onBlur={() => setFocusedField(null)}
                            style={inputBase}
                          />
                        </FloatingField>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* STEP 4: EVIDENCE */}
            {step === 4 && (
              <>
                {/* Evidence Hero Banner Card */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  border: `1px solid ${c.line}`,
                  padding: "16px",
                  boxShadow: shadows.sm,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 4
                }}>
                  <div style={{
                    width: "100%",
                    height: 160,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: `1px solid ${c.line}`,
                    background: "#FAFCFA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img
                      src={evidenceArt}
                      alt="Photographic & GPS Evidence Illustration"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "#D97706",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8
                    }}>
                      <Camera size={11} /> PHOTO EVIDENCE
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: c.ink, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
                      Kitchen & Meal Evidence
                    </h3>
                    <p style={{ fontSize: 12, color: c.textSecondary, margin: 0, lineHeight: 1.45 }}>
                      Attach photo proof of food preparation with auto GPS coordinates.
                    </p>
                  </div>
                </div>

                {/* Hidden File Inputs for Direct Camera Capture & Gallery Chooser */}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoUpload} />
                <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />

                {photo ? (
                  <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${c.line}`, boxShadow: shadows.md, position: "relative" }}>
                    <img src={photo} alt="Inspection evidence" style={{ width: "100%", display: "block", aspectRatio: "16/10", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(26,33,29,0.7)",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}
                    >
                      <X size={16} color="#fff" />
                    </button>

                    <div style={{
                      position: "absolute",
                      bottom: 12,
                      left: 12,
                      background: "rgba(255,255,255,0.92)",
                      padding: "6px 12px",
                      borderRadius: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: shadows.sm
                    }}>
                      <MapPin size={13} color={c.forest} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: c.ink }}>
                        {geo ? `Lat: ${geo.lat}, Lng: ${geo.lng}` : 'Geo-tagging...'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {/* Option 1: Take Photo directly using device camera */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="hover-scale"
                        style={{
                          borderRadius: 16,
                          border: `1.5px solid ${c.forest}`,
                          padding: "20px 14px",
                          textAlign: "center",
                          background: "#E8F5E9",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          transition: "all 0.15s ease",
                          boxShadow: shadows.sm
                        }}
                      >
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: c.forest,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: shadows.sm
                        }}>
                          <Camera size={20} color="#FFFFFF" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>Take Photo</div>
                          <div style={{ fontSize: 11, color: c.textSecondary, marginTop: 2 }}>Open phone camera</div>
                        </div>
                      </button>

                      {/* Option 2: Choose existing photo from device gallery */}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="hover-scale"
                        style={{
                          borderRadius: 16,
                          border: `1px solid ${c.line}`,
                          padding: "20px 14px",
                          textAlign: "center",
                          background: "#FFFFFF",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          transition: "all 0.15s ease",
                          boxShadow: shadows.sm
                        }}
                      >
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: c.mint,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <Upload size={20} color={c.forest} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>From Gallery</div>
                          <div style={{ fontSize: 11, color: c.textSecondary, marginTop: 2 }}>Choose existing photo</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Geolocation auto button */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: c.surface,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${c.line}`
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <MapPin size={18} color={c.forest} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.ink }}>GPS Tagging</div>
                      <div style={{ fontSize: 11, color: c.textSecondary }}>
                        {geo ? `${geo.lat}, ${geo.lng}` : "Click to detect location"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchGeolocation}
                    disabled={geoLoading}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: c.mint,
                      color: c.forest,
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {geoLoading ? "Locating..." : geo ? "Re-detect" : "Auto Detect"}
                  </button>
                </div>

                <FloatingField icon={MessageSquare} label="Inspector Remarks & Observations" active={focusedField === "remarks"} filled={!!remarks}>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    onFocus={() => setFocusedField("remarks")}
                    onBlur={() => setFocusedField(null)}
                    rows={2}
                    placeholder="e.g. Hygiene standards met, water tap functional..."
                    style={{ ...inputBase, resize: "none" }}
                  />
                </FloatingField>
              </>
            )}

            {/* STEP 5: REVIEW */}
            {step === 5 && (
              <>
                {/* Step 5 Hero Banner Card */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  border: `1px solid ${c.line}`,
                  padding: "16px",
                  boxShadow: shadows.sm,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 4
                }}>
                  <div style={{
                    width: "100%",
                    height: 160,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: `1px solid ${c.line}`,
                    background: "#FAFCFA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img
                      src={auditSummaryArt}
                      alt="Audit Verification Illustration"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: c.forest,
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8
                    }}>
                      <CheckCircle2 size={11} /> AUDIT VERIFICATION
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: c.ink, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
                      Final Summary & Submission
                    </h3>
                    <p style={{ fontSize: 12, color: c.textSecondary, margin: 0, lineHeight: 1.45 }}>
                      Verify inspection record details before sending to Meghalaya Database.
                    </p>
                  </div>
                </div>

                <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 18, overflow: "hidden", boxShadow: shadows.sm }}>
                <div style={{ background: c.mint, padding: "14px 18px", borderBottom: `1px solid ${c.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.forest }}>Inspection Details Summary</span>
                  <span style={{ fontSize: 11, color: c.textSecondary }}>Today: {new Date().toLocaleDateString()}</span>
                </div>

                {[
                  { icon: Building2, label: "Block", value: `${block} Block` },
                  { icon: GraduationCap, label: "School & Category", value: `${schoolName} (${schoolCategories.join(", ")})` },
                  { icon: Users, label: "Attendance Today", value: `Boys: ${attendanceBoys} | Girls: ${attendanceGirls} (Total: ${(parseInt(attendanceBoys, 10) || 0) + (parseInt(attendanceGirls, 10) || 0)})` },
                  { icon: Users, label: "Students with Aadhaar", value: `Boys: ${aadhaarBoys} | Girls: ${aadhaarGirls} (Total: ${(parseInt(aadhaarBoys, 10) || 0) + (parseInt(aadhaarGirls, 10) || 0)})` },
                  { icon: ClipboardList, label: "Facilities Checklist", value: `Shed: ${kitchenShed === "yes" ? "Yes" : "No (" + (kitchenShedReason || "N/A") + ")"} | Foodgrains: ${foodgrainsDelivered === "yes" ? "Yes" : "No (SDSEO Reported: " + foodgrainsReportedSDSEO.toUpperCase() + ")"} | Water: ${waterSupply === "yes" ? "Yes" : "No (" + (waterSupplyReason || "N/A") + ")"} | Garden: ${kitchenGarden === "yes" ? `Yes (${kitchenGardenType})` : `No (${kitchenGardenReason || "N/A"})`}` },
                  { icon: FileText, label: "Reporting Compliance", value: `SDSEO Form/UC Submitted: ${submittedSDSEO === "yes" ? "Yes" : "No" + (sdseoNonSubmissionReason ? " (" + sdseoNonSubmissionReason + ")" : "")} | Monthly Form: ${monthlyFormMonth || "N/A"} | UC: ${utilizationCertMonth || "N/A"} | MeghSIMS Daily: ${meghSimsDaily === "yes" ? "Yes" : "No" + (meghSimsNoReason ? " (" + meghSimsNoReason + ")" : "")}` },
                  { icon: FileText, label: "Meals on All 5 Working Days", value: mealsServedAllFiveDays === "yes" ? "Yes" : `No — ${missedMealDaysCount || "0"} day(s) missed${missedMealDaysReason ? " (" + missedMealDaysReason + ")" : ""}` },
                  { icon: Camera, label: "Photo Evidence", value: photo ? "Photo attached" : "No photo attached" },
                  { icon: MapPin, label: "Coordinates", value: geo ? `${geo.lat}, ${geo.lng}` : "Not tagged" },
                  { icon: MessageSquare, label: "Inspector Remarks", value: remarks || "None provided" },
                ].map((row, i, arr) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${c.line}` : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: c.paper, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <row.icon size={16} color={c.forest} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: c.textSecondary, marginBottom: 2, fontWeight: 500 }}>{row.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.ink }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}

          </div>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: 32 }}>
          {saveError && (
            <div style={{
              marginBottom: 12, padding: "10px 14px", borderRadius: 10,
              background: "#FEE2E2", color: c.terracotta, fontSize: 13, fontWeight: 600
            }}>
              {saveError} You can try submitting again — nothing was lost.
            </div>
          )}
          <button
            type="button"
            onClick={() => (step === STEPS.length - 1 ? handleSubmit() : setStep((s) => s + 1))}
            disabled={!canContinue() || isSaving}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              cursor: canContinue() && !isSaving ? "pointer" : "not-allowed",
              background: canContinue() && !isSaving ? c.forest : c.line,
              color: canContinue() && !isSaving ? "#fff" : c.textFaint,
              fontSize: 15,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: canContinue() && !isSaving ? shadows.md : "none",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {step === STEPS.length - 1 ? (isSaving ? "Saving Inspection..." : "Submit Official Inspection") : "Continue"}
            {step < STEPS.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>

      </div>
    </div>
  );
}
