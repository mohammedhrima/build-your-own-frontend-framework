import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  Decoration,
  type DecorationSet,
} from "@codemirror/view";
import {
  EditorState,
  StateField,
  StateEffect,
  RangeSetBuilder,
} from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import {
  HighlightStyle,
  syntaxHighlighting,
  indentUnit,
} from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";
import type { LineRange } from "./diff.js";

const addedLine = Decoration.line({ class: "cm-added" });
const setAdded = StateEffect.define<LineRange[]>();

const addedField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setAdded)) {
        const b = new RangeSetBuilder<Decoration>();
        const doc = tr.state.doc;
        for (const r of e.value) {
          for (let ln = r.from; ln <= r.to && ln <= doc.lines; ln++) {
            b.add(doc.line(ln).from, doc.line(ln).from, addedLine);
          }
        }
        deco = b.finish();
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const theme = EditorView.theme(
  {
    "&": { color: "#dbe4f3", backgroundColor: "transparent", height: "100%" },
    ".cm-scroller": {
      fontFamily:
        "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: "13px",
      lineHeight: "1.7",
      overflow: "auto",
    },
    ".cm-content": { padding: "14px 0 60vh 0", caretColor: "#36b6ff" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      border: "none",
      color: "#46506a",
      paddingRight: "4px",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 12px" },
    ".cm-line": { padding: "0 16px" },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.035)" },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#8a97b8",
    },
    ".cm-added": {
      backgroundColor: "rgba(54,182,255,0.13)",
      boxShadow: "inset 3px 0 0 #36b6ff",
    },
    ".cm-cursor": { borderLeftColor: "#36b6ff" },
    "&.cm-focused": { outline: "none" },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(54,182,255,0.22) !important",
    },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: "#8aa6ff" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "#c79bff" },
  { tag: [t.string, t.special(t.string)], color: "#86e0a8" },
  { tag: t.comment, color: "#5b6680", fontStyle: "italic" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#f3ab73" },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName)],
    color: "#62c9ff",
  },
  { tag: [t.typeName, t.className], color: "#5fd6d0" },
  { tag: t.propertyName, color: "#9fb3d6" },
  { tag: t.tagName, color: "#8aa6ff" },
  { tag: t.attributeName, color: "#86e0a8" },
  { tag: t.operator, color: "#9fb3d6" },
  { tag: t.variableName, color: "#dbe4f3" },
  { tag: [t.brace, t.bracket, t.paren, t.punctuation], color: "#7d8aab" },
]);

export type Editor = {
  view: EditorView;
  setStep(code: string, added: LineRange[]): void;
  getCode(): string;
  destroy(): void;
};

export function createEditor(
  parent: HTMLElement,
  onChange: (code: string) => void,
): Editor {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        indentUnit.of("  "),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        javascript({ jsx: true, typescript: true }),
        syntaxHighlighting(highlight),
        addedField,
        theme,
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(view.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    view,
    getCode: () => view.state.doc.toString(),
    setStep(code, added) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: code },
      });
      view.dispatch({ effects: setAdded.of(added) });
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const firstLine = added.length
        ? Math.min(added[0].from, view.state.doc.lines)
        : 1;
      const pos = view.state.doc.line(firstLine).from;
      view.dispatch({
        effects: EditorView.scrollIntoView(pos, {
          y: added.length ? "center" : "start",
        }),
        scrollIntoView: reduce,
      });
    },
    destroy: () => view.destroy(),
  };
}

function languageFor(path: string): Extension {
  if (path.endsWith(".json")) return json();
  if (path.endsWith(".html")) return html();
  return javascript({ jsx: true, typescript: true });
}

export type Viewer = { destroy(): void };

export function createViewer(
  parent: HTMLElement,
  path: string,
  code: string,
): Viewer {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        languageFor(path),
        syntaxHighlighting(highlight),
        theme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
      ],
    }),
  });
  return { destroy: () => view.destroy() };
}
