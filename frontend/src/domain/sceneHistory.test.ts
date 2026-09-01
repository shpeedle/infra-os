import { describe, expect, it } from "vitest";

import { createSeedScene } from "./scene";
import { commitScene, createSceneHistory, redoScene, undoScene } from "./sceneHistory";

describe("scene undo and redo history", () => {
  it("returns to an earlier edit and re-applies it", () => {
    const initial = createSeedScene();
    const changed = { ...initial, revision: 2, project: { ...initial.project, name: "Changed" } };
    const history = commitScene(createSceneHistory(initial), changed);

    expect(undoScene(history).present).toEqual(initial);
    expect(redoScene(undoScene(history)).present).toEqual(changed);
  });

  it("clears redo after a new edit", () => {
    const initial = createSeedScene();
    const first = { ...initial, revision: 2 };
    const second = { ...initial, revision: 3 };
    const history = commitScene(undoScene(commitScene(createSceneHistory(initial), first)), second);

    expect(history.future).toEqual([]);
  });
});
