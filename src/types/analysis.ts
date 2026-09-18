/**
 * Renderer-facing analysis types.
 *
 * These re-export the shared contract so UI components import from a single
 * local path while the schema itself stays owned by `shared/analysis.ts`,
 * which the main process validates against.
 */
export type {
  DetectedObject,
  DocumentField,
  DocumentInfo,
  ImageAnalysis,
  ImageCategory,
  PersonDetail,
} from '@shared/analysis';
export type {
  AnalysisError,
  AnalysisErrorCode,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  AppStatus,
} from '@shared/ipc';
