#!/usr/bin/env python3
"""Generate a standalone HTML analysis of face embeddings stored in MongoDB."""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import io
import json
import math
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlsplit, urlunsplit

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pymongo
import sklearn
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE


SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parents[1]
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "output"
DEFAULT_MONGO_URI = "mongodb://localhost:27017/universidad"
EMBEDDING_SOURCES = {"users", "profiles", "probes", "evaluation"}
ALL_SOURCES = sorted(EMBEDDING_SOURCES | {"recognition-logs"})
SOURCE_LABELS = {
    "users": "Usuarios de produccion",
    "profiles": "Perfiles enrolados de evaluacion",
    "probes": "Probes de evaluacion",
    "evaluation": "Perfiles y probes de evaluacion",
    "recognition-logs": "Logs operativos de reconocimiento",
}
PLOT_COLORS = [
    "#00594e",
    "#0ea5e9",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
    "#ec4899",
    "#64748b",
    "#84cc16",
    "#06b6d4",
    "#a855f7",
]


def env_value(name: str, default: Any = None) -> Any:
    return os.getenv(f"npm_config_{name}", default)


def env_int(name: str, default: int) -> int:
    value = env_value(name)
    return int(value) if value not in (None, "") else default


def env_float(name: str, default: float) -> float:
    value = env_value(name)
    return float(value) if value not in (None, "") else default


def env_bool(name: str) -> bool:
    value = str(env_value(name, "")).strip().lower()
    if value in {"", "0", "false", "no", "off"}:
        return False
    if value in {"1", "true", "yes", "on"}:
        return True
    raise ValueError(f"npm_config_{name} debe ser true o false")


def parse_bool(value: str | bool) -> bool:
    if isinstance(value, bool):
        return value
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise argparse.ArgumentTypeError("debe ser true o false")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Genera graficas PCA/t-SNE y estadisticas desde embeddings en MongoDB."
    )
    parser.add_argument("--source", choices=ALL_SOURCES, default=env_value("source", "users"))
    parser.add_argument("--run-id", default=env_value("run_id"), help="Run requerido para profiles, probes o evaluation.")
    parser.add_argument("--mongo-uri", default=env_value("mongo_uri"), help="Sobrescribe MONGODB_URI.")
    parser.add_argument("--database", default=env_value("database"), help="Nombre de base si la URI no lo incluye.")
    parser.add_argument("--output", default=env_value("output"), help="Ruta del HTML de salida.")
    parser.add_argument("--max-samples", type=int, default=env_int("max_samples", 1000))
    parser.add_argument("--random-state", type=int, default=env_int("random_state", 42))
    parser.add_argument("--tsne-perplexity", type=float, default=env_float("tsne_perplexity", 30.0))
    parser.add_argument("--top-dimensions", type=int, default=env_int("top_dimensions", 24))
    parser.add_argument(
        "--color-by",
        choices=["category", "kind", "result"],
        default=env_value("color_by", "category"),
    )
    parser.add_argument(
        "--skip-tsne",
        nargs="?",
        const=True,
        type=parse_bool,
        default=env_bool("skip_tsne"),
    )
    parser.add_argument("--start-date", default=env_value("start_date"), help="ISO date para recognition-logs.")
    parser.add_argument("--end-date", default=env_value("end_date"), help="ISO date para recognition-logs.")
    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if args.source not in ALL_SOURCES:
        raise ValueError(f"--source invalido: {args.source}")
    if args.color_by not in {"category", "kind", "result"}:
        raise ValueError(f"--color-by invalido: {args.color_by}")
    if args.max_samples < 2:
        raise ValueError("--max-samples debe ser mayor o igual a 2")
    if args.top_dimensions < 2:
        raise ValueError("--top-dimensions debe ser mayor o igual a 2")
    if not math.isfinite(args.tsne_perplexity) or args.tsne_perplexity <= 0:
        raise ValueError("--tsne-perplexity debe ser mayor que 0")
    if args.source in {"profiles", "probes", "evaluation"} and not args.run_id:
        raise ValueError(f"--run-id es obligatorio para source={args.source}")


def parse_iso_date(value: str | None, *, end_of_day: bool = False) -> datetime | None:
    if not value:
        return None
    normalized = value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    if end_of_day and len(value.strip()) == 10:
        parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
    return parsed.astimezone(timezone.utc)


def mask_mongo_uri(uri: str) -> str:
    try:
        parsed = urlsplit(uri)
        host = parsed.hostname or "localhost"
        if parsed.port:
            host = f"{host}:{parsed.port}"
        if parsed.username or parsed.password:
            host = f"****:****@{host}"
        return urlunsplit((parsed.scheme, host, parsed.path, parsed.query, parsed.fragment))
    except ValueError:
        return "mongodb://****"


def get_database(client: MongoClient, uri: str, database_name: str | None):
    if database_name:
        return client[database_name]
    database = client.get_default_database()
    if database is None:
        raise ValueError("La URI no incluye base de datos; usa --database")
    return database


def normalize_embedding(raw: Any) -> list[float]:
    if not isinstance(raw, list):
        return []
    values: list[float] = []
    for value in raw:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return []
        if not math.isfinite(number):
            return []
        values.append(number)
    return values


def full_name(document: dict[str, Any]) -> str:
    name = " ".join(
        str(document.get(key) or "").strip() for key in ("nombre", "apellido")
    ).strip()
    return name or str(document.get("_id") or "Sin identificador")


def sample_documents(collection, query, projection, limit: int, random_state: int):
    total = collection.count_documents(query)
    selected_query = query
    if total > limit:
        ids = [doc["_id"] for doc in collection.find(query, {"_id": 1}).sort("_id", 1)]
        rng = np.random.default_rng(random_state)
        selected_indices = np.sort(rng.choice(len(ids), size=limit, replace=False))
        selected_ids = [ids[int(index)] for index in selected_indices]
        selected_query = {"$and": [query, {"_id": {"$in": selected_ids}}]}
    documents = list(collection.find(selected_query, projection).sort("_id", 1).limit(limit))
    return documents, total


def load_users(database, limit: int, random_state: int) -> tuple[list[dict[str, Any]], int]:
    query = {
        "faceRegistered": True,
        "faceDescriptor": {"$exists": True, "$type": "array", "$ne": []},
    }
    projection = {
        "faceDescriptor": 1,
        "nombre": 1,
        "apellido": 1,
        "email": 1,
        "cedula": 1,
        "rolAcademico": 1,
        "facultad": 1,
        "estado": 1,
        "faceRegistered": 1,
        "faceDescriptorUpdatedAt": 1,
    }
    documents, total = sample_documents(database.users, query, projection, limit, random_state)
    items = []
    for doc in documents:
        items.append(
            {
                "id": str(doc["_id"]),
                "label": full_name(doc),
                "category": str(doc.get("rolAcademico") or "Sin rol"),
                "kind": "user",
                "result": str(doc.get("estado") or "sin estado"),
                "embedding": normalize_embedding(doc.get("faceDescriptor")),
                "detection_score": None,
                "detail": " | ".join(
                    str(value)
                    for value in (doc.get("email"), doc.get("cedula"), doc.get("facultad"))
                    if value
                ),
            }
        )
    return items, total


def probe_result(doc: dict[str, Any]) -> str:
    if not doc.get("isKnown"):
        return "impostor"
    top1_identity = str((doc.get("top1") or {}).get("identity") or "")
    return "top1-correcto" if top1_identity == str(doc.get("identity") or "") else "top1-incorrecto"


def load_profiles(
    database, run_id: str, limit: int, random_state: int
) -> tuple[list[dict[str, Any]], int]:
    query = {
        "runId": run_id,
        "status": "ready",
        "embedding": {"$exists": True, "$type": "array", "$ne": []},
    }
    projection = {
        "identity": 1,
        "email": 1,
        "embedding": 1,
        "embeddingDimensions": 1,
        "detectionScore": 1,
        "preparedFile": 1,
    }
    collection = database.face_evaluation_profiles
    documents, total = sample_documents(collection, query, projection, limit, random_state)
    items = []
    for doc in documents:
        identity = str(doc.get("identity") or doc["_id"])
        items.append(
            {
                "id": str(doc["_id"]),
                "label": identity,
                "category": identity,
                "kind": "profile",
                "result": "profile",
                "embedding": normalize_embedding(doc.get("embedding")),
                "detection_score": doc.get("detectionScore"),
                "detail": str(doc.get("email") or doc.get("preparedFile") or ""),
            }
        )
    return items, total


def load_probes(
    database, run_id: str, limit: int, random_state: int
) -> tuple[list[dict[str, Any]], int]:
    query = {
        "runId": run_id,
        "status": "completed",
        "embedding": {"$exists": True, "$type": "array", "$ne": []},
    }
    projection = {
        "probeKey": 1,
        "identity": 1,
        "isKnown": 1,
        "embedding": 1,
        "embeddingDimensions": 1,
        "detectionScore": 1,
        "top1": 1,
        "top2": 1,
        "top1Top2Margin": 1,
        "expectedIdentityRank": 1,
    }
    collection = database.face_evaluation_probes
    documents, total = sample_documents(collection, query, projection, limit, random_state)
    items = []
    for doc in documents:
        identity = str(doc.get("identity") or "Sin identidad")
        top1 = doc.get("top1") or {}
        items.append(
            {
                "id": str(doc["_id"]),
                "label": str(doc.get("probeKey") or doc["_id"]),
                "category": identity,
                "kind": "probe-known" if doc.get("isKnown") else "probe-impostor",
                "result": probe_result(doc),
                "embedding": normalize_embedding(doc.get("embedding")),
                "detection_score": doc.get("detectionScore"),
                "top1_score": top1.get("score"),
                "top1_identity": top1.get("identity"),
                "margin": doc.get("top1Top2Margin"),
                "detail": f"top1={top1.get('identity') or '-'} | rank esperado={doc.get('expectedIdentityRank') or '-'}",
            }
        )
    return items, total


def deterministic_sample(
    items: list[dict[str, Any]], max_samples: int, random_state: int
) -> list[dict[str, Any]]:
    if len(items) <= max_samples:
        return items
    rng = np.random.default_rng(random_state)
    selected = np.sort(rng.choice(len(items), size=max_samples, replace=False))
    return [items[int(index)] for index in selected]


def load_embedding_items(database, args: argparse.Namespace):
    source_totals: dict[str, int] = {}
    if args.source == "users":
        items, total = load_users(database, args.max_samples, args.random_state)
        source_totals["users"] = total
    elif args.source == "profiles":
        items, total = load_profiles(database, args.run_id, args.max_samples, args.random_state)
        source_totals["profiles"] = total
    elif args.source == "probes":
        items, total = load_probes(database, args.run_id, args.max_samples, args.random_state)
        source_totals["probes"] = total
    else:
        profile_quota = max(1, args.max_samples // 2)
        profiles, profile_total = load_profiles(database, args.run_id, profile_quota, args.random_state)
        probe_quota = max(1, args.max_samples - len(profiles))
        probes, probe_total = load_probes(database, args.run_id, probe_quota, args.random_state + 1)
        if len(profiles) + len(probes) < args.max_samples and profile_total > len(profiles):
            remaining = args.max_samples - len(probes)
            profiles, profile_total = load_profiles(database, args.run_id, remaining, args.random_state)
        items = profiles + probes
        source_totals = {"profiles": profile_total, "probes": probe_total}
    return items, source_totals


def dominant_dimension(items: Iterable[dict[str, Any]]) -> int:
    counts = Counter(len(item["embedding"]) for item in items if item["embedding"])
    if not counts:
        return 0
    return int(counts.most_common(1)[0][0])


def prepare_embedding_matrix(items: list[dict[str, Any]]):
    nonzero_items = [
        item
        for item in items
        if item["embedding"] and np.linalg.norm(np.asarray(item["embedding"], dtype=np.float64)) > np.finfo(np.float64).eps
    ]
    dimension = dominant_dimension(nonzero_items)
    accepted = [item for item in nonzero_items if len(item["embedding"]) == dimension]
    accepted_ids = {id(item) for item in accepted}
    rejected = [item for item in items if id(item) not in accepted_ids]
    if dimension < 2 or len(accepted) < 2:
        raise ValueError("Se requieren al menos dos embeddings validos con la misma dimension")
    matrix = np.asarray([item["embedding"] for item in accepted], dtype=np.float64)
    return accepted, rejected, matrix, dimension


def compute_pca(matrix: np.ndarray):
    total_variance = float(np.var(matrix, axis=0).sum())
    if not math.isfinite(total_variance) or total_variance <= np.finfo(np.float64).eps:
        raise ValueError("Los embeddings no tienen varianza suficiente para calcular PCA")
    model = PCA(n_components=2, svd_solver="full")
    points = model.fit_transform(matrix)
    if not np.isfinite(points).all() or not np.isfinite(model.explained_variance_ratio_).all():
        raise ValueError("PCA produjo valores no finitos; revisa los embeddings de entrada")
    return points, model.explained_variance_ratio_


def compute_tsne(matrix: np.ndarray, args: argparse.Namespace):
    if args.skip_tsne or len(matrix) < 4:
        return None, None
    perplexity = min(args.tsne_perplexity, max(2.0, (len(matrix) - 1) / 3), len(matrix) - 1)
    model = TSNE(
        n_components=2,
        perplexity=perplexity,
        init="pca",
        learning_rate="auto",
        max_iter=1000,
        random_state=args.random_state,
    )
    return model.fit_transform(matrix), perplexity


def compute_outliers(items: list[dict[str, Any]], matrix: np.ndarray):
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    normalized = np.divide(matrix, norms, out=np.zeros_like(matrix), where=norms != 0)
    rows = []
    for index, item in enumerate(items):
        similarities = normalized @ normalized[index]
        similarities[index] = -np.inf
        neighbor_index = int(np.argmax(similarities))
        distance = 1.0 - float(similarities[neighbor_index])
        rows.append(
            {
                "index": index,
                "label": item["label"],
                "category": item["category"],
                "kind": item["kind"],
                "distance": distance,
                "neighbor": items[neighbor_index]["label"],
                "same_category": items[neighbor_index]["category"] == item["category"],
            }
        )
    return sorted(rows, key=lambda row: row["distance"], reverse=True)


def figure_to_base64(figure) -> str:
    buffer = io.BytesIO()
    figure.savefig(buffer, format="png", dpi=145, bbox_inches="tight", facecolor="#ffffff")
    plt.close(figure)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def make_scatter(
    points: np.ndarray,
    items: list[dict[str, Any]],
    title: str,
    color_by: str,
    axis_prefix: str,
) -> str:
    figure, axis = plt.subplots(figsize=(10.5, 6.2))
    raw_groups = [str(item.get(color_by) or "Sin categoria") for item in items]
    group_counts = Counter(raw_groups)
    visible_groups = {name for name, _ in group_counts.most_common(14)}
    groups = [group if group in visible_groups else "Otros" for group in raw_groups]
    unique_groups = list(dict.fromkeys(groups))
    markers = {"profile": "*", "probe-known": "o", "probe-impostor": "X", "user": "o"}

    for group_index, group in enumerate(unique_groups):
        indices = [index for index, value in enumerate(groups) if value == group]
        if not indices:
            continue
        kinds = defaultdict(list)
        for index in indices:
            kinds[items[index]["kind"]].append(index)
        for kind, kind_indices in kinds.items():
            coords = points[kind_indices]
            label = group if len(kinds) == 1 else f"{group} ({kind})"
            axis.scatter(
                coords[:, 0],
                coords[:, 1],
                s=44 if kind != "profile" else 95,
                alpha=0.78,
                marker=markers.get(kind, "o"),
                color=PLOT_COLORS[group_index % len(PLOT_COLORS)],
                edgecolors="white",
                linewidths=0.6,
                label=label,
            )

    axis.set_title(title, loc="left", fontsize=15, fontweight="bold")
    axis.set_xlabel(f"{axis_prefix} 1")
    axis.set_ylabel(f"{axis_prefix} 2")
    axis.grid(alpha=0.18)
    handles, labels = axis.get_legend_handles_labels()
    if handles:
        axis.legend(handles[:18], labels[:18], fontsize=7.5, loc="best", frameon=True)
    figure.tight_layout()
    return figure_to_base64(figure)


def make_variance_chart(matrix: np.ndarray, top_dimensions: int) -> tuple[str, list[tuple[int, float]]]:
    variances = np.var(matrix, axis=0)
    variable_indices = np.flatnonzero(variances > np.finfo(np.float64).eps)
    if not len(variable_indices):
        raise ValueError("No hay dimensiones variables para graficar")
    count = min(top_dimensions, len(variable_indices))
    top_indices = variable_indices[np.argsort(variances[variable_indices])[::-1][:count]]
    top = [(int(index), float(variances[index])) for index in top_indices]
    figure, axis = plt.subplots(figsize=(10.5, 4.8))
    axis.bar([str(index) for index, _ in top], [value for _, value in top], color="#0f766e")
    axis.set_title("Dimensiones con mayor varianza", loc="left", fontsize=15, fontweight="bold")
    axis.set_xlabel("Indice de dimension")
    axis.set_ylabel("Varianza")
    axis.tick_params(axis="x", labelrotation=55)
    axis.grid(axis="y", alpha=0.18)
    figure.tight_layout()
    return figure_to_base64(figure), top


def make_correlation_heatmap(matrix: np.ndarray, top: list[tuple[int, float]]) -> str | None:
    indices = [index for index, _ in top[: min(20, len(top))]]
    if len(indices) < 2:
        return None
    correlation = np.corrcoef(matrix[:, indices], rowvar=False)
    correlation = np.nan_to_num(correlation, nan=0.0, posinf=0.0, neginf=0.0)
    figure, axis = plt.subplots(figsize=(8.4, 7.2))
    image = axis.imshow(correlation, cmap="RdBu_r", vmin=-1, vmax=1)
    labels = [str(index) for index in indices]
    axis.set_xticks(range(len(labels)), labels=labels, rotation=55, ha="right")
    axis.set_yticks(range(len(labels)), labels=labels)
    axis.set_title("Correlacion entre dimensiones de mayor varianza", loc="left", fontsize=14, fontweight="bold")
    figure.colorbar(image, ax=axis, fraction=0.046, pad=0.04)
    figure.tight_layout()
    return figure_to_base64(figure)


def make_outlier_chart(outliers: list[dict[str, Any]]) -> str:
    rows = list(reversed(outliers[:20]))
    figure, axis = plt.subplots(figsize=(10.5, 6.2))
    labels = [row["label"][-45:] for row in rows]
    axis.barh(labels, [row["distance"] for row in rows], color="#b5a160")
    axis.set_title("Embeddings mas aislados", loc="left", fontsize=15, fontweight="bold")
    axis.set_xlabel("Distancia coseno")
    axis.grid(axis="x", alpha=0.18)
    axis.tick_params(axis="y", labelsize=8)
    figure.tight_layout()
    return figure_to_base64(figure)


def make_probe_score_chart(items: list[dict[str, Any]]) -> str | None:
    groups: dict[str, list[float]] = defaultdict(list)
    for item in items:
        score = item.get("top1_score")
        if isinstance(score, (int, float)) and math.isfinite(float(score)):
            groups[item["result"]].append(float(score))
    if not groups:
        return None
    figure, axis = plt.subplots(figsize=(10.5, 4.8))
    bins = np.linspace(-1, 1, 35)
    for index, (label, values) in enumerate(sorted(groups.items())):
        axis.hist(values, bins=bins, alpha=0.58, label=f"{label} (n={len(values)})", color=PLOT_COLORS[index])
    axis.set_title("Distribucion de scores Top-1", loc="left", fontsize=15, fontweight="bold")
    axis.set_xlabel("Similitud coseno")
    axis.set_ylabel("Probes")
    axis.legend()
    axis.grid(axis="y", alpha=0.18)
    figure.tight_layout()
    return figure_to_base64(figure)


def chart_card(title: str, description: str, image_base64: str | None) -> str:
    if not image_base64:
        return ""
    return f"""
      <section class="card chart-card">
        <h2>{html.escape(title)}</h2>
        <p class="muted">{html.escape(description)}</p>
        <img src="data:image/png;base64,{image_base64}" alt="{html.escape(title)}" />
      </section>"""


def format_number(value: Any, digits: int = 6) -> str:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return "-"
    number = float(value)
    if not math.isfinite(number):
        return "-"
    return f"{number:.{digits}f}"


def embedding_fingerprint(items: list[dict[str, Any]]) -> str:
    digest = hashlib.sha256()
    for item in sorted(items, key=lambda value: value["id"]):
        digest.update(item["id"].encode("utf-8"))
        digest.update(np.asarray(item["embedding"], dtype="<f8").tobytes())
        for key in ("label", "category", "kind", "result", "top1_score", "detection_score"):
            digest.update(str(item.get(key)).encode("utf-8"))
    return digest.hexdigest()


def log_fingerprint(rows: list[dict[str, Any]], aggregate_data: Any = None) -> str:
    digest = hashlib.sha256()
    for row in sorted(rows, key=lambda value: str(value["_id"])):
        digest.update(str(row["_id"]).encode("utf-8"))
        for key in (
            "status",
            "match",
            "score",
            "threshold",
            "detectionScore",
            "comparedProfiles",
            "createdAt",
        ):
            digest.update(str(row.get(key)).encode("utf-8"))
    if aggregate_data is not None:
        digest.update(json.dumps(aggregate_data, sort_keys=True, default=str).encode("utf-8"))
    return digest.hexdigest()


def library_versions() -> dict[str, str]:
    return {
        "numpyVersion": np.__version__,
        "scikitLearnVersion": sklearn.__version__,
        "matplotlibVersion": matplotlib.__version__,
        "pymongoVersion": pymongo.version,
    }


def base_html(title: str, subtitle: str, summary_cards: str, content: str, metadata_rows: str) -> str:
    generated_at = datetime.now(timezone.utc).isoformat()
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(title)}</title>
  <style>
    :root {{ --bg:#f8fafc; --card:#fff; --text:#0f172a; --muted:#475569; --line:#0f766e; --border:#dce7e5; --accent:#b5a160; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; font-family:Inter,Arial,sans-serif; color:var(--text); background:linear-gradient(180deg,#f8fafc,#edf6f4); }}
    main {{ width:min(1280px,calc(100vw - 32px)); margin:32px auto 64px; display:grid; gap:20px; }}
    .card {{ background:var(--card); border:1px solid var(--border); border-radius:20px; padding:24px; box-shadow:0 16px 40px rgba(15,23,42,.06); overflow:hidden; }}
    .eyebrow {{ margin:0; color:var(--line); text-transform:uppercase; letter-spacing:.25em; font-size:.72rem; font-weight:800; }}
    h1 {{ margin:8px 0; font-size:clamp(1.8rem,4vw,2.8rem); }}
    h2 {{ margin:0 0 6px; font-size:1.15rem; }}
    .muted {{ color:var(--muted); line-height:1.6; }}
    .stats {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(155px,1fr)); gap:12px; margin-top:20px; }}
    .stat {{ padding:15px; border:1px solid var(--border); border-radius:15px; background:#fbfdfd; }}
    .stat-label {{ color:var(--muted); font-size:.78rem; }}
    .stat-value {{ margin-top:7px; font-size:1.3rem; font-weight:800; overflow-wrap:anywhere; }}
    .charts {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr)); gap:20px; }}
    .chart-card img {{ display:block; width:100%; height:auto; margin-top:14px; border-radius:12px; }}
    .table-wrap {{ overflow:auto; border:1px solid var(--border); border-radius:14px; }}
    table {{ width:100%; border-collapse:collapse; min-width:720px; }}
    th,td {{ padding:10px 12px; border-bottom:1px solid var(--border); text-align:left; font-size:.84rem; vertical-align:top; }}
    th {{ background:#f1f7f5; color:#0b5f58; position:sticky; top:0; }}
    tbody tr:last-child td {{ border-bottom:0; }}
    code {{ overflow-wrap:anywhere; }}
    .note {{ padding:14px 16px; border:1px solid #e7d9aa; border-radius:14px; background:#fffbeb; color:#7c6524; }}
  </style>
</head>
<body>
  <main>
    <section class="card">
      <p class="eyebrow">Embedding Analysis · scikit-learn</p>
      <h1>{html.escape(title)}</h1>
      <p class="muted">{html.escape(subtitle)}</p>
      <div class="stats">{summary_cards}</div>
    </section>
    {content}
    <section class="card">
      <h2>Fuente y reproducibilidad</h2>
      <p class="muted">El reporte es estatico y fue generado en {html.escape(generated_at)}.</p>
      <div class="table-wrap"><table><tbody>{metadata_rows}</tbody></table></div>
    </section>
  </main>
</body>
</html>"""


def stat_card(label: str, value: Any) -> str:
    return f'<div class="stat"><div class="stat-label">{html.escape(label)}</div><div class="stat-value">{html.escape(str(value))}</div></div>'


def metadata_table_rows(metadata: dict[str, Any]) -> str:
    return "".join(
        f"<tr><th>{html.escape(str(key))}</th><td><code>{html.escape(str(value))}</code></td></tr>"
        for key, value in metadata.items()
    )


def build_embedding_report(database, args: argparse.Namespace, masked_uri: str) -> tuple[str, dict[str, Any]]:
    raw_items, source_totals = load_embedding_items(database, args)
    sampled_items = deterministic_sample(raw_items, args.max_samples, args.random_state)
    items, rejected, matrix, dimension = prepare_embedding_matrix(sampled_items)
    pca_points, explained = compute_pca(matrix)
    tsne_points, used_perplexity = compute_tsne(matrix, args)
    outliers = compute_outliers(items, matrix)
    variance_chart, top_variances = make_variance_chart(matrix, args.top_dimensions)
    charts = [
        chart_card(
            "PCA 2D",
            f"Proyeccion lineal. PCA1 + PCA2 explican {(explained.sum() * 100):.2f}% de la varianza de la muestra.",
            make_scatter(pca_points, items, "Proyeccion PCA", args.color_by, "PCA"),
        ),
        chart_card(
            "t-SNE 2D",
            "Proyeccion no lineal para inspeccionar vecindades locales; las distancias globales no deben interpretarse literalmente.",
            make_scatter(tsne_points, items, "Proyeccion t-SNE", args.color_by, "t-SNE") if tsne_points is not None else None,
        ),
        chart_card("Varianza por dimension", "Dimensiones que mas cambian dentro de la muestra analizada.", variance_chart),
        chart_card(
            "Correlacion dimensional",
            "Correlacion de Pearson entre las dimensiones de mayor varianza.",
            make_correlation_heatmap(matrix, top_variances),
        ),
        chart_card(
            "Posibles outliers",
            "Distancia coseno al embedding vecino mas cercano dentro de la muestra completa.",
            make_outlier_chart(outliers),
        ),
        chart_card(
            "Scores Top-1",
            "Resultado de recuperacion Top-1 para probes. No aplica un umbral de aceptacion biometrica.",
            make_probe_score_chart(items),
        ),
    ]
    outlier_rows = "".join(
        "<tr>"
        f"<td>{html.escape(row['label'])}</td>"
        f"<td>{html.escape(row['category'])}</td>"
        f"<td>{html.escape(row['kind'])}</td>"
        f"<td>{row['distance']:.6f}</td>"
        f"<td>{html.escape(row['neighbor'])}</td>"
        f"<td>{'Si' if row['same_category'] else 'No'}</td>"
        "</tr>"
        for row in outliers[:50]
    )
    content = f"""
      <section class="charts">{''.join(charts)}</section>
      <section class="card">
        <h2>Embeddings atipicos</h2>
        <p class="muted">Esta lista es diagnostica: una distancia alta no demuestra por si sola que el embedding sea incorrecto.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Muestra</th><th>Categoria</th><th>Tipo</th><th>Distancia</th><th>Vecino</th><th>Misma categoria</th></tr></thead>
          <tbody>{outlier_rows}</tbody>
        </table></div>
      </section>
      <section class="card note">PCA y t-SNE son proyecciones con perdida de informacion. La comparacion biometrica real debe continuar usando los 512 valores y similitud coseno.</section>
    """
    metadata = {
        "source": args.source,
        "runId": args.run_id or "-",
        "mongoUri": masked_uri,
        "sourceTotals": json.dumps(source_totals, ensure_ascii=True),
        "loadedBeforeSampling": len(raw_items),
        "sampled": len(sampled_items),
        "accepted": len(items),
        "rejected": len(rejected),
        "dominantDimension": dimension,
        "randomState": args.random_state,
        "maxSamples": args.max_samples,
        "sampleCountsByKind": json.dumps(Counter(item["kind"] for item in items), ensure_ascii=True),
        "colorBy": args.color_by,
        "samplingStrategy": "estratificado perfiles/probes" if args.source == "evaluation" else "uniforme por ObjectId",
        "datasetSha256": embedding_fingerprint(items),
        "pcaExplainedVariance": f"{explained.sum() * 100:.6f}%",
        "tsnePerplexity": used_perplexity if used_perplexity is not None else "omitido",
        "skipTsne": args.skip_tsne,
        "topDimensions": args.top_dimensions,
        **library_versions(),
    }
    summary = "".join(
        [
            stat_card("Embeddings analizados", len(items)),
            stat_card("Dimensiones", dimension),
            stat_card("Categorias", len({item["category"] for item in items})),
            stat_card("PCA varianza 2D", f"{explained.sum() * 100:.2f}%"),
            stat_card("Descartados", len(rejected)),
        ]
    )
    report = base_html(
        f"Analisis de embeddings: {SOURCE_LABELS[args.source]}",
        "Visualizacion reproducible desde MongoDB usando PCA y t-SNE de scikit-learn.",
        summary,
        content,
        metadata_table_rows(metadata),
    )
    return report, metadata


def load_recognition_logs(database, args: argparse.Namespace):
    query: dict[str, Any] = {}
    start = parse_iso_date(args.start_date)
    end = parse_iso_date(args.end_date, end_of_day=True)
    if start or end:
        query["createdAt"] = {}
        if start:
            query["createdAt"]["$gte"] = start
        if end:
            query["createdAt"]["$lte"] = end
    collection = database.face_recognition_logs
    projection = {
        "status": 1,
        "match": 1,
        "score": 1,
        "threshold": 1,
        "detectionScore": 1,
        "comparedProfiles": 1,
        "errorMessage": 1,
        "createdAt": 1,
    }
    sampled_rows, total = sample_documents(
        collection, query, projection, args.max_samples, args.random_state
    )
    recent_rows = list(collection.find(query, projection).sort("createdAt", -1).limit(100))
    status_counts = {
        str(row["_id"] or "unknown"): int(row["count"])
        for row in collection.aggregate(
            [
                {"$match": query},
                {"$group": {"_id": {"$ifNull": ["$status", "unknown"]}, "count": {"$sum": 1}}},
            ]
        )
    }
    daily_counts = [
        {
            "date": str(row["_id"]["date"]),
            "status": str(row["_id"]["status"] or "unknown"),
            "count": int(row["count"]),
        }
        for row in collection.aggregate(
            [
                {"$match": query},
                {
                    "$group": {
                        "_id": {
                            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                            "status": {"$ifNull": ["$status", "unknown"]},
                        },
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id.date": 1, "_id.status": 1}},
            ]
        )
    ]
    return {
        "sampledRows": sampled_rows,
        "recentRows": recent_rows,
        "total": total,
        "statusCounts": status_counts,
        "dailyCounts": daily_counts,
    }


def finite_score_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if isinstance(row.get("score"), (int, float))
        and not isinstance(row.get("score"), bool)
        and math.isfinite(float(row["score"]))
    ]


def make_log_score_histogram(rows: list[dict[str, Any]]) -> str | None:
    grouped: dict[str, list[float]] = defaultdict(list)
    for row in finite_score_rows(rows):
        grouped[str(row.get("status") or "unknown")].append(float(row["score"]))
    if not grouped:
        return None
    figure, axis = plt.subplots(figsize=(10.5, 4.8))
    all_scores = [score for values in grouped.values() for score in values]
    bins = np.linspace(min(all_scores), max(all_scores) + 1e-9, 30)
    for index, (label, values) in enumerate(sorted(grouped.items())):
        axis.hist(values, bins=bins, alpha=0.58, color=PLOT_COLORS[index], label=f"{label} (n={len(values)})")
    axis.set_title("Distribucion operativa de scores", loc="left", fontsize=15, fontweight="bold")
    axis.set_xlabel("Score")
    axis.set_ylabel("Intentos")
    axis.legend()
    axis.grid(axis="y", alpha=0.18)
    figure.tight_layout()
    return figure_to_base64(figure)


def make_log_timeline(rows: list[dict[str, Any]]) -> str | None:
    daily: dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        date = row.get("date")
        if not date:
            continue
        daily[str(date)][str(row.get("status") or "unknown")] += int(row.get("count") or 0)
    if not daily:
        return None
    dates = sorted(daily)
    statuses = sorted({status for counts in daily.values() for status in counts})
    figure, axis = plt.subplots(figsize=(10.5, 4.8))
    bottom = np.zeros(len(dates))
    for index, status in enumerate(statuses):
        values = np.asarray([daily[date][status] for date in dates])
        axis.bar(dates, values, bottom=bottom, color=PLOT_COLORS[index], label=status)
        bottom += values
    axis.set_title("Intentos por dia", loc="left", fontsize=15, fontweight="bold")
    axis.set_ylabel("Intentos")
    axis.tick_params(axis="x", labelrotation=55)
    axis.legend()
    axis.grid(axis="y", alpha=0.18)
    figure.tight_layout()
    return figure_to_base64(figure)


def make_score_detection_scatter(rows: list[dict[str, Any]]) -> str | None:
    valid = [
        row
        for row in finite_score_rows(rows)
        if isinstance(row.get("detectionScore"), (int, float))
        and math.isfinite(float(row["detectionScore"]))
    ]
    if not valid:
        return None
    figure, axis = plt.subplots(figsize=(10.5, 4.8))
    statuses = sorted({str(row.get("status") or "unknown") for row in valid})
    for index, status in enumerate(statuses):
        group = [row for row in valid if str(row.get("status") or "unknown") == status]
        axis.scatter(
            [float(row["detectionScore"]) for row in group],
            [float(row["score"]) for row in group],
            alpha=0.65,
            s=35,
            color=PLOT_COLORS[index],
            label=status,
        )
    axis.set_title("Deteccion facial vs score", loc="left", fontsize=15, fontweight="bold")
    axis.set_xlabel("Detection score")
    axis.set_ylabel("Similarity score")
    axis.legend()
    axis.grid(alpha=0.18)
    figure.tight_layout()
    return figure_to_base64(figure)


def build_log_report(database, args: argparse.Namespace, masked_uri: str):
    log_data = load_recognition_logs(database, args)
    rows = log_data["sampledRows"]
    recent_rows = log_data["recentRows"]
    total = log_data["total"]
    if not rows:
        raise ValueError("No se encontraron logs para los filtros indicados")
    status_counts = Counter(log_data["statusCounts"])
    scored_rows = finite_score_rows(rows)
    scores = np.asarray([float(row["score"]) for row in scored_rows])
    thresholds = [
        float(row["threshold"])
        for row in rows
        if isinstance(row.get("threshold"), (int, float))
        and not isinstance(row.get("threshold"), bool)
        and math.isfinite(float(row["threshold"]))
    ]
    fingerprint_rows = list(
        {
            str(row["_id"]): row
            for row in [*rows, *recent_rows]
        }.values()
    )
    charts = "".join(
        [
            chart_card(
                "Distribucion de scores",
                "Muestra uniforme agrupada por resultado operativo. Matched/unmatched son decisiones del sistema, no etiquetas independientes de verdad.",
                make_log_score_histogram(rows),
            ),
            chart_card(
                "Actividad temporal",
                "Todos los intentos del rango agrupados por dia y estado mediante MongoDB.",
                make_log_timeline(log_data["dailyCounts"]),
            ),
            chart_card(
                "Calidad de deteccion",
                "Relacion exploratoria entre confianza de deteccion y score de similitud.",
                make_score_detection_scatter(rows),
            ),
        ]
    )
    table_rows = "".join(
        "<tr>"
        f"<td>{html.escape(str(row.get('createdAt') or '-'))}</td>"
        f"<td>{html.escape(str(row.get('status') or '-'))}</td>"
        f"<td>{format_number(row.get('score'))}</td>"
        f"<td>{format_number(row.get('threshold'))}</td>"
        f"<td>{format_number(row.get('detectionScore'))}</td>"
        f"<td>{html.escape(str(row.get('comparedProfiles') or 0))}</td>"
        "</tr>"
        for row in recent_rows
    )
    content = f"""
      <section class="charts">{charts}</section>
      <section class="card">
        <h2>Intentos recientes</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Fecha</th><th>Estado</th><th>Score</th><th>Umbral</th><th>Deteccion</th><th>Perfiles</th></tr></thead>
          <tbody>{table_rows}</tbody>
        </table></div>
      </section>
      <section class="card note">Este reporte no calcula FAR ni FRR con logs operativos porque no existe una etiqueta de identidad esperada independiente de la decision del sistema.</section>
    """
    metadata = {
        "source": args.source,
        "mongoUri": masked_uri,
        "totalDateFilter": total,
        "sampled": len(rows),
        "sampledWithScore": len(scored_rows),
        "maxSamples": args.max_samples,
        "randomState": args.random_state,
        "startDate": args.start_date or "-",
        "endDate": args.end_date or "-",
        "statusCounts": json.dumps(status_counts, ensure_ascii=True),
        "samplingStrategy": "uniforme por ObjectId",
        "datasetSha256": log_fingerprint(
            fingerprint_rows,
            {"statusCounts": status_counts, "dailyCounts": log_data["dailyCounts"]},
        ),
        **library_versions(),
    }
    summary = "".join(
        [
            stat_card("Logs del rango", total),
            stat_card("Muestra analitica", len(rows)),
            stat_card("Muestra con score", len(scored_rows)),
            stat_card("Matched", status_counts.get("matched", 0)),
            stat_card("Unmatched", status_counts.get("unmatched", 0)),
            stat_card("Score promedio muestra", f"{scores.mean():.4f}" if len(scores) else "-"),
            stat_card("Umbral promedio muestra", f"{np.mean(thresholds):.4f}" if thresholds else "-"),
        ]
    )
    report = base_html(
        "Analisis de logs de reconocimiento facial",
        "Graficas operativas construidas desde face_recognition_logs. Esta fuente no contiene embeddings completos.",
        summary,
        content,
        metadata_table_rows(metadata),
    )
    return report, metadata


def main() -> int:
    load_dotenv(BACKEND_ROOT / ".env")
    args = parse_args()
    validate_args(args)
    mongo_uri = args.mongo_uri or os.getenv("MONGODB_URI") or DEFAULT_MONGO_URI
    masked_uri = mask_mongo_uri(mongo_uri)
    output = Path(args.output).resolve() if args.output else DEFAULT_OUTPUT_DIR / f"embedding-analysis-{args.source}.html"

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
    try:
        client.admin.command("ping")
        database = get_database(client, mongo_uri, args.database)
        if args.source == "recognition-logs":
            report, metadata = build_log_report(database, args, masked_uri)
        else:
            report, metadata = build_embedding_report(database, args, masked_uri)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(report, encoding="utf-8")
    finally:
        client.close()

    print("Analisis generado correctamente.")
    print(f"Fuente : {args.source}")
    print(f"Mongo  : {masked_uri}")
    print(f"Salida : {output}")
    for key, value in metadata.items():
        print(f"  - {key}: {value}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError) as error:
        print(f"Error: {error}")
        raise SystemExit(1) from error
