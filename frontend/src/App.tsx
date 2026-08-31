import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { Inspector } from "./components/Inspector";
import { SchematicNode } from "./components/SchematicNode";
import {
  createSeedScene,
  decodeSceneJson,
  MAX_SCENE_BYTES,
  sceneToJson,
  validateScene,
  type RackEntity,
  type Scene,
  type SceneEntity,
} from "./domain/scene";
import {
  formatRevisionDate,
  loadRevisionSnapshots,
  saveRevisionSnapshot,
  type RevisionSnapshot,
} from "./domain/revisions";
import {
  flowPositionToScenePosition,
  sceneToFlowEdges,
  sceneToFlowNodes,
  type SceneFlowNode,
} from "./features/workspace/flowMapping";
import type { EntityField } from "./features/workspace/types";
import { ApiRequestError, artifactUrl, generateCad, type GenerateResponse } from "./lib/api";
import { getInitialTheme, THEME_COLORS, THEME_STORAGE_KEY, type Theme } from "./theme";

const nodeTypes = {
  room: SchematicNode,
  rack: SchematicNode,
  power: SchematicNode,
};

const ModelViewer = lazy(() =>
  import("./components/ModelViewer").then((module) => ({ default: module.ModelViewer })),
);

type GenerationState =
  | { status: "idle" }
  | { status: "generating"; submittedRevision: number }
  | { status: "success"; submittedRevision: number; durationMs: number }
  | {
      status: "error";
      submittedRevision: number;
      message: string;
      issues: { path: string; message: string }[];
    };

export default function App() {
  const [scene, setScene] = useState<Scene>(loadInitialScene);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<Record<string, XYPosition>>({});
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const [artifact, setArtifact] = useState<GenerateResponse | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const abortController = useRef<AbortController | null>(null);

  const sceneIssues = useMemo(() => validateScene(scene), [scene]);
  const flowEdges = useMemo(
    () => sceneToFlowEdges(scene, selectedConnectionId),
    [scene, selectedConnectionId],
  );
  const selectedEntity = scene.entities.find((entity) => entity.id === selectedEntityId) ?? null;
  const flowNodes = useMemo(
    () =>
      sceneToFlowNodes(scene, selectedEntityId).map((node) =>
        dragPositions[node.id] ? { ...node, position: dragPositions[node.id] } : node,
      ),
    [dragPositions, scene, selectedEntityId],
  );
  const artifactIsCurrent = artifact?.scene_revision === scene.revision;
  const glbUrl = artifact
    ? artifactUrl(artifact.formats.find((format) => format.format === "glb")?.download_url ?? "")
    : null;
  const revisionSnapshots = useMemo(() => {
    const stored = loadRevisionSnapshots(scene.project.project_id);
    if (stored.some((snapshot) => snapshot.revision === scene.revision)) return stored;
    return [{ revision: scene.revision, saved_at: new Date().toISOString(), scene }, ...stored];
  }, [scene]);

  useEffect(() => {
    try {
      localStorage.setItem("infra-os.scene.v1", sceneToJson(scene));
    } catch {
      // Local persistence is a convenience; the explicit JSON export remains available.
    }
    saveRevisionSnapshot(scene);
  }, [scene]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[theme].paper);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme selection remains active for this session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isFormField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;
      if (isFormField) return;
      if (event.key === "Escape") {
        setSelectedEntityId(null);
        setSelectedConnectionId(null);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedEntityId) {
        event.preventDefault();
        removeEntity(selectedEntityId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => () => abortController.current?.abort(), []);

  function updateScene(update: (current: Scene) => Scene) {
    setScene((current) => ({ ...update(current), revision: current.revision + 1 }));
    setDragPositions({});
  }

  function updateEntityField(field: EntityField, value: string | number) {
    if (!selectedEntity) return;
    if (field === "label" && typeof value === "string" && value.trim().length === 0) return;
    updateScene((current) => ({
      ...current,
      entities: current.entities.map((entity) =>
        entity.id === selectedEntity.id ? updateEntity(entity, field, value) : entity,
      ),
    }));
  }

  function handleNodeDragStop(_: ReactFlowNodeEvent, node: SceneFlowNode) {
    const entity = scene.entities.find((candidate) => candidate.id === node.id);
    if (!entity) return;
    const position = flowPositionToScenePosition(
      node.position,
      entity,
      scene.room,
      scene.canvas.pixels_per_meter,
    );
    updateScene((current) => ({
      ...current,
      entities: current.entities.map((candidate) =>
        candidate.id === entity.id ? { ...candidate, position_m: position } : candidate,
      ),
    }));
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const source = scene.entities.find((entity) => entity.id === connection.source);
    const target = scene.entities.find((entity) => entity.id === connection.target);
    if (!source || !target || source.type !== "power" || target.type !== "rack") {
      setImportMessage("Power edges must run from a power node to a rack.");
      return;
    }
    if (
      scene.connections.some((edge) => edge.source_id === source.id && edge.target_id === target.id)
    ) {
      setImportMessage("That power connection already exists.");
      return;
    }
    setImportMessage(null);
    updateScene((current) => ({
      ...current,
      connections: [
        ...current.connections,
        {
          id: `power-${source.id}-${target.id}`,
          type: "power",
          source_id: source.id,
          target_id: target.id,
        },
      ],
    }));
  }

  function handleEdgesDelete(edges: Edge[]) {
    if (edges.length === 0) return;
    const deletedIds = new Set(edges.map((edge) => edge.id));
    if (selectedConnectionId && deletedIds.has(selectedConnectionId)) setSelectedConnectionId(null);
    updateScene((current) => ({
      ...current,
      connections: current.connections.filter((connection) => !deletedIds.has(connection.id)),
    }));
  }

  function deleteSelectedConnection() {
    if (!selectedConnectionId) return;
    handleEdgesDelete(flowEdges.filter((edge) => edge.id === selectedConnectionId));
  }

  function removeEntity(entityId: string) {
    const entity = scene.entities.find((candidate) => candidate.id === entityId);
    if (!entity) return;
    updateScene((current) => ({
      ...current,
      entities: current.entities.filter((candidate) => candidate.id !== entityId),
      connections: current.connections.filter(
        (connection) => connection.source_id !== entityId && connection.target_id !== entityId,
      ),
    }));
    setSelectedEntityId(null);
  }

  function addRack() {
    const rackNumber = nextRackNumber(scene.entities);
    const row = Math.floor((rackNumber - 1) / 4);
    const column = (rackNumber - 1) % 4;
    const rack: RackEntity = {
      id: `rack-${String(rackNumber).padStart(2, "0")}`,
      type: "rack",
      label: `Rack ${String(rackNumber).padStart(2, "0")}`,
      position_m: { x: 13 + column * 1.4, y: 2 + row * 2.1 },
      dimensions_m: { x: 0.6, y: 1.1, z: 2 },
      rack_u: 42,
      power_draw_kw: 4.8,
    };
    updateScene((current) => ({ ...current, entities: [...current.entities, rack] }));
    setSelectedEntityId(rack.id);
    setImportMessage("Rack added. Connect its left handle to a power node before generating CAD.");
  }

  async function handleGenerate() {
    if (generation.status === "generating" || sceneIssues.length > 0) return;
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    const submittedRevision = scene.revision;
    setImportMessage(null);
    setGeneration({ status: "generating", submittedRevision });
    try {
      const result = await generateCad(scene, controller.signal);
      setArtifact(result);
      setGeneration({
        status: "success",
        submittedRevision,
        durationMs: result.duration_ms,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const apiError = error instanceof ApiRequestError ? error : null;
      setGeneration({
        status: "error",
        submittedRevision,
        message: apiError?.message ?? "CAD generation failed. The current scene was preserved.",
        issues: apiError?.issues ?? [],
      });
    } finally {
      if (abortController.current === controller) abortController.current = null;
    }
  }

  function exportScene() {
    const blob = new Blob([sceneToJson(scene)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${scene.project.project_id}-scene.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function loadRevision(snapshot: RevisionSnapshot) {
    setScene(snapshot.scene);
    setDragPositions({});
    setSelectedEntityId(null);
    setSelectedConnectionId(null);
    setImportMessage(`Loaded revision ${snapshot.revision}. Generate CAD to update the preview.`);
  }

  async function importScene(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_SCENE_BYTES) {
      setImportMessage(
        `Scene JSON must be smaller than ${MAX_SCENE_BYTES.toLocaleString()} bytes.`,
      );
      return;
    }
    try {
      const imported = decodeSceneJson(await file.text());
      setScene(imported);
      setDragPositions({});
      setSelectedEntityId(null);
      setImportMessage(
        `Loaded ${file.name}. The imported scene is now the editable source of truth.`,
      );
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "The scene file could not be imported.",
      );
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  return (
    <ReactFlowProvider>
      <div className="app-shell" data-theme={theme}>
        <header className="app-header">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              IO
            </div>
            <div>
              <div className="brand-name">Infra / OS</div>
              <div className="brand-context">Data-center digital twin</div>
            </div>
          </div>
          <div className="project-context">
            <span className="eyebrow">Current project</span>
            <strong>{scene.project.name}</strong>
            <code>rev {String(scene.revision).padStart(2, "0")}</code>
          </div>
          <div className="header-status" aria-live="polite">
            <span className={`status-dot status-dot--${generation.status}`} aria-hidden="true" />
            <span>{headerStatus(generation, artifactIsCurrent)}</span>
          </div>
          <div className="header-actions">
            <button
              className="button button--quiet theme-toggle"
              type="button"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              aria-pressed={theme === "dark"}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <span className="theme-toggle__icon" aria-hidden="true">
                {theme === "light" ? "☾" : "☀"}
              </span>
              <span className="theme-toggle__label">
                {theme === "light" ? "Dark mode" : "Light mode"}
              </span>
            </button>
            <button
              className="button button--primary header-action"
              type="button"
              onClick={handleGenerate}
              disabled={generation.status === "generating" || sceneIssues.length > 0}
            >
              {generation.status === "generating" ? "Generating…" : "Generate CAD"}
            </button>
          </div>
        </header>

        <div className="workspace-grid">
          <aside className="sidebar panel-scroll" aria-label="Workspace navigation">
            <div className="sidebar-section">
              <span className="eyebrow">Workspace</span>
              <button className="nav-item nav-item--active" type="button">
                <span className="nav-icon">▦</span> Layout editor
              </button>
              <button className="nav-item" type="button" onClick={() => setSelectedEntityId(null)}>
                <span className="nav-icon">◇</span> Scene overview
              </button>
            </div>
            <div className="sidebar-section sidebar-section--details">
              <span className="eyebrow">Scene</span>
              <div className="sidebar-readout">
                <span>Room</span>
                <strong>{scene.room.label}</strong>
                <code>
                  {scene.room.dimensions_m.x} × {scene.room.dimensions_m.y} ×{" "}
                  {scene.room.dimensions_m.z} m
                </code>
              </div>
              <div className="sidebar-stats">
                <div>
                  <strong>
                    {scene.entities.filter((entity) => entity.type === "rack").length}
                  </strong>
                  <span>racks</span>
                </div>
                <div>
                  <strong>
                    {scene.entities.filter((entity) => entity.type === "power").length}
                  </strong>
                  <span>power</span>
                </div>
                <div>
                  <strong>{scene.connections.length}</strong>
                  <span>edges</span>
                </div>
              </div>
            </div>
            <div className="sidebar-section sidebar-section--actions">
              <span className="eyebrow">Scene JSON</span>
              <button className="button button--secondary" type="button" onClick={addRack}>
                + Add rack
              </button>
              <button className="button button--quiet" type="button" onClick={exportScene}>
                Export scene JSON
              </button>
              <button
                className="button button--quiet"
                type="button"
                onClick={() => importInput.current?.click()}
              >
                Import scene JSON
              </button>
              <input
                ref={importInput}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => void importScene(event.target.files?.[0])}
              />
            </div>
            <div className="sidebar-section revision-history">
              <details>
                <summary>Revision history ({revisionSnapshots.length})</summary>
                {revisionSnapshots.length === 0 ? (
                  <p className="helper-text">Saved revisions will appear here as you edit.</p>
                ) : (
                  <div className="revision-list">
                    {revisionSnapshots.map((snapshot) => (
                      <div
                        className="revision-item"
                        key={`${snapshot.revision}-${snapshot.saved_at}`}
                      >
                        <div>
                          <code>rev {String(snapshot.revision).padStart(2, "0")}</code>
                          <span>{formatRevisionDate(snapshot.saved_at)}</span>
                        </div>
                        <button
                          className="button button--quiet"
                          type="button"
                          onClick={() => loadRevision(snapshot)}
                          disabled={snapshot.revision === scene.revision}
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>
            <div className="sidebar-footer">
              <span className="save-indicator">● Local draft saved</span>
              <span>Browser-first persistence</span>
            </div>
          </aside>

          <main className="main-workspace">
            <DiagramCanvas
              theme={theme}
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={(changes) => {
                const positions = changes.filter(
                  (
                    change,
                  ): change is NodeChange<SceneFlowNode> & {
                    type: "position";
                    position: XYPosition;
                  } => change.type === "position" && change.position !== undefined,
                );
                if (positions.length > 0) {
                  setDragPositions((current) => ({
                    ...current,
                    ...Object.fromEntries(positions.map((change) => [change.id, change.position])),
                  }));
                }
              }}
              onNodeClick={(_, node) => {
                if (node.id !== scene.room.id) {
                  setSelectedConnectionId(null);
                  setSelectedEntityId(node.id);
                }
              }}
              onPaneClick={() => {
                setSelectedEntityId(null);
                setSelectedConnectionId(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEntityId(null);
                setSelectedConnectionId(edge.id);
              }}
              onDeleteSelectedEdge={deleteSelectedConnection}
              selectedConnectionId={selectedConnectionId}
              onNodeDragStop={handleNodeDragStop}
              onConnect={handleConnect}
              onEdgesDelete={handleEdgesDelete}
            />
            <Suspense
              fallback={
                <section
                  className="viewer-panel viewer-panel--fallback"
                  aria-label="Generated CAD preview"
                >
                  <div className="viewer-heading">
                    <div>
                      <span className="eyebrow">Browser preview</span>
                      <h2>Generated GLB</h2>
                    </div>
                  </div>
                  <div className="viewer-message" role="status">
                    Loading 3D viewer…
                  </div>
                </section>
              }
            >
              <ModelViewer url={glbUrl} theme={theme} />
            </Suspense>
          </main>

          <aside className="right-rail panel-scroll">
            <Inspector
              scene={scene}
              selectedEntity={selectedEntity}
              onFieldChange={updateEntityField}
              onDelete={() => selectedEntity && removeEntity(selectedEntity.id)}
            />
            <GenerationPanel
              scene={scene}
              issues={sceneIssues}
              generation={generation}
              artifact={artifact}
              artifactIsCurrent={artifactIsCurrent}
              onGenerate={handleGenerate}
            />
          </aside>
        </div>
        {(importMessage || sceneIssues.length > 0) && (
          <div className="bottom-alerts" aria-live="polite">
            {importMessage && <div className="toast toast--warning">{importMessage}</div>}
            {sceneIssues.length > 0 && (
              <div className="toast toast--error">
                <strong>Scene needs attention</strong>
                <span>{sceneIssues[0].message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}

interface DiagramCanvasProps {
  theme: Theme;
  nodes: SceneFlowNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<SceneFlowNode>[]) => void;
  onNodeClick: (event: ReactMouseEvent<Element>, node: SceneFlowNode) => void;
  onPaneClick: () => void;
  onEdgeClick: EdgeMouseHandler;
  onDeleteSelectedEdge: () => void;
  selectedConnectionId: string | null;
  onNodeDragStop: (event: ReactFlowNodeEvent, node: SceneFlowNode) => void;
  onConnect: (connection: Connection) => void;
  onEdgesDelete: (edges: Edge[]) => void;
}

function DiagramCanvas(props: DiagramCanvasProps) {
  const { fitView } = useReactFlow();
  const colors = THEME_COLORS[props.theme];
  return (
    <section className="diagram-panel" aria-label="2D schematic editor">
      <div className="diagram-heading">
        <div>
          <span className="eyebrow">Schematic / top-down</span>
          <h1>
            {props.nodes.find((node) => node.data.kind === "room")?.data.kind === "room"
              ? "North Hall layout"
              : "Layout"}
          </h1>
        </div>
        <div className="diagram-heading__meta">
          <span className="legend-item">
            <i className="legend-swatch legend-swatch--rack" /> Rack
          </span>
          <span className="legend-item">
            <i className="legend-swatch legend-swatch--power" /> Power
          </span>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => fitView({ padding: 0.15 })}
          >
            Fit to room
          </button>
        </div>
      </div>
      <div className="diagram-canvas">
        <ReactFlow
          nodes={props.nodes}
          edges={props.edges}
          nodeTypes={nodeTypes}
          onNodesChange={props.onNodesChange}
          onNodeClick={props.onNodeClick}
          onPaneClick={props.onPaneClick}
          onEdgeClick={props.onEdgeClick}
          onNodeDragStop={props.onNodeDragStop}
          onConnect={props.onConnect}
          onEdgesDelete={props.onEdgesDelete}
          nodesConnectable
          nodesDraggable
          deleteKeyCode={null}
          fitView
          minZoom={0.25}
          maxZoom={2.5}
          onlyRenderVisibleElements
          colorMode={props.theme}
          aria-label="Data-center schematic canvas"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={colors.canvasGrid}
            bgColor={colors.canvas}
          />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) =>
              node.type === "power"
                ? colors.minimapPower
                : node.type === "rack"
                  ? colors.minimapRack
                  : colors.minimapRoom
            }
            bgColor={colors.canvas}
            maskColor={colors.minimapMask}
          />
        </ReactFlow>
        {props.selectedConnectionId && (
          <button
            className="button button--danger canvas-edge-action"
            type="button"
            onClick={props.onDeleteSelectedEdge}
          >
            Delete selected power edge
          </button>
        )}
        <div className="canvas-footnote">
          <span>Origin: south-west</span>
          <span>Scale: {DEFAULT_SCALE_LABEL}</span>
          <span>Drag · connect · select · delete</span>
        </div>
      </div>
    </section>
  );
}

interface GenerationPanelProps {
  scene: Scene;
  issues: { path: string; message: string }[];
  generation: GenerationState;
  artifact: GenerateResponse | null;
  artifactIsCurrent: boolean | undefined;
  onGenerate: () => void;
}

function GenerationPanel({
  scene,
  issues,
  generation,
  artifact,
  artifactIsCurrent,
  onGenerate,
}: GenerationPanelProps) {
  const step = artifact?.formats.find((format) => format.format === "step");
  const glb = artifact?.formats.find((format) => format.format === "glb");
  return (
    <section className="generation-panel" aria-label="CAD generation status">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Explicit sync</span>
          <h2>CAD generation</h2>
        </div>
        <StatusLabel status={generation.status} />
      </div>
      <p className="generation-copy">
        Generate the current scene on demand. Editing the schematic never changes the model
        silently.
      </p>
      <div className="generation-revision">
        <span>Submitted scene</span>
        <code>
          {generation.status === "idle"
            ? "—"
            : `rev ${String(generation.submittedRevision).padStart(2, "0")}`}
        </code>
      </div>
      {issues.length > 0 ? (
        <div className="validation-box validation-box--error">
          <strong>
            {issues.length} validation issue{issues.length === 1 ? "" : "s"}
          </strong>
          {issues.slice(0, 3).map((issue) => (
            <div className="validation-issue" key={`${issue.path}-${issue.message}`}>
              <code>{issue.path}</code>
              <span>{issue.message}</span>
            </div>
          ))}
          {issues.length > 3 && (
            <span className="helper-text">+ {issues.length - 3} more issues</span>
          )}
        </div>
      ) : (
        <div className="validation-box validation-box--success">
          <span className="validation-icon">✓</span>
          <span>Scene checks passed. All objects are inside the room and connected.</span>
        </div>
      )}
      {generation.status === "error" && (
        <div className="generation-error" role="alert">
          <strong>{generation.message}</strong>
          {generation.issues.map((issue) => (
            <span key={`${issue.path}-${issue.message}`}>
              {issue.path}: {issue.message}
            </span>
          ))}
          <span className="helper-text">Your current diagram was not replaced.</span>
        </div>
      )}
      {artifact && (
        <div className={`artifact-box${artifactIsCurrent ? "" : " artifact-box--stale"}`}>
          <div className="artifact-box__title">
            <span>{artifactIsCurrent ? "Current model" : "Earlier model"}</span>
            <code>{artifact.artifact_id}</code>
          </div>
          <div className="artifact-box__meta">
            <span>rev {artifact.scene_revision}</span>
            <span>{artifact.duration_ms} ms</span>
            <span>{artifact.scene_digest}</span>
          </div>
          <div className="artifact-links">
            {step && (
              <a href={artifactUrl(step.download_url)} download>
                ↓ Download STEP
              </a>
            )}
            {glb && (
              <a href={artifactUrl(glb.download_url)} download>
                ↓ Download GLB
              </a>
            )}
          </div>
          {!artifactIsCurrent && (
            <span className="helper-text">
              Edit changes are waiting for the next explicit generation.
            </span>
          )}
        </div>
      )}
      <button
        className="button button--primary button--full"
        type="button"
        onClick={onGenerate}
        disabled={issues.length > 0 || generation.status === "generating"}
      >
        {generation.status === "generating" ? "Generating STEP + GLB…" : "Generate current scene"}
      </button>
      <p className="generation-footnote">
        {scene.entities.length} entities · {scene.connections.length} power edges · metres in /
        millimetres out
      </p>
    </section>
  );
}

function StatusLabel({ status }: { status: GenerationState["status"] }) {
  const labels: Record<GenerationState["status"], string> = {
    idle: "Ready",
    generating: "Generating",
    success: "Generated",
    error: "Failed",
  };
  return <span className={`status-label status-label--${status}`}>{labels[status]}</span>;
}

function updateEntity(
  entity: SceneEntity,
  field: EntityField,
  value: string | number,
): SceneEntity {
  switch (field) {
    case "label":
      return { ...entity, label: String(value) };
    case "position_x":
      return { ...entity, position_m: { ...entity.position_m, x: Number(value) } };
    case "position_y":
      return { ...entity, position_m: { ...entity.position_m, y: Number(value) } };
    case "dimension_x":
      return { ...entity, dimensions_m: { ...entity.dimensions_m, x: Number(value) } };
    case "dimension_y":
      return { ...entity, dimensions_m: { ...entity.dimensions_m, y: Number(value) } };
    case "dimension_z":
      return { ...entity, dimensions_m: { ...entity.dimensions_m, z: Number(value) } };
    case "rack_u":
      return entity.type === "rack" ? { ...entity, rack_u: Number(value) } : entity;
    case "power_draw_kw":
      return entity.type === "rack" ? { ...entity, power_draw_kw: Number(value) } : entity;
    case "capacity_kw":
      return entity.type === "power" ? { ...entity, capacity_kw: Number(value) } : entity;
  }
}

function loadInitialScene(): Scene {
  try {
    const draft = localStorage.getItem("infra-os.scene.v1");
    return draft ? decodeSceneJson(draft) : createSeedScene();
  } catch {
    return createSeedScene();
  }
}

function nextRackNumber(entities: SceneEntity[]): number {
  const used = new Set(entities.map((entity) => entity.id));
  let number = entities.filter((entity) => entity.type === "rack").length + 1;
  while (used.has(`rack-${String(number).padStart(2, "0")}`)) number += 1;
  return number;
}

function headerStatus(generation: GenerationState, artifactIsCurrent: boolean | undefined): string {
  if (generation.status === "generating") return "Generating current scene";
  if (generation.status === "error") return "Generation failed · diagram preserved";
  if (generation.status === "success" && artifactIsCurrent) return "CAD current";
  if (generation.status === "success") return "CAD is based on an earlier revision";
  return "Draft · not generated";
}

type ReactFlowNodeEvent = MouseEvent | TouchEvent;
const DEFAULT_SCALE_LABEL = "50 px = 1 m";
