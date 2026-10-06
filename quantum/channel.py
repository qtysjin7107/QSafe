from __future__ import annotations

from qiskit_aer.noise import NoiseModel, depolarizing_error


def create_depolarizing_channel(noise_rate: float) -> NoiseModel:
    """
    Create a single-qubit depolarizing noise model.

    noise_rate:
        Probability of a depolarizing error on each transmission.

        Example:
            0.00 -> ideal channel
            0.01 -> 1% depolarizing noise
            0.05 -> 5% depolarizing noise
    """

    if not 0.0 <= noise_rate <= 1.0:
        raise ValueError("noise_rate must be between 0 and 1")

    noise_model = NoiseModel()

    # Single-qubit depolarizing channel.
    error = depolarizing_error(
        noise_rate,
        1,
    )

    # We will use an explicit identity gate as the
    # "physical channel" between Alice and Bob.
    noise_model.add_all_qubit_quantum_error(
        error,
        ["id"],
    )

    return noise_model