from decision.policy import evaluate_security


def make_security_decision(
    threat_probability: float,
    qber: float,
    expected_qber: float,
) -> dict:
    """
    Combine the classical network-threat signal
    with the quantum-channel security signal.
    """

    return evaluate_security(
        threat_probability=threat_probability,
        qber=qber,
        expected_qber=expected_qber,
    )