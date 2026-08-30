import { describe, expect, it } from "vitest";

import {
  createSeedScene,
  decodeSceneJson,
  SceneDecodeError,
  sceneToJson,
  validateScene,
} from "./scene";

describe("scene contract", () => {
  it("creates a valid seeded scene and round-trips its JSON", () => {
    const scene = createSeedScene();
    const decoded = decodeSceneJson(sceneToJson(scene));

    expect(validateScene(scene)).toEqual([]);
    expect(decoded).toEqual(scene);
  });

  it("reports a disconnected rack without mutating the scene", () => {
    const scene = createSeedScene();
    const originalConnections = scene.connections.length;
    scene.connections = scene.connections.slice(0, -1);

    const issues = validateScene(scene);

    expect(issues.some((issue) => issue.message.includes("rack-06"))).toBe(true);
    expect(originalConnections).toBe(6);
  });

  it("reports connection IDs that collide with scene entity IDs", () => {
    const scene = createSeedScene();
    scene.connections[0].id = scene.entities[0].id;

    expect(validateScene(scene).some((issue) => issue.message.includes("not unique"))).toBe(true);
  });

  it("rejects unknown entity types and invalid units at the import boundary", () => {
    const payload = JSON.parse(sceneToJson(createSeedScene())) as Record<string, unknown>;
    const entities = payload.entities as Record<string, unknown>[];
    entities[0].type = "cooling";
    expect(() => decodeSceneJson(JSON.stringify(payload))).toThrow(SceneDecodeError);

    payload.units = "ft";
    expect(() => decodeSceneJson(JSON.stringify(payload))).toThrow("metres");
  });
});
