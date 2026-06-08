import base64
import binascii

from fastapi import HTTPException, status

from app.config import settings


JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _strip_data_url_prefix(image_data: str) -> str:
    if image_data.startswith("data:") and "," in image_data:
        return image_data.split(",", 1)[1]

    return image_data


def _detect_image_format(image_bytes: bytes) -> str:
    if image_bytes.startswith(JPEG_MAGIC):
        return "jpeg"

    if image_bytes.startswith(PNG_MAGIC):
        return "png"

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Formato no soportado. Use JPEG o PNG.",
    )


def validate_and_decode_image(image_data: str) -> tuple[bytes, str]:
    if not image_data or not image_data.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La imagen no puede estar vacia.",
        )

    raw_data = _strip_data_url_prefix(image_data.strip())

    try:
        image_bytes = base64.b64decode(raw_data, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Imagen en base64 invalida.",
        ) from exc

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La imagen no puede estar vacia.",
        )

    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"La imagen excede el tamano maximo de {settings.max_image_size_mb} MB.",
        )

    image_format = _detect_image_format(image_bytes)
    return image_bytes, image_format
