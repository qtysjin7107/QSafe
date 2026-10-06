# Q-Safe

### Threat-Aware Quantum-Secure Communication for Biomedical Networks

Q-Safe is a hybrid cybersecurity and quantum communication system designed for secure communication in biomedical networks. It combines classical network-threat intelligence with Qiskit-based quantum key distribution, QBER analysis, and an adaptive decision policy.

Q-Safe can operate in three analysis modes:

- **Classical ML — LightGBM Threat Classifier**
- **QBER Model — Bayesian QBER Evidence Model**
- **Hybrid Model — Q-Safe Fusion Engine**

The system produces quantitative evidence and an **ACCEPT / MONITOR / REJECT** security decision.

---

## Hackathon Track

**Track 2: Quantum Cryptography and Communication**

### Application Context

Biomedical networks are used only as the application context for the security system. The current classical threat model is trained on **NSL-KDD**, a network intrusion-detection dataset.

---

# Core Workflow

## Classical Security Layer

```text
NSL-KDD
   ↓
Preprocessing
   ↓
LightGBM Threat Classifier
   ↓
Threat Probability
   ↓
Normal / Attack
```

## Quantum Security Layer

```text
Qiskit BB84
   ↓
Channel Noise / Eavesdropping Simulation
   ↓
QBER Measurement
   ↓
Bayesian QBER Evidence Model
   ↓
P(Eve)
```

## Hybrid Security Layer

```text
Threat Probability
        +
QBER / Quantum Evidence
        +
Channel Conditions
        ↓
Q-Safe Adaptive Security Policy
        ↓
ACCEPT / MONITOR / REJECT
```

---

# Analysis Modes

## 1. Classical ML — LightGBM Threat Classifier

This mode analyzes an uploaded **NSL-KDD-compatible** network traffic dataset using the trained LightGBM model.

### Input

- NSL-KDD-compatible CSV/TXT file

### Output

- Row-level threat probability
- Predicted normal/attack counts
- Attack distribution
- Threat-probability histogram
- Accuracy, when labels are available
- Precision
- Recall
- F1-score
- Confusion matrix

The uploaded dataset is processed directly; results are not generated from dummy upload data.

---

## 2. QBER Model — Bayesian QBER Evidence Model

This mode analyzes the quantum communication channel and does not require a network dataset upload.

It uses the Q-Safe Qiskit BB84 implementation and repeated experiments to estimate QBER under channel noise and eavesdropping conditions.

### Inputs

- Channel noise rate
- Eve probability
- Number of qubits/bits per trial
- Number of trials

### Output

- Observed QBER
- Expected QBER
- QBER standard deviation
- Bayesian `P(Eve)`
- Honest-channel likelihood
- Attack likelihood
- Likelihood ratio
- Sifted-key length
- QBER-vs-noise analysis
- QBER-vs-Eve analysis

---

## 3. Hybrid Model — Q-Safe Fusion Engine

This is the main integrated Q-Safe workflow.

It combines:

1. Classical LightGBM network-threat evidence
2. Qiskit BB84/QBER evidence
3. The existing Q-Safe adaptive security policy

The final result contains:

- Network threat probability
- QBER
- Channel noise
- Quantum attack probability / `P(Eve)`
- Classical and quantum evidence
- Explainable decision reason
- **ACCEPT / MONITOR / REJECT**

### Concept

```text
                Uploaded Network Data
                         ↓
               LightGBM Classifier
                         ↓
                Network Threat P
                         │
                         │
                         ├───────────────┐
                         │               │
                         ▼               ▼
                                     Qiskit BB84
                                          ↓
                                        QBER
                                          ↓
                                 Bayesian QBER Model
                                          ↓
                                       P(Eve)
                         │               │
                         └───────┬───────┘
                                 ↓
                          Q-Safe Fusion
                                 ↓
                   ACCEPT / MONITOR / REJECT
```

---

# Project Structure

```text
QSafe/
│
├── quantum/
│   ├── bb84.py
│   ├── channel.py
│   ├── eve.py
│   ├── qber.py
│   ├── qber_model.py
│   ├── experiment_runner.py
│   ├── analyze_experiments.py
│   └── experiments/
│
├── ml/
│   ├── __init__.py
│   ├── preprocess.py
│   ├── train.py
│   ├── predict.py
│   ├── evaluate.py
│   ├── advanced_train.py
│   ├── benchmark_models.py
│   ├── audit_nsl_kdd.py
│   └── hyperparameter_search.py
│
├── decision/
│   └── policy.py
│
├── backend/
│   ├── main.py
│   ├── api/
│   │   ├── routes.py
│   │   └── upload_routes.py
│   └── services/
│       ├── qkd_service.py
│       ├── threat_service.py
│       ├── decision_service.py
│       ├── hybrid_service.py
│       ├── demo_service.py
│       └── upload_analysis_service.py
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── channel-flow.js
│   ├── dragon-theme.js
│   ├── ambient-field.js
│   └── assets/
│
├── models/
│   ├── threat_model_best.joblib
│   └── threat_model_info.json
│
├── data/
│   ├── raw/
│   └── processed/
│
├── experiments/
│   └── figures/
│
├── notebooks/
│
├── render.yaml
├── requirements.txt
├── README.md
└── .gitignore
```

---

# Upload System

The production upload interface supports:

- Clicking the complete upload drop zone
- Drag-and-drop
- Selecting the same file again
- Exact backend error reporting
- CSV and TXT files
- NSL-KDD 41-column format
- NSL-KDD 43-column format
- NSL-KDD 44-column format when the trailing field is empty

### Upload Limits

- Maximum file size: **25 MB**
- Maximum rows: **250,000**

Uploaded files are processed temporarily and are not intended to be stored permanently by the application.

---

# Data Compatibility

The phrase **"anyone can upload"** means anyone can upload a dataset compatible with the currently trained model.

The LightGBM model is trained on the **41 NSL-KDD model features** and the categorical-value metadata expected by that model.

An arbitrary cybersecurity CSV with unrelated feature names, encodings, or schema cannot be meaningfully scored without:

- a schema-mapping layer, or
- retraining / fine-tuning for that dataset.

For the current hackathon implementation, the uploader should therefore be described as accepting **NSL-KDD-compatible network traffic datasets**.

---

# Why the Upload Problem Happened

The previous upload implementation had several compatibility problems:

1. `python-multipart` was not guaranteed to be in the root runtime requirements.
2. The frontend depended on a hard-coded `http://localhost:8000` backend address.
3. The upload UI relied too heavily on a hidden file input and click handling.
4. Some NSL-KDD files could be interpreted as having an extra empty trailing column.
5. One earlier frontend version contained duplicate upload-noise controls.

The production patch addresses these issues.

---

# Requirements

Python **3.11** is recommended.

The project uses Qiskit, Qiskit Aer, FastAPI, pandas, NumPy, SciPy, scikit-learn, LightGBM, and related dependencies.

For FastAPI multipart file uploads, the root `requirements.txt` must contain:

```text
python-multipart
```

Keep the existing Qiskit, Aer, LightGBM, FastAPI, pandas and scikit-learn dependencies.

---

# Local Installation

From the QSafe repository root:

```powershell
pip install -r requirements.txt
```

Start the backend:

```powershell
python -m uvicorn backend.main:app --reload
```

Open the application:

```text
http://127.0.0.1:8000/
```

---

# API

## Health Check

```text
GET /api/health
```

Used to verify that the backend is running.

## Demo Security

```text
POST /api/demo
```

Runs the predefined Q-Safe demonstration scenarios.

## Full Hybrid Analysis

```text
POST /api/analyze
```

Runs the integrated threat + quantum + decision workflow.

## Threat Analysis

```text
POST /api/threat
```

Runs the classical threat model.

## Security Evaluation

```text
POST /api/security
```

Evaluates the security decision policy.

## Dataset Upload Analysis

```text
POST /api/upload/analyze
```

Processes an uploaded NSL-KDD-compatible dataset and returns analysis results.

---

# Swagger API Documentation

FastAPI automatically exposes interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

OpenAPI JSON:

```text
http://127.0.0.1:8000/openapi.json
```

Swagger is intended for API testing and development. The normal user-facing interface is the Q-Safe frontend.

---

# Running the Frontend Separately

The production frontend is designed to work with the FastAPI backend.

You may also use VS Code Live Server during local development. The frontend can detect the local development setup and communicate with the backend at:

```text
http://127.0.0.1:8000
```

For the most reliable end-to-end test, use the FastAPI-served page:

```text
http://127.0.0.1:8000/
```

This is also the preferred architecture for deployment.

---

# GitHub

From the real QSafe repository:

```powershell
git status
git add .
git commit -m "feat: production upload pipeline and model selector"
git push origin main
```

If the repository does not have a remote yet:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Model Files

Keep the trained model files in GitHub:

```text
models/threat_model_best.joblib
models/threat_model_info.json
```

The raw NSL-KDD datasets should remain ignored by Git.

Do not commit user-uploaded datasets.

---

# Render Deployment

Q-Safe is designed to run as a **single Render Web Service**.

```text
Browser
   |
   v
Render HTTPS URL
   |
   +--> FastAPI API
   |
   +--> Static frontend
```

This avoids having separate frontend and backend origins in production.

## Render Build Command

```text
pip install -r requirements.txt
```

## Render Start Command

```text
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Render Health Check

```text
/api/health
```

The repository includes a `render.yaml` configuration for this deployment architecture.

Connect the Render service to the GitHub repository and the `main` branch. Pushes to the connected branch can then trigger new deployments.

---

# Render Free-Tier Considerations

The free Render Web Service is suitable for a hackathon/demo deployment.

Free services can spin down after inactivity and may take time to wake when a new request arrives.

The runtime filesystem is ephemeral, so uploaded datasets should be treated as temporary processing inputs and should not be relied upon as permanent storage.

The trained model files committed to GitHub are part of the deployment and are restored when the service is rebuilt.

---

# Research Positioning

Q-Safe is not positioned as a claim of quantum advantage.

The primary contribution is the **hybrid, threat-aware interpretation of security evidence across classical and quantum layers**.

### Research Questions

**RQ1.** Can classical network-threat probability improve the interpretation of abnormal QBER?

**RQ2.** Can noise-aware QBER analysis reduce false alarms caused by legitimate channel noise?

**RQ3.** Does combining classical network evidence with quantum-channel evidence produce more informative security decisions than either layer alone?

### Proposed Research Contribution

> Q-Safe proposes a cross-layer threat-aware security framework that fuses classical network threat probability with noise-aware quantum-channel evidence to support adaptive security decisions in biomedical communication networks.

---

# Demonstration Scenarios

The Q-Safe frontend supports security demonstrations such as:

- Normal
- Noisy Channel
- Network Attack
- Eavesdropper
- Combined Attack

The visual communication channel can react to the decision state:

```text
ACCEPT  → stable / straight channel
MONITOR → warning / wavy channel
REJECT  → critical / chaotic channel
```

The Dragon Guardian theme can provide a visual interpretation:

```text
ACCEPT  → calm
MONITOR → irritated
REJECT  → furious / fire
```

The underlying security result remains generated by the backend.

---

# Security Decision

The adaptive policy produces one of three outcomes:

### ACCEPT

The available classical and quantum evidence indicates a sufficiently safe channel.

### MONITOR

Evidence is elevated or ambiguous and the connection should be monitored.

### REJECT

The evidence indicates a likely security compromise or sufficiently strong quantum-channel attack evidence.

---

# Important Notes

- NSL-KDD is a network intrusion dataset, not healthcare-specific patient data.
- Biomedical networks are the application context for the communication-security problem.
- QBER results are generated from Qiskit BB84 experiments and the Q-Safe Bayesian evidence model.
- The `eve_probability` value used in QKD simulation is a simulation control, not ground-truth knowledge given to the Bayesian detector.
- Uploaded datasets are temporary inputs and should not be treated as persistent storage.
- The current classifier requires an NSL-KDD-compatible schema.

---

# Status

Q-Safe currently contains:

- Classical NSL-KDD threat classification
- LightGBM-based prediction
- Qiskit BB84 simulation
- Quantum channel noise simulation
- Eavesdropping simulation
- QBER measurement
- Bayesian QBER evidence analysis
- Adaptive ACCEPT / MONITOR / REJECT policy
- Hybrid security analysis
- FastAPI backend
- Interactive web dashboard
- Dataset upload pipeline
- Three analysis modes
- Render deployment configuration

---

# License

Add your chosen project license here before public release.
