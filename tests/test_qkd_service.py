from backend.services.qkd_service import run_quantum_security


def main():
    scenarios = [
        {
            "name": "Normal",
            "noise_rate": 0.0,
            "eve_probability": 0.0,
        },
        {
            "name": "Noisy channel",
            "noise_rate": 0.05,
            "eve_probability": 0.0,
        },
        {
            "name": "Eavesdropper",
            "noise_rate": 0.0,
            "eve_probability": 0.50,
        },
        {
            "name": "Noise + Eve",
            "noise_rate": 0.05,
            "eve_probability": 0.50,
        },
    ]

    for scenario in scenarios:
        print(f"\n=== {scenario['name']} ===")

        result = run_quantum_security(
            n_bits=100,
            noise_rate=scenario["noise_rate"],
            eve_probability=scenario["eve_probability"],
        )

        print(result)


if __name__ == "__main__":
    main()