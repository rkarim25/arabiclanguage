/* Sync + coaching backend for Arabic Through Stories.
   Google sign-in (ID token verified server-side) -> long-lived session token
   -> learning data stored in KV under the user's email.
   Claude reads/writes the KV from chat sessions via wrangler. */

const SESSION_TTL = 180 * 24 * 60 * 60; // 180 days, seconds

function cors(env, extra = {}) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
    ...extra,
  };
}

function json(env, status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: cors(env) });
}

async function requireSession(req, env) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return env.ARABIC_SYNC.get("session:" + token); // -> email or null
}

async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });

    if (url.pathname === "/config" && req.method === "GET") {
      const stored = await env.ARABIC_SYNC.get("config:clientId");
      return json(env, 200, { clientId: env.GOOGLE_CLIENT_ID || stored || null });
    }

    // Email + sync code login — works on any device, no Google setup needed
    if (url.pathname === "/login-pw" && req.method === "POST") {
      let body;
      try { body = await req.json(); } catch { return json(env, 400, { error: "bad-json" }); }
      if (!body.email || !body.password) return json(env, 400, { error: "bad-request" });
      if (body.email.toLowerCase().trim() !== env.ALLOWED_EMAIL) return json(env, 403, { error: "email-not-allowed" });
      const stored = await env.ARABIC_SYNC.get("auth:pwhash");
      const hash = await sha256Hex("arabic-sync-v1" + body.password.trim());
      if (!stored || hash !== stored) {
        await new Promise(res => setTimeout(res, 800)); // slow brute force
        return json(env, 401, { error: "bad-code" });
      }
      const session = crypto.randomUUID() + "-" + crypto.randomUUID();
      await env.ARABIC_SYNC.put("session:" + session, env.ALLOWED_EMAIL, { expirationTtl: SESSION_TTL });
      return json(env, 200, { session, email: env.ALLOWED_EMAIL });
    }

    if (url.pathname === "/login" && req.method === "POST") {
      let body;
      try { body = await req.json(); } catch { return json(env, 400, { error: "bad-json" }); }
      if (!body.credential) return json(env, 400, { error: "no-credential" });

      // Verify the Google ID token
      const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(body.credential));
      if (!r.ok) return json(env, 401, { error: "invalid-token" });
      const info = await r.json();

      if (info.email !== env.ALLOWED_EMAIL || info.email_verified !== "true") {
        return json(env, 403, { error: "email-not-allowed" });
      }
      // If a client ID is pinned (env or stored), enforce audience match
      const pinned = env.GOOGLE_CLIENT_ID || (await env.ARABIC_SYNC.get("config:clientId"));
      if (pinned && info.aud !== pinned) return json(env, 401, { error: "aud-mismatch" });
      // First successful login pins the client ID so other devices auto-configure
      if (!pinned && info.aud) await env.ARABIC_SYNC.put("config:clientId", info.aud);

      const session = crypto.randomUUID() + "-" + crypto.randomUUID();
      await env.ARABIC_SYNC.put("session:" + session, info.email, { expirationTtl: SESSION_TTL });
      return json(env, 200, { session, email: info.email });
    }

    // Everything below requires a session
    const email = await requireSession(req, env);
    if (!email) return json(env, 401, { error: "unauthorized" });

    if (url.pathname === "/data" && req.method === "GET") {
      const data = await env.ARABIC_SYNC.get("data:" + email);
      return data
        ? new Response(data, { status: 200, headers: cors(env) })
        : json(env, 404, { error: "no-data" });
    }

    if (url.pathname === "/sync" && req.method === "POST") {
      const text = await req.text();
      if (text.length > 20 * 1024 * 1024) return json(env, 413, { error: "too-large" });
      try { JSON.parse(text); } catch { return json(env, 400, { error: "bad-json" }); }
      await env.ARABIC_SYNC.put("data:" + email, text);
      return json(env, 200, { ok: true, savedAt: Date.now() });
    }

    if (url.pathname === "/coach" && req.method === "GET") {
      const coach = (await env.ARABIC_SYNC.get("coach:" + email)) || (await env.ARABIC_SYNC.get("coach"));
      return coach
        ? new Response(coach, { status: 200, headers: cors(env) })
        : json(env, 200, { note: null });
    }

    return json(env, 404, { error: "not-found" });
  },
};
