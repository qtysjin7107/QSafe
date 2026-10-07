"""
QSafe BB84 implementation.

Handles Alice/Bob basis selection,
quantum state preparation,
measurement, and key sifting.
"""
from __future__ import annotations

from dataclasses import dataclass
from secrets import randbelow
from typing import List

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

from .channel import create_depolarizing_channel
from .eve import build_bb84_circuit_with_eve


@dataclass
class BB84Result:
    alice_bits: List[int]
    alice_bases: List[int]
    bob_bases: List[int]
    bob_bits: List[int]
    sifted_alice_key: List[int]
    sifted_bob_key: List[int]
    qber: float


def random_bit() -> int:
    """Return a random bit: 0 or 1."""
    return randbelow(2)


def build_bb84_circuit(
    alice_bit: int,
    alice_basis: int,
    bob_basis: int,
) -> QuantumCircuit:
    """
    Build one normal BB84 transmission without Eve.
    """

    qc = QuantumCircuit(1, 1)

    # Alice
    if alice_bit == 1:
        qc.x(0)

    if alice_basis == 1:
        qc.h(0)

    # Physical channel
    qc.id(0)

    # Bob
    if bob_basis == 1:
        qc.h(0)
    qc.measure(0, 0)
    return qc


def run_bb84(
    n_bits: int = 100,
    noise_rate: float = 0.0,
    eve_probability: float = 0.0,
) -> BB84Result:
    """
    Run BB84 with optional channel noise and Eve.

    noise_rate:
        Ordinary channel noise.

    eve_probability:
        Probability that Eve intercepts a given qubit.

        0.0 -> no Eve
        0.1 -> Eve attacks 10% of qubits
        0.5 -> Eve attacks 50% of qubits
        1.0 -> Eve attacks every qubit
    """

    if n_bits <= 0:
        raise ValueError("n_bits must be greater than 0")

    if not 0.0 <= noise_rate <= 1.0:
        raise ValueError("noise_rate must be between 0 and 1")

    if not 0.0 <= eve_probability <= 1.0:
        raise ValueError("eve_probability must be between 0 and 1")

    noise_model = create_depolarizing_channel(
        noise_rate
    )

    simulator = AerSimulator(
        noise_model=noise_model
    )

    # =========================================================
    # RANDOM CHOICES
    # =========================================================

    alice_bits = [
        random_bit()
        for _ in range(n_bits)
    ]

    alice_bases = [
        random_bit()
        for _ in range(n_bits)
    ]

    bob_bases = [
        random_bit()
        for _ in range(n_bits)
    ]

    circuits = []

    # =========================================================
    # BUILD EACH TRANSMISSION
    # =========================================================

    for i in range(n_bits):

        # Does Eve attack this particular qubit?
        eve_attacks = (
            random_bit() == 1
            if eve_probability == 1.0
            else (
                randbelow(1_000_000) / 1_000_000
                < eve_probability
            )
        )

        if eve_attacks:

            eve_basis = random_bit()

            circuit = build_bb84_circuit_with_eve(
                alice_bit=alice_bits[i],
                alice_basis=alice_bases[i],
                eve_basis=eve_basis,
                bob_basis=bob_bases[i],
            )

        else:

            circuit = build_bb84_circuit(
                alice_bit=alice_bits[i],
                alice_basis=alice_bases[i],
                bob_basis=bob_bases[i],
            )

        circuits.append(circuit)

    # =========================================================
    # RUN ALL CIRCUITS
    # =========================================================

    result = simulator.run(
        circuits,
        shots=1,
    ).result()

    bob_bits = []

    for i in range(n_bits):

        counts = result.get_counts(i)

        measured_string = next(iter(counts.keys()))

        # For Eve circuits:
        #
        # c0 = Eve measurement
        # c1 = Bob measurement
        #
        # Qiskit displays the higher-index classical bit first,
        # so measured_string[0] is Bob's result.
        #
        # For normal circuits there is only one classical bit.
        if len(measured_string) == 2:
            bob_bit = int(measured_string[0])
        else:
            bob_bit = int(measured_string[0])

        bob_bits.append(bob_bit)

    # =========================================================
    # BASIS SIFTING
    # =========================================================

    sifted_alice_key = []
    sifted_bob_key = []

    for i in range(n_bits):

        if alice_bases[i] == bob_bases[i]:

            sifted_alice_key.append(
                alice_bits[i]
            )

            sifted_bob_key.append(
                bob_bits[i]
            )

    # =========================================================
    # QBER
    # =========================================================

    if len(sifted_alice_key) == 0:

        qber = 0.0

    else:

        errors = sum(
            a != b
            for a, b in zip(
                sifted_alice_key,
                sifted_bob_key,
            )
        )

        sifted_errors = sum(
            a != b
            for a, b in zip(
                sifted_alice_key,
                sifted_bob_key
            )
        )

        qber = (
            sifted_errors / len(sifted_alice_key)
            if sifted_alice_key
            else 0.0
        )

    return BB84Result(
        alice_bits=alice_bits,
        alice_bases=alice_bases,
        bob_bases=bob_bases,
        bob_bits=bob_bits,
        sifted_alice_key=sifted_alice_key,
        sifted_bob_key=sifted_bob_key,
        qber=qber,
    )


def run_eve_experiment():
    """
    Compare QBER at different Eve interception probabilities.

    Keep normal channel noise at zero so that we isolate
    the effect of eavesdropping.
    """

    eve_levels = [
        0.00,
        0.05,
        0.10,
        0.25,
        0.50,
        1.00,
    ]

    print("=" * 70)
    print("Q-SAFE — EAVESDROPPING EXPERIMENT")
    print("=" * 70)

    print()

    print(
        f"{'Eve Probability':<20}"
        f"{'Sifted Bits':<18}"
        f"{'QBER':<15}"
    )

    print("-" * 53)

    for eve_probability in eve_levels:

        result = run_bb84(
            n_bits=2000,
            noise_rate=0.0,
            eve_probability=eve_probability,
        )

        print(
            f"{eve_probability:<20.2%}"
            f"{len(result.sifted_alice_key):<18}"
            f"{result.qber:<15.4%}"
        )


if __name__ == "__main__":
    run_eve_experiment()