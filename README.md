# QSafe

### Threat-Aware Quantum-Secure Communication for Biomedical Networks

QSafe is a hybrid cybersecurity and quantum communication system that combines:

- NSL-KDD based network-threat analysis
- Classical normal-vs-attack classification
- BB84-style Quantum Key Distribution using Qiskit
- Quantum channel noise simulation
- Eavesdropping simulation
- Quantum Bit Error Rate (QBER) analysis
- Adaptive security decisions

## Core Workflow

NSL-KDD
→ Threat Classification
→ Threat Probability

Qiskit BB84
→ Channel Noise / Eavesdropping
→ QBER

Threat Probability + QBER + Channel Conditions
→ Adaptive Security Policy
→ ACCEPT / MONITOR / REJECT

## Project Structure

- `quantum/` - QKD, channel, eavesdropping and QBER logic
- `ml/` - NSL-KDD preprocessing and classification
- `decision/` - adaptive security policy
- `backend/` - FastAPI integration
- `frontend/` - web dashboard
- `data/` - local datasets and processed data
- `experiments/` - experiment outputs and figures
- `notebooks/` - research and development notebooks

## Hackathon Track

Track 2: Quantum Cryptography and Communication