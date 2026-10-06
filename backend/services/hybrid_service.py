from backend.services.decision_service import make_security_decision
from backend.services.qkd_service import run_quantum_security
from backend.services.threat_service import analyze_network_threat


def analyze_security(
    network_features: dict,
    n_bits: int = 100,
    trials: int = 10,
    noise_rate: float = 0.0,
    eve_probability: float = 0.0,
) -> dict:
    """
    Run the complete Q-Safe security pipeline.

    Classical side:
        Network features -> ML -> threat probability

    Quantum side:
        BB84 -> QBER -> expected QBER

    Final:
        Classical + quantum evidence -> security decision
    """

    # ---------------------------------------------------------
    # 1. Classical threat analysis
    # ---------------------------------------------------------

    threat_result = analyze_network_threat(
        network_features
    )

    threat_probability = float(
        threat_result["threat_probability"]
    )

    # ---------------------------------------------------------
    # 2. Quantum security analysis
    # ---------------------------------------------------------

    quantum_result = run_quantum_security(
        n_bits=n_bits,
        trials=trials,
        noise_rate=noise_rate,
        eve_probability=eve_probability,
    )

    # ---------------------------------------------------------
    # 3. Hybrid security decision
    # ---------------------------------------------------------

    decision_result = make_security_decision(
        threat_probability=threat_probability,
        qber=quantum_result["qber"],
        expected_qber=quantum_result["expected_qber"],
        quantum_attack_probability=(
            quantum_result["quantum_attack_probability"]
    ),
)
    # ---------------------------------------------------------
    # 4. Unified result
    # ---------------------------------------------------------

    return {
        "threat": threat_result,
        "quantum": quantum_result,
        "decision": decision_result,
    }