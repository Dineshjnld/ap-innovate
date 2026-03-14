/**
 * Seed script — creates dummy officers, projects, comments, connections,
 * messages, follows, activities & notifications.
 *
 * Run:  node server/seed.mjs
 * All users get password:  Appolice@2026
 */

import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const now = Date.now();
const id = (prefix) => `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
const ago = (hours) => Math.floor(now - hours * 3600_000);
const PASSWORD = "Appolice@2026";
const hash = await bcrypt.hash(PASSWORD, 12);

/* ═══════════════════════════════════════════════════════════════════════════
   USERS  (1 DGP, 1 ADGP, 1 IG, 1 DIG, 5 SP, 6 DSP = 15)
   ═══════════════════════════════════════════════════════════════════════════ */
const users = [
  // Senior Officers
  { id: "u-dgp001", name: "K. Rajendra Prasad", email: "dgp.rajendra@appolice.gov.in", rank: "DGP", district: "Visakhapatnam", bio: "Director General of Police, AP. 35 years of distinguished service.", interests: ["AI / Automation", "Crime Analytics", "Cyber Crime"] },
  { id: "u-adgp001", name: "M. Lakshmi Devi", email: "adgp.lakshmi@appolice.gov.in", rank: "ADGP", district: "Guntur", bio: "ADGP Law & Order. Pioneer in community policing initiatives.", interests: ["Community Policing", "Public Safety", "Technology Innovation"] },
  { id: "u-ig001", name: "P. Venkateshwarlu", email: "ig.venkatesh@appolice.gov.in", rank: "IG", district: "Krishna", bio: "Inspector General, Coastal Range. Focus on maritime security & cyber crime.", interests: ["Cyber Crime", "Investigation Tools", "Crime Analytics"] },
  { id: "u-dig001", name: "S. Anand Kumar", email: "dig.anand@appolice.gov.in", rank: "DIG", district: "Kurnool", bio: "DIG Rayalaseema Range. Expert in traffic management systems.", interests: ["Traffic Management", "Technology Innovation", "AI / Automation"] },

  // Superintendents of Police
  { id: "u-sp001", name: "R. Padmavathi", email: "sp.padma@appolice.gov.in", rank: "SP", district: "Tirupati", bio: "SP Tirupati. Implemented smart surveillance across pilgrim zones.", interests: ["Technology Innovation", "Public Safety", "AI / Automation"] },
  { id: "u-sp002", name: "V. Srikanth Reddy", email: "sp.srikanth@appolice.gov.in", rank: "SP", district: "Chittoor", bio: "SP Chittoor. Leading drone-based border patrol programs.", interests: ["Investigation Tools", "Technology Innovation", "Crime Analytics"] },
  { id: "u-sp003", name: "N. Bhaskar Rao", email: "sp.bhaskar@appolice.gov.in", rank: "SP", district: "East Godavari", bio: "SP East Godavari. Focused on riverine area surveillance.", interests: ["Public Safety", "Community Policing", "Traffic Management"] },
  { id: "u-sp004", name: "A. Priya Sharma", email: "sp.priya@appolice.gov.in", rank: "SP", district: "Anantapur", bio: "SP Anantapur. Driving digital-first policing model.", interests: ["Cyber Crime", "AI / Automation", "Crime Analytics"] },
  { id: "u-sp005", name: "D. Kiran Kumar", email: "sp.kiran@appolice.gov.in", rank: "SP", district: "Kadapa", bio: "SP Kadapa. Specialist in organized crime investigation.", interests: ["Investigation Tools", "Crime Analytics", "Technology Innovation"] },

  // Deputy Superintendents of Police
  { id: "u-dsp001", name: "G. Suresh Babu", email: "dsp.suresh@appolice.gov.in", rank: "DSP", district: "Visakhapatnam", bio: "DSP Vizag Rural. Developed mobile FIR filing system.", interests: ["Technology Innovation", "Community Policing"] },
  { id: "u-dsp002", name: "T. Kavitha Rani", email: "dsp.kavitha@appolice.gov.in", rank: "DSP", district: "Guntur", bio: "DSP Guntur Urban. Expert in women safety programs.", interests: ["Public Safety", "Community Policing", "Technology Innovation"] },
  { id: "u-dsp003", name: "B. Ramesh Naidu", email: "dsp.ramesh@appolice.gov.in", rank: "DSP", district: "Nandyal", bio: "DSP Nandyal. Implemented AI-based CCTV analytics.", interests: ["AI / Automation", "Crime Analytics", "Cyber Crime"] },
  { id: "u-dsp004", name: "L. Divya Teja", email: "dsp.divya@appolice.gov.in", rank: "DSP", district: "Prakasam", bio: "DSP Prakasam. Leading highway patrol modernization.", interests: ["Traffic Management", "Technology Innovation", "Public Safety"] },
  { id: "u-dsp005", name: "H. Mohan Krishna", email: "dsp.mohan@appolice.gov.in", rank: "DSP", district: "Srikakulam", bio: "DSP Srikakulam. Focus on tribal area connectivity.", interests: ["Community Policing", "Public Safety"] },
  { id: "u-dsp006", name: "J. Sravani", email: "dsp.sravani@appolice.gov.in", rank: "DSP", district: "Kakinada", bio: "DSP Kakinada. Cyber crime cell specialist.", interests: ["Cyber Crime", "Investigation Tools", "AI / Automation"] },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PROJECTS  (by each SP and DSP = 11 projects)
   ═══════════════════════════════════════════════════════════════════════════ */
const projects = [
  // SP projects
  { id: "p-seed01", authorId: "u-sp001", title: "Smart Surveillance Grid for Tirupati Pilgrim Zones", slug: "smart-surveillance-grid-tirupati", category: ["Technology Innovation", "Public Safety"], district: "Tirupati",
    problem: "Over 80,000 pilgrims visit Tirumala daily. Current CCTV coverage has blind spots and no real-time anomaly detection, leading to delayed crowd management response.",
    solution: "Deploy AI-powered camera network with facial recognition, crowd density heatmaps, and automated alert system. Integrates with control room dashboard for real-time monitoring.",
    budget: 4500000, status: "approved", approvedByName: "K. Rajendra Prasad", approvedByRank: "DGP", approvalComment: "Excellent initiative. Prioritize Phase 1 deployment at main entry points.", createdAt: ago(120) },

  { id: "p-seed02", authorId: "u-sp002", title: "Drone-Based Border Patrol System", slug: "drone-border-patrol-chittoor", category: ["Investigation Tools", "Technology Innovation"], district: "Chittoor",
    problem: "120 km of border with Tamil Nadu is difficult to patrol manually. Smuggling and illegal activities go undetected in remote terrain.",
    solution: "Deploy fleet of 8 long-range drones with thermal imaging and real-time video feed. AI-based object detection for unauthorized vehicles and movement patterns.",
    budget: 7200000, status: "approved", approvedByName: "S. Anand Kumar", approvedByRank: "DIG", approvalComment: "Approved. Coordinate with BSF for airspace clearance protocols.", createdAt: ago(96) },

  { id: "p-seed03", authorId: "u-sp003", title: "Riverine Area Flood Response Network", slug: "riverine-flood-response-east-godavari", category: ["Public Safety", "Community Policing"], district: "East Godavari",
    problem: "Annual Godavari floods affect 200+ villages. Communication breakdown during floods delays rescue operations by 4-6 hours.",
    solution: "Establish mesh radio network with solar-powered relay stations. Deploy IoT water-level sensors at 50 critical points with automated SMS alerts to village heads and field officers.",
    budget: 3800000, status: "submitted", createdAt: ago(72) },

  { id: "p-seed04", authorId: "u-sp004", title: "Predictive Crime Analytics Dashboard", slug: "predictive-crime-analytics-anantapur", category: ["Crime Analytics", "AI / Automation"], district: "Anantapur",
    problem: "Crime pattern analysis is done manually using spreadsheets. Takes 2 weeks to identify hotspots. Reactive policing leads to repeat offenses in same areas.",
    solution: "Machine learning model trained on 5 years of FIR data to predict crime hotspots weekly. Interactive dashboard for beat allocation and resource deployment.",
    budget: 2100000, status: "approved", approvedByName: "P. Venkateshwarlu", approvedByRank: "IG", approvalComment: "Very promising. Share the ML model validation metrics in the next review.", createdAt: ago(168) },

  { id: "p-seed05", authorId: "u-sp005", title: "Digital Evidence Chain Management", slug: "digital-evidence-chain-kadapa", category: ["Investigation Tools", "Technology Innovation"], district: "Kadapa",
    problem: "Physical evidence handling has chain-of-custody gaps. 12% of cases face evidence tampering allegations in court due to poor documentation.",
    solution: "Blockchain-based evidence tracking system. Every evidence item gets a QR code, with tamper-proof timestamps for collection, transfer, and storage. Mobile app for field officers.",
    budget: 1800000, status: "submitted", createdAt: ago(48) },

  // DSP projects
  { id: "p-seed06", authorId: "u-dsp001", title: "Mobile FIR Filing Application", slug: "mobile-fir-filing-vizag", category: ["Technology Innovation", "Community Policing"], district: "Visakhapatnam",
    problem: "Citizens must visit police stations to file FIRs. Average wait time is 2.5 hours. 40% of minor complaints go unreported.",
    solution: "React Native mobile app for citizens to file FIRs with photo/video/location. Auto-assigns to jurisdiction. Officer receives push notification. Real-time status tracking.",
    budget: 1500000, status: "approved", approvedByName: "M. Lakshmi Devi", approvedByRank: "ADGP", approvalComment: "Excellent citizen-centric approach. Pilot in Vizag Urban first.", createdAt: ago(200) },

  { id: "p-seed07", authorId: "u-dsp002", title: "Women Safety Smart Wearable Integration", slug: "women-safety-wearable-guntur", category: ["Public Safety", "Technology Innovation"], district: "Guntur",
    problem: "SOS apps require phone access which isn't always possible during emergencies. Response time to women safety distress calls averages 18 minutes.",
    solution: "Partner with wearable manufacturers for panic button integration. Direct SOS to nearest patrol vehicle via GPS. Automated audio recording and location sharing to control room.",
    budget: 2800000, status: "submitted", createdAt: ago(36) },

  { id: "p-seed08", authorId: "u-dsp003", title: "AI-Powered CCTV Analytics Platform", slug: "ai-cctv-analytics-nandyal", category: ["AI / Automation", "Crime Analytics"], district: "Nandyal",
    problem: "1,200 CCTV cameras across the district but only 6 operators monitoring. 95% of footage is never reviewed. Post-incident analysis takes days.",
    solution: "Deploy edge AI on existing cameras for real-time vehicle number plate recognition, abandoned object detection, and unusual crowd formation alerts. Cloud dashboard for historical search.",
    budget: 3200000, status: "approved", approvedByName: "S. Anand Kumar", approvedByRank: "DIG", approvalComment: "Good use of existing infrastructure. Ensure data privacy compliance.", createdAt: ago(144) },

  { id: "p-seed09", authorId: "u-dsp004", title: "Highway Patrol Smart Response System", slug: "highway-patrol-smart-prakasam", category: ["Traffic Management", "Technology Innovation"], district: "Prakasam",
    problem: "NH-16 stretch through Prakasam has the highest accident rate in the state. Average response time for highway accidents is 45 minutes.",
    solution: "Install IoT crash sensors at 30 black spots. Automatic accident detection triggers nearest patrol bike GPS routing. Integrate with ambulance networks for golden-hour compliance.",
    budget: 2400000, status: "submitted", createdAt: ago(24) },

  { id: "p-seed10", authorId: "u-dsp005", title: "Tribal Area Digital Connectivity Project", slug: "tribal-digital-connectivity-srikakulam", category: ["Community Policing", "Public Safety"], district: "Srikakulam",
    problem: "32 tribal hamlets have no mobile coverage. Police outpost communication relies on wireless sets from the 1990s. Emergency response takes 3+ hours.",
    solution: "Solar-powered mesh network with rugged tablets for village-level policing. Offline-first FIR system that syncs when connectivity is available. Monthly satellite data dumps.",
    budget: 4100000, status: "approved", approvedByName: "K. Rajendra Prasad", approvedByRank: "DGP", approvalComment: "Critical for inclusive governance. Fast-track procurement.", createdAt: ago(240) },

  { id: "p-seed11", authorId: "u-dsp006", title: "Cyber Crime Rapid Response Toolkit", slug: "cyber-crime-toolkit-kakinada", category: ["Cyber Crime", "Investigation Tools"], district: "Kakinada",
    problem: "Cyber fraud complaints increased 340% in 2 years. SI/ASI-level officers lack tools to freeze bank accounts and trace digital payments within the golden 2-hour window.",
    solution: "Pre-configured toolkit with bank API integrations for instant account freeze requests. Automated UPI/NEFT trace workflows. Training module with 20 real case simulations.",
    budget: 950000, status: "submitted", createdAt: ago(12) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMMENTS  (realistic threaded discussion)
   ═══════════════════════════════════════════════════════════════════════════ */
const comments = [
  // On Smart Surveillance (p-seed01)
  { id: "c-s01", projectId: "p-seed01", authorId: "u-dgp001", content: "This aligns perfectly with our state-wide safe-city initiative. What's the expected camera density per square kilometer?", parentId: null, createdAt: ago(115) },
  { id: "c-s02", projectId: "p-seed01", authorId: "u-sp001", content: "Sir, we're planning 45 cameras/sq.km in the core pilgrim zone and 12/sq.km in peripheral areas. The AI layer reduces manual monitoring load by 70%.", parentId: "c-s01", createdAt: ago(114) },
  { id: "c-s03", projectId: "p-seed01", authorId: "u-adgp001", content: "Impressive density. Please ensure facial recognition complies with the latest Supreme Court privacy guidelines. Include a data retention policy — max 30 days for non-flagged footage.", parentId: "c-s01", createdAt: ago(112) },
  { id: "c-s04", projectId: "p-seed01", authorId: "u-dsp001", content: "We deployed a similar system in Vizag. Happy to share our vendor evaluation report and lessons learned from Phase 1.", parentId: null, createdAt: ago(110) },
  { id: "c-s05", projectId: "p-seed01", authorId: "u-sp001", content: "That would be very helpful, Suresh. Can you share access to the Vizag dashboard so we can benchmark?", parentId: "c-s04", createdAt: ago(109) },

  // On Drone Border Patrol (p-seed02)
  { id: "c-s06", projectId: "p-seed02", authorId: "u-dig001", content: "Budget approved. Ensure each drone has at least 90 minutes flight time. Coordinate with the District Collector for NOC on restricted airspace zones.", parentId: null, createdAt: ago(94) },
  { id: "c-s07", projectId: "p-seed02", authorId: "u-sp004", content: "We're considering a similar approach for Anantapur-Karnataka border. Would be great if we could standardize the drone fleet across both districts for maintenance efficiency.", parentId: null, createdAt: ago(90) },
  { id: "c-s08", projectId: "p-seed02", authorId: "u-sp002", content: "@A. Priya Sharma Absolutely. Let's schedule a joint review. Standardized fleet would cut maintenance costs by 35%.", parentId: "c-s07", createdAt: ago(89) },
  { id: "c-s09", projectId: "p-seed02", authorId: "u-dsp003", content: "Our AI platform can process the drone video feed for real-time alerts. We could integrate the Nandyal CCTV analytics with drone footage.", parentId: null, createdAt: ago(85) },

  // On Predictive Crime Analytics (p-seed04)
  { id: "c-s10", projectId: "p-seed04", authorId: "u-ig001", content: "The ML model approach is solid. What's the training data size and have you addressed bias in historical FIR data?", parentId: null, createdAt: ago(165) },
  { id: "c-s11", projectId: "p-seed04", authorId: "u-sp004", content: "Sir, we used 1.2 lakh FIR records. We applied de-biasing by removing demographic identifiers and focusing purely on geospatial and temporal features.", parentId: "c-s10", createdAt: ago(164) },
  { id: "c-s12", projectId: "p-seed04", authorId: "u-dsp003", content: "Can this model be extended to other districts? The Nandyal CCTV data could feed into the same analytics pipeline.", parentId: null, createdAt: ago(160) },
  { id: "c-s13", projectId: "p-seed04", authorId: "u-sp004", content: "Yes, the model is district-agnostic. We'll publish the API spec so other districts can send their data and get predictions.", parentId: "c-s12", createdAt: ago(159) },

  // On Mobile FIR (p-seed06)
  { id: "c-s14", projectId: "p-seed06", authorId: "u-adgp001", content: "This is the kind of citizen-centric innovation we need. How are you handling FIR classification — manual or automated?", parentId: null, createdAt: ago(198) },
  { id: "c-s15", projectId: "p-seed06", authorId: "u-dsp001", content: "Ma'am, we're using NLP to auto-suggest IPC sections based on the complaint text. The SHO reviews and confirms before final FIR generation.", parentId: "c-s14", createdAt: ago(197) },
  { id: "c-s16", projectId: "p-seed06", authorId: "u-dsp006", content: "Can we integrate the cyber crime toolkit with this app? Citizens could file cyber fraud complaints with automatic bank freeze requests.", parentId: null, createdAt: ago(195) },
  { id: "c-s17", projectId: "p-seed06", authorId: "u-dsp001", content: "Great idea, Sravani. Let's discuss the API integration. The app architecture supports modular plugins.", parentId: "c-s16", createdAt: ago(194) },

  // On AI CCTV Analytics (p-seed08)
  { id: "c-s18", projectId: "p-seed08", authorId: "u-dig001", content: "Excellent use of existing infrastructure. What edge hardware are you using? Need to ensure it works in our temperature range (up to 48°C in Rayalaseema).", parentId: null, createdAt: ago(140) },
  { id: "c-s19", projectId: "p-seed08", authorId: "u-dsp003", content: "Sir, we're using NVIDIA Jetson Orin modules with IP67 weatherproof enclosures. Tested up to 55°C operating temperature.", parentId: "c-s18", createdAt: ago(139) },
  { id: "c-s20", projectId: "p-seed08", authorId: "u-sp005", content: "Can the number plate recognition feed into our evidence chain system? Would be great for automated case linking.", parentId: null, createdAt: ago(135) },
  { id: "c-s21", projectId: "p-seed08", authorId: "u-dsp003", content: "Definitely possible. We can output structured ANPR data via REST API. Let's define the schema together.", parentId: "c-s20", createdAt: ago(134) },

  // On Tribal Connectivity (p-seed10)
  { id: "c-s22", projectId: "p-seed10", authorId: "u-dgp001", content: "This addresses a critical governance gap. I'm fast-tracking the procurement. Include local youth as digital ambassadors for sustainability.", parentId: null, createdAt: ago(238) },
  { id: "c-s23", projectId: "p-seed10", authorId: "u-dsp005", content: "Thank you, sir. We've already identified 15 tribal youth who completed ITI courses. They'll be trained as first-level maintainers.", parentId: "c-s22", createdAt: ago(237) },
  { id: "c-s24", projectId: "p-seed10", authorId: "u-sp003", content: "We have similar terrain challenges in East Godavari agency areas. Can we replicate this model for 18 hamlets in our district?", parentId: null, createdAt: ago(230) },

  // On Cyber Crime Toolkit (p-seed11)
  { id: "c-s25", projectId: "p-seed11", authorId: "u-ig001", content: "The 2-hour golden window is critical. What's the current average time for bank account freezing in your district?", parentId: null, createdAt: ago(10) },
  { id: "c-s26", projectId: "p-seed11", authorId: "u-dsp006", content: "Sir, currently it takes 4-6 hours due to manual coordination. The toolkit will bring it down to under 15 minutes with pre-authenticated bank API connections.", parentId: "c-s25", createdAt: ago(9) },
  { id: "c-s27", projectId: "p-seed11", authorId: "u-sp004", content: "This is exactly what our Anantapur cyber cell needs. The training simulation module is a fantastic addition — most officers learn best from real cases.", parentId: null, createdAt: ago(8) },
  { id: "c-s28", projectId: "p-seed11", authorId: "u-dsp002", content: "Can we include UPI fraud pattern recognition? We're seeing a surge in Guntur district.", parentId: null, createdAt: ago(6) },
  { id: "c-s29", projectId: "p-seed11", authorId: "u-dsp006", content: "Already planned for Phase 2, Kavitha. The toolkit will have a fraud pattern library that updates weekly from RBI's CERT-In feeds.", parentId: "c-s28", createdAt: ago(5) },

  // On Highway Patrol (p-seed09)
  { id: "c-s30", projectId: "p-seed09", authorId: "u-sp003", content: "NH-16 runs through our district too. Can the crash sensors be extended to the East Godavari stretch? Same vendor could reduce per-unit cost.", parentId: null, createdAt: ago(20) },
  { id: "c-s31", projectId: "p-seed09", authorId: "u-dsp004", content: "Absolutely. Joint procurement would bring costs down by 25%. Let's coordinate with the Highways Department.", parentId: "c-s30", createdAt: ago(19) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   FOLLOWS / CONNECTIONS / MESSAGES
   ═══════════════════════════════════════════════════════════════════════════ */
const follows = [
  // Everyone follows DGP
  { follower: "u-adgp001", following: "u-dgp001" },
  { follower: "u-ig001", following: "u-dgp001" },
  { follower: "u-dig001", following: "u-dgp001" },
  { follower: "u-sp001", following: "u-dgp001" },
  { follower: "u-sp002", following: "u-dgp001" },
  { follower: "u-sp003", following: "u-dgp001" },
  { follower: "u-sp004", following: "u-dgp001" },
  { follower: "u-sp005", following: "u-dgp001" },
  { follower: "u-dsp001", following: "u-dgp001" },
  { follower: "u-dsp002", following: "u-dgp001" },
  { follower: "u-dsp003", following: "u-dgp001" },
  { follower: "u-dsp004", following: "u-dgp001" },
  { follower: "u-dsp005", following: "u-dgp001" },
  { follower: "u-dsp006", following: "u-dgp001" },
  // SPs follow ADGP & IG
  { follower: "u-sp001", following: "u-adgp001" },
  { follower: "u-sp002", following: "u-adgp001" },
  { follower: "u-sp003", following: "u-adgp001" },
  { follower: "u-sp004", following: "u-ig001" },
  { follower: "u-sp005", following: "u-ig001" },
  // DSPs follow their nearby SPs
  { follower: "u-dsp001", following: "u-sp001" },
  { follower: "u-dsp002", following: "u-sp003" },
  { follower: "u-dsp003", following: "u-sp005" },
  { follower: "u-dsp004", following: "u-sp003" },
  { follower: "u-dsp005", following: "u-sp003" },
  { follower: "u-dsp006", following: "u-sp004" },
  // Cross-follows between collaborating officers
  { follower: "u-sp002", following: "u-sp004" },
  { follower: "u-sp004", following: "u-sp002" },
  { follower: "u-dsp001", following: "u-dsp006" },
  { follower: "u-dsp006", following: "u-dsp001" },
  { follower: "u-dsp003", following: "u-dsp006" },
];

const connections = [
  // Accepted connections
  { a: "u-dgp001", b: "u-adgp001", requestedBy: "u-adgp001", status: "accepted" },
  { a: "u-dgp001", b: "u-ig001", requestedBy: "u-ig001", status: "accepted" },
  { a: "u-adgp001", b: "u-ig001", requestedBy: "u-adgp001", status: "accepted" },
  { a: "u-dig001", b: "u-ig001", requestedBy: "u-dig001", status: "accepted" },
  { a: "u-sp001", b: "u-sp002", requestedBy: "u-sp001", status: "accepted" },
  { a: "u-sp002", b: "u-sp004", requestedBy: "u-sp002", status: "accepted" },
  { a: "u-sp004", b: "u-sp005", requestedBy: "u-sp004", status: "accepted" },
  { a: "u-dsp001", b: "u-dsp006", requestedBy: "u-dsp001", status: "accepted" },
  { a: "u-dsp003", b: "u-dsp006", requestedBy: "u-dsp003", status: "accepted" },
  { a: "u-sp003", b: "u-dsp004", requestedBy: "u-dsp004", status: "accepted" },
  { a: "u-adgp001", b: "u-dsp002", requestedBy: "u-dsp002", status: "accepted" },
  // Pending requests
  { a: "u-dsp002", b: "u-sp001", requestedBy: "u-dsp002", status: "requested" },
  { a: "u-dsp005", b: "u-sp005", requestedBy: "u-dsp005", status: "requested" },
  { a: "u-dsp004", b: "u-sp002", requestedBy: "u-dsp004", status: "requested" },
];

const messages = [
  // DGP <-> ADGP
  { from: "u-dgp001", to: "u-adgp001", text: "Lakshmi, have you reviewed the Tirupati smart surveillance proposal? I think it deserves priority funding.", createdAt: ago(100), read: true },
  { from: "u-adgp001", to: "u-dgp001", text: "Yes sir, reviewed it. The approach is solid. I've suggested they add a data retention policy. Recommending approval from my side.", createdAt: ago(99), read: true },
  { from: "u-dgp001", to: "u-adgp001", text: "Good. Also look at the tribal connectivity project from Srikakulam DSP. That one addresses a genuine governance gap.", createdAt: ago(98), read: true },
  { from: "u-adgp001", to: "u-dgp001", text: "Will review today. The mobile FIR project from Vizag DSP is also very promising — could transform citizen experience.", createdAt: ago(97), read: true },

  // IG <-> SP Anantapur
  { from: "u-ig001", to: "u-sp004", text: "Priya, the predictive analytics dashboard looks excellent. Can you share the ML model accuracy metrics before the next review?", createdAt: ago(162), read: true },
  { from: "u-sp004", to: "u-ig001", text: "Thank you, sir. Current accuracy is 78% for weekly hotspot prediction. We're targeting 85% with the next training cycle using 2 more years of data.", createdAt: ago(161), read: true },
  { from: "u-ig001", to: "u-sp004", text: "That's promising. Also explore if the model can identify crime displacement patterns after police intervention.", createdAt: ago(160), read: true },

  // SP Chittoor <-> SP Anantapur (collaboration)
  { from: "u-sp002", to: "u-sp004", text: "Priya, saw your comment on the drone project. Let's standardize our approach. Are you free for a video call this Thursday?", createdAt: ago(88), read: true },
  { from: "u-sp004", to: "u-sp002", text: "Thursday works. 3 PM? I'll prepare a comparison matrix for the drone models we're evaluating.", createdAt: ago(87), read: true },
  { from: "u-sp002", to: "u-sp004", text: "Perfect. I'll also bring our terrain mapping data. Together we can make a strong case for joint procurement to IG sir.", createdAt: ago(86), read: true },

  // DSP Vizag <-> DSP Kakinada (tech collaboration)
  { from: "u-dsp001", to: "u-dsp006", text: "Sravani, your cyber crime toolkit idea is brilliant. Can we integrate it as a module in the mobile FIR app?", createdAt: ago(190), read: true },
  { from: "u-dsp006", to: "u-dsp001", text: "That's exactly what I was thinking! The API architecture should support it. Let me draft a technical spec this week.", createdAt: ago(189), read: true },
  { from: "u-dsp001", to: "u-dsp006", text: "Great. I'll share our app's plugin architecture docs. We designed it for exactly this kind of extensibility.", createdAt: ago(188), read: true },
  { from: "u-dsp006", to: "u-dsp001", text: "Perfect. Also, let's present this combined approach to ADGP ma'am — citizen app + cyber toolkit could be a statewide rollout.", createdAt: ago(187), read: false },

  // DIG <-> DSP Nandyal
  { from: "u-dig001", to: "u-dsp003", text: "Ramesh, the AI CCTV project is approved. Need your hardware procurement list by end of this week for budget allocation.", createdAt: ago(138), read: true },
  { from: "u-dsp003", to: "u-dig001", text: "Thank you, sir. I'll have the complete BOM ready by Friday. Already validated the Jetson Orin pricing with three vendors.", createdAt: ago(137), read: true },

  // SP East Godavari <-> DSP Srikakulam
  { from: "u-sp003", to: "u-dsp005", text: "Mohan, your tribal connectivity project is inspiring. We have similar challenges in East Godavari agency areas. Can we collaborate?", createdAt: ago(228), read: true },
  { from: "u-dsp005", to: "u-sp003", text: "Of course, sir. The mesh network design is modular — we can extend coverage points easily. I'll share the technical architecture document.", createdAt: ago(227), read: true },
  { from: "u-sp003", to: "u-dsp005", text: "Excellent. Let's plan a joint site survey next month. I'll arrange our boat team for the riverine hamlets.", createdAt: ago(226), read: false },

  // DSP Guntur <-> DSP Kakinada
  { from: "u-dsp002", to: "u-dsp006", text: "Sravani, UPI fraud cases are spiking here in Guntur. Do you have any quick reference material on tracing protocols?", createdAt: ago(4), read: true },
  { from: "u-dsp006", to: "u-dsp002", text: "Sending you our SOP document now. Key thing: you must freeze the merchant account within 2 hours. After that, funds cascade through 3-4 mule accounts.", createdAt: ago(3), read: true },
  { from: "u-dsp002", to: "u-dsp006", text: "Got it, very helpful. We need the bank API integrations ASAP — manual calls to bank fraud desks are too slow.", createdAt: ago(2), read: false },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SEED EXECUTION
   ═══════════════════════════════════════════════════════════════════════════ */

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Users ──────────────────────────────────────────────────────────
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, rank, district, interests, bio, innovations_count, connections_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,$9)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.email, hash, u.rank, u.district, u.interests, u.bio, Math.floor(ago(500 + Math.random() * 200))],  
      );
    }
    console.log(`✓ ${users.length} users created`);

    // ── Projects ───────────────────────────────────────────────────────
    for (const p of projects) {
      await client.query(
        `INSERT INTO projects (id, title, slug, category, district, author_id, problem_statement, proposed_solution, budget, status,
         approved_by_name, approved_by_rank, approval_comment, approved_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.title, p.slug, p.category, p.district, p.authorId,
          p.problem, p.solution, p.budget, p.status,
          p.approvedByName ?? null, p.approvedByRank ?? null, p.approvalComment ?? null,
          p.status === "approved" ? p.createdAt + 86400000 : null,
          p.createdAt, p.createdAt,
        ],
      );
    }
    // Update innovations_count
    await client.query(`
      UPDATE users SET innovations_count = (SELECT COUNT(*) FROM projects WHERE author_id = users.id)
    `);
    console.log(`✓ ${projects.length} projects created`);

    // ── Comments ───────────────────────────────────────────────────────
    for (const c of comments) {
      await client.query(
        `INSERT INTO comments (id, project_id, author_id, content, parent_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.projectId, c.authorId, c.content, c.parentId, c.createdAt],
      );
    }
    // Update comments_count on projects
    await client.query(`
      UPDATE projects SET comments_count = (SELECT COUNT(*) FROM comments WHERE project_id = projects.id)
    `);
    console.log(`✓ ${comments.length} comments created`);

    // ── Follows ────────────────────────────────────────────────────────
    for (const f of follows) {
      await client.query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [f.follower, f.following],
      );
    }
    console.log(`✓ ${follows.length} follow relationships created`);

    // ── Connections ────────────────────────────────────────────────────
    for (const c of connections) {
      const [a, b] = [c.a, c.b].sort();
      await client.query(
        `INSERT INTO connections (user_a_id, user_b_id, requested_by_id, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [a, b, c.requestedBy, c.status],
      );
    }
    // Update connections_count
    await client.query(`
      UPDATE users SET connections_count = (
        SELECT COUNT(*) FROM connections
        WHERE (user_a_id = users.id OR user_b_id = users.id) AND status = 'accepted'
      )
    `);
    console.log(`✓ ${connections.length} connections created`);

    // ── Messages ───────────────────────────────────────────────────────
    for (const m of messages) {
      const mId = id("m");
      await client.query(
        `INSERT INTO messages (id, from_user_id, to_user_id, text, created_at, is_read)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [mId, m.from, m.to, m.text, m.createdAt, m.read],
      );
    }
    console.log(`✓ ${messages.length} messages created`);

    // ── Activities (for every project) ─────────────────────────────────
    for (const p of projects) {
      const aId = id("a");
      await client.query(
        `INSERT INTO activities (id, user_id, action, project_title, project_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [aId, p.authorId, "submitted a new innovation", p.title, p.id, p.createdAt],
      );
      // Activity for approval
      if (p.status === "approved") {
        const aId2 = id("a");
        // Find the approver user
        const approverUser = users.find(u => u.name === p.approvedByName);
        const approverId = approverUser ? approverUser.id : p.authorId;
        await client.query(
          `INSERT INTO activities (id, user_id, action, project_title, project_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [aId2, approverId, "approved the innovation", p.title, p.id, p.createdAt + 86400000],
        );
      }
    }
    // Activity for some comments
    const commentActivities = comments.filter((_, i) => i % 3 === 0);
    for (const c of commentActivities) {
      const proj = projects.find(p => p.id === c.projectId);
      if (proj) {
        const aId = id("a");
        await client.query(
          `INSERT INTO activities (id, user_id, action, project_title, project_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [aId, c.authorId, "commented on", proj.title, proj.id, c.createdAt],
        );
      }
    }
    console.log(`✓ Activities created`);

    // ── Notifications ──────────────────────────────────────────────────
    const notifications = [];
    // Approval notifications to project authors
    for (const p of projects.filter(p => p.status === "approved")) {
      notifications.push({ userId: p.authorId, title: "Project Approved", body: `Your project "${p.title}" has been approved by ${p.approvedByRank} ${p.approvedByName}.`, createdAt: p.createdAt + 86400000 });
    }
    // Comment notifications to project owners
    for (const c of comments) {
      const proj = projects.find(p => p.id === c.projectId);
      if (proj && c.authorId !== proj.authorId) {
        notifications.push({ userId: proj.authorId, title: "New Comment", body: `${users.find(u => u.id === c.authorId)?.name} commented on "${proj.title}"`, createdAt: c.createdAt });
      }
    }
    // Connection request notifications
    for (const c of connections.filter(c => c.status === "requested")) {
      const targetId = c.requestedBy === c.a ? c.b : c.a;
      const requester = users.find(u => u.id === c.requestedBy);
      notifications.push({ userId: targetId, title: "Connection Request", body: `${requester?.name} sent you a connection request`, createdAt: ago(200) });
    }
    // Follow notifications
    for (const f of follows.slice(0, 10)) {
      const follower = users.find(u => u.id === f.follower);
      notifications.push({ userId: f.following, title: "New Follower", body: `${follower?.name} started following you`, createdAt: ago(280) });
    }
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (id, user_id, title, body, created_at, is_read)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id("n"), n.userId, n.title, n.body, n.createdAt, false],
      );
    }
    console.log(`✓ ${notifications.length} notifications created`);

    // ── Backfill search vectors ────────────────────────────────────────
    await client.query(`
      UPDATE projects SET search_vector =
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(problem_statement, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(proposed_solution, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(district, '')), 'D')
      WHERE search_vector IS NULL
    `);

    await client.query("COMMIT");
    console.log("\n✅ Seed complete! All 15 users can log in with password: " + PASSWORD);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
