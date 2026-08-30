import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { SceneFlowNode } from "../features/workspace/flowMapping";

export function SchematicNode(props: NodeProps<SceneFlowNode>) {
  if (props.data.kind !== "entity") return <RoomNode {...props} />;
  return props.data.entity.type === "rack" ? <RackNode {...props} /> : <PowerNode {...props} />;
}

function RoomNode({ data }: NodeProps<SceneFlowNode>) {
  if (data.kind !== "room") return null;
  return (
    <div className="room-node" aria-label={`${data.label} room boundary`}>
      <div className="room-node__label">{data.label}</div>
      <div className="room-node__dimensions">
        {data.dimensions_m.x} × {data.dimensions_m.y} m
      </div>
    </div>
  );
}

function RackNode({ data, selected }: NodeProps<SceneFlowNode>) {
  if (data.kind !== "entity" || data.entity.type !== "rack") return null;
  return (
    <div className={`schematic-node schematic-node--rack${selected ? " is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="power-in" aria-label="Power input" />
      <div className="node-kicker">RACK / {data.entity.rack_u}U</div>
      <div className="node-label" title={data.entity.label}>
        {data.entity.label}
      </div>
      <div className="node-foot">{data.entity.power_draw_kw.toFixed(1)} kW</div>
    </div>
  );
}

function PowerNode({ data, selected }: NodeProps<SceneFlowNode>) {
  if (data.kind !== "entity" || data.entity.type !== "power") return null;
  return (
    <div className={`schematic-node schematic-node--power${selected ? " is-selected" : ""}`}>
      <Handle type="source" position={Position.Right} id="power-out" aria-label="Power output" />
      <div className="node-kicker">POWER / SOURCE</div>
      <div className="node-label" title={data.entity.label}>
        {data.entity.label}
      </div>
      <div className="node-foot">{data.entity.capacity_kw.toFixed(0)} kW capacity</div>
    </div>
  );
}
