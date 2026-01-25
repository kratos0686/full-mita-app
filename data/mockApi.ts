
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

export interface PlacedPhoto {
  photoId: string;
  url: string;
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

export interface ComplianceCheck {
    id: string;
    text: string;
    isCompleted: boolean;
}

export interface Project {
  id: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  address: string;
  status: string;
  progress: number;
  rooms: number;
  estimate: string;
  logs: string;
  insurance: string;
  policyNumber: string;
  adjuster: string;
  startDate: string;
  milestones: Milestone[];
  tasks: AITask[];
  lineItems: LineItem[];
  totalCost: number;
  invoiceStatus: 'Draft' | 'Sent' | 'Paid';
  roomScans: RoomScan[];
  complianceChecks: {
      asbestos: 'not_tested' | 'pending' | 'clear' | 'abatement_required';
      aiChecklist: ComplianceCheck[];
  }
}

export interface AIProjectData extends Project {
  aiSummary: string;
  aiAlert: {
    isAlert: boolean;
    reason: string;
  };
  priority: number;
}

const projects: Project[] = [
  { 
    id: 'P-1001', 
    client: 'Sarah Johnson', 
    clientEmail: 's.johnson@example.com',
    clientPhone: '555-123-4567',
    address: '124 Maple Ave', 
    status: 'Drying - Day 2', 
    progress: 65, 
    rooms: 3, 
    estimate: 'Oct 16', 
    logs: "GPP trending down steadily.",
    insurance: "State Farm",
    policyNumber: 'SF-987654321',
    adjuster: 'Tom Brown',
    startDate: "Oct 12, 2023",
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
        dimensions: { length: 15.2, width: 20.1, sqft: 305.5 },
        placedPhotos: [
          { photoId: '1', url: 'https://picsum.photos/seed/mit1/400/400', x: 20, y: 50 },
          { photoId: '2', url: 'https://picsum.photos/seed/mit2/400/400', x: 80, y: 50 },
        ],
      }
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
    rooms: 5, 
    estimate: 'Oct 19', 
    logs: "High humidity spike recorded at 2:00 AM. Needs investigation.",
    insurance: "Allstate",
    policyNumber: 'ALL-112233445',
    adjuster: 'Jane Doe',
    startDate: "Oct 14, 2023",
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
    complianceChecks: {
      asbestos: 'not_tested',
      aiChecklist: []
    }
  },
  { 
    id: 'P-1003', 
    client: 'Elena Rodriguez', 
    clientEmail: 'e.rodriguez@example.com',
    clientPhone: '555-456-7890',
    address: '55 Pine St', 
    status: 'Completed', 
    progress: 100, 
    rooms: 2, 
    estimate: 'Oct 17', 
    logs: "Atmospheric conditions are stable, no anomalies.",
    insurance: "Progressive",
    policyNumber: 'PROG-55667788',
    adjuster: 'Sam Wilson',
    startDate: "Oct 13, 2023",
    milestones: [
        { title: 'First Contact', date: 'Oct 13, 02:45 PM', status: 'completed' },
        { title: 'Initial Assessment', date: 'Oct 13, 04:00 PM', status: 'completed' },
        { title: 'Extraction & Setup', date: 'Oct 13, 06:00 PM', status: 'completed' },
        { title: 'Drying Complete', date: 'Oct 16, 09:00 AM', status: 'active' },
    ],
    tasks: [
        { id: 't7', text: 'Break down and remove all equipment.', isCompleted: false },
        { id: 't8', text: 'Obtain signature on Completion Form.', isCompleted: false },
    ],
    lineItems: [
        { id: 'li3', description: 'Standard Mitigation Labor', quantity: 24, rate: 75, total: 1800 },
    ],
    totalCost: 1800,
    invoiceStatus: 'Paid',
    roomScans: [],
    complianceChecks: {
      asbestos: 'clear',
      aiChecklist: [
        { id: 'c3', text: 'All materials passed dry standard.', isCompleted: true },
      ]
    }
  },
];

// Simulate API delay
const apiDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getProjects = async (): Promise<Project[]> => {
  await apiDelay(500);
  return projects;
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  await apiDelay(300);
  return projects.find(p => p.id === id) || null;
};

export const addProject = async (projectData: Omit<Project, 'id' | 'progress' | 'milestones' | 'tasks' | 'lineItems' | 'totalCost' | 'invoiceStatus' | 'roomScans' | 'complianceChecks'>): Promise<Project> => {
  await apiDelay(200);
  const newId = `P-${Math.floor(Math.random() * 900) + 1000}`;
  const newProject: Project = {
    ...projectData,
    id: newId,
    progress: 5,
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
    complianceChecks: {
      asbestos: 'not_tested',
      aiChecklist: []
    }
  };
  projects.unshift(newProject);
  return newProject;
};

export const addScanToProject = async (projectId: string, scan: RoomScan): Promise<Project | null> => {
  await apiDelay(200);
  const projectIndex = projects.findIndex(p => p.id === projectId);
  if (projectIndex === -1) return null;
  projects[projectIndex].roomScans.push(scan);
  return projects[projectIndex];
};

export const updateComplianceChecklist = async (projectId: string, newCheck: ComplianceCheck): Promise<Project | null> => {
    await apiDelay(100);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return null;
    const project = projects[projectIndex];
    if (!project.complianceChecks.aiChecklist.some(c => c.text === newCheck.text)) {
      project.complianceChecks.aiChecklist.push(newCheck);
    }
    return project;
}
