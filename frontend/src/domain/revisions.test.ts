import { describe, expect, it } from "vitest";

import { createSeedScene } from "./scene";
import {
  compareScenes,
  loadRevisionSnapshots,
  MAX_REVISION_SNAPSHOTS,
  saveRevisionSnapshot,
} from "./revisions";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("revision snapshots", () => {
  it("saves and loads immutable scene snapshots per project", () => {
    const storage = memoryStorage();
    const scene = createSeedScene();
    saveRevisionSnapshot(scene, storage, "2026-08-30T12:00:00.000Z");

    scene.entities[2].label = "Changed after save";
    const snapshots = loadRevisionSnapshots("north-hall", storage);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].scene.entities[2].label).toBe("Rack 01");
    expect(snapshots[0].saved_at).toBe("2026-08-30T12:00:00.000Z");
  });

  it("deduplicates identical revisions and bounds history", () => {
    const storage = memoryStorage();
    const duplicate = createSeedScene();
    duplicate.project.project_id = "duplicate";
    saveRevisionSnapshot(duplicate, storage, "2026-08-30T12:00:00.000Z");
    saveRevisionSnapshot(duplicate, storage, "2026-08-30T12:01:00.000Z");
    expect(loadRevisionSnapshots("duplicate", storage)).toHaveLength(1);

    for (let revision = 1; revision <= MAX_REVISION_SNAPSHOTS + 5; revision += 1) {
      const scene = createSeedScene();
      scene.revision = revision;
      scene.project.project_id = "bounded";
      saveRevisionSnapshot(
        scene,
        storage,
        `2026-08-30T12:${String(revision).padStart(2, "0")}:00.000Z`,
      );
    }
    const snapshots = loadRevisionSnapshots("bounded", storage);
    expect(snapshots).toHaveLength(MAX_REVISION_SNAPSHOTS);
    expect(snapshots[0].revision).toBe(MAX_REVISION_SNAPSHOTS + 5);
    expect(snapshots.at(-1)?.revision).toBe(6);
  });

  it("reports entity and connection changes between revisions", () => {
    const older = createSeedScene();
    const newer = createSeedScene();
    newer.entities = newer.entities.slice(0, -1);
    newer.connections = newer.connections.slice(0, -1);
    newer.entities[2].label = "Rack 01 revised";

    expect(compareScenes(older, newer)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: "rack-06", detail: expect.stringContaining("Removed") }),
        expect.objectContaining({ subject: "power-b-rack-06", detail: "Power connection removed" }),
        expect.objectContaining({ subject: "rack-01", detail: "Rack 01 changed" }),
      ]),
    );
  });
});
