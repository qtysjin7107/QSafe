"""
Draw the QSafe BB84 circuits.

Run from the repository root:

    python draw_circuits.py

Prints each circuit as text in the terminal and saves a PNG into docs/.
If the PNG step fails, run:  pip install pylatexenc
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # save to file without needing a display

from quantum.bb84 import build_bb84_circuit
from quantum.eve import build_bb84_circuit_with_eve

OUT = Path("docs")
OUT.mkdir(exist_ok=True)

# Chosen so every gate shows up: bit = 1, both bases = X (1).
# Change eve_basis to 0 to see which Eve gates disappear.
circuits = {
    "bb84_honest": build_bb84_circuit(
        alice_bit=1, alice_basis=1, bob_basis=1
    ),
    "bb84_with_eve": build_bb84_circuit_with_eve(
        alice_bit=1, alice_basis=1, eve_basis=1, bob_basis=1
    ),
}

for name, qc in circuits.items():
    print(f"\n=== {name} ===")
    print(qc.draw(output="text", fold=-1))

    try:
        path = OUT / f"{name}.png"
        qc.draw(output="mpl", filename=str(path))
        print(f"saved {path}")
    except Exception as exc:
        print(f"(PNG skipped: {exc})")