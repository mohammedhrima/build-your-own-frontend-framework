// Messages between the workbench and the sandboxed preview iframe.

/** A serialized JS value (see sandbox/runtime.ts `ser`). */
export type Val =
  | { t: "str"; v: string }
  | { t: "num"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "undef" }
  | { t: "null" }
  | { t: "big"; v: string }
  | { t: "sym"; v: string }
  | { t: "fn"; name: string; src: string }
  | { t: "err"; name: string; message: string; stack: string }
  | { t: "node"; id: number; kind: "el" | "text" | "doc" | "other"; tag?: string; attrs?: [string, string][]; text?: string }
  | { t: "arr"; len: number; items: Val[]; more: boolean }
  | { t: "obj"; ctor: string; entries: [string, Val][]; more: boolean }
  | { t: "map"; size: number; entries: [Val, Val][] }
  | { t: "set"; size: number; items: Val[] }
  | { t: "date"; v: string }
  | { t: "re"; v: string }
  | { t: "circ" }
  | { t: "deep"; ctor: string };

export type Source = { file: string; line: number; col: number };

export type DomNode = {
  id: number;
  k: 1 | 3 | 8; // element, text, comment
  tag?: string;
  attrs?: [string, string][];
  text?: string;
  kids?: DomNode[];
};

export type VNodeSnap = {
  type: string;
  tag?: string;
  value?: string;
  props: [string, Val][];
  key?: string;
  domId?: number;
  hooks?: { name: string; value: Val }[];
  kids: VNodeSnap[];
};

export type FromFrame =
  | { kind: "ready"; hash: string; title: string }
  | { kind: "location"; hash: string; title: string }
  | {
      kind: "console";
      method: string;
      level: "log" | "info" | "warn" | "error" | "debug";
      args: Val[];
      source?: Source;
      stack?: string;
      inPromise?: boolean;
    }
  | { kind: "eval-result"; ok: boolean; value: Val }
  | { kind: "dom"; tree: DomNode | null; changed: number[]; attrs: Record<number, string[]>; title: string }
  | { kind: "vdom"; tree: VNodeSnap | null };

export type ToFrame =
  | { kind: "eval"; code: string }
  | { kind: "highlight"; id: number | null; label?: boolean }
  | { kind: "flash-updates"; on: boolean }
  | { kind: "mark"; marks: { id: number; label: string }[] }
  | { kind: "nav"; to: "back" | "forward" | string }
  | { kind: "select"; id: number };
