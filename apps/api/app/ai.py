from __future__ import annotations

from typing import Any

from app.config import AppSettings


def build_document_prompt(
    *,
    client_name: str,
    client_reference: str,
    document_type: str,
    template_id: str,
    workflow_snapshot: dict[str, Any],
) -> str:
    fields = "\n".join(f"- {key}: {value}" for key, value in workflow_snapshot.items())
    return (
        f"Generate a {document_type} for {client_name} ({client_reference}) "
        f"using template {template_id}.\nWorkflow data:\n{fields}"
    )


def generate_document_content(*, settings: AppSettings, prompt: str) -> None:
    _ = prompt
    if not settings.ai_enabled:
        return None
    if not settings.ai_api_key or settings.ai_provider == "disabled":
        return None

    return None
