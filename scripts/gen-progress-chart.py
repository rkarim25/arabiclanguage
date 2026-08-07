"""gen-progress-chart.py — renders progress.png from data/progress-series.json
for the weekly coach email (embedded via its GitHub Pages URL, so it always
shows the latest deploy: https://rkarim25.github.io/arabiclanguage/progress.png).

SKILL AXIS (2026-08-07): the panels plot the skill itself — listening (words of
recitation caught/followed by ear) and speaking (share of the Umrah set
deployable in speech) — with three forecasts: current pace, one higher, one
lower. Placement tests are purple diamonds.

Run AFTER scripts/gen-progress.js:
    python scripts/gen-progress-chart.py
"""
import json, os, datetime
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

ROOT = os.path.join(os.path.dirname(__file__), "..")
with open(os.path.join(ROOT, "data", "progress-series.json"), encoding="utf-8") as f:
    pg = json.load(f)

STYLE = {
    "current": ("#8a8578", None),
    "higher":  ("#0d7a5f", None),
    "lower":   ("#b03535", None),
}
D = lambda s: datetime.datetime.strptime(s, "%Y-%m-%d")
fmtd = lambda d: d.strftime("%d %b %y").lstrip("0")

fig, axes = plt.subplots(1, 2, figsize=(12, 4.6), dpi=110)
fig.patch.set_facecolor("#faf6ef")
for ax, key in zip(axes, ["quran", "conv"]):
    tr = pg["tracks"][key]
    target = 100 * tr["target"]
    ax.set_facecolor("#faf6ef")
    xs = [D(p["d"]) for p in tr["reality"]]
    ys = [100 * p["skill"] for p in tr["reality"]]
    held = tr.get("held", [])
    if len(held) > 1:
        ax.plot([D(p["d"]) for p in held], [100 * p["frac"] for p in held],
                color="#8a8578", lw=1, ls=(0, (1, 2)), alpha=0.6, zorder=4, label="words held (the engine)")
    ax.plot(xs, ys, color="#0d7a5f", lw=2.2, solid_capstyle="round", zorder=5, label="reality (the skill today)")
    ax.plot(xs[-1], ys[-1], "o", color="#0d7a5f", ms=6, zorder=6)
    horizon = None
    for s in tr["scenarios"]:
        col, _ = STYLE.get(s["id"], ("#999", None))
        sx = [D(p["d"]) for p in s["series"]]
        sy = [min(100.0, 100 * p["skill"]) for p in s["series"]]
        done = f" → {fmtd(D(s['completion']))}" if s["completion"] else " → 18mo+"
        ax.plot(sx, sy, color=col, lw=1.2, ls=(0, (2, 3)), label=s["label"] + done, zorder=3)
        if s["completion"]:
            cd = D(s["completion"])
            ax.plot(cd, target, "o", color=col, ms=4, zorder=6)
            horizon = max(horizon, cd) if horizon else cd
    for p in tr.get("tests", []):
        ax.plot(D(p["d"]), 100 * p["skill"], "D", color="#7b5ea8", ms=6, mec="white", mew=0.8,
                zorder=7, label="placement test" if p is tr["tests"][0] else None)
    ax.axhline(target, color="#0d7a5f", lw=1, ls=(0, (6, 3)), alpha=0.6)
    goal_txt = ("goal: catch %d%% of the words by ear" if tr["kind"] == "listen" and tr["stage"] == "salah"
                else "goal: follow %d%% of the meaning" if tr["kind"] == "listen"
                else "goal: deploy %d%% in speech") % round(target)
    ax.text(0.995, tr["target"] + 0.005, goal_txt, transform=ax.get_yaxis_transform(),
            ha="right", va="bottom", fontsize=7.5, color="#0d7a5f")
    end = min(max(horizon or D(pg["generated"][:10]), D(pg["generated"][:10]) + datetime.timedelta(days=270)),
              D(pg["generated"][:10]) + datetime.timedelta(days=550))
    ax.set_xlim(xs[0], end + datetime.timedelta(days=30))
    ax.set_ylim(0, 104)
    icon = "🎧" if tr["kind"] == "listen" else "🗣"
    ax.set_title(f"{tr['label']}  ·  today ~{100*tr['todaySkill']:.0f}%",
                 fontsize=9.5, color="#26221a", pad=6)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    ax.tick_params(labelsize=7.5, colors="#8a8578")
    for sp in ax.spines.values():
        sp.set_color("#d8d0c0")
    ax.legend(fontsize=6.6, loc="upper left", frameon=False, labelcolor="#5a544a")
fig.suptitle("Your two skills — solid is the skill today; dotted is where each rhythm takes it; ◆ placement tests anchor it",
             fontsize=10, color="#26221a", y=1.0)
fig.tight_layout(rect=(0, 0, 1, 0.96))
out = os.path.join(ROOT, "progress.png")
fig.savefig(out, bbox_inches="tight")
print("wrote", out, f"({os.path.getsize(out)//1024} KB)")
