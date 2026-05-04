import crypto from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret() {
  const secret = process.env.MF_AUTH_SECRET;
  if (!secret) {
    throw new Error("Falta configurar MF_AUTH_SECRET");
  }
  return secret;
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
}

function safeCompare(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function validatePin(usuarioId, pin) {
  const users = [
    { usuarioId: "usr_gustavo", nombre: "Gustavo", pin: process.env.MF_PIN_GUSTAVO },
    { usuarioId: "usr_vane", nombre: "Vane", pin: process.env.MF_PIN_VANE },
  ];

  const user = users.find((u) => u.usuarioId === usuarioId);

  if (!user || !user.pin || String(user.pin) !== String(pin || "")) {
    return null;
  }

  return {
    usuarioId: user.usuarioId,
    nombre: user.nombre,
  };
}

export function createToken(user) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64Url(
    JSON.stringify({
      usuarioId: user.usuarioId,
      nombre: user.nombre,
      workspaceId: user.workspaceId || "ws_default",
      workspaceNombre: user.workspaceNombre || "Mis Finanzas",
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    })
  );

  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = sign(`${header}.${payload}`);

  if (!safeCompare(signature, expectedSignature)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);

    if (!decoded.exp || decoded.exp < now) return null;
    if (!decoded.usuarioId) return null;

    return {
      usuarioId: decoded.usuarioId,
      nombre: decoded.nombre || decoded.usuarioId,
      workspaceId: decoded.workspaceId || "ws_default",
      workspaceNombre: decoded.workspaceNombre || "Mis Finanzas",
    };
  } catch {
    return null;
  }
}

export async function resolveWorkspaceForUser(sql, user) {
  if (!user || !user.usuarioId) return user;

  const rows = await sql`
    SELECT
      wu.workspace_id,
      w.nombre AS workspace_nombre,
      wu.rol
    FROM workspace_usuarios wu
    JOIN workspaces w
      ON w.workspace_id = wu.workspace_id
    WHERE wu.usuario_id = ${user.usuarioId}
      AND COALESCE(wu.activo, true) = true
      AND COALESCE(w.activo, true) = true
    ORDER BY
      CASE WHEN wu.rol = 'owner' THEN 0 ELSE 1 END,
      CASE WHEN wu.workspace_id = 'ws_default' THEN 1 ELSE 0 END,
      wu.created_at ASC
    LIMIT 1;
  `;

  if (rows.length === 0) return user;

  return {
    ...user,
    workspaceId: rows[0].workspace_id,
    workspaceNombre: rows[0].workspace_nombre || user.workspaceNombre || rows[0].workspace_id,
  };
}

export function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({
      ok: false,
      error: "Sesión inválida o vencida",
    });
    return null;
  }

  return user;
}
