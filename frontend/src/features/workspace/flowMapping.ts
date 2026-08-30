import type { Edge, Node, XYPosition } from "@xyflow/react";

import type { Dimensions, Room, Scene, SceneEntity } from "../../domain/scene";

export type SceneNodeData =
  | { kind: "room"; label: string; dimensions_m: Dimensions }
  | { kind: "entity"; entity: SceneEntity };

export type SceneFlowNode = Node<SceneNodeData>;

export const roomNodeId = (scene: Scene): string => scene.room.id;

export function sceneToFlowNodes(scene: Scene, selectedEntityId: string | null): SceneFlowNode[] {
  const scale = scene.canvas.pixels_per_meter;
  const roomNode: SceneFlowNode = {
    id: scene.room.id,
    type: "room",
    position: { x: 0, y: 0 },
    data: {
      kind: "room",
      label: scene.room.label,
      dimensions_m: scene.room.dimensions_m,
    },
    draggable: false,
    selectable: false,
    connectable: false,
    zIndex: -1,
    style: {
      width: scene.room.dimensions_m.x * scale,
      height: scene.room.dimensions_m.y * scale,
    },
  };
  const entityNodes = scene.entities.map<SceneFlowNode>((entity) => ({
    id: entity.id,
    type: entity.type,
    position: scenePositionToFlowPosition(
      entity.position_m,
      entity.dimensions_m,
      scene.room,
      scale,
    ),
    data: { kind: "entity", entity },
    selected: entity.id === selectedEntityId,
    style: {
      width: entity.dimensions_m.x * scale,
      height: entity.dimensions_m.y * scale,
    },
  }));
  return [roomNode, ...entityNodes];
}

export function sceneToFlowEdges(scene: Scene, selectedConnectionId: string | null = null): Edge[] {
  return scene.connections.map((connection) => ({
    id: connection.id,
    source: connection.source_id,
    target: connection.target_id,
    type: "smoothstep",
    selectable: true,
    deletable: true,
    selected: connection.id === selectedConnectionId,
    data: { kind: connection.type },
  }));
}

export function flowPositionToScenePosition(
  position: XYPosition,
  entity: SceneEntity,
  room: Room,
  pixelsPerMeter: number,
) {
  const maxX = Math.max(0, room.dimensions_m.x - entity.dimensions_m.x);
  const maxY = Math.max(0, room.dimensions_m.y - entity.dimensions_m.y);
  return {
    x: clamp(position.x / pixelsPerMeter, 0, maxX),
    y: clamp(room.dimensions_m.y - position.y / pixelsPerMeter - entity.dimensions_m.y, 0, maxY),
  };
}

function scenePositionToFlowPosition(
  position: { x: number; y: number },
  dimensions: Dimensions,
  room: Room,
  pixelsPerMeter: number,
): XYPosition {
  return {
    x: position.x * pixelsPerMeter,
    y: (room.dimensions_m.y - position.y - dimensions.y) * pixelsPerMeter,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
