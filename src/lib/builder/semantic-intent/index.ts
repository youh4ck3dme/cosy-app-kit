import type { RawNode, EngineResult } from "./types";
import { Detector } from "./detector";
import { StateInjector } from "./injector";
import { CodeEmitter } from "./emitter";
import { AISpatialContextEngine } from "./spatialEngine";
import { IPhone17AirAdapter } from "../mobile/iPhone17AirAdapter";

export class SemanticIntentEngine {
  private detector: Detector;
  private injector: StateInjector;
  private emitter: CodeEmitter;
  private spatial: AISpatialContextEngine;
  private iPhone17Air: IPhone17AirAdapter;

  constructor() {
    this.detector = new Detector();
    this.injector = new StateInjector();
    this.emitter = new CodeEmitter();
    this.spatial = new AISpatialContextEngine();
    this.iPhone17Air = new IPhone17AirAdapter();
  }

  public generateCode(componentName: string, rawNodes: RawNode[]): EngineResult {
    // 1) Spatial mobile auto-fix (rigid Figma widths / flex)
    // 2) iPhone 17 Air hardware pass (dvh, safe-area, GPU, 44pt touch)
    const responsiveNodes = this.spatial.autoFixMobileResponsive(rawNodes);
    const airNodes = this.iPhone17Air.optimizeForIPhone17Air(responsiveNodes);
    const intent = this.detector.detectIntent(airNodes);
    const smartNodes = this.injector.injectState(intent, airNodes);
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
export { FigmaAdapterEngine } from "./FigmaAdapterEngine";
export { IPhone17AirAdapter } from "../mobile/iPhone17AirAdapter";
