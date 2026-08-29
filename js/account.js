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
      (who ? who.full + " · " : "") + (m === "google" ? "sync code / Google" : "GitHub token");
  }
  const last = store.get(SYNC_KEY, 0);
  document.getElementById("lastSync").textContent = last ? `Last synced ${new Date(last).toLocaleString()}` : "Not synced yet.";
}
refreshSyncUI();

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
on("btnDisconnect", () => { setToken(null); setSession(null); store.set("ats-email", null); refreshSyncUI(); });

/* coach notes */
async function loadCoach() {
  if (!syncMethod()) return; // works for BOTH sign-in methods (email+code session or GitHub token)
  try {
    const c = await fetchCoach();
    if (!c || !c.note) return;
    // the teacher-lesson HOMEWORK CONTRACT rides in the coach payload — store it
    // locally so the day-plan can schedule backwards from the lesson deadline
    if (c.homework && c.homework.lessonAt) {
      store.set("ats-homework", c.homework);
      const pc = document.getElementById("planCard");
      if (pc && typeof planRenderCard === "function") planRenderCard(pc);
    } else if (!c.homework) store.set("ats-homework", null);
    // the WEEK rides in the same payload (CURRICULUM.md §6) — cache it so the
    // week hero and week.html show the coach's target instead of a self-seed
    if (c.week && c.week.n) {
      // only repaint when the coach's week actually CHANGED — an unconditional
      // reload here would re-fetch, re-store and reload again, forever
      const prev = store.get(WEEK_KEY, null);
      const isNew = !prev || prev.n !== c.week.n || JSON.stringify(prev) !== JSON.stringify(c.week);
      store.set(WEEK_KEY, c.week);
      if (isNew && typeof paintWeekHero === "function") { try { await paintWeekHero(); } catch (e) {} }
    }
    const who = whoami();
    if (who) document.getElementById("coachCard").querySelector("h2").firstChild.textContent = `🧑‍🏫 Coach's notes for ${who.name} `;
    document.getElementById("coachCard").style.display = "block";
    document.getElementById("coachDate").textContent = c.updated ? "· " + c.updated : "";
    document.getElementById("coachNote").textContent = c.note;
    const ul = document.getElementById("coachFocus");
    ul.innerHTML = "";
    (c.focus || []).forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      ul.appendChild(li);
    });
  } catch (e) { /* offline or bad token — skip */ }
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
