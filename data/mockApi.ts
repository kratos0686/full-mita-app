
import { 
  Project, 
  Milestone, 
  AITask, 
  LineItem, 
  RoomScan, 
  ComplianceCheck, 
  WaterCategory, 
  LossClass,
  TicSheetItem,
  PlacedEquipment
} from '../types';

// --- Seed Data (Initial State) ---
const seedProjects: Project[] = [
  { 
    id: 'P-1001', 
    client: 'Sarah Johnson', 
    clientEmail: 's.johnson@example.com',
    clientPhone: '555-123-4567',
    address: '124 Maple Ave', 
    status: 'Drying - Day 2', 
    progress: 65, 
    estimate: 'Oct 16', 
    logs: "GPP trending down steadily.",
    insurance: "State Farm",
    policyNumber: 'SF-987654321',
    adjuster: 'Tom Brown',
    startDate: "Oct 12, 2023",
    summary: 'Class 3 Water Loss. Overhead pipe burst affecting kitchen and living room.',
    riskLevel: 'high',
    waterCategory: WaterCategory.CAT_3,
    lossClass: LossClass.CLASS_3,
    budget: 15000,
    assignedTeam: ['Mike R.', 'Jessica P.'],
    equipment: [
      { id: 'AM-4022', type: 'Air Mover', model: 'Phoenix AirMax', status: 'Running', hours: 42.5, room: 'Living Room' },
      { id: 'DH-1102', type: 'Dehumidifier', model: 'LGR 3500i', status: 'Running', hours: 42.5, room: 'Living Room' },
      { id: 'AM-4023', type: 'Air Mover', model: 'Phoenix AirMax', status: 'Off', hours: 12.0, room: 'Kitchen' },
      { id: 'HE-9001', type: 'HEPA Scrubber', model: 'DefendAir HEPA', status: 'Running', hours: 24.8, room: 'Master Bedroom' },
      { id: 'AM-4024', type: 'Air Mover', model: 'Velo Pro', status: 'Running', hours: 3.2, room: 'Living Room' },
    ],
    rooms: [
      {
        id: 'r1', name: 'Living Room', status: 'drying',
        dimensions: { length: 15.2, width: 20.1, height: 8 },
        photos: [
            { id: 'p1', url: 'https://picsum.photos/seed/mit1/800/600', timestamp: Date.now(), tags: ['drywall', 'flooring'], notes: 'Initial saturation', aiInsight: 'Class 3 Water Intrusion' },
            { id: 'p2', url: 'https://picsum.photos/seed/mit-lr1/800/600', timestamp: Date.now(), tags: ['equipment setup'], notes: 'Dehu and air movers placed.', aiInsight: 'Optimal Placement Verified' }
        ],
        readings: [
          { timestamp: Date.now() - 86400000, temp: 72, rh: 85, gpp: 98, mc: 45 },
          { timestamp: Date.now(), temp: 78, rh: 45, gpp: 62, mc: 28 },
        ]
      }
    ],
    milestones: [
        { title: 'First Contact', date: 'Oct 12, 08:15 AM', status: 'completed' },
        { title: 'Initial Assessment', date: 'Oct 12, 09:30 AM', status: 'completed' },
        { title: 'Extraction & Setup', date: 'Oct 12, 01:00 PM', status: 'completed' },
        { title: 'Drying Monitoring', date: 'In Progress', status: 'active' },
        { title: 'Reconstruction Plan', date: 'TBD', status: 'pending' },
    ],
    tasks: [
        { id: 't1', text: 'Submit daily psychrometric logs.', isCompleted: true },
        { id: 't2', text: 'Verify dehumidifier drainage line is clear.', isCompleted: false },
        { id: 't3', text: 'Take moisture readings on affected drywall.', isCompleted: false },
    ],
    lineItems: [
        { id: 'li1', description: 'Emergency Water Extraction', quantity: 4, rate: 250, total: 1000 },
        { id: 'li2', description: 'Dehumidifier Rental (Large)', quantity: 3, rate: 150, total: 450 },
    ],
    totalCost: 1450,
    invoiceStatus: 'Draft',
    roomScans: [
      {
        scanId: 'scan-01',
        roomName: 'Living Room',
        floorPlanSvg: '<svg viewBox="0 0 100 100"><polygon points="10,10 90,10 90,90 10,90" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="0.5" stroke-linejoin="round"></polygon></svg>',
        dimensions: { length: 15.2, width: 20.1, height: 8, sqft: 305.5 },
        placedPhotos: [
          { id: '1', url: 'https://picsum.photos/seed/mit-floor/400/400', timestamp: Date.now(), tags: ['flooring'], notes: 'Source of loss under flooring.', position: { wall: 'floor', x: 20, y: 80 } },
          { id: '2', url: 'https://picsum.photos/seed/mit-west-wall/400/400', timestamp: Date.now(), tags: ['drywall'], notes: 'Water damage on the west wall.', position: { wall: 'left', x: 50, y: 25 } },
          { id: '3', url: 'https://picsum.photos/seed/mit-window/400/400', timestamp: Date.now(), tags: ['window'], notes: 'Saturation at window sill.', position: { wall: 'back', x: 70, y: 40 } },
        ],
      }
    ],
    videos: [
        { id: 'v1', url: '#', description: 'Initial Walkthrough', timestamp: Date.now() - 86400000 }
    ],
    ticSheet: [
      { id: 'ts1', category: 'Water Extraction', description: 'Weighted extraction, carpet', uom: 'SQFT', quantity: 305, included: true, source: 'manual' },
      { id: 'ts2', category: 'Demolition', description: 'Remove wet drywall - up to 2 ft', uom: 'LF', quantity: 70, included: true, source: 'manual' }
    ],
    complianceChecks: {
      asbestos: 'pending',
      aiChecklist: [
        { id: 'c1', text: 'Confirm Category 3 water protocols are in place.', isCompleted: true },
        { id: 'c2', text: 'Verify containment barrier is sealed.', isCompleted: false },
      ]
    }
  },
  { 
    id: 'P-1002', 
    client: 'Robert Smith', 
    clientEmail: 'r.smith@example.com',
    clientPhone: '555-987-6543',
    address: '890 Oak Lane', 
    status: 'Initial Assessment', 
    progress: 15, 
    estimate: 'Oct 19', 
    logs: "High humidity spike recorded at 2:00 AM. Needs investigation.",
    insurance: "Allstate",
    policyNumber: 'ALL-112233445',
    adjuster: 'Jane Doe',
    startDate: "Oct 14, 2023",
    summary: 'Basement sump pump failure. 2 inches of standing water.',
    riskLevel: 'medium',
    waterCategory: WaterCategory.CAT_2,
    lossClass: LossClass.CLASS_2,
    budget: 7500,
    assignedTeam: ['David F.'],
    rooms: [],
    milestones: [
        { title: 'First Contact', date: 'Oct 14, 11:00 AM', status: 'completed' },
        { title: 'Initial Assessment', date: 'In Progress', status: 'active' },
        { title: 'Extraction & Setup', date: 'TBD', status: 'pending' },
        { title: 'Drying Monitoring', date: 'TBD', status: 'pending' },
    ],
    tasks: [
        { id: 't4', text: 'Perform AR scan of all affected areas.', isCompleted: false },
        { id: 't5', text: 'Photograph the source of loss.', isCompleted: false },
        { id: 't6', text: 'Obtain signature on Authorization Form.', isCompleted: true },
    ],
    lineItems: [],
    totalCost: 0,
    invoiceStatus: 'Draft',
    roomScans: [],
    videos: [],
    ticSheet: [],
    complianceChecks: {
      asbestos: 'not_tested',
      aiChecklist: []
    }
  },
];

// --- Offline Storage Logic ---
const STORAGE_KEY = 'mitigation_ai_projects';

const loadProjectsFromStorage = (): Project[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load projects from storage", e);
  }
  // Initialize with seed data if empty
  saveProjectsToStorage(seedProjects);
  return seedProjects;
};

const saveProjectsToStorage = (projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("Failed to save projects to storage", e);
  }
};

// Simulate API delay for realism, but data is local
const apiDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getProjects = async (): Promise<Project[]> => {
  await apiDelay(300);
  return loadProjectsFromStorage();
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  await apiDelay(200);
  const projects = loadProjectsFromStorage();
  return projects.find(p => p.id === id) || null;
};

export const addProject = async (projectData: Omit<Project, 'id' | 'progress' | 'milestones' | 'tasks' | 'lineItems' | 'totalCost' | 'invoiceStatus' | 'roomScans' | 'complianceChecks' | 'summary' | 'riskLevel' | 'rooms' | 'ticSheet' | 'videos'>): Promise<Project> => {
  await apiDelay(400);
  const projects = loadProjectsFromStorage();
  
  const newId = `P-${Math.floor(Math.random() * 9000) + 1000}`;
  const newProject: Project = {
    ...projectData,
    id: newId,
    progress: 5,
    summary: 'Newly created project file.',
    riskLevel: 'low',
    rooms: [],
    budget: 5000,
    assignedTeam: ['Unassigned'],
    milestones: [
      { title: 'Project Created', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), status: 'active' },
      { title: 'Initial Assessment', date: 'TBD', status: 'pending' },
    ],
    tasks: [
        { id: `t-${Date.now()}`, text: 'Perform AR scan of all affected areas.', isCompleted: false },
        { id: `t-${Date.now()+1}`, text: 'Obtain signature on Authorization Form.', isCompleted: false },
    ],
    lineItems: [],
    totalCost: 0,
    invoiceStatus: 'Draft',
    roomScans: [],
    videos: [],
    ticSheet: [],
    complianceChecks: {
      asbestos: 'not_tested',
      aiChecklist: []
    }
  };
  
  const updatedProjects = [newProject, ...projects];
  saveProjectsToStorage(updatedProjects);
  return newProject;
};

export const addScanToProject = async (projectId: string, scan: RoomScan): Promise<Project | null> => {
  await apiDelay(300);
  const projects = loadProjectsFromStorage();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  
  if (projectIndex === -1) return null;
  
  projects[projectIndex].roomScans.push(scan);
  saveProjectsToStorage(projects);
  return projects[projectIndex];
};

export const updateComplianceChecklist = async (projectId: string, newCheck: ComplianceCheck): Promise<Project | null> => {
    await apiDelay(200);
    const projects = loadProjectsFromStorage();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) return null;
    
    if (!projects[projectIndex].complianceChecks.aiChecklist.some(c => c.text === newCheck.text)) {
      projects[projectIndex].complianceChecks.aiChecklist.push(newCheck);
      saveProjectsToStorage(projects);
    }
    return projects[projectIndex];
}