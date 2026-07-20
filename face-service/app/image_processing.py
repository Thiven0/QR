import cv2
import numpy as np
from fastapi import HTTPException, status

from app.config import settings


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Imagen invalida o corrupta.",
        )

    return image


def validate_image_dimensions(image: np.ndarray) -> tuple[int, int]:
    height, width = image.shape[:2]
    if width < settings.min_image_width or height < settings.min_image_height:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "La imagen es demasiado pequena. "
                f"Minimo requerido: {settings.min_image_width}x{settings.min_image_height}."
            ),
        )

    return width, height


def preprocess_image(image: np.ndarray) -> np.ndarray:
    # Estandariza el formato para las siguientes iteraciones de deteccion facial.
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    normalized_image = cv2.equalizeHist(cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY))

    return normalized_image


def validate_and_preprocess_image(image_bytes: bytes) -> None:
    image = decode_image_bytes(image_bytes)
    validate_image_dimensions(image)
    preprocess_image(image)


def load_validated_source_image(image_bytes: bytes) -> np.ndarray:
    image = decode_image_bytes(image_bytes)
    validate_image_dimensions(image)
    return image
