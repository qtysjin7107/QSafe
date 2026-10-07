from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

from quantum.qber_model import QBERModel


# ============================================================
# SETTINGS FOR THE SLIDE 9 DEMO
# ============================================================

OBSERVED_QBER = 0.064          # 6.4%
NOISE_RATE = 0.05              # 5%
ATTACK_EVE_PROBABILITY = 0.10  # attack hypothesis
PRIOR_EVE = 0.50               # default prior


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)


# ============================================================
# LOAD THE EXPERIMENTALLY CALIBRATED MODEL
# ============================================================

model = QBERModel()

honest = model.honest_distribution(
    noise_rate=NOISE_RATE
)

attack = model.attack_distribution(
    noise_rate=NOISE_RATE,
    eve_probability=ATTACK_EVE_PROBABILITY
)


# ============================================================
# BAYES POSTERIOR
# ============================================================

honest_pdf = norm.pdf(
    OBSERVED_QBER,
    honest.mean,
    honest.std
)

attack_pdf = norm.pdf(
    OBSERVED_QBER,
    attack.mean,
    attack.std
)

posterior_eve = (
    attack_pdf * PRIOR_EVE
    /
    (
        attack_pdf * PRIOR_EVE
        +
        honest_pdf * (1 - PRIOR_EVE)
    )
)


# ============================================================
# DISTRIBUTION CURVES
# ============================================================

x_min = max(
    0,
    min(
        honest.mean - 4 * honest.std,
        attack.mean - 4 * attack.std
    )
)

x_max = min(
    1,
    max(
        honest.mean + 4 * honest.std,
        attack.mean + 4 * attack.std
    )
)

x = np.linspace(
    x_min,
    x_max,
    800
)

honest_curve = norm.pdf(
    x,
    honest.mean,
    honest.std
)

attack_curve = norm.pdf(
    x,
    attack.mean,
    attack.std
)


# ============================================================
# PLOT
# ============================================================

fig, ax = plt.subplots(
    figsize=(11, 6.5)
)

# Honest distribution
ax.plot(
    x * 100,
    honest_curve,
    linewidth=3,
    color="#3C5070",
    label="HONEST CHANNEL"
)

ax.fill_between(
    x * 100,
    honest_curve,
    alpha=0.18,
    color="#3C5070"
)


# Attack distribution
ax.plot(
    x * 100,
    attack_curve,
    linewidth=3,
    color="#A52A2A",
    label="EAVESDROPPING"
)

ax.fill_between(
    x * 100,
    attack_curve,
    alpha=0.14,
    color="#A52A2A"
)


# ============================================================
# OBSERVED QBER
# ============================================================

ax.axvline(
    OBSERVED_QBER * 100,
    linewidth=2.5,
    linestyle="--",
    color="#D8A62A"
)

ax.annotate(
    f"Observed QBER\n{OBSERVED_QBER * 100:.1f}%",
    xy=(
        OBSERVED_QBER * 100,
        max(
            honest_curve.max(),
            attack_curve.max()
        ) * 0.55
    ),
    xytext=(
        OBSERVED_QBER * 100 + 1.5,
        max(
            honest_curve.max(),
            attack_curve.max()
        ) * 0.72
    ),
    arrowprops=dict(
        arrowstyle="->",
        linewidth=1.5
    ),
    fontsize=11,
    fontweight="bold"
)


# ============================================================
# STYLING
# ============================================================

ax.set_xlabel(
    "Observed QBER (%)",
    fontsize=13
)

ax.set_ylabel(
    "Likelihood density",
    fontsize=13
)

ax.set_title(
    "Bayesian QBER Evidence",
    fontsize=19,
    fontweight="bold"
)

ax.legend(
    frameon=False,
    loc="upper right"
)

ax.grid(
    True,
    alpha=0.15
)

ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)


# ============================================================
# POSTERIOR CALLOUT
# ============================================================

ax.text(
    0.98,
    0.93,
    f"P(Eve | QBER)\n{posterior_eve * 100:.1f}%",
    transform=ax.transAxes,
    ha="right",
    va="top",
    fontsize=18,
    fontweight="bold"
)


# ============================================================
# SAVE
# ============================================================

plt.tight_layout()

output = DOCS / "bayes_likelihood.png"

plt.savefig(
    output,
    dpi=300,
    bbox_inches="tight",
    facecolor="white"
)

plt.close()

print()
print("========================================")
print("BAYES GRAPH GENERATED")
print("========================================")
print()
print(f"Observed QBER : {OBSERVED_QBER * 100:.1f}%")
print(f"Noise         : {NOISE_RATE * 100:.1f}%")
print(f"Honest mean   : {honest.mean * 100:.2f}%")
print(f"Honest std    : {honest.std * 100:.2f}%")
print(f"Attack mean   : {attack.mean * 100:.2f}%")
print(f"Attack std    : {attack.std * 100:.2f}%")
print(f"P(Eve | QBER) : {posterior_eve * 100:.2f}%")
print()
print(f"Saved to: {output}")