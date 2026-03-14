import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pg from "pg";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";

dotenv.config({ path: "./server/.env" });

const { Pool } = pg;

const PORT = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-in-production";
const DATABASE_URL = process.env.DATABASE_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? "900");
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "30");
const MAX_SIGNIN_ATTEMPTS = Number(process.env.MAX_SIGNIN_ATTEMPTS ?? "5");
const SIGNIN_LOCKOUT_MINUTES = Number(process.env.SIGNIN_LOCKOUT_MINUTES ?? "15");
const SIGNIN_LOCKOUT_MS = SIGNIN_LOCKOUT_MINUTES * 60 * 1000;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Set it in server/.env or deployment environment.");
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on("join-project", (projectId) => {
    socket.join(`project:${projectId}`);
    console.log(`Socket ${socket.id} joined project:${projectId}`);
  });

  socket.on("leave-project", (projectId) => {
    socket.leave(`project:${projectId}`);
    console.log(`Socket ${socket.id} left project:${projectId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000,
});

const ensureDatabaseExists = async () => {
  if (DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")) {
    console.log("Checking database existence...");
  }
  // Parse the DB name from the connection string
  try {
    const url = new URL(DATABASE_URL);
    const targetDb = url.pathname.slice(1);
    
    // Create a temporary connection to the 'postgres' default database
    const baseUrl = DATABASE_URL.replace(`/${targetDb}`, "/postgres");
    const tempPool = new Pool({ 
      connectionString: baseUrl,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 2000 
    });

    try {
      const res = await tempPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
      if (res.rowCount === 0) {
        console.log(`Database "${targetDb}" not found. Creating it now...`);
        await tempPool.query(`CREATE DATABASE ${targetDb}`);
        console.log(`Database "${targetDb}" created successfully.`);
      }
    } finally {
      await tempPool.end();
    }
  } catch (err) {
    console.warn("Skipping DB creation check (unreachable or local).");
  }
};

let isMockMode = false;

const initDb = async (retries = 2) => {
  try {
    await ensureDatabaseExists();
  } catch (e) {
    console.warn("Could not ensure DB existence, will try connecting anyway.");
  }

  while (retries > 0) {
    try {
      console.log(`Connecting to database... (${retries} attempts remaining)`);
      await pool.query("SELECT 1"); // Simple probe
      console.log("Database connected successfully.");
      isMockMode = false;
      break; 
    } catch (err) {
      retries -= 1;
      if (retries === 0) {
        console.warn("CRITICAL: Database connection failed. Starting in MOCK MODE.");
        isMockMode = true;
        return;
      }
      console.warn("Database not ready, retrying in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

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
      innovations_count INTEGER DEFAULT 0,
      connections_count INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL
    );
  `);

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
      versions INTEGER DEFAULT 1
    );
  `);

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
      PRIMARY KEY (follower_id, following_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS connections (
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requested_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'requested',
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

  await pool.query("CREATE INDEX IF NOT EXISTS auth_refresh_tokens_user_id_idx ON auth_refresh_tokens (user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS auth_refresh_tokens_expires_at_idx ON auth_refresh_tokens (expires_at)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_login_attempts (
      email TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      lock_until BIGINT,
      updated_at BIGINT NOT NULL
    );
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS auth_login_attempts_lock_until_idx ON auth_login_attempts (lock_until)");
};

const normalizeEmail = (value = "") => value.trim().toLowerCase();
const makeUserId = () => `u-${Math.random().toString(36).slice(2, 10)}`;
const makeRefreshTokenId = () => `rt-${Math.random().toString(36).slice(2, 10)}`;
const makeRefreshToken = () => randomBytes(48).toString("hex");
const hashToken = (value) => createHash("sha256").update(value).digest("hex");

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isStrongPassword = (value) =>
  value.length >= 8 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /[0-9]/.test(value);

const createAccessToken = (userId) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowSeconds + ACCESS_TOKEN_TTL_SECONDS;
  const token = jwt.sign(
    {
      sub: userId,
      typ: "access",
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  );

  return {
    token,
    expiresAt: expiresAtSeconds * 1000,
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
  status: row.status,
  approvedBy: row.approved_by_name ? {
    name: row.approved_by_name,
    rank: row.approved_by_rank,
    date: new Date(Number(row.approved_at)).toISOString().split("T")[0],
    comment: row.approval_comment,
  } : undefined,
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

const issueAuthSession = async (userId) => {
  const refreshToken = makeRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const now = Date.now();
  const refreshExpiresAt = now + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

  await pool.query(
    `
      INSERT INTO auth_refresh_tokens (id, user_id, token_hash, created_at, expires_at, revoked_at)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `,
    [makeRefreshTokenId(), userId, refreshTokenHash, now, refreshExpiresAt],
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
  if (!auth || !auth.startsWith("Bearer ")) {
    return null;
  }

  const token = auth.slice("Bearer ".length);
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }

  if (payload?.typ !== "access") {
    return null;
  }

  const userId = payload?.sub;
  if (!userId) {
    return null;
  }

  return userId;
};

const findUserById = async (userId) => {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0] ?? null;
};

const findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] ?? null;
};

const findActiveRefreshToken = async (refreshToken) => {
  const now = Date.now();
  const tokenHash = hashToken(refreshToken);
  const result = await pool.query(
    `
      SELECT *
      FROM auth_refresh_tokens
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > $2
      LIMIT 1
    `,
    [tokenHash, now],
  );

  return result.rows[0] ?? null;
};

const revokeRefreshToken = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  await pool.query(
    `
      UPDATE auth_refresh_tokens
      SET revoked_at = $1
      WHERE token_hash = $2
        AND revoked_at IS NULL
    `,
    [Date.now(), tokenHash],
  );
};

const getLoginAttempt = async (email) => {
  const result = await pool.query("SELECT * FROM auth_login_attempts WHERE email = $1", [email]);
  return result.rows[0] ?? null;
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
    `
      INSERT INTO auth_login_attempts (email, failed_count, lock_until, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET
        failed_count = EXCLUDED.failed_count,
        lock_until = EXCLUDED.lock_until,
        updated_at = EXCLUDED.updated_at
    `,
    [email, failedCount, lockUntil, now],
  );

  return {
    failedCount,
    lockUntil,
  };
};

app.post("/api/auth/signup", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? "");
  const rank = String(req.body?.rank ?? "").trim();
  const district = String(req.body?.district ?? "").trim();

  if (!name || !email || !password || !rank || !district) {
    return res.status(400).json({ message: "Missing required signup fields" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters and include uppercase, lowercase, and a number",
    });
  }

  const exists = await findUserByEmail(email);
  if (exists) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const id = makeUserId();
  const passwordHash = await bcrypt.hash(password, 12);
  const interests = Array.isArray(req.body?.categories) ? req.body.categories : [];

  await pool.query(
    `
      INSERT INTO users (
        id, name, email, password_hash, rank, district, interests, bio, avatar,
        innovations_count, connections_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, '', NULL, 0, 0, $8)
    `,
    [id, name, email, passwordHash, rank, district, interests, Date.now()],
  );

  const row = await findUserById(id);
  const session = await issueAuthSession(id);

  return res.status(201).json({
    ...session,
    user: toAuthUser(row),
  });
});

app.post("/api/auth/signin", async (req, res) => {
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
    const retryAfterSeconds = Math.ceil((attempt.lock_until - now) / 1000);
    return res.status(429).json({
      message: "Too many failed sign-in attempts. Try again later.",
      retryAfterSeconds,
    });
  }

  const row = await findUserByEmail(email);
  if (!row) {
    await registerFailedSignIn(email);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    const status = await registerFailedSignIn(email);
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

  return res.json({
    ...session,
    user: toAuthUser(row),
  });
});

app.post("/api/auth/refresh", async (req, res) => {
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
      `
        UPDATE auth_refresh_tokens
        SET revoked_at = $1
        WHERE id = $2
          AND revoked_at IS NULL
      `,
      [now, tokenRow.id],
    );
    await client.query(
      `
        INSERT INTO auth_refresh_tokens (id, user_id, token_hash, created_at, expires_at, revoked_at)
        VALUES ($1, $2, $3, $4, $5, NULL)
      `,
      [makeRefreshTokenId(), user.id, nextRefreshTokenHash, now, nextRefreshExpiresAt],
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
});

app.post("/api/auth/signout", async (req, res) => {
  const refreshToken = String(req.body?.refreshToken ?? "").trim();
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  return res.json({ ok: true });
});

app.get("/api/users/me", (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return findUserById(userId)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      return res.json(toAuthUser(user));
    })
    .catch(() => res.status(500).json({ message: "Internal server error" }));
});

app.put("/api/users/me", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await findUserById(userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const name = String(req.body?.name ?? user.name).trim();
  const district = String(req.body?.district ?? user.district).trim();
  const bio = String(req.body?.bio ?? user.bio ?? "").trim();

  await pool.query("UPDATE users SET name = $1, district = $2, bio = $3 WHERE id = $4", [name, district, bio, user.id]);

  const updated = await findUserById(user.id);
  return res.json(toAuthUser(updated));
});

app.get("/api/users", async (req, res) => {
  const currentUserId = getUserFromToken(req);
  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const query = String(req.query?.q ?? "").trim().toLowerCase();
  const rowsResult = await pool.query("SELECT * FROM users ORDER BY name ASC");
  const rows = rowsResult.rows;

  const users = rows
    .map((row) => toAuthUser(row))
    .filter((user) => user.id !== currentUserId)
    .filter((user) => {
      if (!query) {
        return true;
      }

      const haystack = [user.name, user.email, user.rank, user.district].join(" ").toLowerCase();
      return haystack.includes(query);
    });

  return res.json(users);
});

app.get("/api/users/:userId", (req, res) => {
  const currentUserId = getUserFromToken(req);
  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = String(req.params.userId ?? "").trim();
  if (!userId) {
    return res.status(400).json({ message: "User id is required" });
  }

  return findUserById(userId)
    .then((row) => {
      if (!row) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(toAuthUser(row));
    })
    .catch(() => res.status(500).json({ message: "Internal server error" }));
});

app.get("/api/projects", async (req, res) => {
  const currentUserId = getUserFromToken(req);
  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { categories, districts, q } = req.query;
  let queryText = "SELECT * FROM projects";
  const queryParams = [];
  const whereClauses = [];

  if (categories) {
    const categoryList = String(categories).split(",").map(s => s.trim()).filter(Boolean);
    if (categoryList.length > 0) {
      queryParams.push(categoryList);
      whereClauses.push(`category && $${queryParams.length}`);
    }
  }

  if (districts) {
    const districtList = String(districts).split(",").map(s => s.trim()).filter(Boolean);
    if (districtList.length > 0) {
      queryParams.push(districtList);
      whereClauses.push(`district = ANY($${queryParams.length})`);
    }
  }

  if (q) {
    const searchTerm = `%${String(q).trim().toLowerCase()}%`;
    queryParams.push(searchTerm);
    whereClauses.push(`(LOWER(title) LIKE $${queryParams.length} OR LOWER(problem_statement) LIKE $${queryParams.length})`);
  }

  if (whereClauses.length > 0) {
    queryText += " WHERE " + whereClauses.join(" AND ");
  }

  queryText += " ORDER BY created_at DESC";

  const result = await pool.query(queryText, queryParams);
  const projects = [];

  for (const row of result.rows) {
    const author = await findUserById(row.author_id);
    projects.push(toProject(row, author));
  }

  return res.json(projects);
});

app.post("/api/projects", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { title, category, district, problemStatement, proposedSolution, budget, externalLinks } = req.body;
  if (!title || !category || !district) {
    return res.status(400).json({ message: "Missing required project fields" });
  }

  const id = `p-${Math.random().toString(36).slice(2, 10)}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  const now = Date.now();

  await pool.query(
    `INSERT INTO projects (
      id, title, slug, category, district, author_id, problem_statement, proposed_solution, budget, created_at, updated_at, external_links
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, title, slug, category, district, userId, problemStatement, proposedSolution, budget, now, now, externalLinks || []]
  );

  const row = (await pool.query("SELECT * FROM projects WHERE id = $1", [id])).rows[0];
  const author = await findUserById(userId);
  const project = toProject(row, author);
  
  io.emit("project-created", project);
  
  return res.status(201).json(project);
});

app.get("/api/projects/:projectId", async (req, res) => {
  const currentUserId = getUserFromToken(req);
  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { projectId } = req.params;
  const result = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Project not found" });
  }

  const row = result.rows[0];
  const author = await findUserById(row.author_id);
  return res.json(toProject(row, author));
});

app.get("/api/projects/:projectId/comments", async (req, res) => {
  const currentUserId = getUserFromToken(req);
  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { projectId } = req.params;
  const result = await pool.query("SELECT * FROM comments WHERE project_id = $1 ORDER BY created_at ASC", [projectId]);
  const comments = [];

  for (const row of result.rows) {
    const author = await findUserById(row.author_id);
    comments.push(toComment(row, author));
  }

  return res.json(comments);
});

app.get("/api/messages/me", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await pool.query(
    "SELECT * FROM messages WHERE from_user_id = $1 OR to_user_id = $1 ORDER BY created_at ASC",
    [userId]
  );

  const messages = result.rows.map(row => ({
    id: row.id,
    from: row.from_user_id,
    to: row.to_user_id,
    text: row.text,
    createdAt: Number(row.created_at),
    read: row.is_read
  }));

  return res.json(messages);
});

app.post("/api/messages/me", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ message: "Recipient and text are required" });
  }

  const id = `m-${Math.random().toString(36).slice(2, 10)}`;
  const now = Date.now();

  await pool.query(
    "INSERT INTO messages (id, from_user_id, to_user_id, text, created_at, is_read) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, userId, to, text, now, false]
  );

  // Send notification to recipient (only if not sending to self)
  if (to !== userId) {
    const notificationId = `n-${Math.random().toString(36).slice(2, 10)}`;
    const sender = await findUserById(userId);
    await pool.query(
      "INSERT INTO notifications (id, user_id, title, body, created_at, is_read) VALUES ($1, $2, $3, $4, $5, $6)",
      [notificationId, to, "New Message", `You received a new message from ${sender.name}`, now, false]
    );
  }

  return res.status(201).json({
    id,
    from: userId,
    to,
    text,
    createdAt: now,
    read: false
  });
});

app.delete("/api/notifications/me/:id", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  await pool.query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [id, userId]);
  return res.json({ ok: true });
});

app.delete("/api/notifications/me", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  await pool.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
  return res.json({ ok: true });
});

app.post("/api/messages/me/read", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { peerId } = req.body;
  if (!peerId) {
    return res.status(400).json({ message: "Peer ID is required" });
  }

  await pool.query(
    "UPDATE messages SET is_read = TRUE WHERE to_user_id = $1 AND from_user_id = $2",
    [userId, peerId]
  );

  return res.json({ ok: true });
});

app.get("/api/notifications/me", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await pool.query(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  const notifications = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: Number(row.created_at),
    read: row.is_read
  }));

  return res.json(notifications);
});

app.post("/api/notifications/me/read", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
    [userId]
  );

  return res.json({ ok: true });
});

app.post("/api/projects/:projectId/comments", async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { projectId } = req.params;
  const { content, parentId } = req.body;
  if (!content) {
    return res.status(400).json({ message: "Comment content is required" });
  }

  const id = `c-${Math.random().toString(36).slice(2, 10)}`;
  const now = Date.now();

  await pool.query(
    `INSERT INTO comments (id, project_id, author_id, content, parent_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, projectId, userId, content, parentId || null, now]
  );

  await pool.query("UPDATE projects SET comments_count = comments_count + 1 WHERE id = $1", [projectId]);

  const row = (await pool.query("SELECT * FROM comments WHERE id = $1", [id])).rows[0];
  const author = await findUserById(userId);
  const comment = toComment(row, author);

  io.to(`project:${projectId}`).emit("comment-created", comment);
  io.emit("activity-created", {
    id: `a-${Math.random().toString(36).slice(2, 10)}`,
    user: toAuthUser(author),
    action: "commented on",
    projectTitle: "Project", // Would be better to fetch title
    projectId,
    timestamp: "Just now"
  });

  return res.status(201).json(comment);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
});

initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Auth API with Socket.IO running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
