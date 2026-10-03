/* Account surface: cloud sync, coach notes, manual backup.
   Lifted verbatim out of the old index.html inline script when the site was
   rebuilt around milestones (2026-08-29). Every block is guarded so a page that
   omits the sync card (the new home does) simply skips wiring it. */
(function () {
/* sync UI — only wired on pages that actually show the sync card */
const setup = document.getElementById("syncSetup");
const connected = document.getElementById("syncConnected");
const syncMsg = document.getElementById("syncMsg");
const $ = id => document.getElementById(id);
const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
const hasSync = !!(setup && connected);
function refreshSyncUI() {
  if (!hasSync) return;
  const m = syncMethod();
  setup.style.display = m ? "none" : "block";
  connected.style.display = m ? "block" : "none";
  if (m) {
    const who = whoami();
    document.getElementById("syncMethodLabel").textContent =
      (who ? who.full + " · " : "") + (m === "google" ? "Google account" : "GitHub token");
  }
  const last = store.get(SYNC_KEY, 0);
  document.getElementById("lastSync").textContent = last ? `Last synced ${new Date(last).toLocaleString()}` : "Not synced yet.";
}
refreshSyncUI();
initGoogleSignin();

/* email + sync code sign-in */
on("btnCodeLogin", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const code = document.getElementById("loginCode").value.trim();
  if (!email || !code) return;
  const btn = document.getElementById("btnCodeLogin");
  btn.textContent = "Signing in…";
  try {
    await codeLogin(email, code);
    await syncNow();
    refreshSyncUI();
    loadCoach();
  } catch (e) {
    alert(e.message === "bad-code" ? "That code isn't right — check it, or ask your coach in chat to reset it."
      : e.message === "email-not-allowed" ? "That email isn't enabled on this site — ask your coach in chat to add it."
      : "Sign-in failed: " + e.message);
  }
  btn.textContent = "Sign in";
});

on("btnConnect", async () => {
  const t = document.getElementById("tokenInput").value.trim();
  if (!t) return;
  setToken(t);
  try {
    await syncNow();
    refreshSyncUI();
    loadCoach();
    syncMsg.textContent = "";
  } catch (e) {
    setToken(null);
    alert("Could not sync with that token. Check it has Contents read/write on arabic-learning-data.");
  }
  refreshSyncUI();
});
on("btnSync", async () => {
  syncMsg.textContent = "Syncing…";
  try { const n = await syncNow(); syncMsg.textContent = `✓ Synced (${n} events).`; refreshSyncUI(); }
  catch (e) { syncMsg.textContent = "✗ Sync failed — " + (e.message === "bad-token" ? "token invalid or expired." : "check your connection."); }
});
on("btnRestore", async () => {
  if (!confirm("Replace progress in THIS browser with the cloud copy?")) return;
  try { await restoreFromCloud(); location.reload(); }
  catch (e) { alert("No cloud data found yet."); }
});
on("btnDisconnect", () => {
  setToken(null);
  setSession(null);
  store.set("ats-email", null);
  refreshSyncUI();
  initGoogleSignin();
});

/* Google sign-in */
async function initGoogleSignin() {
  if (syncMethod()) return;
  const btnContainer = document.getElementById("gsiButton");
  if (!btnContainer) return;
  const clientId = await getGoogleClientId();
  if (!clientId) return;

  const render = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            btnContainer.innerHTML = "<span style='font-size:14px;color:var(--muted)'>Signing in with Google…</span>";
            await googleLogin(resp.credential);
            await syncNow();
            refreshSyncUI();
            loadCoach();
          } catch (e) {
            alert(e.message === "email-not-allowed"
              ? "That Google account isn't allowed — please sign in as rkarim88@gmail.com."
              : "Google sign-in failed: " + e.message);
            refreshSyncUI();
            initGoogleSignin();
          }
        },
      });
      btnContainer.innerHTML = "";
      google.accounts.id.renderButton(btnContainer, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: "signin_with",
        width: 250
      });
    } catch (e) {
      console.warn("Google sign-in init error:", e);
    }
  };

  if (window.google && window.google.accounts && window.google.accounts.id) {
    render();
  } else if (!document.getElementById("gsiScript")) {
    const s = document.createElement("script");
    s.id = "gsiScript";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = render;
    document.head.appendChild(s);
  } else {
    render();
  }
}

/* coach notes */
async function loadCoach() {
  const card = document.getElementById("coachCard");
  if (!card) return;

  let c = null;
  if (syncMethod()) {
    try { c = await fetchCoach(); } catch (e) {}
  }

  // 1. If remote coach note exists, display it
  if (c && c.note) {
    if (c.homework && c.homework.lessonAt) {
      store.set("ats-homework", c.homework);
      const pc = document.getElementById("planCard");
      if (pc && typeof planRenderCard === "function") planRenderCard(pc);
    } else if (!c.homework) store.set("ats-homework", null);
    
    const who = whoami();
    if (who) card.querySelector("h2").firstChild.textContent = `🧑‍🏫 Coach's notes for ${who.name} `;
    card.style.display = "block";
    document.getElementById("coachDate").textContent = c.updated ? "· " + c.updated : "";
    document.getElementById("coachNote").textContent = c.note;
    const ul = document.getElementById("coachFocus");
    ul.innerHTML = "";
    (c.focus || []).forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      ul.appendChild(li);
    });
    return;
  }

  // 2. Otherwise, dynamically generate on-device motivation and insights!
  if (typeof analyzeLearnerProgress === "function") {
    const a = analyzeLearnerProgress();
    const who = whoami();
    if (who) card.querySelector("h2").firstChild.textContent = `🧑‍🏫 Coach's notes for ${who.name} `;
    card.style.display = "block";
    document.getElementById("coachDate").textContent = "· Today's live analysis";
    document.getElementById("coachNote").innerHTML = `<b>${a.headline}</b><br><span style="color:var(--muted)">Active streak: <b>${a.streakDays} days</b> · Today: <b>${a.minutesToday}m</b> · Words held: <b>${a.totalHeld}</b></span>`;
    const ul = document.getElementById("coachFocus");
    ul.innerHTML = "";
    
    const liNext = document.createElement("li");
    liNext.innerHTML = `<b>⚡ Fastest next win:</b> ${a.nextAction}`;
    ul.appendChild(liNext);

    if (a.recentMissesCount > 0) {
      const liMiss = document.createElement("li");
      liMiss.innerHTML = `<b>🎯 Practice focus:</b> You have ${a.recentMissesCount} recent test items to reinforce in Words Drill.`;
      ul.appendChild(liMiss);
    } else if (a.learningCount > 0) {
      const liLrn = document.createElement("li");
      liLrn.innerHTML = `<b>📇 Vocabulary:</b> ${a.learningCount} words currently in learning queue.`;
      ul.appendChild(liLrn);
    }
  }
}
loadCoach();
autoSync();

/* manual backup */
on("btnExport", () => {
  const data = { progress: getProgress(), srs: getSrs(), log: store.get(LOG_KEY, []), exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "arabic-stories-progress.json";
  a.click();
});
on("btnImport", () => { const f = $("importFile"); if (f) f.click(); });
if ($("importFile")) $("importFile").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (d.progress) store.set("ats-progress", d.progress);
      if (d.srs) store.set("ats-srs", d.srs);
      if (d.log) store.set(LOG_KEY, d.log);
      location.reload();
    } catch (err) { alert("Could not read that file."); }
  };
  r.readAsText(f);
};

})();
