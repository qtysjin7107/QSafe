from decision.policy import evaluate_security


def make_security_decision(
    threat_probability: float,
    qber: float,
    expected_qber: float,
    quantum_attack_probability: float | None = None,
) -> dict:
    """
    Combine classical network-threat evidence
    with quantum-channel evidence.
    """

    return evaluate_security(
        threat_probability=threat_probability,
        qber=qber,
        expected_qber=expected_qber,
        quantum_attack_probability=(
            quantum_attack_probability
        ),
    )