// Mock data for the AP Police Innovation Hub

export const CATEGORIES = [
  "Technology Innovation",
  "Investigation Tools",
  "Traffic Management",
  "Crime Analytics",
  "Public Safety",
  "Cyber Crime",
  "AI / Automation",
  "Community Policing",
  "Others",
] as const;

export const DISTRICTS = [
  "Anantapur", "Chittoor", "East Godavari", "Eluru",
  "Guntur", "Kadapa", "Kakinada", "Krishna",
  "Kurnool", "Nandyal", "NTR", "Palnadu",
  "Prakasam", "Srikakulam", "Sri Potti Sriramulu Nellore",
  "Tirupati", "Visakhapatnam", "Vizianagaram",
  "West Godavari", "Anakapalli", "Alluri Sitharama Raju",
  "Konaseema", "Bapatla", "Parvathipuram Manyam",
  "Sri Sathya Sai", "Annamayya",
] as const;

export const RANKS = [
  "DGP", "ADGP", "IG", "DIG", "SP", "ASP",
  "DSP", "CI", "SI", "ASI", "HC", "PC",
] as const;

export const APPROVAL_RANKS = ["DGP", "ADGP", "IG", "DIG"] as const;

export interface User {
  id: string;
  name: string;
  rank: string;
  district: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: string;
  innovationsCount: number;
  connectionsCount: number;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  category: string[];
  district: string;
  author: User;
  problemStatement: string;
  proposedSolution: string;
  budget: number;
  funding: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  approvedBy?: { name: string; rank: string; date: string; comment: string };
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  externalLinks: string[];
  commentsCount: number;
  versions: number;
}

export interface FeedItem {
  id: string;
  user: User;
  action: string;
  projectTitle: string;
  projectId: string;
  timestamp: string;
}

export interface DiscussionComment {
  id: string;
  projectId: string;
  author: User;
  content: string;
  createdAt: string;
  parentId: string | null;
}

export const MOCK_CURRENT_USER: User = {
  id: "u1",
  name: "Rajesh Kumar",
  rank: "SP",
  district: "Visakhapatnam",
  email: "rajesh.kumar@appolice.gov.in",
  bio: "Passionate about leveraging technology for modern policing.",
  innovationsCount: 12,
  connectionsCount: 87,
};

export const MOCK_USERS: User[] = [
  MOCK_CURRENT_USER,
  { id: "u2", name: "Priya Sharma", rank: "DSP", district: "Guntur", email: "priya.s@appolice.gov.in", innovationsCount: 8, connectionsCount: 54 },
  { id: "u3", name: "Anil Reddy", rank: "SP", district: "Vijayawada", email: "anil.r@appolice.gov.in", innovationsCount: 15, connectionsCount: 102 },
  { id: "u4", name: "Sunitha Devi", rank: "IG", district: "Tirupati", email: "sunitha.d@appolice.gov.in", innovationsCount: 6, connectionsCount: 210 },
  { id: "u5", name: "Venkat Rao", rank: "DIG", district: "Kurnool", email: "venkat.r@appolice.gov.in", innovationsCount: 20, connectionsCount: 156 },
  { id: "u6", name: "Lakshmi Naidu", rank: "SP", district: "Eluru", email: "lakshmi.n@appolice.gov.in", innovationsCount: 9, connectionsCount: 73 },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    title: "Smart Patrol Surveillance System",
    slug: "smart-patrol-surveillance-system",
    category: ["Technology Innovation", "AI / Automation"],
    district: "Visakhapatnam",
    author: MOCK_USERS[0],
    problemStatement: "Manual patrol routes are inefficient and leave coverage gaps in urban areas. Officers often patrol the same routes, leaving other areas vulnerable to criminal activity during peak hours.",
    proposedSolution: "Deploy AI-powered route optimization using real-time crime data, GPS tracking, and predictive analytics. The system would dynamically adjust patrol routes every 30 minutes based on incident reports, crowd density, and historical crime patterns.",
    budget: 1500000,
    status: "approved",
    approvedBy: { name: "K. Srinivas", rank: "DIG", date: "2026-03-10", comment: "Excellent innovation. Pilot in Vizag urban." },
    createdAt: "2026-03-01",
    updatedAt: "2026-03-10",
    attachments: ["system-architecture.pdf", "demo-video.mp4"],
    externalLinks: ["https://example.com/demo"],
    commentsCount: 14,
    versions: 3,
  },
  {
    id: "p2",
    title: "ANPR-Based Traffic Enforcement",
    slug: "anpr-traffic-enforcement",
    category: ["Traffic Management", "Technology Innovation"],
    district: "Vijayawada",
    author: MOCK_USERS[2],
    problemStatement: "Manual traffic challan issuance is slow and leads to confrontations. Only 12% of violations are captured during manual enforcement drives.",
    proposedSolution: "Install Automatic Number Plate Recognition cameras at 50 key junctions. Integrate with vehicle registration database for automated e-challan generation and SMS notification to violators.",
    budget: 3200000,
    status: "under_review",
    createdAt: "2026-02-20",
    updatedAt: "2026-03-08",
    attachments: ["anpr-specs.pdf"],
    externalLinks: [],
    commentsCount: 8,
    versions: 2,
  },
  {
    id: "p3",
    title: "Cyber Crime Rapid Response Unit",
    slug: "cyber-crime-rapid-response",
    category: ["Cyber Crime", "Investigation Tools"],
    district: "Guntur",
    author: MOCK_USERS[1],
    problemStatement: "Cyber crime complaints take an average of 72 hours for initial response. Victims lose critical evidence and money during this delay.",
    proposedSolution: "Establish a 24/7 cyber crime war room with trained officers, automated complaint triage system, and direct coordination with banks and telecom providers for immediate account freezing.",
    budget: 800000,
    status: "submitted",
    createdAt: "2026-03-05",
    updatedAt: "2026-03-05",
    attachments: [],
    externalLinks: [],
    commentsCount: 3,
    versions: 1,
  },
  {
    id: "p4",
    title: "Community Policing Mobile App",
    slug: "community-policing-app",
    category: ["Community Policing", "Public Safety"],
    district: "Tirupati",
    author: MOCK_USERS[3],
    problemStatement: "Citizens have limited channels to report non-emergency issues. The current complaint system is paper-based and lacks feedback loops.",
    proposedSolution: "Launch a citizen-facing mobile app for reporting issues, tracking complaint status, receiving safety alerts, and rating police response. Includes multilingual support in Telugu, Hindi, and English.",
    budget: 500000,
    status: "approved",
    approvedBy: { name: "M. Rajan", rank: "ADGP", date: "2026-02-28", comment: "Good initiative. Expand to all districts." },
    createdAt: "2026-02-10",
    updatedAt: "2026-02-28",
    attachments: ["app-mockups.pdf", "user-research.pdf"],
    externalLinks: ["https://figma.com/mockup"],
    commentsCount: 22,
    versions: 4,
  },
  {
    id: "p5",
    title: "Drone-Based Crime Scene Documentation",
    slug: "drone-crime-scene-documentation",
    category: ["Investigation Tools", "Technology Innovation"],
    district: "Kurnool",
    author: MOCK_USERS[4],
    problemStatement: "Crime scene documentation relies on manual photography which is time-consuming and often misses aerial perspectives critical for accident reconstruction.",
    proposedSolution: "Deploy police drones equipped with 4K cameras and thermal imaging for rapid crime scene mapping. Create 3D models of crime scenes using photogrammetry software for court evidence.",
    budget: 2100000,
    status: "under_review",
    createdAt: "2026-03-08",
    updatedAt: "2026-03-11",
    attachments: ["drone-specs.pdf"],
    externalLinks: [],
    commentsCount: 6,
    versions: 2,
  },
  {
    id: "p6",
    title: "Predictive Crime Hotspot Mapping",
    slug: "predictive-crime-hotspot-mapping",
    category: ["Crime Analytics", "AI / Automation"],
    district: "Eluru",
    author: MOCK_USERS[5],
    problemStatement: "Crime prevention is reactive. Police respond after incidents rather than proactively deploying resources to high-risk areas.",
    proposedSolution: "Build a machine learning model trained on 5 years of FIR data, seasonal patterns, festival calendars, and socio-economic indicators to predict crime hotspots 48 hours in advance.",
    budget: 1800000,
    status: "submitted",
    createdAt: "2026-03-11",
    updatedAt: "2026-03-11",
    attachments: [],
    externalLinks: [],
    commentsCount: 1,
    versions: 1,
  },
];

export const MOCK_FEED: FeedItem[] = [
  { id: "f1", user: MOCK_USERS[5], action: "posted a new innovation", projectTitle: "Predictive Crime Hotspot Mapping", projectId: "p6", timestamp: "Just now" },
  { id: "f2", user: MOCK_USERS[4], action: "updated project", projectTitle: "Drone-Based Crime Scene Documentation", projectId: "p5", timestamp: "2 hours ago" },
  { id: "f3", user: MOCK_USERS[0], action: "received approval for", projectTitle: "Smart Patrol Surveillance System", projectId: "p1", timestamp: "Yesterday" },
  { id: "f4", user: MOCK_USERS[1], action: "posted a new innovation", projectTitle: "Cyber Crime Rapid Response Unit", projectId: "p3", timestamp: "2 days ago" },
  { id: "f5", user: MOCK_USERS[3], action: "received approval for", projectTitle: "Community Policing Mobile App", projectId: "p4", timestamp: "2 weeks ago" },
  { id: "f6", user: MOCK_USERS[2], action: "posted a new innovation", projectTitle: "ANPR-Based Traffic Enforcement", projectId: "p2", timestamp: "3 weeks ago" },
];

export const MOCK_DISCUSSION_COMMENTS: DiscussionComment[] = [
  {
    id: "c1",
    projectId: "p1",
    author: MOCK_USERS[0],
    content: "This system may help optimize peak-hour patrol coverage.",
    createdAt: "2026-03-11T09:30:00Z",
    parentId: null,
  },
  {
    id: "c2",
    projectId: "p1",
    author: MOCK_USERS[2],
    content: "Agreed. We should integrate ANPR checkpoints for better incident correlation.",
    createdAt: "2026-03-11T10:00:00Z",
    parentId: "c1",
  },
  {
    id: "c3",
    projectId: "p1",
    author: MOCK_USERS[3],
    content: "Yes, ANPR integration can improve case handoff for investigation teams.",
    createdAt: "2026-03-11T10:25:00Z",
    parentId: "c2",
  },
  {
    id: "c4",
    projectId: "p3",
    author: MOCK_USERS[1],
    content: "Need SOP templates for bank escalation during first 30 minutes.",
    createdAt: "2026-03-10T14:12:00Z",
    parentId: null,
  },
];
