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

export interface Room {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  readings: Reading[];
  photos: Photo[];
  status: 'wet' | 'drying' | 'dry';
  moldCondition?: MoldCondition;
  dryStandard?: number; // Target MC%
}

export interface Photo {
  id: string;
  url: string;
  timestamp: number;
  tags: string[];
  notes: string;
  is3D?: boolean;
}

export interface Project {
  id: string;
  address: string;
  customerName: string;
  startDate: string;
  status: 'active' | 'monitoring' | 'completed';
  riskLevel: 'low' | 'medium' | 'high';
  
  // S-500 Specifics
  waterCategory: WaterCategory;
  lossClass: LossClass;
  safetyAssessment?: SafetyAssessment;
  recommendedEquipment?: Equipment[];
  
  rooms: Room[];
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export type ViewState = 'dashboard' | 'job-intake' | 'project' | 'ar-scan' | 'consult';
