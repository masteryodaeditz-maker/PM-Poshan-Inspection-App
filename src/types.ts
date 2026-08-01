export type BlockName =
  | 'Mawphlang'
  | 'Mawsynram'
  | 'Mylliem'
  | 'Pynursla'
  | 'Sohiong'
  | 'Mawlai'
  | 'Mawkynrew'
  | 'Mawryngkneng'
  | 'Mawpat'
  | 'Khatarshnong Laitkroh'
  | 'Shella Bholaganj'
  | 'SMC';

export type SchoolCategory = 'LP' | 'UP' | 'Pre-Primary' | 'Sec.';

export type MealStatus = 'yes' | 'no';

export type QualityIssueCategory = 
  | 'Late Supply Delivery'
  | 'Substandard Food Quality'
  | 'Hygiene & Cleanliness Issue'
  | 'Ingredient Shortage'
  | 'Water Supply Deficiency'
  | 'Cook-cum-Helper Absent'
  | 'Other';

export interface InspectionRecord {
  id: string;
  timestamp: string; // ISO string
  block: BlockName;
  schoolName: string;
  schoolCategory: SchoolCategory;
  managementType?: string;
  mealServed: MealStatus;
  studentCount: number;
  expectedStudentCount: number;
  attendanceBoys?: number;
  attendanceGirls?: number;
  aadhaarBoys?: number;
  aadhaarGirls?: number;
  photoUrl?: string;
  latitude?: string;
  longitude?: string;
  remarks?: string;
  issueCategory?: QualityIssueCategory;
  inspectorName?: string;
  mealsServedAllFiveDays?: MealStatus;
  missedMealDaysCount?: number;
  missedMealDaysReason?: string;

  // Facilities checklist
  kitchenShed?: MealStatus;
  kitchenShedReason?: string;
  foodgrainsDelivered?: MealStatus;
  foodgrainsReportedSDSEO?: MealStatus;
  foodgrainsNoReportReason?: string;
  waterSupply?: MealStatus;
  waterSupplyReason?: string;
  kitchenGarden?: MealStatus;
  kitchenGardenType?: string;
  kitchenGardenReason?: string;

  // Reporting compliance
  monthlyFormMonth?: string;
  utilizationCertMonth?: string;
  submittedSDSEO?: MealStatus;
  sdseoNonSubmissionReason?: string;
  meghSimsDaily?: MealStatus;
  meghSimsNoReason?: string;
}

export interface SchoolRecord {
  id: string;
  name: string;
  block: BlockName;
  category: SchoolCategory;
  enrolledStudents: number;
  lastInspected?: string;
  complianceRate: number; // percentage 0 - 100
  headmasterContact?: string;
}

export interface BlockStat {
  name: BlockName;
  totalSchools: number;
  inspectedSchools: number;
  compliancePercentage: number;
  studentsServedToday: number;
}

export type ExportType = 'csv' | 'xlsx' | 'photos';

export interface ExportLogEntry {
  id: string;
  exportType: ExportType;
  exportedAt: string; // ISO string, when the export button was clicked
  rangeStart: string | null; // ISO date string, null = all time
  rangeEnd: string | null;
  recordCount: number;
}
