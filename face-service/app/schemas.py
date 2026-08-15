from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    model_loaded: bool
    model_name: str


class EnrollRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=120)
    image: str = Field(min_length=1)

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, value: str) -> str:
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("user_id no puede estar vacio")

        return normalized_value


class IdentifyRequest(BaseModel):
    image: str = Field(min_length=1)


class ExtractEmbeddingRequest(BaseModel):
    image: str = Field(min_length=1)


class EnrollResponse(BaseModel):
    success: bool
    user_id: str
    message: str


class IdentifyResponse(BaseModel):
    match: bool
    user_id: str | None
    score: float | None
    threshold: float
    message: str


class ProfileRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    image: str
    embedding: list[float] = Field(default_factory=list)
    created_at: datetime


class ExtractionTimings(BaseModel):
    base64_decode_ms: float
    image_decode_validation_ms: float
    face_analysis_ms: float
    total_ms: float


class ExtractEmbeddingResponse(BaseModel):
    success: bool
    embedding: list[float]
    detection_score: float
    embedding_dimensions: int
    timings: ExtractionTimings
    message: str
