import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pg from "pg";
import { createHash, randomBytes } from "node:crypto";

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

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rank TEXT NOT NULL,
      district TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT NULL,
      innovations_count INTEGER DEFAULT 0,
      connections_count INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL
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
  interests: [],
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

  await pool.query(
    `
      INSERT INTO users (
        id, name, email, password_hash, rank, district, bio, avatar,
        innovations_count, connections_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, '', NULL, 0, 0, $7)
    `,
    [id, name, email, passwordHash, rank, district, Date.now()],
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

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Auth API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
