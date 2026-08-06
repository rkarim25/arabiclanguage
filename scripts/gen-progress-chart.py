"""gen-progress-chart.py — renders progress.png from data/progress-series.json
for the weekly coach email (embedded via its GitHub Pages URL, so it always
shows the latest deploy: https://rkarim25.github.io/arabiclanguage/progress.png).

Run AFTER scripts/gen-progress.js. Same visual language as the dashboard:
solid = reality, dotted = forecasts, green goal line at 90%.
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
    "current": ("#8a8578", "his current rhythm"),
    "plus5":  ("#3d9b76", "+5 min/day"),
    "plus10": ("#0d7a5f", "+10 min/day"),
    "ten7":   ("#3572b0", "10 min every day"),
    "miss1":  ("#c99a2e", "10 min, miss 1 d/wk"),
    "miss2":  ("#c97e2e", "10 min, miss 2 d/wk"),
    "miss3":  ("#c25c33", "10 min, miss 3 d/wk"),
    "miss4":  ("#b03535", "10 min, miss 4 d/wk"),
}
D = lambda s: datetime.datetime.strptime(s, "%Y-%m-%d")

fig, axes = plt.subplots(1, 2, figsize=(12, 4.6), dpi=110)
fig.patch.set_facecolor("#faf6ef")
for ax, (key, icon, title) in zip(axes, [("quran", "📖", "Quran"), ("conv", "🗣", "Conversation")]):
    tr = pg["tracks"][key]
    total, target = tr["basketSize"], tr["target"] * tr["basketSize"]
    ax.set_facecolor("#faf6ef")
    xs = [D(p["d"]) for p in tr["reality"]]
    ys = [100 * p["mass"] / total for p in tr["reality"]]
    ax.plot(xs, ys, color="#0d7a5f", lw=2.2, solid_capstyle="round", zorder=5, label="reality (recallable now)")
    ax.plot(xs[-1], ys[-1], "o", color="#0d7a5f", ms=6, zorder=6)
    horizon = None
    for s in tr["scenarios"]:
        col, label = STYLE.get(s["id"], ("#999", s["id"]))
        sx = [D(p["d"]) for p in s["series"]]
        sy = [min(100.0, 100 * p["mass"] / total) for p in s["series"]]
        done = f' → {D(s["completion"]).strftime("%-d %b %y") if os.name != "nt" else D(s["completion"]).strftime("%d %b %y")}' if s["completion"] else " → 18mo+"
        ax.plot(sx, sy, color=col, lw=1.1, ls=(0, (2, 3)), label=label + done, zorder=3)
        if s["completion"]:
            cd = D(s["completion"])
            ax.plot(cd, 90, "o", color=col, ms=4, zorder=6)
            horizon = max(horizon, cd) if horizon else cd
    ax.axhline(90, color="#0d7a5f", lw=1, ls=(0, (6, 3)), alpha=0.6)
    ax.text(0.995, 0.905, "goal: hold 90%", transform=ax.get_yaxis_transform(),
            ha="right", va="bottom", fontsize=7.5, color="#0d7a5f")
    end = min(max(horizon or D(pg["generated"][:10]), D(pg["generated"][:10]) + datetime.timedelta(days=270)),
              D(pg["generated"][:10]) + datetime.timedelta(days=550))
    ax.set_xlim(xs[0], end + datetime.timedelta(days=30))
    ax.set_ylim(0, 104)
    ax.set_title(f"{title} — {tr['label']}  ·  holding {tr['todayMass']:.0f}/{total} ({100*tr['todayMass']/total:.0f}%)",
                 fontsize=9.5, color="#26221a", pad=6)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    ax.tick_params(labelsize=7.5, colors="#8a8578")
    for sp in ax.spines.values():
        sp.set_color("#d8d0c0")
    ax.legend(fontsize=6.4, loc="upper left", frameon=False, labelcolor="#5a544a")
fig.suptitle("Reality & forecast — solid is what you can recall today; dotted is where each rhythm takes you",
             fontsize=10, color="#26221a", y=1.0)
fig.tight_layout(rect=(0, 0, 1, 0.96))
out = os.path.join(ROOT, "progress.png")
fig.savefig(out, bbox_inches="tight")
print("wrote", out, f"({os.path.getsize(out)//1024} KB)")
