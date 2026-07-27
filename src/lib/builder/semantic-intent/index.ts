import type { RawNode, EngineResult } from "./types";
import { Detector } from "./detector";
import { StateInjector } from "./injector";
import { CodeEmitter } from "./emitter";
import { AISpatialContextEngine } from "./spatialEngine";

export class SemanticIntentEngine {
  private detector: Detector;
  private injector: StateInjector;
  private emitter: CodeEmitter;
  private spatial: AISpatialContextEngine;

  constructor() {
    this.detector = new Detector();
    this.injector = new StateInjector();
    this.emitter = new CodeEmitter();
    this.spatial = new AISpatialContextEngine();
  }

  public generateCode(componentName: string, rawNodes: RawNode[]): EngineResult {
    // Always-on mobile auto-fix before intent detection / code emit
    const responsiveNodes = this.spatial.autoFixMobileResponsive(rawNodes);
    const intent = this.detector.detectIntent(responsiveNodes);
    const smartNodes = this.injector.injectState(intent, responsiveNodes);
    return this.emitter.emit(componentName, intent, smartNodes);
  }
}

export * from "./types";
export { AISpatialContextEngine } from "./spatialEngine";
export type { ScopedContextResult } from "./spatialEngine";
export {
  applyScopedPromptHeuristic,
  runScopedEditPipeline,
} from "./scopedEdit";
export type { ScopedEditPipelineResult } from "./scopedEdit";
