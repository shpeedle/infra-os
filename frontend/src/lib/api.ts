import type { Scene } from "../domain/scene";

export interface ArtifactFormat {
  format: "step" | "glb";
  role: "engineering" | "browser-preview";
  units: "mm";
  download_url: string;
}

export interface GenerateResponse {
  artifact_id: string;
  scene_revision: number;
  scene_digest: string;
  generator_version: string;
  duration_ms: number;
  formats: ArtifactFormat[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly issues: ValidationIssue[];

  constructor(code: string, message: string, issues: ValidationIssue[] = []) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.issues = issues;
  }
}

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "/api";

export async function generateCad(scene: Scene, signal?: AbortSignal): Promise<GenerateResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scene),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError(
      "network_error",
      "The API could not be reached. Check that the FastAPI service is running and retry.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw parseApiError(payload, response.status);
  if (!isGenerateResponse(payload)) {
    throw new ApiRequestError(
      "invalid_response",
      "The API returned an invalid generation response.",
    );
  }
  return payload;
}

export function artifactUrl(downloadUrl: string): string {
  if (/^https?:\/\//.test(downloadUrl)) return downloadUrl;
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    return new URL(downloadUrl, `${API_BASE}/`).toString();
  }
  return downloadUrl;
}

function parseApiError(payload: unknown, status: number): ApiRequestError {
  if (!isRecord(payload)) {
    return new ApiRequestError("http_error", `The API returned HTTP ${status}.`);
  }
  const errorPayload = payload.error;
  if (!isRecord(errorPayload)) {
    return new ApiRequestError("http_error", `The API returned HTTP ${status}.`);
  }
  const code = typeof errorPayload.code === "string" ? errorPayload.code : "http_error";
  const message =
    typeof errorPayload.message === "string"
      ? errorPayload.message
      : `The API returned HTTP ${status}.`;
  const issues = Array.isArray(errorPayload.issues)
    ? errorPayload.issues.filter(isValidationIssue)
    : [];
  return new ApiRequestError(code, message, issues);
}

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (!isRecord(value)) return false;
  const formats = value.formats;
  return (
    typeof value.artifact_id === "string" &&
    typeof value.scene_revision === "number" &&
    typeof value.scene_digest === "string" &&
    typeof value.generator_version === "string" &&
    typeof value.duration_ms === "number" &&
    Array.isArray(formats) &&
    formats.length > 0 &&
    formats.every(isArtifactFormat) &&
    formats.some((format) => format.format === "step") &&
    formats.some((format) => format.format === "glb")
  );
}

function isArtifactFormat(value: unknown): value is ArtifactFormat {
  if (!isRecord(value)) return false;
  return (
    (value.format === "step" || value.format === "glb") &&
    (value.role === "engineering" || value.role === "browser-preview") &&
    value.units === "mm" &&
    typeof value.download_url === "string"
  );
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  return isRecord(value) && typeof value.path === "string" && typeof value.message === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
