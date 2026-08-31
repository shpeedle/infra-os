import { decodeScene, sceneToJson, type Scene } from "./scene";

export const REVISION_STORAGE_PREFIX = "infra-os.revisions.v1";
export const MAX_REVISION_SNAPSHOTS = 50;

export interface RevisionSnapshot {
  revision: number;
  saved_at: string;
  scene: Scene;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function key(projectId: string): string {
  return `${REVISION_STORAGE_PREFIX}.${projectId}`;
}

export function loadRevisionSnapshots(
  projectId: string,
  revisionStorage: StorageLike | null = storage(),
): RevisionSnapshot[] {
  if (!revisionStorage) return [];
  try {
    const raw = revisionStorage.getItem(key(projectId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .flatMap((item): RevisionSnapshot[] => {
        if (!item || typeof item !== "object") return [];
        const candidate = item as Record<string, unknown>;
        if (typeof candidate.revision !== "number" || typeof candidate.saved_at !== "string") {
          return [];
        }
        try {
          return [
            {
              revision: candidate.revision,
              saved_at: candidate.saved_at,
              scene: decodeScene(candidate.scene),
            },
          ];
        } catch {
          return [];
        }
      })
      .slice(0, MAX_REVISION_SNAPSHOTS);
  } catch {
    return [];
  }
}

export function saveRevisionSnapshot(
  scene: Scene,
  revisionStorage: StorageLike | null = storage(),
  savedAt = new Date().toISOString(),
): RevisionSnapshot[] {
  if (!revisionStorage) return [];
  const current = loadRevisionSnapshots(scene.project.project_id, revisionStorage);
  const serialized = sceneToJson(scene);
  const existing = current.find((snapshot) => snapshot.revision === scene.revision);
  if (existing) return current;
  const next = [
    { revision: scene.revision, saved_at: savedAt, scene: decodeScene(JSON.parse(serialized)) },
    ...current,
  ].slice(0, MAX_REVISION_SNAPSHOTS);
  try {
    revisionStorage.setItem(key(scene.project.project_id), JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function formatRevisionDate(savedAt: string): string {
  const date = new Date(savedAt);
  return Number.isNaN(date.valueOf())
    ? "Unknown time"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
