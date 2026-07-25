import type { CommandFactory, ICommand, SerializedCommand } from "./command.interface";
import { AddNodeCommand, type AddNodePayload } from "./impl/addNode.command";
import { MoveNodeCommand, type MoveNodePayload } from "./impl/moveNode.command";
import { RemoveNodeCommand, type RemoveNodePayload } from "./impl/removeNode.command";
import {
  UpdatePropertyCommand,
  type UpdatePropertyPayload,
} from "./impl/updateProperty.command";

export class CommandRegistry {
  private factories = new Map<string, CommandFactory>();

  register(type: string, factory: CommandFactory): void {
    this.factories.set(type, factory);
  }

  create(serialized: SerializedCommand): ICommand {
    const factory = this.factories.get(serialized.type);
    if (!factory) {
      throw new Error(`No command factory registered for type: ${serialized.type}`);
    }
    return factory(serialized);
  }

  has(type: string): boolean {
    return this.factories.has(type);
  }
}

export function createDefaultCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  registry.register("ADD_NODE", (serialized) =>
    AddNodeCommand.fromSerialized(serialized as SerializedCommand<AddNodePayload>),
  );
  registry.register("REMOVE_NODE", (serialized) =>
    RemoveNodeCommand.fromSerialized(serialized as SerializedCommand<RemoveNodePayload>),
  );
  registry.register("UPDATE_PROPERTY", (serialized) =>
    UpdatePropertyCommand.fromSerialized(
      serialized as SerializedCommand<UpdatePropertyPayload>,
    ),
  );
  registry.register("MOVE_NODE", (serialized) =>
    MoveNodeCommand.fromSerialized(serialized as SerializedCommand<MoveNodePayload>),
  );

  return registry;
}

export const globalCommandRegistry = createDefaultCommandRegistry();
