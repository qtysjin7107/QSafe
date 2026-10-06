from __future__ import annotations

import io

import matplotlib
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

matplotlib.use("Agg")

from backend.services.decision_service import make_security_decision
from backend.services.qkd_service import run_quantum_security
from quantum.bb84 import build_bb84_circuit
from quantum.eve import build_bb84_circuit_with_eve


lab_router = APIRouter(prefix="/api")


class LiveLabRequest(BaseModel):
    noise_rate: float = Field(default=0.0, ge=0.0, le=0.20)
    eve_probability: float = Field(default=0.0, ge=0.0, le=1.0)
    threat_probability: float = Field(default=0.05, ge=0.0, le=1.0)
    n_bits: int = Field(default=200, ge=100, le=500)
    trials: int = Field(default=3, ge=1, le=5)


@lab_router.post("/lab/simulate")
def simulate_live_lab(request: LiveLabRequest):
    """Run one real Qiskit-backed hybrid experiment for the live lab."""
    try:
        quantum = run_quantum_security(
            n_bits=request.n_bits,
            trials=request.trials,
            noise_rate=request.noise_rate,
            eve_probability=request.eve_probability,
        )

        decision = make_security_decision(
            threat_probability=request.threat_probability,
            qber=quantum["qber"],
            expected_qber=quantum["expected_qber"],
            quantum_attack_probability=quantum["quantum_attack_probability"],
        )

        dashboard_data = {
            "threat_probability": float(request.threat_probability),
            "qber": float(quantum["qber"]),
            "channel_noise": float(request.noise_rate),
            "expected_qber": float(quantum["expected_qber"]),
            "quantum_attack_probability": float(
                quantum["quantum_attack_probability"]
            ),
            "eavesdropper_detected": bool(
                quantum["quantum_attack_probability"] >= 0.80
            ),
            "decision": decision["decision"],
            "reason": decision["reason"],
            "qkd": {
                "protocol": "BB84",
                "qubits_sent": int(request.n_bits * request.trials),
                "sifted_key_length": round(
                    float(quantum["mean_sifted_key_length"])
                ),
            },
        }

        return {
            "success": True,
            "inputs": {
                "noise_rate": float(request.noise_rate),
                "eve_probability": float(request.eve_probability),
                "threat_probability": float(request.threat_probability),
                "n_bits": int(request.n_bits),
                "trials": int(request.trials),
            },
            "quantum": quantum,
            "decision": decision,
            "data": dashboard_data,
        }

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Live quantum simulation failed: {error}",
        ) from error


@lab_router.get("/qiskit/circuit.svg")
def get_qiskit_circuit(
    eve: bool = Query(default=False),
):
    """Render the actual BB84 circuit used by the Q-Safe Qiskit implementation."""
    try:
        if eve:
            circuit = build_bb84_circuit_with_eve(
                alice_bit=1,
                alice_basis=1,
                eve_basis=0,
                bob_basis=1,
            )
        else:
            circuit = build_bb84_circuit(
                alice_bit=1,
                alice_basis=1,
                bob_basis=1,
            )

        figure = circuit.draw(output="mpl")

        buffer = io.BytesIO()
        figure.savefig(
            buffer,
            format="svg",
            bbox_inches="tight",
        )
        try:
            import matplotlib.pyplot as plt
            plt.close(figure)
        except Exception:
            figure.clear()

        return Response(
            content=buffer.getvalue(),
            media_type="image/svg+xml",
            headers={"Cache-Control": "no-store"},
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Qiskit circuit rendering failed: {error}",
        ) from error
