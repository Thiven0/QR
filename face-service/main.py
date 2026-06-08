from fastapi import FastAPI

from app.config import settings
from app.profile_store import save_profile
from app.schemas import (
    EnrollRequest,
    EnrollResponse,
    HealthResponse,
    IdentifyRequest,
    IdentifyResponse,
)
from app.validators import validate_and_decode_image


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        model_loaded=False,
    )


@app.post("/enroll", response_model=EnrollResponse, tags=["profiles"])
def enroll_profile(payload: EnrollRequest) -> EnrollResponse:
    validate_and_decode_image(payload.image)
    profile = save_profile(payload.user_id.strip(), payload.image.strip())

    return EnrollResponse(
        success=True,
        user_id=profile.user_id,
        message="Perfil almacenado correctamente.",
    )


@app.post("/identify", response_model=IdentifyResponse, tags=["profiles"])
def identify_profile(payload: IdentifyRequest) -> IdentifyResponse:
    validate_and_decode_image(payload.image)

    return IdentifyResponse(
        match=False,
        user_id=None,
        score=None,
        threshold=settings.face_threshold,
        message="Identificacion no disponible todavia. Se habilitara en la iteracion 5.",
    )
