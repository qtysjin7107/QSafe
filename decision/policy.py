from dataclasses import dataclass


@dataclass
class PolicyConfig:
    # These are initial values.
    # We will calibrate them using the quantum experiments later.
    low_threat_threshold: float = 0.40
    high_threat_threshold: float = 0.70
    quantum_anomaly_threshold: float = 0.05


def evaluate_security(
    threat_probability: float,
    qber: float,
    expected_qber: float,
    config: PolicyConfig | None = None,
) -> dict:
    """
    Combine classical network threat information
    and quantum-channel information.

    threat_probability:
        P(network attack), between 0 and 1.

    qber:
        Observed Quantum Bit Error Rate.

    expected_qber:
        Expected QBER under the current channel conditions.
        This should eventually come from our quantum experiments.
    """

    if not 0.0 <= threat_probability <= 1.0:
        raise ValueError("threat_probability must be between 0 and 1.")

    if not 0.0 <= qber <= 1.0:
        raise ValueError("qber must be between 0 and 1.")

    if not 0.0 <= expected_qber <= 1.0:
        raise ValueError("expected_qber must be between 0 and 1.")

    if config is None:
        config = PolicyConfig()

    quantum_anomaly = max(0.0, qber - expected_qber)

    high_network_threat = (
        threat_probability >= config.high_threat_threshold
    )

    medium_network_threat = (
        threat_probability >= config.low_threat_threshold
    )

    quantum_anomaly_detected = (
        quantum_anomaly >= config.quantum_anomaly_threshold
    )

    if high_network_threat and quantum_anomaly_detected:
        decision = "REJECT"
        reason = (
            "High classical network threat combined with "
            "significant quantum-channel disturbance."
        )

    elif high_network_threat:
        decision = "MONITOR"
        reason = (
            "High probability of a classical network attack "
            "without significant quantum-channel anomaly."
        )

    elif quantum_anomaly_detected:
        decision = "MONITOR"
        reason = (
            "Quantum-channel disturbance is significantly "
            "higher than the expected channel behaviour."
        )

    elif medium_network_threat:
        decision = "MONITOR"
        reason = (
            "Moderate classical network threat detected."
        )

    else:
        decision = "ACCEPT"
        reason = "No significant classical or quantum anomaly detected."

    return {
        "decision": decision,
        "threat_probability": round(threat_probability, 6),
        "qber": round(qber, 6),
        "expected_qber": round(expected_qber, 6),
        "quantum_anomaly": round(quantum_anomaly, 6),
        "reason": reason,
    }