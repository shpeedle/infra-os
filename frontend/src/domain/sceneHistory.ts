import type { Scene } from "./scene";

export const MAX_UNDO_STEPS = 100;

export interface SceneHistory {
  past: Scene[];
  present: Scene;
  future: Scene[];
}

export function createSceneHistory(scene: Scene): SceneHistory {
  return { past: [], present: scene, future: [] };
}

export function commitScene(history: SceneHistory, next: Scene): SceneHistory {
  return {
    past: [...history.past, history.present].slice(-MAX_UNDO_STEPS),
    present: next,
    future: [],
  };
}

export function undoScene(history: SceneHistory): SceneHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoScene(history: SceneHistory): SceneHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present].slice(-MAX_UNDO_STEPS),
    present: next,
    future: history.future.slice(1),
  };
}
