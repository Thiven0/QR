import logging
from dataclasses import dataclass
from importlib import import_module
from typing import Any

import numpy as np
from fastapi import HTTPException, status

from app.config import settings


logger = logging.getLogger(__name__)


@dataclass(slots=True)
class FaceAnalysisResult:
    embedding: list[float]
    aligned_face: np.ndarray
    detection_score: float


class FaceService:
    def __init__(self) -> None:
        self._face_app: Any | None = None
        self._face_align_module: Any | None = None
        self._load_error: str | None = None

    def load_model(self) -> bool:
        if self._face_app is not None:
            return True

        try:
            face_analysis_module = import_module("insightface.app")
            self._face_align_module = import_module("insightface.utils.face_align")
            face_analysis = getattr(face_analysis_module, "FaceAnalysis")

            self._face_app = face_analysis(
                name=settings.face_model_name,
                root=str(settings.face_model_root),
                providers=["CPUExecutionProvider"],
            )
            self._face_app.prepare(
                ctx_id=-1,
                det_size=(settings.face_det_width, settings.face_det_height),
            )
            self._load_error = None
            logger.info("InsightFace model loaded: %s", settings.face_model_name)
            return True
        except Exception as exc:
            self._face_app = None
            self._face_align_module = None
            self._load_error = str(exc)
            logger.exception("Failed to load InsightFace model")
            return False

    def is_model_loaded(self) -> bool:
        return self._face_app is not None

    def get_load_error(self) -> str | None:
        return self._load_error

    def analyze_face(self, image: np.ndarray) -> FaceAnalysisResult:
        if not self.is_model_loaded() and not self.load_model():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="El modelo facial no esta disponible. Revise la instalacion de InsightFace y ONNX Runtime.",
            )

        assert self._face_app is not None
        faces = self._face_app.get(image)

        if len(faces) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No se detecto ningun rostro en la imagen.",
            )

        if len(faces) > 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Se detectaron multiples rostros. Debe haber exactamente un rostro.",
            )

        face = faces[0]
        aligned_face = self._face_align_module.norm_crop(image, landmark=face.kps)
        embedding = self._extract_embedding(face)

        return FaceAnalysisResult(
            embedding=embedding,
            aligned_face=aligned_face,
            detection_score=float(getattr(face, "det_score", 0.0)),
        )

    @staticmethod
    def _extract_embedding(face: Any) -> list[float]:
        embedding = getattr(face, "normed_embedding", None)
        if embedding is None:
            embedding = getattr(face, "embedding", None)

        if embedding is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible extraer el embedding facial.",
            )

        return np.asarray(embedding, dtype=np.float32).tolist()


face_service = FaceService()
