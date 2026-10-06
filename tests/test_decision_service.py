from backend.services.decision_service import make_security_decision


def main():
    scenarios = [
        {
            "name": "Normal",
            "threat_probability": 0.10,
            "qber": 0.03,
            "expected_qber": 0.03,
        },
        {
            "name": "Classical attack",
            "threat_probability": 0.90,
            "qber": 0.03,
            "expected_qber": 0.03,
        },
        {
            "name": "Quantum anomaly",
            "threat_probability": 0.10,
            "qber": 0.12,
            "expected_qber": 0.03,
        },
        {
            "name": "Combined threat",
            "threat_probability": 0.90,
            "qber": 0.15,
            "expected_qber": 0.03,
        },
    ]

    for scenario in scenarios:
        result = make_security_decision(
            threat_probability=scenario["threat_probability"],
            qber=scenario["qber"],
            expected_qber=scenario["expected_qber"],
        )

        print(f"\n{scenario['name']}")
        print(result)


if __name__ == "__main__":
    main()