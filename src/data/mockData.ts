import { InspectionRecord, SchoolRecord, BlockName } from '../types';

export const INITIAL_BLOCKS: BlockName[] = [
  "Mawphlang",
  "Mawsynram",
  "Mylliem",
  "Pynursla",
  "Sohiong",
  "Mawlai",
  "Mawkynrew",
  "Mawryngkneng",
  "Mawpat",
  "Khatarshnong Laitkroh",
  "Shella Bholaganj",
  "SMC"
];

export const SCHOOL_TYPES = ["LP", "UP", "Pre-Primary", "Sec."] as const;

// Real data only. Schools are auto-registered into the directory the moment
// a real inspection is submitted for them (see utils/storage.ts), and the
// inspection log starts empty until your team submits actual audits.
export const INITIAL_SCHOOLS: SchoolRecord[] = [];

export const INITIAL_INSPECTIONS: InspectionRecord[] = [];
