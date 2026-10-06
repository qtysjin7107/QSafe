from dataclasses import dataclass


@dataclass
class PolicyConfig:
    low_threat_threshold: float = 0.40
    high_threat_threshold: float = 0.70

    low_quantum_threat_threshold: float = 0.40
    high_quantum_threat_threshold: float = 0.80


def evaluate_security(
    threat_probability: float,
    qber: float,
    expected_qber: float,
    quantum_attack_probability: float | None = None,
    config: PolicyConfig | None = None,
) -> dict:

    if not 0.0 <= threat_probability <= 1.0:
        raise ValueError(
            "threat_probability must be between 0 and 1."
        )

    if not 0.0 <= qber <= 1.0:
        raise ValueError(
            "qber must be between 0 and 1."
        )

    if not 0.0 <= expected_qber <= 1.0:
        raise ValueError(
            "expected_qber must be between 0 and 1."
        )

    if quantum_attack_probability is not None:
        if not 0.0 <= quantum_attack_probability <= 1.0:
            raise ValueError(
                "quantum_attack_probability must be between 0 and 1."
            )

    if config is None:
        config = PolicyConfig()

    quantum_anomaly = max(
        0.0,
        qber - expected_qber
    )

    high_network_threat = (
        threat_probability >= config.high_threat_threshold
    )

    medium_network_threat = (
        threat_probability >= config.low_threat_threshold
    )

    if quantum_attack_probability is not None:
        high_quantum_threat = (
            quantum_attack_probability
            >= config.high_quantum_threat_threshold
        )

        medium_quantum_threat = (
            quantum_attack_probability
            >= config.low_quantum_threat_threshold
        )
    else:
        high_quantum_threat = False
        medium_quantum_threat = quantum_anomaly >= 0.05

    if high_network_threat and high_quantum_threat:
        decision = "REJECT"

        reason = (
            "High classical network threat combined with "
            "high quantum-channel attack probability."
        )

    elif high_network_threat:
        decision = "MONITOR"

        reason = (
            "High probability of a classical network attack "
            "without strong quantum attack evidence."
        )

    elif high_quantum_threat:
        decision = "REJECT"

        reason = (
            "Strong statistical evidence of a quantum-channel "
            "eavesdropping threat."
        )

    elif medium_network_threat and medium_quantum_threat:
        decision = "MONITOR"

        reason = (
            "Both classical and quantum security indicators "
            "show moderate risk."
        )

    elif medium_quantum_threat:
        decision = "MONITOR"

        reason = (
            "Elevated quantum-channel security risk detected."
        )

    elif medium_network_threat:
        decision = "MONITOR"

        reason = (
            "Moderate classical network threat detected."
        )

    else:
        decision = "ACCEPT"

        reason = (
            "No significant classical or quantum threat detected."
        )

    return {
        "decision": decision,
        "threat_probability": round(
            threat_probability,
            6
        ),
        "qber": round(
            qber,
            6
        ),
        "expected_qber": round(
            expected_qber,
            6
        ),
        "quantum_anomaly": round(
            quantum_anomaly,
            6
        ),
        "quantum_attack_probability": (
            round(
                quantum_attack_probability,
                6
            )
            if quantum_attack_probability is not None
            else None
        ),
        "reason": reason,
    }