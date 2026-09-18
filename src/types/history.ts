import type { ImageAnalysis } from './analysis';

/** One completed analysis, kept in memory for the current session only. */
export interface HistoryEntry {
  id: string;
  fileName: string;
  width: number;
  height: number;
  /** Small JPEG data URL, or null if the thumbnail could not be rendered. */
  thumbnail: string | null;
  analysis: ImageAnalysis;
  model: string;
  durationMs: number;
  analyzedAt: number;
}
