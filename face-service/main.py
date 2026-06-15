from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.face_utils import face_service
from app.image_processing import load_validated_source_image, preprocess_image
from app.schemas import (
    ExtractEmbeddingRequest,
    ExtractEmbeddingResponse,
    HealthResponse,
)
from app.validators import validate_and_decode_image


@asynccontextmanager
async def lifespan(_: FastAPI):
    face_service.load_model()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        model_loaded=face_service.is_model_loaded(),
        model_name=settings.face_model_name,
    )


@app.post("/extract-embedding", response_model=ExtractEmbeddingResponse, tags=["face"])
def extract_embedding(payload: ExtractEmbeddingRequest) -> ExtractEmbeddingResponse:
    image_bytes, _ = validate_and_decode_image(payload.image)
    source_image = load_validated_source_image(image_bytes)
    preprocess_image(source_image)
    analysis = face_service.analyze_face(source_image)

    return ExtractEmbeddingResponse(
        success=True,
        embedding=analysis.embedding,
        detection_score=analysis.detection_score,
        embedding_dimensions=len(analysis.embedding),
        message="Embedding facial extraido correctamente.",
    )
