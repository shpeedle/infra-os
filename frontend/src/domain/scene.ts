export const SCHEMA_VERSION = "1.0" as const;
export const DEFAULT_PIXELS_PER_METER = 50;
export const MAX_SCENE_BYTES = 512_000;

export type EntityType = "rack" | "power";

export interface Point2D {
  x: number;
  y: number;
}

export interface Dimensions {
  x: number;
  y: number;
  z: number;
}

export interface ProjectMetadata {
  project_id: string;
  name: string;
  description: string;
}

export interface CanvasMetadata {
  pixels_per_meter: number;
  origin: "south-west";
}

export interface Room {
  id: string;
  type: "room";
  label: string;
  position_m: Point2D;
  dimensions_m: Dimensions;
}

interface EntityBase {
  id: string;
  label: string;
  position_m: Point2D;
  dimensions_m: Dimensions;
}

export interface RackEntity extends EntityBase {
  type: "rack";
  rack_u: number;
  power_draw_kw: number;
}

export interface PowerEntity extends EntityBase {
  type: "power";
  capacity_kw: number;
}

export type SceneEntity = RackEntity | PowerEntity;

export interface PowerConnection {
  id: string;
  type: "power";
  source_id: string;
  target_id: string;
}

export interface Scene {
  schema_version: typeof SCHEMA_VERSION;
  project: ProjectMetadata;
  revision: number;
  units: "m";
  coordinate_system: "room-local-south-west";
  canvas: CanvasMetadata;
  room: Room;
  entities: SceneEntity[];
  connections: PowerConnection[];
}

export interface SceneIssue {
  path: string;
  message: string;
}

export class SceneDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneDecodeError";
  }
}

export function createSeedScene(): Scene {
  return {
    schema_version: SCHEMA_VERSION,
    project: {
      project_id: "north-hall",
      name: "North Hall pilot",
      description: "A small two-bus data-center layout for the geometry proof.",
    },
    revision: 1,
    units: "m",
    coordinate_system: "room-local-south-west",
    canvas: {
      pixels_per_meter: DEFAULT_PIXELS_PER_METER,
      origin: "south-west",
    },
    room: {
      id: "room-main",
      type: "room",
      label: "North Hall",
      position_m: { x: 0, y: 0 },
      dimensions_m: { x: 24, y: 12, z: 3.2 },
    },
    entities: [
      {
        id: "pdu-a",
        type: "power",
        label: "PDU A",
        position_m: { x: 1.5, y: 8.6 },
        dimensions_m: { x: 1.2, y: 1, z: 2.2 },
        capacity_kw: 30,
      },
      {
        id: "pdu-b",
        type: "power",
        label: "PDU B",
        position_m: { x: 1.5, y: 2.4 },
        dimensions_m: { x: 1.2, y: 1, z: 2.2 },
        capacity_kw: 30,
      },
      ...[
        ["rack-01", 5, 8.5, "Rack 01"],
        ["rack-02", 7, 8.5, "Rack 02"],
        ["rack-03", 9, 8.5, "Rack 03"],
        ["rack-04", 5, 2.3, "Rack 04"],
        ["rack-05", 7, 2.3, "Rack 05"],
        ["rack-06", 9, 2.3, "Rack 06"],
      ].map(([id, x, y, label]) => ({
        id: id as string,
        type: "rack" as const,
        label: label as string,
        position_m: { x: x as number, y: y as number },
        dimensions_m: { x: 0.6, y: 1.1, z: 2 },
        rack_u: 42,
        power_draw_kw: 4.8,
      })),
    ],
    connections: [
      ["power-a-rack-01", "pdu-a", "rack-01"],
      ["power-a-rack-02", "pdu-a", "rack-02"],
      ["power-a-rack-03", "pdu-a", "rack-03"],
      ["power-b-rack-04", "pdu-b", "rack-04"],
      ["power-b-rack-05", "pdu-b", "rack-05"],
      ["power-b-rack-06", "pdu-b", "rack-06"],
    ].map(([id, source_id, target_id]) => ({
      id,
      type: "power" as const,
      source_id,
      target_id,
    })),
  };
}

export function decodeSceneJson(json: string): Scene {
  if (new TextEncoder().encode(json).byteLength > MAX_SCENE_BYTES) {
    throw new SceneDecodeError(
      `Scene JSON must be smaller than ${MAX_SCENE_BYTES.toLocaleString()} bytes.`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    throw new SceneDecodeError("The selected file is not valid JSON.");
  }
  return decodeScene(value);
}

export function decodeScene(value: unknown): Scene {
  if (!isRecord(value)) {
    throw new SceneDecodeError("The scene must be a JSON object.");
  }
  // Shape and unit errors are rejected here. Semantic issues such as a
  // disconnected rack remain editable so the inspector can show the repair.
  return parseScene(value);
}

export function sceneToJson(scene: Scene): string {
  return `${JSON.stringify(scene, null, 2)}\n`;
}

export function validateScene(scene: Scene): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const room = scene.room;
  const ids = new Set<string>([room.id]);
  const entitiesById = new Map<string, SceneEntity>();

  if (room.position_m.x !== 0 || room.position_m.y !== 0) {
    issues.push({
      path: "room.position_m",
      message: "The fixed room must start at the room-local south-west origin (0, 0).",
    });
  }

  scene.entities.forEach((entity, index) => {
    if (ids.has(entity.id)) {
      issues.push({
        path: `entities[${index}].id`,
        message: `Entity ID '${entity.id}' is not unique.`,
      });
      return;
    }
    ids.add(entity.id);
    entitiesById.set(entity.id, entity);
    if (!/^[A-Za-z][A-Za-z0-9_-]{1,63}$/.test(entity.id)) {
      issues.push({
        path: `entities[${index}].id`,
        message: `${entity.id} is not a valid stable entity ID.`,
      });
    }
    if (entity.label.trim().length === 0) {
      issues.push({
        path: `entities[${index}].label`,
        message: `${entity.id} needs a non-empty label.`,
      });
    }
    if (!isValidPoint(entity.position_m)) {
      issues.push({
        path: `entities[${index}].position_m`,
        message: `${entity.id} has an invalid room position.`,
      });
    }
    if (!isValidDimensions(entity.dimensions_m)) {
      issues.push({
        path: `entities[${index}].dimensions_m`,
        message: `${entity.id} has invalid dimensions; width, depth, and height must be positive.`,
      });
    }
    if (entity.position_m.x + entity.dimensions_m.x > room.dimensions_m.x) {
      issues.push({
        path: `entities[${index}].position_m.x`,
        message: `${entity.id} extends beyond the room width of ${room.dimensions_m.x} m.`,
      });
    }
    if (entity.position_m.y + entity.dimensions_m.y > room.dimensions_m.y) {
      issues.push({
        path: `entities[${index}].position_m.y`,
        message: `${entity.id} extends beyond the room depth of ${room.dimensions_m.y} m.`,
      });
    }
    if (entity.dimensions_m.z > room.dimensions_m.z) {
      issues.push({
        path: `entities[${index}].dimensions_m.z`,
        message: `${entity.id} is taller than the room height of ${room.dimensions_m.z} m.`,
      });
    }
  });

  const rackSources = new Map<string, string[]>();
  const powerTargets = new Map<string, RackEntity[]>();
  scene.entities.forEach((entity) => {
    if (entity.type === "rack") rackSources.set(entity.id, []);
    if (entity.type === "power") powerTargets.set(entity.id, []);
  });
  const connectionIds = new Set<string>();
  const pairs = new Set<string>();

  scene.connections.forEach((connection, index) => {
    if (ids.has(connection.id) || connectionIds.has(connection.id)) {
      issues.push({
        path: `connections[${index}].id`,
        message: `Connection ID '${connection.id}' is not unique.`,
      });
    }
    connectionIds.add(connection.id);
    const pair = `${connection.source_id}->${connection.target_id}`;
    if (pairs.has(pair)) {
      issues.push({
        path: `connections[${index}]`,
        message: "Duplicate power connections between the same source and target are not allowed.",
      });
    }
    pairs.add(pair);
    const source = entitiesById.get(connection.source_id);
    const target = entitiesById.get(connection.target_id);
    if (!source) {
      issues.push({
        path: `connections[${index}].source_id`,
        message: `Source entity '${connection.source_id}' does not exist.`,
      });
    }
    if (!target) {
      issues.push({
        path: `connections[${index}].target_id`,
        message: `Target entity '${connection.target_id}' does not exist.`,
      });
    }
    if (!source || !target) return;
    if (source.type !== "power" || target.type !== "rack") {
      issues.push({
        path: `connections[${index}]`,
        message: "Power connections must run from a power node to a rack.",
      });
      return;
    }
    rackSources.get(target.id)?.push(source.id);
    powerTargets.get(source.id)?.push(target);
  });

  scene.entities.forEach((entity, index) => {
    if (entity.type === "rack" && rackSources.get(entity.id)?.length === 0) {
      issues.push({
        path: `entities[${index}].id`,
        message: `Rack '${entity.id}' is disconnected; connect it to a power node before generating CAD.`,
      });
    }
    if (entity.type === "rack" && (rackSources.get(entity.id)?.length ?? 0) > 1) {
      issues.push({
        path: `entities[${index}].id`,
        message: `Rack '${entity.id}' has more than one power connection in the prototype.`,
      });
    }
    if (entity.type === "power" && powerTargets.get(entity.id)?.length === 0) {
      issues.push({
        path: `entities[${index}].id`,
        message: `Power node '${entity.id}' is disconnected.`,
      });
    }
    if (entity.type === "power") {
      const load = (powerTargets.get(entity.id) ?? []).reduce(
        (total, rack) => total + rack.power_draw_kw,
        0,
      );
      if (load > entity.capacity_kw) {
        issues.push({
          path: `entities[${index}].capacity_kw`,
          message: `Power node '${entity.id}' carries ${load} kW, exceeding its ${entity.capacity_kw} kW capacity.`,
        });
      }
    }
  });
  return issues;
}

function parseScene(value: Record<string, unknown>): Scene {
  const schemaVersion = requiredString(value, "schema_version");
  if (schemaVersion !== SCHEMA_VERSION) {
    throw new SceneDecodeError(`Unsupported scene schema version '${schemaVersion}'.`);
  }
  const units = requiredString(value, "units");
  if (units !== "m") throw new SceneDecodeError("Scene units must be metres ('m').");
  const coordinateSystem = requiredString(value, "coordinate_system");
  if (coordinateSystem !== "room-local-south-west") {
    throw new SceneDecodeError("Scene coordinates must use the room-local south-west convention.");
  }
  const project = parseProject(requiredRecord(value, "project"));
  const room = parseRoom(requiredRecord(value, "room"));
  const canvasValue = requiredRecord(value, "canvas");
  const origin = requiredString(canvasValue, "origin");
  if (origin !== "south-west") throw new SceneDecodeError("Canvas origin must be south-west.");
  const canvas: CanvasMetadata = {
    pixels_per_meter: boundedNumber(canvasValue, "pixels_per_meter", 1, 500),
    origin: "south-west",
  };
  const revision = integer(value, "revision", 0, 2_000_000_000);
  const entitiesValue = requiredArray(value, "entities");
  const connectionsValue = requiredArray(value, "connections");
  if (entitiesValue.length > 100 || connectionsValue.length > 200) {
    throw new SceneDecodeError("The scene exceeds the supported entity or connection limit.");
  }
  return {
    schema_version: SCHEMA_VERSION,
    project,
    revision,
    units: "m",
    coordinate_system: "room-local-south-west",
    canvas,
    room,
    entities: entitiesValue.map((entity, index) => parseEntity(requiredRecordAt(entity, index))),
    connections: connectionsValue.map((connection, index) =>
      parseConnection(requiredRecordAt(connection, index)),
    ),
  };
}

function isValidPoint(point: Point2D): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= 100 &&
    point.y <= 100
  );
}

function isValidDimensions(dimensions: Dimensions): boolean {
  return (
    Number.isFinite(dimensions.x) &&
    Number.isFinite(dimensions.y) &&
    Number.isFinite(dimensions.z) &&
    dimensions.x > 0 &&
    dimensions.y > 0 &&
    dimensions.z > 0
  );
}

function parseProject(value: Record<string, unknown>): ProjectMetadata {
  return {
    project_id: validId(value, "project_id"),
    name: boundedString(value, "name", 120),
    description: optionalString(value, "description", "", 500),
  };
}

function parseRoom(value: Record<string, unknown>): Room {
  if (requiredString(value, "type") !== "room")
    throw new SceneDecodeError("Room type must be 'room'.");
  return {
    id: validId(value, "id"),
    type: "room",
    label: boundedString(value, "label", 120),
    position_m: parsePoint(requiredRecord(value, "position_m")),
    dimensions_m: parseDimensions(requiredRecord(value, "dimensions_m")),
  };
}

function parseEntity(value: Record<string, unknown>): SceneEntity {
  const type = requiredString(value, "type");
  const base = {
    id: validId(value, "id"),
    label: boundedString(value, "label", 120),
    position_m: parsePoint(requiredRecord(value, "position_m")),
    dimensions_m: parseDimensions(requiredRecord(value, "dimensions_m")),
  };
  if (type === "rack") {
    return {
      ...base,
      type,
      rack_u: integer(value, "rack_u", 1, 60),
      power_draw_kw: boundedNumber(value, "power_draw_kw", 0, 1000),
    };
  }
  if (type === "power") {
    return {
      ...base,
      type,
      capacity_kw: boundedNumber(value, "capacity_kw", 0.001, 10_000),
    };
  }
  throw new SceneDecodeError(`Unsupported entity type '${type}'.`);
}

function parseConnection(value: Record<string, unknown>): PowerConnection {
  if (requiredString(value, "type") !== "power") {
    throw new SceneDecodeError("Connection type must be 'power'.");
  }
  return {
    id: validId(value, "id"),
    type: "power",
    source_id: validId(value, "source_id"),
    target_id: validId(value, "target_id"),
  };
}

function parsePoint(value: Record<string, unknown>): Point2D {
  return {
    x: boundedNumber(value, "x", 0, 100),
    y: boundedNumber(value, "y", 0, 100),
  };
}

function parseDimensions(value: Record<string, unknown>): Dimensions {
  return {
    x: boundedNumber(value, "x", Number.MIN_VALUE, 100),
    y: boundedNumber(value, "y", Number.MIN_VALUE, 100),
    z: boundedNumber(value, "z", Number.MIN_VALUE, 20),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredRecord(value: Record<string, unknown>, key: string): Record<string, unknown> {
  const result = value[key];
  if (!isRecord(result)) throw new SceneDecodeError(`Scene field '${key}' must be an object.`);
  return result;
}

function requiredRecordAt(value: unknown, index: number): Record<string, unknown> {
  if (!isRecord(value))
    throw new SceneDecodeError(`Scene collection item ${index} must be an object.`);
  return value;
}

function requiredArray(value: Record<string, unknown>, key: string): unknown[] {
  const result = value[key];
  if (!Array.isArray(result)) throw new SceneDecodeError(`Scene field '${key}' must be an array.`);
  return result;
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const result = value[key];
  if (typeof result !== "string" || result.trim().length === 0) {
    throw new SceneDecodeError(`Scene field '${key}' must be a non-empty string.`);
  }
  return result;
}

function boundedString(value: Record<string, unknown>, key: string, maxLength: number): string {
  const result = requiredString(value, key);
  if (result.length > maxLength) throw new SceneDecodeError(`Scene field '${key}' is too long.`);
  return result;
}

function optionalString(
  value: Record<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
): string {
  const result = value[key];
  if (result === undefined) return fallback;
  if (typeof result !== "string" || result.length > maxLength) {
    throw new SceneDecodeError(`Scene field '${key}' must be a short string.`);
  }
  return result;
}

function validId(value: Record<string, unknown>, key: string): string {
  const result = requiredString(value, key);
  if (!/^[A-Za-z][A-Za-z0-9_-]{1,63}$/.test(result)) {
    throw new SceneDecodeError(
      `Scene field '${key}' must be a stable ID using letters, numbers, '_' or '-'.`,
    );
  }
  return result;
}

function boundedNumber(
  value: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number {
  const result = value[key];
  if (typeof result !== "number" || !Number.isFinite(result) || result < min || result > max) {
    throw new SceneDecodeError(
      `Scene field '${key}' must be a finite number between ${min} and ${max}.`,
    );
  }
  return result;
}

function integer(value: Record<string, unknown>, key: string, min: number, max: number): number {
  const result = value[key];
  if (typeof result !== "number" || !Number.isInteger(result) || result < min || result > max) {
    throw new SceneDecodeError(
      `Scene field '${key}' must be an integer between ${min} and ${max}.`,
    );
  }
  return result;
}
