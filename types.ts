
export interface Reading {
  timestamp: number;
  temp: number; // Fahrenheit
  rh: number; // Relative Humidity %
  gpp: number; // Grains Per Pound (Calculated)
  mc: number; // Moisture Content % (Material)
}

export enum WaterCategory {
  CAT_1 = 'Category 1 (Clean)',
  CAT_2 = 'Category 2 (Gray)',
  CAT_3 = 'Category 3 (Black)'
}

export enum LossClass {
  CLASS_1 = 'Class 1 (Least)',
  CLASS_2 = 'Class 2 (Significant)',
  CLASS_3 = 'Class 3 (Greatest)',
  CLASS_4 = 'Class 4 (Specialty)'
}

export enum MoldCondition {
  COND_1 = 'Condition 1 (Normal)',
  COND_2 = 'Condition 2 (Settled Spores)',
  COND_3 = 'Condition 3 (Active Growth)'
}

export interface SafetyAssessment {
  electricalSafe: boolean;
  structuralSafe: boolean;
  biohazardRisk: boolean;
  ppeRequired: string[];
  notes: string;
  completedAt: number;
}

export interface Equipment {
  type: 'dehumidifier' | 'air_mover' | 'scrubber' | 'heater';
  count: number;
  model?: string;
}

export interface Milestone {
  title: string;
  date: string;
  status: 'completed' | 'active' | 'pending';
}

export interface AITask {
    id: string;
    text: string;
    isCompleted: boolean;
}

export interface LineItem {
    id:string;
    description: string;
    quantity: number;
    rate: number;
    total: number;
}

export interface Photo {
  id: string;
  url: string;
  timestamp: number;
  tags: string[];
  notes: string;
}

export interface PlacedPhoto extends Photo {
  x: number; // as a percentage of the floor plan width
  y: number; // as a percentage of the floor plan height
}

export interface RoomScan {
  scanId: string;
  roomName: string;
  floorPlanSvg: string;
  dimensions: { length: number; width: number; sqft: number };
  placedPhotos: PlacedPhoto[];
}

export interface Room {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  readings: Reading[];
  photos: Photo[];
  status: 'wet' | 'drying' | 'dry';
  moldCondition?: MoldCondition;
}

export interface ComplianceCheck {
    id: string;
    text: string;
    isCompleted: boolean;
}

export interface TicSheetItem {
  id: string;
  category: string;
  description: string;
  uom: string; // Unit of Measure
  quantity: number;
  included: boolean;
  source: 'ai' | 'manual';
}


export interface Project {
  id: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  address: string;
  status: string;
  progress: number;
  estimate: string;
  logs: string;
  insurance: string;
  policyNumber: string;
  adjuster: string;
  startDate: string;
  
  // Merged from MitigationAI types
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  rooms: Room[];
  
  // S-500 Specifics
  waterCategory?: WaterCategory;
  lossClass?: LossClass;
  safetyAssessment?: SafetyAssessment;
  
  milestones: Milestone[];
  tasks: AITask[];
  lineItems: LineItem[];
  totalCost: number;
  invoiceStatus: 'Draft' | 'Sent' | 'Paid';
  roomScans: RoomScan[];
  ticSheet: TicSheetItem[];
  complianceChecks: {
      asbestos: 'not_tested' | 'pending' | 'clear' | 'abatement_required';
      aiChecklist: ComplianceCheck[];
  }
  budget?: number;
  assignedTeam?: string[];
}

export interface AIProjectData extends Project {
  aiSummary: string;
  aiAlert: {
    isAlert: boolean;
    reason: string;
  };
  priority: number;
}

export type Tab = 'dashboard' | 'scanner' | 'logs' | 'equipment' | 'photos' | 'project' | 'analysis' | 'reference' | 'forms' | 'new-project' | 'billing' | 'tic-sheet';
export type ViewState = 'dashboard' | 'job-intake' | 'project' | 'ar-scan' | 'consult';
export type UserRole = 'Admin' | 'Manager' | 'Technician' | 'Billing';
