from __future__ import annotations

from secrets import randbelow

from qiskit import QuantumCircuit


def random_bit() -> int:
    """Return a random bit: 0 or 1."""
    return randbelow(2)


def build_bb84_circuit_with_eve(
    alice_bit: int,
    alice_basis: int,
    eve_basis: int,
    bob_basis: int,
) -> QuantumCircuit:
    """
    Build one BB84 transmission with an intercept-and-resend Eve.

    c0 = Eve's measurement
    c1 = Bob's measurement

    basis:
        0 -> Z basis
        1 -> X basis
    """

    qc = QuantumCircuit(1, 2)

    # =========================================================
    # ALICE
    # =========================================================

    if alice_bit == 1:
        qc.x(0)

    if alice_basis == 1:
        qc.h(0)

    # =========================================================
    # PHYSICAL QUANTUM CHANNEL
    # =========================================================
    # This gate represents transmission from Alice toward Eve.
    # Our Aer noise model will attach channel noise to it.
    qc.id(0)

    # =========================================================
    # EVE INTERCEPTS
    # =========================================================

    # Eve chooses a random measurement basis.
    if eve_basis == 1:
        qc.h(0)

    # Eve measures.
    qc.measure(0, 0)

    # The original qubit is destroyed.
    qc.reset(0)

    # =========================================================
    # EVE PREPARES A FRESH QUBIT
    # =========================================================

    # If Eve measured 1, prepare |1>.
    with qc.if_test((qc.clbits[0], 1)):
        qc.x(0)

    # If Eve measured in X basis, prepare the X-basis state.
    if eve_basis == 1:
        qc.h(0)

    # =========================================================
    # SECOND CHANNEL LEG: EVE -> BOB
    # =========================================================
    # This represents Eve sending her replacement qubit to Bob.
    # It also experiences the configured channel noise.
    qc.id(0)

    # =========================================================
    # BOB
    # =========================================================

    if bob_basis == 1:
        qc.h(0)

    qc.measure(0, 1)

    return qc