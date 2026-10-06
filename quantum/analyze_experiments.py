from __future__ import annotations

import pandas as pd
import matplotlib.pyplot as plt


FILE = "experiments/qkd_experiment_results.csv"


def main():

    df = pd.read_csv(FILE)

    print("=" * 70)
    print("Q-SAFE — EXPERIMENT ANALYSIS")
    print("=" * 70)

    print()
    print(df)

    # ========================================================
    # QBER VS EVE
    # ========================================================

    plt.figure()

    for noise in sorted(
        df["noise_rate"].unique()
    ):

        subset = df[
            df["noise_rate"] == noise
        ]

        plt.plot(
            subset["eve_probability"] * 100,
            subset["mean_qber"] * 100,
            marker="o",
            label=f"Noise {noise:.0%}",
        )

    plt.xlabel("Eve interception probability (%)")
    plt.ylabel("Mean QBER (%)")
    plt.title("Q-Safe: QBER vs Eavesdropping")
    plt.legend()
    plt.tight_layout()

    plt.show()


    # ========================================================
    # QBER VS NOISE
    # ========================================================

    plt.figure()

    for eve in sorted(
        df["eve_probability"].unique()
    ):

        subset = df[
            df["eve_probability"] == eve
        ]

        plt.plot(
            subset["noise_rate"] * 100,
            subset["mean_qber"] * 100,
            marker="o",
            label=f"Eve {eve:.0%}",
        )

    plt.xlabel("Channel noise (%)")
    plt.ylabel("Mean QBER (%)")
    plt.title("Q-Safe: QBER vs Channel Noise")
    plt.legend()
    plt.tight_layout()

    plt.show()


if __name__ == "__main__":
    main()