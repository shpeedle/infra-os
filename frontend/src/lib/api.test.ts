import { afterEach, describe, expect, it, vi } from "vitest";

import { generateCad } from "./api";
import { createSeedScene } from "../domain/scene";

describe("generation API boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects a successful response missing a required artifact format", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          artifact_id: "artifact-0123456789abcdef",
          scene_revision: 1,
          scene_digest: "digest",
          generator_version: "test",
          duration_ms: 10,
          formats: [
            {
              format: "step",
              role: "engineering",
              units: "mm",
              download_url: "/artifacts/test/step",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(generateCad(createSeedScene())).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
});
