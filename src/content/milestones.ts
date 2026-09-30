import { ANNOTATIONS } from "./annotations";
import { CHAPTERS } from "./story";

/** The story's key models and the turning points: bigger on the chart, and their labels come first. */
export const MILESTONE_IDS = [...new Set([...CHAPTERS.flatMap((c) => c.models), ...ANNOTATIONS.map((a) => a.model)])];
