import type { RawNode, EngineResult } from "./types";
import { Detector } from "./detector";
import { StateInjector } from "./injector";
import { CodeEmitter } from "./emitter";

export class SemanticIntentEngine {
  private detector: Detector;
  private injector: StateInjector;
  private emitter: CodeEmitter;

  constructor() {
    this.detector = new Detector();
    this.injector = new StateInjector();
    this.emitter = new CodeEmitter();
  }

  public generateCode(componentName: string, rawNodes: RawNode[]): EngineResult {
    const intent = this.detector.detectIntent(rawNodes);
    const smartNodes = this.injector.injectState(intent, rawNodes);
    return this.emitter.emit(componentName, intent, smartNodes);
  }
}

export * from "./types";
