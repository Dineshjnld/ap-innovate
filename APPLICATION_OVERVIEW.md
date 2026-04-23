# AP Innovate Application Overview

## 1. Executive Summary

**AP Innovate** is a full-stack internal collaboration platform built for the **Andhra Pradesh Police Innovation Hub**. It enables police officers across districts to submit innovation proposals, discover existing ideas, discuss implementation details, connect with peers, message in real time, and route projects through a command-level approval workflow.

At its core, the application solves a coordination problem: useful policing innovations often remain siloed inside individual districts or officers' teams. AP Innovate turns those scattered ideas into a searchable, reviewable, state-wide institutional knowledge system.

## 2. Problem the Application Solves

The platform addresses several operational gaps:

- Innovation ideas are often scattered across districts and not centrally documented.
- Similar ideas may be proposed repeatedly because prior submissions are hard to discover.
- Approval and review of field innovations can be informal, inconsistent, or slow.
- Officers in different districts need a trusted digital space to collaborate on implementation.
- Leadership needs visibility into submitted, approved, rejected, and under-review initiatives.
- Valuable project knowledge, files, comments, and revisions are often lost over time.

## 3. Who the Application Is For

### Primary End Users

- Andhra Pradesh Police officers across ranks and districts
- Officers who want to submit innovation proposals
- Officers who want to explore and reuse innovations from other districts
- Officers collaborating through comments, follows, connections, and direct messages

### Review and Decision-Making Users

- Senior command officers such as `DGP`, `ADGP`, `IG`, and `DIG`
- Admin users who manage oversight, project visibility, and role assignments

### Likely Stakeholders

- Police leadership
- Innovation cells or modernization teams
- District command units
- Technology and implementation partners referenced in projects

## 4. What Makes the Application Special

This is not just a project listing tool. Its differentiators in the current codebase are:

- **Police-specific workflow design** with districts, ranks, command approvals, and internal-use positioning
- **Statewide innovation repository** for preserving institutional knowledge
- **AI-powered project comparison** to detect overlap with earlier submissions before a new idea is filed
- **Rank-aware approval workflow** where only approved command ranks can move projects through review states
- **Real-time collaboration** using Socket.IO for presence, typing signals, notifications, messages, and project activity
- **Version history for project edits**, so changes are tracked over time
- **Professional networking features** such as follow, connection request, and profile discovery
- **Rich file handling** including documents, images, video attachments, avatar optimization, and download/view support
- **Admin dashboard** for monitoring projects, users, pending review volume, and role management

## 5. Product Capabilities

### Innovation Submission

Users can submit innovation proposals with:

- Title
- Categories
- District
- Problem statement
- Proposed solution
- Budget
- Funding source
- Officer in charge
- Company name
- External links
- File attachments

### AI Compare Before Submission

Before submitting, the user can run **AI Compare**. The backend uses the Hugging Face model `Xenova/all-MiniLM-L6-v2` plus structured scoring logic to compare the draft against existing projects and estimate semantic overlap.

This helps:

- reduce duplicate submissions
- encourage reuse of existing work
- improve proposal quality
- guide officers toward similar existing innovations

### Discovery and Search

The platform supports:

- category filtering
- district filtering
- text search
- global search across projects, profiles, categories, and districts
- PostgreSQL full-text search on innovation content

### Project Review and Approval

Projects move through statuses such as:

- `submitted`
- `under_review`
- `approved`
- `rejected`
- `draft` appears in UI models even though most flows submit directly

Senior authorized ranks can:

- approve a project
- reject a project
- mark a project under review
- add decision remarks

### Project Collaboration

Each project has:

- a detail page
- threaded discussion/comments
- live comment updates
- file previews/downloads
- approval history display
- version count

### Messaging and Presence

The app includes a direct messaging system with:

- conversation list
- read receipts
- typing indicators
- online/offline presence
- last seen support
- user search for starting new chats

### Profiles and Network Building

Users have professional profiles with:

- name, rank, district, email, bio, avatar
- follower counts
- connection counts
- innovation counts
- profile editing
- avatar upload and optimization
- ability to follow others
- ability to send or accept connection requests
- ability to browse another user's projects

### Administration

Admins can:

- view all projects with filters
- inspect version history for edited projects
- view all users
- promote/demote users between `user` and `admin`
- review aggregate platform statistics

## 6. End-to-End User Journey

### Standard Officer Journey

1. Sign up or sign in.
2. Enter the innovation hub dashboard.
3. Discover existing projects and officers.
4. Create a new innovation proposal.
5. Run AI comparison to check for similar projects.
6. Submit the innovation.
7. Collaborate through comments and messages.
8. Track whether the project is submitted, under review, approved, or rejected.
9. Edit the project later if needed, with version history retained.

### Senior Reviewer Journey

1. Open a project detail page.
2. Review the problem statement, solution, attachments, and discussion.
3. Add command remarks.
4. Approve, reject, or mark under review.
5. Trigger notifications and updates for the author and interested users.

### Admin Journey

1. Open the admin dashboard.
2. Review overall project, user, comment, and pending-review counts.
3. Filter projects by status or search term.
4. Inspect project edit history.
5. Manage user roles.

## 7. Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router v6
- Tailwind CSS
- shadcn/ui
- Radix UI primitives
- Lucide React icons
- TanStack React Query
- React Hook Form
- Zod
- Sonner
- Recharts
- Socket.IO client

### Backend

- Node.js
- Express
- PostgreSQL
- `pg` connection pool
- Socket.IO
- JWT authentication
- bcrypt password hashing
- Multer for uploads
- Sharp for avatar optimization
- `@xenova/transformers` for in-process AI similarity analysis

### Testing and Quality

- Vitest
- Playwright
- ESLint

### Infrastructure and Deployment

- Docker
- Docker Compose
- PM2 cluster mode
- multi-stage Docker build

### Security and Monitoring Assets in Repo

- Helmet
- Express rate limiting
- CrowdSec setup scripts
- Wazuh agent setup scripts
- Prometheus and Grafana monitoring configs
- GitHub workflow files for Trivy, OWASP Dependency Check, and ZAP baseline scans

## 8. Architecture Overview

The system is a **full-stack monorepo-style project** with:

- `src/` for the React frontend
- `server/` for the Express backend
- PostgreSQL as the primary database
- `uploads/` for stored uploaded assets
- `dist/` for built frontend output

### Runtime Model

- The browser app communicates with the backend using REST APIs.
- It also opens a Socket.IO connection for real-time events.
- The Express server stores and retrieves data from PostgreSQL.
- The backend serves uploaded files and can also serve the built frontend in production.

### Real-Time Strategy

The codebase uses a hybrid model:

- **Polling** for many live data subscriptions such as projects, messages, comments, notifications, and profiles
- **Socket events** for higher-immediacy features such as presence, typing, room updates, project status changes, and new message flows

## 9. Key Frontend Pages

- `LandingPage`: public-facing entry page for the AP Police Innovation Hub
- `SignInPage`: login flow
- `SignUpPage`: account creation
- `Index`: main innovation dashboard
- `CreateProjectPage`: new innovation submission
- `ProjectPage`: project detail, discussion, and approval
- `ProfilePage`: self and peer profile pages
- `MessagesPage`: real-time direct messaging workspace
- `NotificationsPage`: notification center
- `AdminDashboard`: admin oversight and user/project management

## 10. Key Backend Domains

The backend currently manages:

- authentication
- user profiles
- avatar uploads
- projects
- project editing and version history
- project comments
- activities
- follows
- connections
- direct messages
- notifications
- admin controls
- AI project comparison
- health checks

## 11. Database Design

The PostgreSQL schema is initialized directly from the backend at startup. Important tables include:

- `users`
- `projects`
- `comments`
- `activities`
- `messages`
- `notifications`
- `follows`
- `connections`
- `auth_refresh_tokens`
- `auth_login_attempts`
- `project_versions`

### Notable Database Features

- full-text search using `tsvector`
- GIN indexing for search and categories
- project version snapshots before edits
- relationship mapping across users, projects, comments, messages, and notifications
- refresh token persistence and revocation
- login-attempt tracking for brute-force resistance

## 12. Authentication and Authorization

### Authentication

The app uses:

- JWT access tokens
- refresh tokens
- refresh token rotation
- hashed refresh token storage
- session hydration on frontend boot
- periodic refresh attempts while logged in

### Authorization

Role and rank rules exist at multiple levels:

- protected routes on the frontend require authentication
- admin routes require `role === "admin"`
- project approval actions are limited to specific command ranks
- project editing is limited to the original author

## 13. API Surface Summary

Major API areas implemented in the server include:

- `/api/auth/*`
- `/api/users/*`
- `/api/projects/*`
- `/api/projects/:projectId/comments`
- `/api/projects/:projectId/versions`
- `/api/messages/me`
- `/api/notifications/me`
- `/api/upload`
- `/api/activities`
- `/api/stats`
- `/api/admin/*`
- `/api/ai/compare-projects`
- `/api/health`

## 14. File and Media Handling

The application supports:

- multi-file project uploads
- document, image, video, and other file attachment handling
- PDF inline viewing
- image gallery/lightbox viewing
- video preview playback
- download links for attached files
- avatar upload with automatic resize and WebP conversion via Sharp

## 15. Real-Time and Collaboration Features

Implemented real-time capabilities include:

- presence snapshot and presence updates
- online/offline tracking
- last-seen tracking
- user typing and stop-typing events
- project room join/leave
- message delivery updates
- notification delivery
- project status change broadcasts

## 16. Security Features Present in Code

- password hashing with bcrypt
- JWT-based auth
- refresh token rotation
- rate limiting for API and auth endpoints
- Helmet security headers
- input sanitization on server-side text handling
- protected admin middleware
- file type validation for uploads
- upload size limits
- DB-backed failed login tracking

## 17. Deployment Model

### Docker Compose

The repo ships with services for:

- PostgreSQL 16 (`db`)
- API server (`api`)

The API container:

- builds the frontend
- installs production dependencies
- runs the Node server with PM2
- exposes port `3001` internally, mapped to `80` in `docker-compose.yml`

### Production Notes

The backend can serve the built frontend from `dist/`, which means the project can run as a unified deployed app once built.

## 18. Repository Structure at a Glance

### Main App Folders

- `src/`: frontend application
- `server/`: backend server and seed files
- `deploy/monitoring/`: Prometheus/Grafana assets
- `deploy/security/`: security hardening scripts
- `.github/workflows/`: security automation workflows
- `public/`: public web assets
- `uploads/`: uploaded user/project files

## 19. Strengths of the Current Application

- Clear domain focus for policing innovation
- Strong combination of product, collaboration, and workflow capabilities
- Full-stack implementation already present
- Real-time communication features are meaningful, not cosmetic
- AI comparison adds a distinct operational value
- Role/rank-aware governance is embedded into the product
- Admin tooling already exists
- Deployment, security, and monitoring assets are included

## 20. Current Observations / Notes

- The repository already contains a large technical README, but this file is better suited for business, onboarding, and product-level understanding.
- The frontend relies heavily on polling for "live" data, with sockets used selectively for more immediate interaction.
- The status model in UI includes `draft`, though most visible user flows submit directly into review-oriented states.
- Some routes like `/hub`, `/hub1`, `/hub2`, and `/dashboard` indicate iterative dashboard development or alternate entry paths.
- The application appears designed for **internal, authenticated organizational use**, not for public citizen access.

## 21. Best One-Line Description

**AP Innovate is a secure, AI-assisted innovation management and collaboration platform for Andhra Pradesh Police officers to submit, review, discuss, and scale policing innovations across districts.**

## 22. Best Short Pitch

AP Innovate gives Andhra Pradesh Police a centralized digital system for capturing ideas from the field, comparing them against existing innovations, enabling cross-district collaboration, and moving high-value proposals through an accountable approval workflow with leadership visibility.
