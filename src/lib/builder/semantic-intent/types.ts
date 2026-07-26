export type NodeType = "input" | "button" | "text" | "box" | "list";
export type InputType = "text" | "email" | "password" | "number";
export type ActionType = "submit" | "cancel" | "navigate";
export type IntentType = "FormIntent" | "NavigationIntent" | "StaticIntent";

export interface RawNode {
  id: string;
  type: NodeType;
  label?: string;
  text?: string;
  inputType?: InputType;
  name?: string;
  action?: ActionType;
  children?: RawNode[];
  className?: string;
}

export interface SmartNode extends RawNode {
  stateKey?: string;
  isInteractive?: boolean;
  eventHandlers?: {
    onChange?: boolean;
    onClick?: boolean;
    onSubmit?: boolean;
  };
}

export interface EngineResult {
  componentName: string;
  code: string;
  intent: IntentType;
}
