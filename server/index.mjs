import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pg from "pg";
import multer from "multer";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const { Pool } = pg;

const PORT = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-in-production";
const TRUST_PROXY = process.env.TRUST_PROXY ?? "loopback";
const DATABASE_URL = process.env.DATABASE_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? "900");
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "30");
const MAX_SIGNIN_ATTEMPTS = Number(process.env.MAX_SIGNIN_ATTEMPTS ?? "5");
const SIGNIN_LOCKOUT_MINUTES = Number(process.env.SIGNIN_LOCKOUT_MINUTES ?? "15");
const SIGNIN_LOCKOUT_MS = SIGNIN_LOCKOUT_MINUTES * 60 * 1000;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve(__dirname, "..", "uploads");
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES ?? String(25 * 1024 * 1024));

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Set it in server/.env or deployment environment.");
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ── Process-level safety nets ───────────────────────────────────────────── */
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

/* ═══════════════════════════════════════════════════════════════════════════
   EXPRESS + SOCKET.IO SETUP
   ═══════════════════════════════════════════════════════════════════════════ */

const app = express();
app.set("trust proxy", TRUST_PROXY);
app.disable("x-powered-by");
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map(s => s.trim()),
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const socketUserMap = new Map();
const onlineUsers = new Map(); // userId -> { socketIds: Set, lastSeen: null }
const lastSeenMap = new Map(); // userId -> timestamp (when they go offline)

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.typ === "access" && payload?.sub) {
      socket.userId = payload.sub;
    }
  } catch {}
  next();
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("authenticate", (userId) => {
    if (userId && typeof userId === "string") {
      if (socket.userId && socket.userId !== userId) {
        return;
      }
      socketUserMap.set(socket.id, userId);
      socket.join(`user:${userId}`);

      // Track online presence
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);
      lastSeenMap.delete(userId); // Clear last seen — they're online now

      // Broadcast this user came online
      io.emit("presence-update", { userId, status: "online" });

      // Send the new socket the full presence map
      const presenceSnapshot = {};
      for (const [uid, sockets] of onlineUsers.entries()) {
        if (sockets.size > 0) presenceSnapshot[uid] = { status: "online" };
      }
      for (const [uid, ts] of lastSeenMap.entries()) {
        if (!presenceSnapshot[uid]) presenceSnapshot[uid] = { status: "offline", lastSeen: ts };
      }
      socket.emit("presence-snapshot", presenceSnapshot);
    }
  });

  socket.on("join-project", (projectId) => {
    if (projectId && typeof projectId === "string") {
      socket.join(`project:${projectId}`);
    }
  });

  socket.on("leave-project", (projectId) => {
    if (projectId && typeof projectId === "string") {
      socket.leave(`project:${projectId}`);
    }
  });

  socket.on("typing", ({ to }) => {
    if (to && typeof to === "string") {
      io.to(`user:${to}`).emit("user-typing", {
        from: socketUserMap.get(socket.id),
      });
    }
  });

  socket.on("stop-typing", ({ to }) => {
    if (to && typeof to === "string") {
      io.to(`user:${to}`).emit("user-stop-typing", {
        from: socketUserMap.get(socket.id),
      });
    }
  });

  socket.on("disconnect", () => {
    const userId = socketUserMap.get(socket.id);
    socketUserMap.delete(socket.id);

    if (userId) {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          const now = Date.now();
          lastSeenMap.set(userId, now);
          io.emit("presence-update", { userId, status: "offline", lastSeen: now });
        }
      }
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SECURITY MIDDLEWARE
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Request ID for audit trail ────────────────────────────────────── */
app.use((req, _res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  next();
});

/* ── Helmet — comprehensive HTTP security headers ─────────────────── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xContentTypeOptions: true,
  xFrameOptions: { action: "deny" },
}));

/* ── Additional security headers not covered by Helmet ────────────── */
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.removeHeader("X-Powered-By");
  next();
});

app.use(compression());
app.use(cors({
  origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map(s => s.trim()),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  maxAge: 86400,
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

/* ── Upload serving with security hardening ────────────────────────── */
app.use("/uploads", (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  next();
}, express.static(UPLOAD_DIR, {
  maxAge: "7d",
  etag: true,
  lastModified: true,
  dotfiles: "deny",
  index: false,
}));

/* Serve Vite build output in production */
const DIST_DIR = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { maxAge: "30d", etag: true }));
}

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later." },
});
app.use("/api/auth/", authLimiter);

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many signup attempts. Try again later." },
});
app.use("/api/auth/signup", signupLimiter);

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many file uploads. Slow down." },
});
app.use("/api/upload", uploadLimiter);
app.use("/api/users/me/avatar", uploadLimiter);

/* ═══════════════════════════════════════════════════════════════════════════
   FILE UPLOAD CONFIG (MULTER)
   ═══════════════════════════════════════════════════════════════════════════ */

const ALLOWED_MIMES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4", "video/webm", "video/quicktime",
  "text/plain", "text/csv",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

/* ═══════════════════════════════════════════════════════════════════════════
   DATABASE
   ═══════════════════════════════════════════════════════════════════════════ */

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err.message);
});

const ensureDatabaseExists = async () => {
  try {
    const url = new URL(DATABASE_URL);
    const targetDb = url.pathname.slice(1);
    const baseUrl = DATABASE_URL.replace(`/${targetDb}`, "/postgres");
    const tempPool = new Pool({
      connectionString: baseUrl,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 3000,
    });
    try {
      const res = await tempPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
      if (res.rowCount === 0) {
        console.log(`Creating database "${targetDb}"...`);
        // Use double-quoting for the DB name to prevent SQL injection
        await tempPool.query(`CREATE DATABASE "${targetDb}"`);
        console.log(`Database "${targetDb}" created.`);
      }
    } finally {
      await tempPool.end();
    }
  } catch {
    console.warn("Skipping DB creation check.");
  }
};

const initDb = async (retries = 3) => {
  await ensureDatabaseExists().catch(() => {});

  while (retries > 0) {
    try {
      await pool.query("SELECT 1");
      console.log("Database connected.");
      break;
    } catch (err) {
      retries -= 1;
      if (retries === 0) {
        console.error("FATAL: Database connection failed.", err.message);
        process.exit(1);
      }
      console.warn(`Database not ready, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ── Tables ────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rank TEXT NOT NULL,
      district TEXT NOT NULL,
      interests TEXT[] DEFAULT '{}',
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      innovations_count INTEGER DEFAULT 0,
      connections_count INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL
    );
  `);

  // Add role column if missing (migration for existing DBs)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT[] NOT NULL,
      district TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_statement TEXT NOT NULL,
      proposed_solution TEXT NOT NULL,
      budget BIGINT DEFAULT 0,
      funding TEXT NOT NULL DEFAULT 'Self Funding',
      officer_in_charge TEXT NOT NULL DEFAULT '',
      company TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted',
      approved_by_name TEXT,
      approved_by_rank TEXT,
      approved_at BIGINT,
      approval_comment TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      attachments TEXT[] DEFAULT '{}',
      external_links TEXT[] DEFAULT '{}',
      comments_count INTEGER DEFAULT 0,
      versions INTEGER DEFAULT 1,
      search_vector TSVECTOR
    );
  `);

  // Add funding column if missing (migration for existing DBs)
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS funding TEXT NOT NULL DEFAULT 'Self Funding'`).catch(() => {});
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS officer_in_charge TEXT NOT NULL DEFAULT ''`).catch(() => {});
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS company TEXT DEFAULT ''`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      parent_id TEXT REFERENCES comments(id) ON DELETE SET NULL,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      project_title TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      PRIMARY KEY (follower_id, following_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS connections (
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requested_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'requested',
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      PRIMARY KEY (user_a_id, user_b_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      revoked_at BIGINT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_login_attempts (
      email TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      lock_until BIGINT,
      updated_at BIGINT NOT NULL
    );
  `);

  // ── Security audit log (government compliance) ───────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      ip TEXT,
      user_agent TEXT,
      details TEXT,
      created_at BIGINT NOT NULL
    );
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event)").catch(() => {});
  await pool.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)").catch(() => {});
  await pool.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)").catch(() => {});

  // ── Project versions table (edit history) ────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT[] NOT NULL,
      district TEXT NOT NULL,
      problem_statement TEXT NOT NULL,
      proposed_solution TEXT NOT NULL,
      budget BIGINT DEFAULT 0,
      attachments TEXT[] DEFAULT '{}',
      external_links TEXT[] DEFAULT '{}',
      edited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at BIGINT NOT NULL
    );
  `);

  // ── Indexes ───────────────────────────────────────────────────────────
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_projects_author_id ON projects(author_id)",
    "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)",
    "CREATE INDEX IF NOT EXISTS idx_projects_district ON projects(district)",
    "CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_projects_category ON projects USING GIN(category)",
    "CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING GIN(search_vector)",
    "CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id)",
    "CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(from_user_id, to_user_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)",
    "CREATE INDEX IF NOT EXISTS idx_connections_user_b ON connections(user_b_id)",
    "CREATE INDEX IF NOT EXISTS idx_auth_refresh_user ON auth_refresh_tokens(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_auth_refresh_expires ON auth_refresh_tokens(expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_district ON users(district)",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
    "CREATE INDEX IF NOT EXISTS idx_project_versions_project ON project_versions(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_project_versions_created ON project_versions(created_at DESC)",
  ];

  for (const idx of indexes) {
    await pool.query(idx).catch(() => {});
  }

  // ── Full-text search trigger ──────────────────────────────────────────
  await pool.query(`
    CREATE OR REPLACE FUNCTION projects_search_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.problem_statement, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.proposed_solution, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.district, '')), 'D');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
  `).catch(() => {});

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trig_projects_search'
      ) THEN
        CREATE TRIGGER trig_projects_search
          BEFORE INSERT OR UPDATE OF title, problem_statement, proposed_solution, district
          ON projects
          FOR EACH ROW
          EXECUTE FUNCTION projects_search_trigger();
      END IF;
    END $$;
  `).catch(() => {});

  // Backfill search vectors for existing rows
  await pool.query(`
    UPDATE projects SET search_vector =
      setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(problem_statement, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(proposed_solution, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(district, '')), 'D')
    WHERE search_vector IS NULL;
  `).catch(() => {});

  // ── Clean orphaned rows that reference missing FK targets ─────────────
  const orphanCleanups = [
    "DELETE FROM comments WHERE project_id NOT IN (SELECT id FROM projects)",
    "DELETE FROM activities WHERE project_id NOT IN (SELECT id FROM projects)",
    "DELETE FROM activities WHERE user_id NOT IN (SELECT id FROM users)",
    "DELETE FROM comments WHERE author_id NOT IN (SELECT id FROM users)",
    "DELETE FROM messages WHERE from_user_id NOT IN (SELECT id FROM users) OR to_user_id NOT IN (SELECT id FROM users)",
    "DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users)",
    "DELETE FROM follows WHERE follower_id NOT IN (SELECT id FROM users) OR following_id NOT IN (SELECT id FROM users)",
    "DELETE FROM connections WHERE user_a_id NOT IN (SELECT id FROM users) OR user_b_id NOT IN (SELECT id FROM users)",
    "DELETE FROM auth_refresh_tokens WHERE user_id NOT IN (SELECT id FROM users)",
  ];
  for (const sql of orphanCleanups) {
    try {
      const r = await pool.query(sql);
      if (r.rowCount > 0) console.log(`  Cleaned ${r.rowCount} orphaned rows: ${sql.slice(12, 60)}...`);
    } catch {}
  }

  // Backfill activity for projects that have none (e.g. created before activity tracking)
  try {
    const orphanedProjects = await pool.query(`
      SELECT p.id, p.title, p.author_id, p.created_at
      FROM projects p
      LEFT JOIN activities a ON a.project_id = p.id
      WHERE a.id IS NULL
    `);
    for (const proj of orphanedProjects.rows) {
      const actId = `a-backfill-${proj.id}`;
      await pool.query(
        `INSERT INTO activities (id, user_id, action, project_title, project_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [actId, proj.author_id, "submitted a new innovation", proj.title, proj.id, proj.created_at],
      );
    }
    if (orphanedProjects.rowCount > 0) {
      console.log(`  Backfilled activities for ${orphanedProjects.rowCount} project(s).`);
    }
  } catch (err) {
    console.error("Activity backfill failed:", err.message);
  }

  // Cleanup expired tokens periodically
  setInterval(async () => {
    try {
      await pool.query("DELETE FROM auth_refresh_tokens WHERE expires_at < $1", [Date.now()]);
      await pool.query("DELETE FROM auth_login_attempts WHERE lock_until < $1", [Date.now()]);
    } catch {}
  }, 60 * 60 * 1000);

  // Seed admin user if none exists
  try {
    const adminCheck = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.rowCount === 0) {
      const adminId = makeId("u");
      const adminHash = await bcrypt.hash("Admin@2026", 12);
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, rank, district, interests, bio, avatar, role, innovations_count, connections_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, '{}', 'System Administrator', NULL, 'admin', 0, 0, $7)
         ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
        [adminId, "AP Innovate Admin", "admin@appolice.gov.in", adminHash, "DGP", "Vijayawada HQ", Date.now()],
      );
      console.log("  Admin user seeded: admin@appolice.gov.in / Admin@2026");
    }
  } catch (err) {
    console.error("Admin seed failed:", err.message);
  }

  console.log("Database schema initialized with indexes and full-text search.");
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const normalizeEmail = (v = "") => v.trim().toLowerCase();
const makeId = (prefix = "x") => `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
const makeRefreshToken = () => randomBytes(48).toString("hex");
const hashToken = (v) => createHash("sha256").update(v).digest("hex");

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isStrongPassword = (v) =>
  v.length >= 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);

const sanitizeText = (text) => {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

const createAccessToken = (userId) => {
  const token = jwt.sign(
    { sub: userId, typ: "access" },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );
  return {
    token,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
  };
};

const toAuthUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  rank: row.rank,
  district: row.district,
  bio: row.bio ?? "",
  avatar: row.avatar ?? undefined,
  role: row.role ?? "user",
  innovationsCount: row.innovations_count ?? 0,
  connectionsCount: row.connections_count ?? 0,
  interests: row.interests ?? [],
});

const toProject = (row, author) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  category: row.category,
  district: row.district,
  author: author ? toAuthUser(author) : null,
  problemStatement: row.problem_statement,
  proposedSolution: row.proposed_solution,
  budget: Number(row.budget),
  funding: row.funding || "Self Funding",
  officerInCharge: row.officer_in_charge || "",
  company: row.company || "",
  status: row.status,
  approvedBy: row.approved_by_name
    ? {
        name: row.approved_by_name,
        rank: row.approved_by_rank,
        date: new Date(Number(row.approved_at)).toISOString().split("T")[0],
        comment: row.approval_comment,
      }
    : undefined,
  createdAt: new Date(Number(row.created_at)).toISOString().split("T")[0],
  updatedAt: new Date(Number(row.updated_at)).toISOString().split("T")[0],
  attachments: row.attachments || [],
  externalLinks: row.external_links || [],
  commentsCount: row.comments_count || 0,
  versions: row.versions || 1,
});

const toComment = (row, author) => ({
  id: row.id,
  projectId: row.project_id,
  author: author ? toAuthUser(author) : null,
  content: row.content,
  createdAt: new Date(Number(row.created_at)).toISOString(),
  parentId: row.parent_id,
});

const toActivity = (row, user) => ({
  id: row.id,
  user: user ? toAuthUser(user) : null,
  action: row.action,
  projectTitle: row.project_title,
  projectId: row.project_id,
  timestamp: new Date(Number(row.created_at)).toISOString(),
});

const issueAuthSession = async (userId) => {
  const refreshToken = makeRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const now = Date.now();
  const refreshExpiresAt = now + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

  await pool.query(
    `INSERT INTO auth_refresh_tokens (id, user_id, token_hash, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [makeId("rt"), userId, refreshTokenHash, now, refreshExpiresAt],
  );

  const access = createAccessToken(userId);
  return {
    token: access.token,
    refreshToken,
    expiresAt: access.expiresAt,
  };
};

const getUserFromToken = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (payload?.typ !== "access" || !payload?.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const userId = getUserFromToken(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  req.userId = userId;
  next();
};

const findUserById = async (userId) => {
  const r = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  return r.rows[0] ?? null;
};

const findUserByEmail = async (email) => {
  const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return r.rows[0] ?? null;
};

const findActiveRefreshToken = async (refreshToken) => {
  const h = hashToken(refreshToken);
  const r = await pool.query(
    `SELECT * FROM auth_refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > $2
     LIMIT 1`,
    [h, Date.now()],
  );
  return r.rows[0] ?? null;
};

const revokeRefreshToken = async (refreshToken) => {
  const h = hashToken(refreshToken);
  await pool.query(
    "UPDATE auth_refresh_tokens SET revoked_at = $1 WHERE token_hash = $2 AND revoked_at IS NULL",
    [Date.now(), h],
  );
};

const getLoginAttempt = async (email) => {
  const r = await pool.query("SELECT * FROM auth_login_attempts WHERE email = $1", [email]);
  return r.rows[0] ?? null;
};

const clearLoginAttempt = async (email) => {
  await pool.query("DELETE FROM auth_login_attempts WHERE email = $1", [email]);
};

const registerFailedSignIn = async (email) => {
  const now = Date.now();
  const attempt = await getLoginAttempt(email);
  const isLocked = attempt?.lock_until && attempt.lock_until > now;
  const failedCount = isLocked ? attempt.failed_count : (attempt?.failed_count ?? 0) + 1;
  const shouldLock = failedCount >= MAX_SIGNIN_ATTEMPTS;
  const lockUntil = shouldLock ? now + SIGNIN_LOCKOUT_MS : null;

  await pool.query(
    `INSERT INTO auth_login_attempts (email, failed_count, lock_until, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email)
     DO UPDATE SET failed_count = EXCLUDED.failed_count, lock_until = EXCLUDED.lock_until, updated_at = EXCLUDED.updated_at`,
    [email, failedCount, lockUntil, now],
  );
  return { failedCount, lockUntil };
};

const createNotification = async (userId, title, body) => {
  try {
    const id = makeId("n");
    const now = Date.now();
    await pool.query(
      "INSERT INTO notifications (id, user_id, title, body, created_at) VALUES ($1, $2, $3, $4, $5)",
      [id, userId, title, body, now],
    );
    const notification = { id, title, body, createdAt: now, read: false };
    io.to(`user:${userId}`).emit("notification-received", notification);
    return notification;
  } catch (err) {
    console.error("createNotification failed:", err.message);
    return null;
  }
};

const createActivity = async (userId, action, projectTitle, projectId) => {
  try {
    const id = makeId("a");
    const now = Date.now();
    await pool.query(
      "INSERT INTO activities (id, user_id, action, project_title, project_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, userId, action, projectTitle, projectId, now],
    );
    const user = await findUserById(userId);
    const activity = toActivity(
      { id, user_id: userId, action, project_title: projectTitle, project_id: projectId, created_at: now },
      user,
    );
    io.emit("activity-created", activity);
    return activity;
  } catch (err) {
    console.error("createActivity failed:", err.message);
    return null;
  }
};

/* ── Security audit logger (government compliance) ───────────────────── */
const logAuditEvent = async (event, { userId = null, email = null, ip = null, userAgent = null, details = null } = {}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, event, user_id, email, ip, user_agent, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [makeId("audit"), event, userId, email, ip, userAgent, details, Date.now()],
    );
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const makeUniqueSlug = async (title) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  let slug = base;
  let counter = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await pool.query("SELECT 1 FROM projects WHERE slug = $1", [slug]);
    if (existing.rowCount === 0) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   AUTH ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const name = sanitizeText(String(req.body?.name ?? "").trim());
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");
    const rank = sanitizeText(String(req.body?.rank ?? "").trim());
    const district = sanitizeText(String(req.body?.district ?? "").trim());

    if (!name || !email || !password || !rank || !district) {
      return res.status(400).json({ message: "Missing required signup fields" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with uppercase, lowercase, a number, and a special character",
      });
    }

    const exists = await findUserByEmail(email);
    if (exists) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const id = makeId("u");
    const passwordHash = await bcrypt.hash(password, 12);
    const interests = Array.isArray(req.body?.categories) ? req.body.categories.map(s => sanitizeText(String(s))) : [];

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, rank, district, interests, bio, avatar, role, innovations_count, connections_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '', NULL, 'user', 0, 0, $8)`,
      [id, name, email, passwordHash, rank, district, interests, Date.now()],
    );

    const row = await findUserById(id);
    const session = await issueAuthSession(id);
    void logAuditEvent("SIGNUP", { userId: id, email, ip: getClientIp(req), userAgent: req.headers["user-agent"] });
    return res.status(201).json({ ...session, user: toAuthUser(row) });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/signin", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const attempt = await getLoginAttempt(email);
    const now = Date.now();
    if (attempt?.lock_until && attempt.lock_until > now) {
      return res.status(429).json({
        message: "Too many failed sign-in attempts. Try again later.",
        retryAfterSeconds: Math.ceil((attempt.lock_until - now) / 1000),
      });
    }

    const row = await findUserByEmail(email);
    if (!row) {
      await registerFailedSignIn(email);
      void logAuditEvent("SIGNIN_FAIL", { email, ip: getClientIp(req), userAgent: req.headers["user-agent"], details: "User not found" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      const status = await registerFailedSignIn(email);
      void logAuditEvent("SIGNIN_FAIL", { userId: row.id, email, ip: getClientIp(req), userAgent: req.headers["user-agent"], details: status.lockUntil ? "Account locked" : "Wrong password" });
      if (status.lockUntil && status.lockUntil > now) {
        return res.status(429).json({
          message: "Too many failed sign-in attempts. Try again later.",
          retryAfterSeconds: Math.ceil((status.lockUntil - now) / 1000),
        });
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await clearLoginAttempt(email);
    const session = await issueAuthSession(row.id);
    void logAuditEvent("SIGNIN_OK", { userId: row.id, email, ip: getClientIp(req), userAgent: req.headers["user-agent"] });
    return res.json({ ...session, user: toAuthUser(row) });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/refresh", async (req, res, next) => {
  try {
    const refreshToken = String(req.body?.refreshToken ?? "").trim();
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const tokenRow = await findActiveRefreshToken(refreshToken);
    if (!tokenRow) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    const user = await findUserById(tokenRow.user_id);
    if (!user) {
      await revokeRefreshToken(refreshToken);
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    const now = Date.now();
    const nextRefreshToken = makeRefreshToken();
    const nextRefreshTokenHash = hashToken(nextRefreshToken);
    const nextRefreshExpiresAt = now + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
    const access = createAccessToken(user.id);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE auth_refresh_tokens SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL",
        [now, tokenRow.id],
      );
      await client.query(
        "INSERT INTO auth_refresh_tokens (id, user_id, token_hash, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)",
        [makeId("rt"), user.id, nextRefreshTokenHash, now, nextRefreshExpiresAt],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return res.json({
      token: access.token,
      refreshToken: nextRefreshToken,
      expiresAt: access.expiresAt,
      user: toAuthUser(user),
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/signout", async (req, res) => {
  const refreshToken = String(req.body?.refreshToken ?? "").trim();
  const userId = getUserFromToken(req);
  if (refreshToken) {
    await revokeRefreshToken(refreshToken).catch(() => {});
  }
  void logAuditEvent("SIGNOUT", { userId, ip: getClientIp(req) });
  return res.json({ ok: true });
});

/* ═══════════════════════════════════════════════════════════════════════════
   USER ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.get("/api/users/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    return res.json(toAuthUser(user));
  } catch (err) {
    next(err);
  }
});

app.put("/api/users/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const name = sanitizeText(String(req.body?.name ?? user.name).trim());
    const district = sanitizeText(String(req.body?.district ?? user.district).trim());
    const bio = sanitizeText(String(req.body?.bio ?? user.bio ?? "").trim());

    await pool.query(
      "UPDATE users SET name = $1, district = $2, bio = $3 WHERE id = $4",
      [name, district, bio, user.id],
    );
    const updated = await findUserById(user.id);
    return res.json(toAuthUser(updated));
  } catch (err) {
    next(err);
  }
});

/* ── Avatar upload with auto-optimization ────────────────────────────── */

const AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB raw input limit
  fileFilter: (_req, file, cb) => {
    if (AVATAR_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed for avatars"));
  },
});

app.post("/api/users/me/avatar", requireAuth, (req, res, next) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError ? "File too large (max 10 MB)" : err.message;
      return res.status(400).json({ message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    try {
      const user = await findUserById(req.userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      // Delete old avatar file if it exists
      if (user.avatar) {
        const oldFile = path.join(UPLOAD_DIR, path.basename(user.avatar));
        fs.unlink(oldFile, () => {}); // best-effort delete
      }

      // Optimize: resize to 256x256, convert to WebP, quality 80
      const filename = `avatar-${randomUUID()}.webp`;
      const outputPath = path.join(UPLOAD_DIR, filename);

      await sharp(req.file.buffer)
        .resize(256, 256, { fit: "cover", position: "centre" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const avatarUrl = `/uploads/${filename}`;
      await pool.query("UPDATE users SET avatar = $1 WHERE id = $2", [avatarUrl, user.id]);

      const updated = await findUserById(user.id);
      return res.json(toAuthUser(updated));
    } catch (e) {
      next(e);
    }
  });
});

app.get("/api/users", requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query?.q ?? "").trim().toLowerCase();
    let rows;

    if (query) {
      const searchTerm = `%${query}%`;
      rows = (await pool.query(
        `SELECT * FROM users
         WHERE id != $1 AND (LOWER(name) LIKE $2 OR LOWER(email) LIKE $2 OR LOWER(rank) LIKE $2 OR LOWER(district) LIKE $2)
         ORDER BY name ASC LIMIT 50`,
        [req.userId, searchTerm],
      )).rows;
    } else {
      rows = (await pool.query(
        "SELECT * FROM users WHERE id != $1 ORDER BY name ASC LIMIT 100",
        [req.userId],
      )).rows;
    }

    return res.json(rows.map(toAuthUser));
  } catch (err) {
    next(err);
  }
});

app.get("/api/users/:userId", requireAuth, async (req, res, next) => {
  try {
    const row = await findUserById(req.params.userId);
    if (!row) return res.status(404).json({ message: "User not found" });
    return res.json(toAuthUser(row));
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   FOLLOW / CONNECTION ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.post("/api/users/:userId/follow", requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.userId) return res.status(400).json({ message: "Cannot follow yourself" });

    const target = await findUserById(targetId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const existing = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.userId, targetId],
    );

    if (existing.rowCount > 0) {
      await pool.query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2", [req.userId, targetId]);
      return res.json({ following: false });
    }

    await pool.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.userId, targetId],
    );

    const me = await findUserById(req.userId);
    await createNotification(targetId, "New Follower", `${me.name} started following you`);

    return res.json({ following: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/users/:userId/followers", requireAuth, async (req, res, next) => {
  try {
    const count = (await pool.query(
      "SELECT COUNT(*) as c FROM follows WHERE following_id = $1",
      [req.params.userId],
    )).rows[0].c;
    const isFollowing = (await pool.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.userId, req.params.userId],
    )).rowCount > 0;

    return res.json({ count: Number(count), isFollowing });
  } catch (err) {
    next(err);
  }
});

app.post("/api/users/:userId/connect", requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.userId) return res.status(400).json({ message: "Cannot connect with yourself" });

    const target = await findUserById(targetId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const [a, b] = [req.userId, targetId].sort();
    const existing = await pool.query(
      "SELECT * FROM connections WHERE user_a_id = $1 AND user_b_id = $2",
      [a, b],
    );

    if (existing.rowCount > 0) {
      const conn = existing.rows[0];
      if (conn.status === "accepted") {
        return res.json({ status: "connected" });
      }
      if (conn.requested_by_id !== req.userId) {
        await pool.query(
          "UPDATE connections SET status = 'accepted' WHERE user_a_id = $1 AND user_b_id = $2",
          [a, b],
        );
        await pool.query("UPDATE users SET connections_count = connections_count + 1 WHERE id = ANY($1)", [[req.userId, targetId]]);

        const me = await findUserById(req.userId);
        await createNotification(targetId, "Connection Accepted", `${me.name} accepted your connection request`);

        return res.json({ status: "connected" });
      }
      return res.json({ status: "requested" });
    }

    await pool.query(
      "INSERT INTO connections (user_a_id, user_b_id, requested_by_id, status) VALUES ($1, $2, $3, 'requested')",
      [a, b, req.userId],
    );

    const me = await findUserById(req.userId);
    await createNotification(targetId, "Connection Request", `${me.name} sent you a connection request`);

    return res.json({ status: "requested" });
  } catch (err) {
    next(err);
  }
});

app.get("/api/users/:userId/connection", requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const [a, b] = [req.userId, targetId].sort();
    const existing = await pool.query(
      "SELECT * FROM connections WHERE user_a_id = $1 AND user_b_id = $2",
      [a, b],
    );

    if (existing.rowCount === 0) return res.json({ status: "none" });

    const conn = existing.rows[0];
    if (conn.status === "accepted") return res.json({ status: "connected" });
    if (conn.requested_by_id === req.userId) return res.json({ status: "requested" });
    return res.json({ status: "incoming-request" });
  } catch (err) {
    next(err);
  }
});

app.get("/api/users/:userId/connections-count", requireAuth, async (req, res, next) => {
  try {
    const count = (await pool.query(
      `SELECT COUNT(*) as c FROM connections
       WHERE (user_a_id = $1 OR user_b_id = $1) AND status = 'accepted'`,
      [req.params.userId],
    )).rows[0].c;
    return res.json({ count: Number(count) });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   FILE UPLOAD ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.post("/api/upload", requireAuth, (req, res, next) => {
  upload.array("files", 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB` });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const files = req.files.map((file) => ({
      id: path.parse(file.filename).name,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`,
    }));

    return res.status(201).json({ files });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROJECT ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.get("/api/projects", requireAuth, async (req, res, next) => {
  try {
    const { categories, districts, q, status, author } = req.query;
    const params = [];
    const clauses = [];

    if (categories) {
      const list = String(categories).split(",").map(s => s.trim()).filter(Boolean);
      if (list.length > 0) {
        params.push(list);
        clauses.push(`category && $${params.length}`);
      }
    }

    if (districts) {
      const list = String(districts).split(",").map(s => s.trim()).filter(Boolean);
      if (list.length > 0) {
        params.push(list);
        clauses.push(`district = ANY($${params.length})`);
      }
    }

    if (status) {
      params.push(String(status).trim());
      clauses.push(`status = $${params.length}`);
    }

    if (author) {
      params.push(String(author).trim());
      clauses.push(`author_id = $${params.length}`);
    }

    if (q) {
      const search = String(q).trim();
      if (search.length > 0) {
        // Use full-text search with prefix matching
        const tsQuery = search
          .split(/\s+/)
          .filter(Boolean)
          .map(word => `${word.replace(/[^a-zA-Z0-9]/g, "")}:*`)
          .filter(w => w.length > 2)
          .join(" & ");
        if (tsQuery) {
          params.push(tsQuery);
          clauses.push(`search_vector @@ to_tsquery('english', $${params.length})`);
        } else {
          // Fallback to LIKE for very short queries
          const searchTerm = `%${search.toLowerCase()}%`;
          params.push(searchTerm);
          clauses.push(`(LOWER(title) LIKE $${params.length} OR LOWER(problem_statement) LIKE $${params.length})`);
        }
      }
    }

    let sql = "SELECT * FROM projects";
    if (clauses.length > 0) sql += " WHERE " + clauses.join(" AND ");
    sql += " ORDER BY created_at DESC LIMIT 200";

    const result = await pool.query(sql, params);

    // Batch fetch authors efficiently
    const authorIds = [...new Set(result.rows.map(r => r.author_id))];
    const authorsResult = authorIds.length > 0
      ? await pool.query("SELECT * FROM users WHERE id = ANY($1)", [authorIds])
      : { rows: [] };
    const authorsMap = new Map(authorsResult.rows.map(r => [r.id, r]));

    const projects = result.rows.map(row =>
      toProject(row, authorsMap.get(row.author_id) ?? null),
    );

    return res.json(projects);
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects", requireAuth, async (req, res, next) => {
  try {
    const { title, category, district, problemStatement, proposedSolution, budget, funding, officerInCharge, company, externalLinks, attachments } = req.body;
    if (!title || !category || !district || !problemStatement || !officerInCharge) {
      return res.status(400).json({ message: "Missing required project fields" });
    }

    const id = makeId("p");
    const slug = await makeUniqueSlug(title);
    const now = Date.now();

    await pool.query(
      `INSERT INTO projects (id, title, slug, category, district, author_id, problem_statement, proposed_solution, budget, funding, officer_in_charge, company, created_at, updated_at, external_links, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        sanitizeText(title),
        slug,
        Array.isArray(category) ? category.map(s => sanitizeText(String(s))) : [sanitizeText(String(category))],
        sanitizeText(district),
        req.userId,
        sanitizeText(problemStatement),
        sanitizeText(proposedSolution ?? ""),
        Number(budget) || 0,
        sanitizeText(String(funding || "Self Funding")),
        sanitizeText(String(officerInCharge)),
        sanitizeText(String(company || "")),
        now,
        now,
        Array.isArray(externalLinks) ? externalLinks : [],
        Array.isArray(attachments) ? attachments : [],
      ],
    );

    await pool.query("UPDATE users SET innovations_count = innovations_count + 1 WHERE id = $1", [req.userId]);

    const row = (await pool.query("SELECT * FROM projects WHERE id = $1", [id])).rows[0];
    const author = await findUserById(req.userId);
    const project = toProject(row, author);

    await createActivity(req.userId, "submitted a new innovation", title, id);

    io.emit("project-created", project);
    return res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects/:projectId", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM projects WHERE id = $1", [req.params.projectId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Project not found" });

    const row = result.rows[0];
    const author = await findUserById(row.author_id);
    return res.json(toProject(row, author));
  } catch (err) {
    next(err);
  }
});

// PROJECT STATUS UPDATE (Approval/Rejection)
app.put("/api/projects/:projectId/status", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, comment } = req.body;

    if (!status || !comment) {
      return res.status(400).json({ message: "Status and comment are required" });
    }

    const validStatuses = ["submitted", "under_review", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const approver = await findUserById(req.userId);
    if (!approver) return res.status(401).json({ message: "Unauthorized" });

    const approvalRanks = ["DGP", "ADGP", "IG", "DIG"];
    if (!approvalRanks.includes(approver.rank)) {
      return res.status(403).json({ message: "Insufficient rank for project approval" });
    }

    const project = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
    if (project.rowCount === 0) return res.status(404).json({ message: "Project not found" });

    const now = Date.now();
    await pool.query(
      `UPDATE projects
       SET status = $1, approved_by_name = $2, approved_by_rank = $3, approved_at = $4, approval_comment = $5, updated_at = $6
       WHERE id = $7`,
      [status, approver.name, approver.rank, now, sanitizeText(comment), now, projectId],
    );

    const updatedRow = (await pool.query("SELECT * FROM projects WHERE id = $1", [projectId])).rows[0];
    const author = await findUserById(updatedRow.author_id);
    const updatedProject = toProject(updatedRow, author);

    if (updatedRow.author_id !== req.userId) {
      const actionVerb = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "marked for review";
      await createNotification(
        updatedRow.author_id,
        `Project ${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)}`,
        `Your project "${updatedRow.title}" has been ${actionVerb} by ${approver.name} (${approver.rank})`,
      );
    }

    await createActivity(req.userId, `${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "reviewed"}`, updatedRow.title, projectId);

    io.emit("project-updated", updatedProject);
    io.to(`project:${projectId}`).emit("project-status-changed", updatedProject);

    void logAuditEvent("PROJECT_STATUS_CHANGE", {
      userId: req.userId,
      ip: getClientIp(req),
      details: `Project ${projectId} "${updatedRow.title}" → ${status} by ${approver.name} (${approver.rank})`,
    });

    return res.json(updatedProject);
  } catch (err) {
    next(err);
  }
});

// PROJECT EDIT (author can edit their own project after submission)
app.put("/api/projects/:projectId", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const row = (await pool.query("SELECT * FROM projects WHERE id = $1", [projectId])).rows[0];
    if (!row) return res.status(404).json({ message: "Project not found" });

    // Only the author can edit their project
    if (row.author_id !== req.userId) {
      return res.status(403).json({ message: "Only the project author can edit this project" });
    }

    const { title, category, district, problemStatement, proposedSolution, budget, funding, officerInCharge, company, externalLinks, attachments } = req.body;

    // Save current state as a version snapshot before applying edits
    const currentVersion = row.versions || 1;
    const versionId = makeId("pv");
    await pool.query(
      `INSERT INTO project_versions (id, project_id, version, title, category, district, problem_statement, proposed_solution, budget, attachments, external_links, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        versionId, projectId, currentVersion,
        row.title, row.category, row.district,
        row.problem_statement, row.proposed_solution, Number(row.budget),
        row.attachments || [], row.external_links || [],
        req.userId, Date.now(),
      ],
    );

    // Apply the edits
    const newTitle = sanitizeText(String(title ?? row.title).trim());
    const newCategory = Array.isArray(category) ? category.map(s => sanitizeText(String(s))) : row.category;
    const newDistrict = sanitizeText(String(district ?? row.district).trim());
    const newProblem = sanitizeText(String(problemStatement ?? row.problem_statement).trim());
    const newSolution = sanitizeText(String(proposedSolution ?? row.proposed_solution).trim());
    const newBudget = budget !== undefined ? (Number(budget) || 0) : Number(row.budget);
    const newFunding = funding !== undefined ? sanitizeText(String(funding).trim()) : (row.funding || "Self Funding");
    const newOfficerInCharge = officerInCharge !== undefined ? sanitizeText(String(officerInCharge).trim()) : (row.officer_in_charge || "");
    const newCompany = company !== undefined ? sanitizeText(String(company).trim()) : (row.company || "");
    const newLinks = Array.isArray(externalLinks) ? externalLinks : (row.external_links || []);
    const newAttachments = Array.isArray(attachments) ? attachments : (row.attachments || []);
    const now = Date.now();

    await pool.query(
      `UPDATE projects
       SET title = $1, category = $2, district = $3, problem_statement = $4, proposed_solution = $5,
           budget = $6, funding = $7, officer_in_charge = $8, company = $9, external_links = $10, attachments = $11, versions = $12, updated_at = $13
       WHERE id = $14`,
      [newTitle, newCategory, newDistrict, newProblem, newSolution, newBudget, newFunding, newOfficerInCharge, newCompany, newLinks, newAttachments, currentVersion + 1, now, projectId],
    );

    const updatedRow = (await pool.query("SELECT * FROM projects WHERE id = $1", [projectId])).rows[0];
    const author = await findUserById(updatedRow.author_id);
    const updatedProject = toProject(updatedRow, author);

    await createActivity(req.userId, "edited their innovation", updatedRow.title, projectId);
    io.emit("project-updated", updatedProject);

    return res.json(updatedProject);
  } catch (err) {
    next(err);
  }
});

// PROJECT VERSION HISTORY
app.get("/api/projects/:projectId/versions", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM project_versions WHERE project_id = $1 ORDER BY version DESC",
      [projectId],
    );
    const editorIds = [...new Set(result.rows.map(r => r.edited_by))];
    const editorsResult = editorIds.length > 0
      ? await pool.query("SELECT * FROM users WHERE id = ANY($1)", [editorIds])
      : { rows: [] };
    const editorsMap = new Map(editorsResult.rows.map(r => [r.id, r]));

    const versions = result.rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      version: r.version,
      title: r.title,
      category: r.category,
      district: r.district,
      problemStatement: r.problem_statement,
      proposedSolution: r.proposed_solution,
      budget: Number(r.budget),
      attachments: r.attachments || [],
      externalLinks: r.external_links || [],
      editedBy: editorsMap.has(r.edited_by) ? toAuthUser(editorsMap.get(r.edited_by)) : null,
      createdAt: new Date(Number(r.created_at)).toISOString(),
    }));

    return res.json(versions);
  } catch (err) {
    next(err);
  }
});

/* ── Admin middleware ────────────────────────────────────────────────────── */

const requireAdmin = async (req, res, next) => {
  const user = await findUserById(req.userId);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  req.adminUser = user;
  next();
};

// ADMIN: list all projects with filtering
app.get("/api/admin/projects", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, author, q } = req.query;
    const params = [];
    const clauses = [];

    if (status) { params.push(String(status)); clauses.push(`status = $${params.length}`); }
    if (author) { params.push(String(author)); clauses.push(`author_id = $${params.length}`); }
    if (q) {
      const search = `%${String(q).trim().toLowerCase()}%`;
      params.push(search);
      clauses.push(`(LOWER(title) LIKE $${params.length} OR LOWER(problem_statement) LIKE $${params.length})`);
    }

    let sql = "SELECT * FROM projects";
    if (clauses.length > 0) sql += " WHERE " + clauses.join(" AND ");
    sql += " ORDER BY updated_at DESC LIMIT 500";

    const result = await pool.query(sql, params);

    const authorIds = [...new Set(result.rows.map(r => r.author_id))];
    const authorsResult = authorIds.length > 0
      ? await pool.query("SELECT * FROM users WHERE id = ANY($1)", [authorIds])
      : { rows: [] };
    const authorsMap = new Map(authorsResult.rows.map(r => [r.id, r]));

    const projects = result.rows.map(row => toProject(row, authorsMap.get(row.author_id) ?? null));
    return res.json(projects);
  } catch (err) {
    next(err);
  }
});

// ADMIN: list all users
app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
    return res.json(result.rows.map(toAuthUser));
  } catch (err) {
    next(err);
  }
});

// ADMIN: update user role
app.put("/api/admin/users/:userId/role", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, req.params.userId]);
    const updated = await findUserById(req.params.userId);
    void logAuditEvent("ADMIN_ROLE_CHANGE", {
      userId: req.userId,
      ip: getClientIp(req),
      details: `Changed user ${req.params.userId} role to ${role}`,
    });
    return res.json(toAuthUser(updated));
  } catch (err) {
    next(err);
  }
});

// ADMIN: get dashboard stats
app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [projects, users, comments, pending] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM projects"),
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM comments"),
      pool.query("SELECT COUNT(*) FROM projects WHERE status IN ('submitted', 'under_review')"),
    ]);
    return res.json({
      totalProjects: Number(projects.rows[0].count),
      totalUsers: Number(users.rows[0].count),
      totalComments: Number(comments.rows[0].count),
      pendingReview: Number(pending.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// ADMIN: view security audit logs
app.get("/api/admin/audit-logs", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const event = req.query.event ? String(req.query.event) : null;
    const params = [];
    let sql = "SELECT * FROM audit_logs";
    if (event) {
      params.push(event);
      sql += ` WHERE event = $${params.length}`;
    }
    sql += " ORDER BY created_at DESC LIMIT " + limit;
    const result = await pool.query(sql, params);
    return res.json(result.rows.map(r => ({
      id: r.id,
      event: r.event,
      userId: r.user_id,
      email: r.email,
      ip: r.ip,
      userAgent: r.user_agent,
      details: r.details,
      createdAt: Number(r.created_at),
    })));
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   COMMENT ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.get("/api/projects/:projectId/comments", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM comments WHERE project_id = $1 ORDER BY created_at ASC",
      [projectId],
    );

    const authorIds = [...new Set(result.rows.map(r => r.author_id))];
    const authorsResult = authorIds.length > 0
      ? await pool.query("SELECT * FROM users WHERE id = ANY($1)", [authorIds])
      : { rows: [] };
    const authorsMap = new Map(authorsResult.rows.map(r => [r.id, r]));

    const comments = result.rows.map(row =>
      toComment(row, authorsMap.get(row.author_id) ?? null),
    );

    return res.json(comments);
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects/:projectId/comments", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { content, parentId } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const projResult = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
    if (projResult.rowCount === 0) return res.status(404).json({ message: "Project not found" });
    const proj = projResult.rows[0];

    const id = makeId("c");
    const now = Date.now();

    await pool.query(
      `INSERT INTO comments (id, project_id, author_id, content, parent_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, projectId, req.userId, sanitizeText(content.trim()), parentId || null, now],
    );

    await pool.query("UPDATE projects SET comments_count = comments_count + 1 WHERE id = $1", [projectId]);

    const row = (await pool.query("SELECT * FROM comments WHERE id = $1", [id])).rows[0];
    const author = await findUserById(req.userId);
    const comment = toComment(row, author);

    io.to(`project:${projectId}`).emit("comment-created", comment);
    await createActivity(req.userId, "commented on", proj.title, projectId);

    if (proj.author_id !== req.userId) {
      await createNotification(
        proj.author_id,
        "New Comment",
        `${author.name} commented on "${proj.title}"`,
      );
    }

    if (parentId) {
      const parentComment = (await pool.query("SELECT * FROM comments WHERE id = $1", [parentId])).rows[0];
      if (parentComment && parentComment.author_id !== req.userId && parentComment.author_id !== proj.author_id) {
        await createNotification(
          parentComment.author_id,
          "Reply to Your Comment",
          `${author.name} replied to your comment on "${proj.title}"`,
        );
      }
    }

    // Detect @mentions and notify
    const mentions = content.match(/@(\w[\w\s]*?)(?=\s|$|[.,!?])/g);
    if (mentions) {
      const mentionedNames = mentions.map(m => m.slice(1).trim().toLowerCase());
      const mentionedUsers = (await pool.query(
        "SELECT * FROM users WHERE LOWER(name) = ANY($1)",
        [mentionedNames],
      )).rows;

      for (const mentioned of mentionedUsers) {
        if (mentioned.id !== req.userId && mentioned.id !== proj.author_id) {
          await createNotification(
            mentioned.id,
            "You Were Mentioned",
            `${author.name} mentioned you in a comment on "${proj.title}"`,
          );
        }
      }
    }

    return res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVITY ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.get("/api/activities", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query?.limit) || 30, 100);
    const result = await pool.query(
      "SELECT * FROM activities ORDER BY created_at DESC LIMIT $1",
      [limit],
    );

    const userIds = [...new Set(result.rows.map(r => r.user_id))];
    const usersResult = userIds.length > 0
      ? await pool.query("SELECT * FROM users WHERE id = ANY($1)", [userIds])
      : { rows: [] };
    const usersMap = new Map(usersResult.rows.map(r => [r.id, r]));

    const activities = result.rows.map(row =>
      toActivity(row, usersMap.get(row.user_id) ?? null),
    );

    return res.json(activities);
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGE ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.get("/api/messages/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE from_user_id = $1 OR to_user_id = $1 ORDER BY created_at ASC",
      [req.userId],
    );

    return res.json(result.rows.map(row => ({
      id: row.id,
      from: row.from_user_id,
      to: row.to_user_id,
      text: row.text,
      createdAt: Number(row.created_at),
      read: row.is_read,
    })));
  } catch (err) {
    next(err);
  }
});

app.post("/api/messages/me", requireAuth, async (req, res, next) => {
  try {
    const { to, text } = req.body;
    if (!to || !text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ message: "Recipient and text are required" });
    }

    const recipient = await findUserById(to);
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    const id = makeId("m");
    const now = Date.now();
    const sanitizedText = sanitizeText(text.trim());

    await pool.query(
      "INSERT INTO messages (id, from_user_id, to_user_id, text, created_at, is_read) VALUES ($1, $2, $3, $4, $5, FALSE)",
      [id, req.userId, to, sanitizedText, now],
    );

    const message = { id, from: req.userId, to, text: sanitizedText, createdAt: now, read: false };

    // Real-time delivery to recipient
    io.to(`user:${to}`).emit("message-received", message);

    if (to !== req.userId) {
      const sender = await findUserById(req.userId);
      await createNotification(to, "New Message", `You received a new message from ${sender.name}`);
    }

    return res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

app.post("/api/messages/me/read", requireAuth, async (req, res, next) => {
  try {
    const { peerId } = req.body;
    if (!peerId) return res.status(400).json({ message: "Peer ID is required" });

    await pool.query(
      "UPDATE messages SET is_read = TRUE WHERE to_user_id = $1 AND from_user_id = $2 AND is_read = FALSE",
      [req.userId, peerId],
    );

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICATION ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

app.get("/api/notifications/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
      [req.userId],
    );

    return res.json(result.rows.map(row => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: Number(row.created_at),
      read: row.is_read,
    })));
  } catch (err) {
    next(err);
  }
});

app.post("/api/notifications/me/read", requireAuth, async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [req.userId]);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/notifications/me/:id", requireAuth, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/notifications/me", requireAuth, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM notifications WHERE user_id = $1", [req.userId]);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   STATS + HEALTH
   ═══════════════════════════════════════════════════════════════════════════ */

app.get("/api/stats", requireAuth, async (req, res, next) => {
  try {
    const [projects, users, comments] = await Promise.all([
      pool.query("SELECT COUNT(*) as c FROM projects"),
      pool.query("SELECT COUNT(*) as c FROM users"),
      pool.query("SELECT COUNT(*) as c FROM comments"),
    ]);

    return res.json({
      totalProjects: Number(projects.rows[0].c),
      totalUsers: Number(users.rows[0].c),
      totalComments: Number(comments.rows[0].c),
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", db: "connected" });
  } catch {
    return res.status(503).json({ status: "error", db: "disconnected" });
  }
});

/* SPA fallback — serve index.html for all non-API routes */
if (fs.existsSync(DIST_DIR)) {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error.message);
  if (error.stack) console.error(error.stack);
  return res.status(500).json({ message: "An unexpected error occurred. Please try again." });
});

/* ═══════════════════════════════════════════════════════════════════════════
   START SERVER
   ═══════════════════════════════════════════════════════════════════════════ */

initDb()
  .then(() => {
    /* ── Security warnings ───────────────────────────────────────────── */
    const WEAK_SECRETS = ["change-this-in-production", "secret", "jwt-secret", "test"];
    if (WEAK_SECRETS.includes(JWT_SECRET) || JWT_SECRET.length < 32) {
      console.warn("⚠️  WARNING: JWT_SECRET is weak. Generate a strong random secret for production!");
      console.warn("   Run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    }
    if (CORS_ORIGIN === "*") {
      console.warn("⚠️  WARNING: CORS_ORIGIN is set to '*'. Restrict it to your domain in production.");
    }

    /* ── Periodic cleanup: audit logs older than 90 days ────────────── */
    setInterval(async () => {
      try {
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        await pool.query("DELETE FROM audit_logs WHERE created_at < $1", [cutoff]);
      } catch {}
    }, 24 * 60 * 60 * 1000);

    httpServer.listen(PORT, () => {
      console.log(`Production API running on http://localhost:${PORT}`);
      console.log(`  Upload dir: ${UPLOAD_DIR}`);
      console.log(`  CORS: ${CORS_ORIGIN}`);
      console.log(`  Max file size: ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      console.log(`  Security: Helmet CSP + HSTS + Rate limiting + Audit logging`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize:", err);
    process.exit(1);
  });
