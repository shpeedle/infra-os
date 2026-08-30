import type { EntityField } from "../features/workspace/types";
import type { Scene, SceneEntity } from "../domain/scene";

interface InspectorProps {
  scene: Scene;
  selectedEntity: SceneEntity | null;
  onFieldChange: (field: EntityField, value: string | number) => void;
  onDelete: () => void;
}

export function Inspector({ scene, selectedEntity, onFieldChange, onDelete }: InspectorProps) {
  return (
    <aside className="inspector panel-scroll" aria-label="Entity inspector">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Properties</span>
          <h2>{selectedEntity ? selectedEntity.label : "Inspector"}</h2>
        </div>
        {selectedEntity && <span className="entity-badge">{selectedEntity.type}</span>}
      </div>
      {!selectedEntity ? (
        <div className="empty-panel">
          <div className="empty-mark">+</div>
          <p>Select a rack or power node to inspect its engineering properties.</p>
          <span className="helper-text">Drag nodes on the canvas or use the fields below.</span>
        </div>
      ) : (
        <div className="inspector-form">
          <div className="readout-row">
            <span>Stable ID</span>
            <code>{selectedEntity.id}</code>
          </div>
          <label className="field field--wide">
            <span>Label</span>
            <input
              value={selectedEntity.label}
              onChange={(event) => onFieldChange("label", event.target.value)}
              maxLength={120}
            />
          </label>
          <fieldset>
            <legend>Position / metres</legend>
            <div className="field-grid">
              <NumberField
                label="X"
                value={selectedEntity.position_m.x}
                step={0.1}
                onChange={(value) => onFieldChange("position_x", value)}
              />
              <NumberField
                label="Y"
                value={selectedEntity.position_m.y}
                step={0.1}
                onChange={(value) => onFieldChange("position_y", value)}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Dimensions / metres</legend>
            <div className="field-grid field-grid--three">
              <NumberField
                label="W"
                value={selectedEntity.dimensions_m.x}
                step={0.01}
                onChange={(value) => onFieldChange("dimension_x", value)}
              />
              <NumberField
                label="D"
                value={selectedEntity.dimensions_m.y}
                step={0.01}
                onChange={(value) => onFieldChange("dimension_y", value)}
              />
              <NumberField
                label="H"
                value={selectedEntity.dimensions_m.z}
                step={0.01}
                onChange={(value) => onFieldChange("dimension_z", value)}
              />
            </div>
          </fieldset>
          {selectedEntity.type === "rack" ? (
            <>
              <NumberField
                label="Rack height / U"
                value={selectedEntity.rack_u}
                step={1}
                min={1}
                max={60}
                onChange={(value) => onFieldChange("rack_u", value)}
              />
              <NumberField
                label="Power draw / kW"
                value={selectedEntity.power_draw_kw}
                step={0.1}
                min={0}
                max={1000}
                onChange={(value) => onFieldChange("power_draw_kw", value)}
              />
            </>
          ) : (
            <NumberField
              label="Capacity / kW"
              value={selectedEntity.capacity_kw}
              step={0.1}
              min={0.1}
              max={10000}
              onChange={(value) => onFieldChange("capacity_kw", value)}
            />
          )}
          <div className="inspector-actions">
            <button className="button button--danger" type="button" onClick={onDelete}>
              Remove {selectedEntity.type}
            </button>
          </div>
          <p className="helper-text">
            Coordinates are room-local, measured from the south-west corner. Room bounds are{" "}
            {scene.room.dimensions_m.x} × {scene.room.dimensions_m.y} m.
          </p>
        </div>
      )}
    </aside>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

function NumberField({ label, value, step, min, max, onChange }: NumberFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) onChange(nextValue);
        }}
      />
    </label>
  );
}
