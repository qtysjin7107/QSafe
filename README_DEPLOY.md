# Q-Safe: Upload + Model Selector + Render Deployment Patch

## What this fixes

The upload failure is very likely caused by `python-multipart` not being installed in the main environment. Because FastAPI's `File()`/`Form()` route is imported when the application starts, the dependency belongs in the root `requirements.txt`, not only in an addon file.

This patch also removes the hard-coded production dependency on `http://localhost:8000` by making frontend API calls same-origin when Q-Safe is deployed as one FastAPI service.

The upload UI now:
- works by clicking the whole dropzone;
- supports drag and drop;
- supports selecting the same file again;
- reports the exact backend error;
- accepts NSL-KDD 41-column, 43-column, and 44-column-with-empty-trailing-field inputs;
- limits uploads to 25 MB and 250,000 rows;
- uses real model/simulator output rather than a dummy uploaded dataset.

## Three analysis modes

### Classical ML · LightGBM Threat Classifier

Requires an NSL-KDD-compatible upload.

Returns:
- row-level threat probability;
- predicted normal/attack counts;
- attack distribution;
- threat probability histogram;
- accuracy, precision, recall, F1 when labels are present;
- confusion matrix.

### QBER Model · Bayesian QBER Evidence Model

A network upload is not required.

Returns:
- QBER;
- expected QBER;
- Bayesian P(Eve);
- sifted-key length;
- fresh Qiskit QBER-vs-noise sweep;
- fresh Qiskit QBER-vs-Eve sweep.

### Hybrid Model · Q-Safe Fusion Engine

Requires an NSL-KDD-compatible upload.

Combines:
1. Classical LightGBM threat evidence.
2. Qiskit BB84/QBER evidence.
3. Existing Q-Safe decision policy.

Returns ACCEPT / MONITOR / REJECT plus the classical and quantum evidence.

## Copy these files

Copy these patch files into the matching paths of your real QSafe repository:

```text
frontend/app.js
frontend/index.html
frontend/style.css
frontend/channel-flow.js
frontend/ambient-field.js
frontend/dragon-theme.js
frontend/assets/*
backend/main.py
backend/api/upload_routes.py
backend/services/upload_analysis_service.py
```

The JS/theme files are included so the frontend package stays internally consistent.

## Root requirements.txt

Add:

```text
python-multipart
```

Keep your existing Qiskit, Aer, LightGBM, FastAPI, pandas and scikit-learn dependencies.

## Local run

From the QSafe repository root:

```powershell
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/
```

Health:

```text
http://127.0.0.1:8000/api/health
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

You can still use VS Code Live Server. The patched frontend automatically uses `127.0.0.1:8000` when it detects a local Live Server port.

For the most reliable test, use the FastAPI-served page at `127.0.0.1:8000/`.

## GitHub

From the actual QSafe repo:

```powershell
git status
git add .
git commit -m "feat: production upload pipeline and model selector"
git push origin main
```

If the remote does not exist:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Keep the trained model:

```text
models/threat_model_best.joblib
models/threat_model_info.json
```

Raw NSL-KDD files can remain ignored.

## Render architecture

Use one Render Web Service:

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

This avoids a separate frontend/backend origin in production.

The included `render.yaml` uses:

```text
Build:
pip install -r requirements.txt

Start:
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Health check:

```text
/api/health
```

Connect the Render service to your GitHub repository and the `main` branch. Render can automatically redeploy after pushes to the connected branch.

## Important data/model limitation

"Anyone can upload" must mean "anyone can upload a dataset compatible with the trained model."

The current LightGBM model is trained on the 41 NSL-KDD features and the categorical values present in its training metadata. An arbitrary cybersecurity CSV with different feature names/encodings cannot be meaningfully scored by the trained model without a schema-mapping or retraining step.

For the hackathon, present this clearly rather than pretending the uploader accepts arbitrary data.

## Why the original upload could fail

The most important blockers in the previous package were:

1. `python-multipart` was separated from the root runtime requirements.
2. The frontend had a hard-coded localhost API address, which breaks when the frontend is moved to Render.
3. The upload UI depended too much on a hidden input + inline click handler.
4. NSL-KDD variants with an empty trailing field could be parsed as 44 columns and rejected.
5. The original UI had duplicate `uploadNoise` inputs in one version.

This patch addresses all five.

## Note about Render Free

Render currently offers free Web Services, but they spin down after 15 minutes without inbound traffic and can take about a minute to wake up. Their local filesystem is ephemeral, so do not rely on runtime-uploaded files being preserved after restart/redeploy.

The model files committed in GitHub are part of the deploy and are available again after a restart. User-uploaded datasets should be treated as temporary processing inputs, not persistent storage.
