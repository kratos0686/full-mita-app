
export interface Milestone {
  title: string;
  date: string;
  status: 'completed' | 'active' | 'pending';
}

export interface Project {
  id: string;
  client: string;
  address: string;
  status: string;
  progress: number;
  rooms: number;
  estimate: string;
  logs: string;
  insurance: string;
  startDate: string;
  milestones: Milestone[];
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
    address: '124 Maple Ave', 
    status: 'Drying - Day 2', 
    progress: 65, 
    rooms: 3, 
    estimate: 'Oct 16', 
    logs: "GPP trending down steadily.",
    insurance: "State Farm",
    startDate: "Oct 12, 2023",
    milestones: [
        { title: 'First Contact', date: 'Oct 12, 08:15 AM', status: 'completed' },
        { title: 'Initial Assessment', date: 'Oct 12, 09:30 AM', status: 'completed' },
        { title: 'Extraction & Setup', date: 'Oct 12, 01:00 PM', status: 'completed' },
        { title: 'Drying Monitoring', date: 'In Progress', status: 'active' },
        { title: 'Reconstruction Plan', date: 'TBD', status: 'pending' },
    ]
  },
  { 
    id: 'P-1002', 
    client: 'Robert Smith', 
    address: '890 Oak Lane', 
    status: 'Initial Assessment', 
    progress: 15, 
    rooms: 5, 
    estimate: 'Oct 19', 
    logs: "High humidity spike recorded at 2:00 AM. Needs investigation.",
    insurance: "Allstate",
    startDate: "Oct 14, 2023",
    milestones: [
        { title: 'First Contact', date: 'Oct 14, 11:00 AM', status: 'completed' },
        { title: 'Initial Assessment', date: 'In Progress', status: 'active' },
        { title: 'Extraction & Setup', date: 'TBD', status: 'pending' },
        { title: 'Drying Monitoring', date: 'TBD', status: 'pending' },
    ]
  },
  { 
    id: 'P-1003', 
    client: 'Elena Rodriguez', 
    address: '55 Pine St', 
    status: 'Stabilizing', 
    progress: 40, 
    rooms: 2, 
    estimate: 'Oct 17', 
    logs: "Atmospheric conditions are stable, no anomalies.",
    insurance: "Progressive",
    startDate: "Oct 13, 2023",
    milestones: [
        { title: 'First Contact', date: 'Oct 13, 02:45 PM', status: 'completed' },
        { title: 'Initial Assessment', date: 'Oct 13, 04:00 PM', status: 'completed' },
        { title: 'Extraction & Setup', date: 'In Progress', status: 'active' },
    ]
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
