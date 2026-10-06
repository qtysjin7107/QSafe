from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.threat_service import analyze_network_threat
from backend.services.decision_service import make_security_decision
from backend.services.hybrid_service import analyze_security
from backend.services.demo_service import run_demo

router = APIRouter(
    prefix="/api",
)


class NetworkFeatures(BaseModel):
    duration: int
    protocol_type: str
    service: str
    flag: str
    src_bytes: int
    dst_bytes: int
    land: int
    wrong_fragment: int
    urgent: int
    hot: int
    num_failed_logins: int
    logged_in: int
    num_compromised: int
    root_shell: int
    su_attempted: int
    num_root: int
    num_file_creations: int
    num_shells: int
    num_access_files: int
    num_outbound_cmds: int
    is_host_login: int
    is_guest_login: int
    count: int
    srv_count: int
    serror_rate: float
    srv_serror_rate: float
    rerror_rate: float
    srv_rerror_rate: float
    same_srv_rate: float
    diff_srv_rate: float
    srv_diff_host_rate: float
    dst_host_count: int
    dst_host_srv_count: int
    dst_host_same_srv_rate: float
    dst_host_diff_srv_rate: float
    dst_host_same_src_port_rate: float
    dst_host_srv_diff_host_rate: float
    dst_host_serror_rate: float
    dst_host_srv_serror_rate: float
    dst_host_rerror_rate: float
    dst_host_srv_rerror_rate: float


class ThreatRequest(BaseModel):
    network_features: NetworkFeatures


class SecurityRequest(BaseModel):
    threat_probability: float = Field(
        ge=0.0,
        le=1.0,
    )
    qber: float = Field(
        ge=0.0,
        le=1.0,
    )
    expected_qber: float = Field(
        ge=0.0,
        le=1.0,
    )
class DemoRequest(BaseModel):
    mode: str

    n_bits: int = Field(
        default=100,
        ge=10,
        le=10000,
    )

    trials: int = Field(
        default=10,
        ge=1,
        le=100,
    )

@router.post("/demo")
def demo_security(request: DemoRequest):
    try:
        return run_demo(
            mode=request.mode,
            n_bits=request.n_bits,
            trials=request.trials,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )
    
class AnalyzeRequest(BaseModel):
    network_features: NetworkFeatures

    n_bits: int = Field(
        default=100,
        ge=10,
        le=10000,
    )

    trials: int = Field(
        default=10,
        ge=1,
        le=100,
    )

    noise_rate: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    eve_probability: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

@router.post("/analyze")
def analyze_security_endpoint(request: AnalyzeRequest):
    try:
        return analyze_security(
            network_features=request.network_features.model_dump(),
            n_bits=request.n_bits,
            noise_rate=request.noise_rate,
            eve_probability=request.eve_probability,
        )
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    
@router.post("/threat")
def analyze_threat(request: ThreatRequest):
    try:
        return analyze_network_threat(
            request.network_features.model_dump()
        )
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


@router.post("/security")
def evaluate_security(request: SecurityRequest):
    try:
        return make_security_decision(
            threat_probability=request.threat_probability,
            qber=request.qber,
            expected_qber=request.expected_qber,
        )
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )