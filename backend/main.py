from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router


app = FastAPI(
    title="Q-Safe API",
    description=(
        "Threat-aware quantum-secure communication "
        "backend for biomedical networks."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development only
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "q-safe",
    }