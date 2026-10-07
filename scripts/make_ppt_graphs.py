from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "experiments" / "qkd_experiment_results.csv"
OUTPUT = ROOT / "docs"

OUTPUT.mkdir(exist_ok=True)

df = pd.read_csv(INPUT)


# ============================================================
# QBER VS EVE
# Honest channel: noise = 0
# ============================================================

eve_df = (
    df[df["noise_rate"] == 0.0]
    .sort_values("eve_probability")
)

plt.figure(figsize=(8, 5))

plt.errorbar(
    eve_df["eve_probability"] * 100,
    eve_df["mean_qber"] * 100,
    yerr=eve_df["std_qber"] * 100,
    fmt="o-",
    linewidth=2.5,
    markersize=7,
    capsize=5,
    color="#112250",
    ecolor="#3C5070",
)

plt.xlabel("Eavesdropper Probability (%)", fontsize=12)
plt.ylabel("QBER (%)", fontsize=12)
plt.title(
    "QBER vs Eavesdropper Probability",
    fontsize=16,
    fontweight="bold",
)

plt.grid(True, alpha=0.18)

plt.tight_layout()

plt.savefig(
    OUTPUT / "qber_vs_eve.png",
    dpi=300,
    bbox_inches="tight",
    facecolor="white",
)

plt.close()


# ============================================================
# QBER VS NOISE
# No Eve: eve_probability = 0
# ============================================================

noise_df = (
    df[df["eve_probability"] == 0.0]
    .sort_values("noise_rate")
)

plt.figure(figsize=(8, 5))

plt.errorbar(
    noise_df["noise_rate"] * 100,
    noise_df["mean_qber"] * 100,
    yerr=noise_df["std_qber"] * 100,
    fmt="o-",
    linewidth=2.5,
    markersize=7,
    capsize=5,
    color="#3C5070",
    ecolor="#112250",
)

plt.xlabel("Channel Noise (%)", fontsize=12)
plt.ylabel("QBER (%)", fontsize=12)
plt.title(
    "QBER vs Channel Noise",
    fontsize=16,
    fontweight="bold",
)

plt.grid(True, alpha=0.18)

plt.tight_layout()

plt.savefig(
    OUTPUT / "qber_vs_noise.png",
    dpi=300,
    bbox_inches="tight",
    facecolor="white",
)

plt.close()


print()
print("======================================")
print("PPT GRAPH GENERATION COMPLETE")
print("======================================")
print()
print("Created:")
print(OUTPUT / "qber_vs_eve.png")
print(OUTPUT / "qber_vs_noise.png")