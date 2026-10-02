export type ForgeV2OperationType =
  | "hole"
  | "slot"
  | "cutout_rect"
  | "vent_linear"
  | "text_engrave"
  | "text_emboss"
  | "rib";

export type ForgeV2Operation = {
  id: string;
  type: ForgeV2OperationType;
  version: 1;
  enabled: boolean;
  target?: {
    face?: "top" | "bottom" | "front" | "back" | "left" | "right";
  };
  placement?: {
    x?: number;
    y?: number;
    z?: number;
    rotation_deg?: number;
  };
  params: Record<string, number | string | boolean>;
};

export type ForgeV2DesignSpec = {
  schema_version: 2;
  engine_version: "mesh-v2" | "cad-v2";
  product_slug: string;
  product_version: string;
  params: Record<string, number | string | boolean>;
  operations: ForgeV2Operation[];
};

export function createOperationId() {
  return globalThis.crypto?.randomUUID?.() || `op_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function validateOperationShape(op: ForgeV2Operation): string[] {
  const errors: string[] = [];
  if (!op.id) errors.push("La operación necesita id.");
  if (op.version !== 1) errors.push("Versión de operación no soportada.");
  if (!op.type) errors.push("Falta el tipo de operación.");
  if (!op.params || typeof op.params !== "object") errors.push("Faltan parámetros.");
  return errors;
}
