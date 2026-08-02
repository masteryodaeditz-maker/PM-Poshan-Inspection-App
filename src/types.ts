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

export interface InspectionRecord {
  id: string;
  timestamp: string; // ISO string
  block: BlockName;
  schoolName: string;
  schoolCategory: SchoolCategory;
  managementType?: string;
  studentCount: number;
  attendanceBoys?: number;
  attendanceGirls?: number;
  aadhaarBoys?: number;
  aadhaarGirls?: number;
  photoUrl?: string;
  latitude?: string;
  longitude?: string;
  remarks?: string;
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
  lastInspected?: string;
  headmasterContact?: string;
}

export type ExportType = 'csv' | 'xlsx' | 'pdf' | 'photos';

export interface ExportLogEntry {
  id: string;
  exportType: ExportType;
  exportedAt: string; // ISO string, when the export button was clicked
  rangeStart: string | null; // ISO date string, null = all time
  rangeEnd: string | null;
  recordCount: number;
}
