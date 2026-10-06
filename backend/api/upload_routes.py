from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.services.upload_analysis_service import analyze_uploaded_dataset

upload_router = APIRouter(prefix="/api")
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@upload_router.post("/upload/analyze")
async def upload_and_analyze(
    file: UploadFile | None = File(None),
    analysis_mode: str = Form("hybrid"),
    n_bits: int = Form(100),
    trials: int = Form(10),
    noise_rate: float = Form(0.0),
    eve_probability: float = Form(0.0),
):
    mode = (analysis_mode or "hybrid").strip().lower()

    if mode not in {"classical", "qber", "hybrid"}:
        raise HTTPException(
            status_code=400,
            detail="analysis_mode must be classical, qber, or hybrid."
        )

    if n_bits < 10 or n_bits > 5000:
        raise HTTPException(status_code=400, detail="n_bits must be between 10 and 5000.")

    if trials < 1 or trials > 50:
        raise HTTPException(status_code=400, detail="trials must be between 1 and 50.")

    if not 0.0 <= noise_rate <= 0.20:
        raise HTTPException(status_code=400, detail="noise_rate must be between 0 and 0.20.")

    if not 0.0 <= eve_probability <= 1.0:
        raise HTTPException(status_code=400, detail="eve_probability must be between 0 and 1.")

    if mode in {"classical", "hybrid"} and file is None:
        raise HTTPException(
            status_code=400,
            detail="Upload an NSL-KDD CSV/TXT file for this model."
        )

    try:
        content = None
        filename = None

        if file is not None:
            filename = file.filename
            content = await file.read()

            if len(content) > MAX_UPLOAD_BYTES:
                raise ValueError("Uploaded file is too large. Maximum size is 25 MB.")

        return analyze_uploaded_dataset(
            content,
            filename,
            analysis_mode=mode,
            n_bits=n_bits,
            trials=trials,
            noise_rate=noise_rate,
            eve_probability=eve_probability,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {error}",
        ) from error
