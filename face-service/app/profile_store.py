import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status

from app.config import settings
from app.schemas import ProfileRecord


def _profile_path(user_id: str) -> Path:
    return settings.profiles_dir / f"{user_id}.json"


def profile_exists(user_id: str) -> bool:
    return _profile_path(user_id).exists()


def save_profile(user_id: str, image: str) -> ProfileRecord:
    if profile_exists(user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El usuario ya tiene un perfil registrado.",
        )

    profile = ProfileRecord(
        user_id=user_id,
        image=image,
        embedding=[],
        created_at=datetime.now(timezone.utc),
    )

    profile_path = _profile_path(user_id)
    profile_path.write_text(
        json.dumps(profile.model_dump(mode="json"), indent=2, ensure_ascii=True),
        encoding="utf-8",
    )

    return profile


def load_profile(user_id: str) -> ProfileRecord | None:
    profile_path = _profile_path(user_id)
    if not profile_path.exists():
        return None

    profile_data = json.loads(profile_path.read_text(encoding="utf-8"))
    return ProfileRecord.model_validate(profile_data)


def list_profiles() -> list[ProfileRecord]:
    profiles: list[ProfileRecord] = []
    for profile_file in settings.profiles_dir.glob("*.json"):
        profile_data = json.loads(profile_file.read_text(encoding="utf-8"))
        profiles.append(ProfileRecord.model_validate(profile_data))

    return profiles
