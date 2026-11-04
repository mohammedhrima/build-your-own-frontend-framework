// A step declares only what it changes. `steps/index.ts` composes the full
// project snapshot for every step.
//
// Teaching comments are written as `//! text`. In the step that adds them they
// show as `// text`; in later steps (file carried over unchanged) they are
// stripped, so older code stays clean.
export type StepDef = {
  id: string;
  title: string;
  /** One short line, shown in the status bar. */
  goal: string;
  /** Optional hands-on prompt. */
  try?: string;
  /** File opened when the step loads. */
  focus: string;
  /** Start from an empty project instead of the previous step. */
  reset?: boolean;
  changes: Record<string, string>;
  deletes?: string[];
};

export type FileStatus = "added" | "modified" | undefined;

export type Step = Omit<StepDef, "changes" | "deletes"> & {
  index: number;
  /** Full project, display version (comments resolved). */
  files: Record<string, string>;
  /** Same project one step earlier (for diffs / badges). */
  prevFiles: Record<string, string>;
  status: Record<string, FileStatus>;
};
