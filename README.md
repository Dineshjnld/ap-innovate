
# AP POLICE Innovation Hub

A production-grade full-stack platform for Andhra Pradesh Police officers to submit, discover, discuss, and approve innovation projects across districts. Features real-time messaging, project collaboration, multi-tier approval workflows, and a live activity feed — all powered by PostgreSQL full-text search and WebSocket events.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Real-Time Events (Socket.io)](#real-time-events-socketio)
- [Authentication Flow](#authentication-flow)
- [File Upload](#file-upload)
- [Search & Filtering](#search--filtering)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Scripts](#scripts)

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│                                                                   │
│  React 18 + TypeScript ─── Vite (SWC) ─── Tailwind + shadcn/ui  │
│  React Router v6 ─── Socket.io-client ─── Polling subscriptions  │
└────────────────┬──────────────────────────────┬──────────────────┘
                 │  REST (JSON)                 │  WebSocket
                 ▼                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                     API Server  (port 3001)                       │
│                                                                   │
│  Express 4 ── helmet ── compression ── express-rate-limit         │
│  JWT auth (access + refresh token rotation)                       │
│  multer (file uploads, 25 MB limit)                               │
│  Socket.io server (authenticated rooms)                           │
└────────────────────────────┬──────────────────────────────────────┘
                             │  pg driver (pool)
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16 (Alpine)                         │
│                                                                   │
│  10 tables ── 24 indexes ── GIN full-text search                 │
│  tsvector trigger (weighted A-D fields)                          │
│  Foreign keys with CASCADE ── Composite primary keys             │
└───────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Frontend** subscribes to data via polling functions (`subscribeProjects`, `subscribeMessages`, etc.) that call the REST API on an interval (`VITE_REALTIME_POLL_MS`, default 4 s).
2. **Socket.io** provides instant push for high-priority events: new messages, notifications, typing indicators, project status changes, and new comments.
3. **Backend** writes to PostgreSQL and emits targeted Socket.io events to per-user rooms (`user:<userId>`).

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 18.3** | UI framework with hooks |
| **TypeScript** | Type safety across all components and services |
| **Vite 5.4 (SWC)** | Build tool — dev server on port 8080, HMR |
| **React Router 6** | Client-side routing (SPA) |
| **Tailwind CSS 3.4** | Utility-first styling |
| **shadcn/ui** | Accessible Radix-based component library |
| **Lucide React** | Icon system |
| **Recharts** | Dashboard charts and statistics |
| **Socket.io Client** | Real-time WebSocket connection |
| **React Hook Form + Zod** | Form handling with schema validation |
| **Sonner** | Toast notifications |
| **date-fns** | Date formatting |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js 20** | Runtime |
| **Express 4.21** | HTTP API framework |
| **PostgreSQL 16** | Primary database — relational data, full-text search, GIN indexes |
| **pg 8.13** | PostgreSQL driver (connection pool) |
| **Socket.io 4.8** | Real-time bidirectional events |
| **jsonwebtoken** | JWT access & refresh tokens |
| **bcryptjs** | Password hashing (12 rounds) |
| **multer 2.1** | Multipart file upload handling |
| **helmet** | HTTP security headers |
| **compression** | Gzip response compression |
| **express-rate-limit** | Request throttling (200/min global, 30/15min auth) |
| **uuid** | Unique ID generation |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker** | Containerized deployment (`node:20-slim`) |
| **Docker Compose** | Orchestrates API + PostgreSQL services |
| **Vitest** | Unit & integration testing |
| **Playwright** | End-to-end testing |
| **ESLint** | Linting |

---

## Project Structure

```
├── server/
│   ├── index.mjs            # Express API server (~1500 lines)
│   ├── .env                  # Server environment variables
│   └── .env.example          # Template
│
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Router configuration
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx       # Public landing page
│   │   ├── SignInPage.tsx        # Authentication
│   │   ├── SignUpPage.tsx        # Registration
│   │   ├── Index.tsx             # Dashboard (project grid + filters + stats)
│   │   ├── ProjectPage.tsx       # Project detail + discussion
│   │   ├── CreateProjectPage.tsx # Submit new innovation
│   │   ├── ProfilePage.tsx       # User profile + follow/connect
│   │   ├── MessagesPage.tsx      # Real-time chat
│   │   ├── NotificationsPage.tsx # Activity center
│   │   └── NotFound.tsx          # 404
│   │
│   ├── components/
│   │   ├── Header.tsx            # Global nav bar with search
│   │   ├── FilterPanel.tsx       # Category/district/search filters
│   │   ├── ProjectCard.tsx       # Project grid card
│   │   ├── ProjectDetail.tsx     # Full project view
│   │   ├── ProjectDiscussion.tsx # Threaded comments
│   │   ├── ProjectApproval.tsx   # Approval workflow UI
│   │   ├── CreateProjectForm.tsx # Form with file upload (drag-drop)
│   │   ├── LiveFeed.tsx          # Activity feed sidebar
│   │   ├── LiveFlashTicker.tsx   # Scrolling alert ticker
│   │   ├── StatsBar.tsx          # Dashboard statistics
│   │   ├── UserProfileWidget.tsx # Profile sidebar card
│   │   └── ui/                   # 50+ shadcn/ui primitives
│   │
│   ├── services/
│   │   ├── database.ts       # API client + polling subscriptions
│   │   ├── auth.ts           # JWT session management
│   │   ├── socket.ts         # Socket.io client singleton
│   │   ├── realtime.ts       # Re-exports for convenience
│   │   └── projectsApi.ts    # Project query helpers
│   │
│   ├── context/
│   │   └── AuthContext.tsx    # Auth provider + socket integration
│   │
│   ├── hooks/
│   │   ├── use-auth.ts       # useAuth() hook
│   │   ├── use-mobile.tsx    # Responsive breakpoint hook
│   │   └── use-toast.ts      # Toast hook
│   │
│   ├── data/
│   │   └── mockData.ts       # Type definitions + constants (categories, districts, ranks)
│   │
│   └── lib/
│       └── utils.ts          # cn() utility
│
├── docker-compose.yml        # PostgreSQL 16 + API service
├── Dockerfile                # node:20-slim container
├── vite.config.ts            # Port 8080, @ alias, SWC
├── tailwind.config.ts        # Navy/gold theme
└── package.json
```

---

## Database Schema

### Entity-Relationship Diagram

```
users ──────────< projects
  │                   │
  │                   ├──< comments (threaded: parent_id → comments.id)
  │                   └──< activities
  │
  ├──< messages (from_user_id, to_user_id)
  ├──< notifications
  ├──< follows (follower_id ↔ following_id)
  ├──< connections (user_a_id ↔ user_b_id, requested_by_id)
  ├──< auth_refresh_tokens
  └──< auth_login_attempts
```

### Tables (10)

| Table | Key Columns | Notes |
|---|---|---|
| `users` | id, name, email, password_hash, rank, district, interests[] | Unique email, array interests |
| `projects` | id, title, slug (unique), category[], district, author_id, status, search_vector | Full-text tsvector, attachments[] |
| `comments` | id, project_id, author_id, content, parent_id | Threaded (self-referencing FK) |
| `activities` | id, user_id, action, project_title, project_id | Activity log |
| `messages` | id, from_user_id, to_user_id, text, is_read | Direct messaging |
| `notifications` | id, user_id, title, body, is_read | Push-style alerts |
| `follows` | follower_id, following_id | Composite PK, follow relationship |
| `connections` | user_a_id, user_b_id, requested_by_id, status | `requested` / `accepted` |
| `auth_refresh_tokens` | id, user_id, token_hash, expires_at, revoked_at | Rotation & revocation |
| `auth_login_attempts` | email, failed_count, lock_until | Brute-force protection |

### Indexes (24)

- **B-tree**: projects(author_id, status, district, created_at DESC), comments(project_id, author_id, created_at), activities(project_id, user_id, created_at DESC), messages(from_user_id, to_user_id, created_at, conversation composite), notifications(user_id, created_at DESC), follows(following_id), connections(user_b_id), auth tokens(user_id, expires_at), users(email, district)
- **GIN**: projects(category), projects(search_vector) — enables fast array containment and full-text queries

### Full-Text Search

A PostgreSQL trigger automatically maintains the `search_vector` column on the `projects` table with weighted fields:

| Weight | Field |
|---|---|
| **A** (highest) | title |
| **B** | problem_statement |
| **C** | proposed_solution |
| **D** (lowest) | district |

Queries use `plainto_tsquery('english', ...)` with `ts_rank()` scoring for relevance-ordered results.

---

## API Reference

All endpoints (except auth and health) require a valid JWT in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register (name, email, password, rank, district) |
| POST | `/api/auth/signin` | Login → access token + refresh token (HTTP-only cookie) |
| POST | `/api/auth/refresh` | Rotate refresh token → new access + refresh tokens |
| POST | `/api/auth/signout` | Revoke refresh token, clear cookie |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Current user profile |
| PUT | `/api/users/me` | Update profile (name, bio, rank, district, interests) |
| GET | `/api/users` | Discover users (excludes self) |
| GET | `/api/users/:id` | User by ID |
| POST | `/api/users/:id/follow` | Toggle follow/unfollow |
| GET | `/api/users/:id/followers` | Follower count + isFollowing flag |
| POST | `/api/users/:id/connect` | Send/accept connection request |
| GET | `/api/users/:id/connection` | Connection status between current user and target |
| GET | `/api/users/:id/connections-count` | Accepted connection count |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List with filters: `categories`, `districts`, `q` (full-text), `status` |
| POST | `/api/projects` | Create project (title, category, district, problem, solution, budget, links, attachments) |
| GET | `/api/projects/:id` | Single project with author details |
| PUT | `/api/projects/:id/status` | Approve / reject / revert (with comment) |

### Comments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects/:id/comments` | Threaded comments with author info |
| POST | `/api/projects/:id/comments` | Add comment (supports `parentId` for replies, `@mention` notifications) |

### Messages

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/me` | All conversations (grouped by partner) |
| POST | `/api/messages/me` | Send message (toUserId, text) |
| POST | `/api/messages/me/read` | Mark messages from a user as read |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications/me` | All notifications (newest first) |
| POST | `/api/notifications/me/read` | Mark all as read |
| DELETE | `/api/notifications/me/:id` | Delete single notification |
| DELETE | `/api/notifications/me` | Clear all notifications |

### Other

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Upload files (multipart, max 25 MB per file, max 10 files) |
| GET | `/api/activities` | Activity feed (last 50) |
| GET | `/api/stats` | Dashboard statistics (projects, users, comments, messages) |
| GET | `/api/health` | Health check |

---

## Real-Time Events (Socket.io)

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `authenticate` | `{ userId }` | Join user-specific room after connection |
| `typing` | `{ toUserId }` | Notify recipient that user is typing |
| `stop-typing` | `{ toUserId }` | Clear typing indicator |

### Server → Client (per-user room)

| Event | Payload | Description |
|---|---|---|
| `message-received` | `{ message }` | New direct message |
| `notification-received` | `{ notification }` | New notification |
| `project-status-changed` | `{ projectId, status, ... }` | Approval/rejection event |
| `typing` | `{ fromUserId }` | Typing indicator |
| `stop-typing` | `{ fromUserId }` | Typing cleared |

### Server → All (broadcast)

| Event | Payload | Description |
|---|---|---|
| `new-comment` | `{ comment, projectId }` | Comment added to any project |
| `project-created` | `{ project }` | New project submitted |

---

## Authentication Flow

```
  Client                        Server                        PostgreSQL
    │                              │                              │
    │  POST /auth/signup           │                              │
    │ ─────────────────────────► │  bcrypt hash (12 rounds)     │
    │                              │ ─────────────────────────► │  INSERT user
    │                              │  Generate access token       │
    │                              │  Generate refresh token      │
    │                              │  SHA-256 hash refresh token  │
    │                              │ ─────────────────────────► │  INSERT auth_refresh_tokens
    │  ◄───────────────────────── │  Set-Cookie: refreshToken    │
    │  { accessToken, user }       │  (httpOnly, sameSite, path)  │
    │                              │                              │
    │  GET /users/me               │                              │
    │  Authorization: Bearer <AT>  │                              │
    │ ─────────────────────────► │  jwt.verify(AT)              │
    │                              │ ─────────────────────────► │  SELECT user
    │  ◄───────────────────────── │  { user }                    │
    │                              │                              │
    │  POST /auth/refresh          │                              │
    │  Cookie: refreshToken        │                              │
    │ ─────────────────────────► │  SHA-256 hash → lookup       │
    │                              │ ─────────────────────────► │  SELECT token (valid, not revoked, not expired)
    │                              │  Revoke old token            │
    │                              │  Issue new AT + RT pair      │
    │                              │ ─────────────────────────► │  INSERT new refresh token
    │  ◄───────────────────────── │  Set-Cookie: new RT          │
    │  { accessToken, user }       │                              │
```

### Security Features

- **Password hashing**: bcrypt with 12 salt rounds
- **Access tokens**: Short-lived JWT (configurable, default 15 min)
- **Refresh token rotation**: Each refresh issues a new token pair and revokes the old
- **Token storage**: Only SHA-256 hashes stored in DB
- **Brute-force protection**: Account lockout after N failed attempts (configurable)
- **HTTP-only cookies**: Refresh tokens stored in HTTP-only, SameSite cookies
- **Rate limiting**: 200 requests/min global, 30 requests/15 min on auth endpoints
- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Input sanitization**: All text inputs stripped of HTML tags before storage
- **Periodic cleanup**: Expired refresh tokens automatically purged every 6 hours

---

## File Upload

The platform supports file uploads on project submissions with drag-and-drop:

- **Endpoint**: `POST /api/upload` (multipart/form-data)
- **Max file size**: 25 MB per file
- **Max files per request**: 10
- **Allowed types**: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, PNG, JPG, GIF, WebP, SVG, TXT, CSV, ZIP
- **Storage**: `uploads/` directory (auto-created), served statically
- **Response**: Array of `{ name, url, size }` objects
- **Frontend UX**: Drag-and-drop zone, file size display, remove individual files, upload progress spinner

---

## Search & Filtering

### Full-Text Search (PostgreSQL `tsvector`)
- Weighted fields: title (A) > problem statement (B) > solution (C) > district (D)
- Automatic trigger updates `search_vector` on INSERT and UPDATE
- Relevance ranking via `ts_rank()`

### Structured Filters
- **Categories**: GIN index on `TEXT[]` column — supports multi-select
- **Districts**: B-tree index — single or multi-select
- **Status**: B-tree index — `submitted`, `approved`, `rejected`, `under-review`

### Combined Query
All filters (categories, districts, search text, status) can be combined in a single `GET /api/projects` request. The backend builds a dynamic `WHERE` clause with parameterized queries to prevent SQL injection.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 16 (or use Docker)
- **npm** ≥ 9

### 1. Clone the repository

```bash
git clone https://github.com/Dineshjnld/ap-innovate.git
cd ap-innovate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
# Frontend
cp .env.example .env

# Backend
cp server/.env.example server/.env
# Edit server/.env with your DATABASE_URL and a strong JWT_SECRET
```

### 4. Start PostgreSQL

**Option A — Docker Compose** (recommended):
```bash
docker compose up db -d
```

**Option B — Local PostgreSQL**:
Ensure PostgreSQL is running and the `ap_innovate` database exists:
```sql
CREATE DATABASE ap_innovate;
```

### 5. Start the API server

```bash
npm run api
```

The server auto-creates all tables, indexes, and triggers on first boot.

### 6. Start the frontend dev server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Environment Variables

### Frontend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3001` | API server base URL |
| `VITE_REALTIME_POLL_MS` | `4000` | Polling interval in ms for data subscriptions |

### Backend (`server/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `JWT_SECRET` | — | **Required.** Secret key for JWT signing |
| `DATABASE_URL` | — | **Required.** PostgreSQL connection string |
| `PGSSL` | `false` | Enable SSL for PostgreSQL connection |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | Access token lifetime (15 min) |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Refresh token lifetime |
| `MAX_SIGNIN_ATTEMPTS` | `5` | Failed logins before lockout |
| `SIGNIN_LOCKOUT_MINUTES` | `15` | Lockout duration |
| `UPLOAD_DIR` | `./uploads` | File upload storage directory |
| `MAX_FILE_SIZE_BYTES` | `26214400` | Max upload size (25 MB) |

---

## Docker Deployment

### Full stack with Docker Compose

```bash
docker compose up --build -d
```

This starts:
- **PostgreSQL 16** (Alpine) on port `5432` with persistent volume `postgres_data`
- **API server** (Node.js 20 slim) on port `3001`

The API waits for PostgreSQL health checks before starting.

### Build frontend for production

```bash
npm run build
```

Output: `dist/` directory — serve with any static file server (Nginx, Caddy, etc.) or configure the Express server to serve it.

### Production Checklist

- [ ] Set a strong, unique `JWT_SECRET`
- [ ] Set `CORS_ORIGIN` to your frontend domain
- [ ] Enable `PGSSL=true` for remote databases
- [ ] Use a reverse proxy (Nginx/Caddy) with HTTPS
- [ ] Mount `uploads/` as a persistent Docker volume
- [ ] Set `ACCESS_TOKEN_TTL_SECONDS=900` (15 min) for production

---

## Monitoring

This repo includes an open-source monitoring stack under [deploy/monitoring/README.md](deploy/monitoring/README.md):

- Grafana OSS
- Prometheus
- Node Exporter
- Postgres Exporter

Quick start on the VM:

```bash
cd ~/ap-innovate/deploy/monitoring
cp .env.monitoring.example .env.monitoring
nano .env.monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

Default endpoints:

- Grafana: `http://YOUR_VM_IP:3000`
- Prometheus: `http://YOUR_VM_IP:9090`

---

## Security

This repo also includes an open-source security baseline under [deploy/security/README.md](deploy/security/README.md):

- CrowdSec with Nginx/AppSec for low-latency inline protection
- Wazuh agent install script for host monitoring and suspicious activity detection
- GitHub Actions for Trivy, OWASP Dependency-Check, and OWASP ZAP baseline scans

Key files:

- [deploy/security/install-crowdsec-nginx.sh](deploy/security/install-crowdsec-nginx.sh)
- [deploy/security/install-wazuh-agent.sh](deploy/security/install-wazuh-agent.sh)
- [.github/workflows/security-trivy.yml](.github/workflows/security-trivy.yml)
- [.github/workflows/security-dependency-check.yml](.github/workflows/security-dependency-check.yml)
- [.github/workflows/security-zap-baseline.yml](.github/workflows/security-zap-baseline.yml)

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 8080) |
| `npm run api` | Start Express API server (port 3001) |
| `npm run build` | Production build → `dist/` |
| `npm run build:dev` | Development build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## License

This project is proprietary to the Andhra Pradesh Police Innovation initiative.
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Backend Auth API (Cloud Ready)

This project includes an auth API at [server/index.mjs](server/index.mjs) with:

- Database-backed sign up/sign in
- Bcrypt password hashing
- JWT token auth
- `/api/users/me` profile APIs
- `/api/users` and `/api/users/:userId` for user discovery

### Modern Auth & Database Setup (Recommended)

The most robust way to run the platform is using **Docker**. This ensures the PostgreSQL database and API are configured perfectly for you.

1. **Install Docker Desktop** (if you haven't already).
2. **Start the Platform**:
   ```sh
   docker compose up --build
   ```
   This will spin up:
   - **PostgreSQL Database** (Container: `ap-innovate-db`)
   - **Auth API Server** (Container: `ap-innovate-api`)

3. **Open the App**:
   Navigate to `http://localhost:8080` in your browser.

---

### Manual / Local Run

If you prefer to run the API directly on your host machine:

1. **Start only the Database**:
   ```sh
   docker compose up -d db
   ```
2. **Start the API**:
   ```sh
   npm run api
   ```
3. **Start the Frontend**:
   ```sh
   npm run dev
   ```

### Cloud Deployment Notes

- Set `JWT_SECRET` to a long random secret.
- Set `CORS_ORIGIN` to your frontend domain.
- Set `DATABASE_URL` to your managed Postgres instance.
- Set `PGSSL=true` when provider requires SSL.
- Set frontend `VITE_API_BASE_URL` to your deployed API URL.
