import { z } from "zod";

import type { SerializedCommand } from "./command.interface";

const BuilderNodeLooseSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().nullable(),
    children: z.array(z.string()),
    props: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const AddNodePayloadSchema = z.object({
  parentId: z.string().min(1),
  node: BuilderNodeLooseSchema,
  index: z.number().int().nonnegative().optional(),
});

export const RemoveNodePayloadSchema = z.object({
  nodeId: z.string().min(1),
});

export const UpdatePropertyPayloadSchema = z.object({
  nodeId: z.string().min(1),
  path: z.string().min(1),
  value: z.unknown(),
});

export const MoveNodePayloadSchema = z.object({
  nodeId: z.string().min(1),
  newParentId: z.string().min(1),
  index: z.number().int().nonnegative().optional(),
});

export const BatchPayloadSchema = z.object({
  count: z.number().int().nonnegative(),
  commands: z.array(z.unknown()).optional(),
});

const schemaByType: Record<string, z.ZodType> = {
  ADD_NODE: AddNodePayloadSchema,
  REMOVE_NODE: RemoveNodePayloadSchema,
  UPDATE_PROPERTY: UpdatePropertyPayloadSchema,
  MOVE_NODE: MoveNodePayloadSchema,
  BATCH: BatchPayloadSchema,
};

export function parseCommandPayload(serialized: SerializedCommand): unknown {
  const schema = schemaByType[serialized.type];
  if (!schema) {
    throw new Error(`No payload schema registered for command type: ${serialized.type}`);
  }
  return schema.parse(serialized.payload);
}
