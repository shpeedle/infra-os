"""Transport response models for the small prototype API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(ApiModel):
    status: Literal["ok"]
    service: str
    artifact_storage: Literal["local"]


class ValidationIssueResponse(ApiModel):
    path: str
    message: str


class ErrorBody(ApiModel):
    code: str
    message: str
    issues: list[ValidationIssueResponse] = Field(default_factory=list)


class ErrorResponse(ApiModel):
    error: ErrorBody


class ArtifactFormatResponse(ApiModel):
    format: Literal["step", "glb"]
    role: Literal["engineering", "browser-preview"]
    units: Literal["mm"]
    download_url: str


class GenerateResponse(ApiModel):
    artifact_id: str
    scene_revision: int
    scene_digest: str
    generator_version: str
    duration_ms: int
    formats: list[ArtifactFormatResponse]
