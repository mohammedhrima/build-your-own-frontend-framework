import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  Decoration,
  type DecorationSet,
} from "@codemirror/view";
import {
  EditorState,
  StateField,
  StateEffect,
  RangeSetBuilder,
  Compartment,
  type Extension,
} from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  HighlightStyle,
  syntaxHighlighting,
  indentUnit,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { linter, lintGutter, lintKeymap, type Diagnostic } from "@codemirror/lint";
import { unifiedMergeView } from "@codemirror/merge";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { tags as t } from "@lezer/highlight";
import type { LineRange } from "../../utils/diff";
import { isModule, transpile } from "../../sandbox/bundler";

// ---- "added in this step" lines: tinted, with an accent bar ---------------

const addedLine = Decoration.line({ class: "cm-added" });
const setAdded = StateEffect.define<LineRange[]>();

const addedField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    if (tr.docChanged) deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setAdded)) continue;
      const b = new RangeSetBuilder<Decoration>();
      const doc = tr.state.doc;
      for (const r of e.value) {
        for (let ln = r.from; ln <= r.to && ln <= doc.lines; ln++) {
          b.add(doc.line(ln).from, doc.line(ln).from, addedLine);
        }
      }
      deco = b.finish();
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---- demo spotlight: the one change being shown right now --------------------

export type Spot = { from: number; to: number; added: number; removed: number };
const setSpot = StateEffect.define<Spot | null>();
const spotLine = Decoration.line({ class: "cm-spot" });
const spotDel = Decoration.line({ class: "cm-spot-del" });

const spotField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    if (tr.docChanged) deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setSpot)) continue;
      const b = new RangeSetBuilder<Decoration>();
      const doc = tr.state.doc;
      const s = e.value;
      if (s && s.added > 0) {
        for (let ln = s.from; ln <= s.to && ln <= doc.lines; ln++) b.add(doc.line(ln).from, doc.line(ln).from, spotLine);
      } else if (s) {
        // pure deletion: mark the line the removed code was above
        const ln = Math.min(Math.max(1, s.from), doc.lines);
        b.add(doc.line(ln).from, doc.line(ln).from, spotDel);
      }
      deco = b.finish();
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---- theme ----------------------------------------------------------------

const theme = EditorView.theme(
  {
    "&": { color: "var(--code-fg)", backgroundColor: "var(--editor-bg)", height: "100%" },
    ".cm-scroller": {
      fontFamily: "var(--mono)",
      fontSize: "13px",
      lineHeight: "1.7",
      fontVariantLigatures: "none",
      overflow: "auto",
    },
    ".cm-content": { padding: "14px 0 40vh", caretColor: "var(--caret)" },
    ".cm-gutters": {
      backgroundColor: "var(--editor-bg)",
      border: "none",
      color: "var(--gutter-fg)",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 4px 0 14px", minWidth: "36px" },
    ".cm-foldGutter .cm-gutterElement": { width: "14px", color: "var(--muted)" },
    ".cm-line": { padding: "0 16px 0 8px" },
    ".cm-activeLine": { backgroundColor: "var(--active-line)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--gutter-active)" },
    ".cm-added": { backgroundColor: "var(--added-line)", boxShadow: "inset 3px 0 0 var(--added-bar)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--caret)", borderLeftWidth: "2px" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--selection) !important",
    },
    ".cm-selectionMatch": { backgroundColor: "var(--selection-match)" },
    ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
      backgroundColor: "transparent",
      outline: "1px solid var(--bracket-match)",
    },
    ".cm-searchMatch": { backgroundColor: "var(--search-match)", outline: "1px solid var(--search-match-border)" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--search-match-active)" },
    ".cm-tooltip": {
      backgroundColor: "var(--widget-bg)",
      border: "1px solid var(--border-strong)",
      color: "var(--fg)",
      borderRadius: "4px",
      boxShadow: "0 4px 16px rgba(0,0,0,.45)",
    },
    ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--mono)", fontSize: "12.5px", maxHeight: "240px" },
    ".cm-tooltip-autocomplete > ul > li": { padding: "1px 8px !important", lineHeight: "1.7" },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--list-active)", color: "var(--fg-strong)" },
    ".cm-completionIcon": { opacity: "0.7" },
    ".cm-panels": { backgroundColor: "var(--widget-bg)", color: "var(--fg)", borderColor: "var(--border)" },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--border)" },
    ".cm-panel.cm-search": { padding: "6px 8px", fontFamily: "var(--ui)", fontSize: "12px" },
    ".cm-panel.cm-search input, .cm-panel.cm-search button": { fontFamily: "var(--ui)", fontSize: "12px" },
    ".cm-textfield": {
      backgroundColor: "var(--input-bg)",
      border: "1px solid var(--border-strong)",
      color: "var(--fg)",
      borderRadius: "3px",
      padding: "3px 6px",
    },
    ".cm-button": {
      backgroundImage: "none",
      backgroundColor: "var(--button-2)",
      border: "1px solid var(--border-strong)",
      color: "var(--fg)",
      borderRadius: "3px",
    },
    ".cm-diagnostic-error": { borderLeftColor: "var(--err)" },
    ".cm-lintRange-error": {
      backgroundImage:
        "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23f14c4c' fill='none' stroke-width='.9'/></svg>\")",
    },
    ".cm-lint-marker-error": { content: "none" },
    ".cm-gutter-lint": { width: "12px" },
    ".cm-gutter-lint .cm-gutterElement": { padding: "0 0 0 2px" },
    ".cm-foldPlaceholder": { backgroundColor: "var(--button-2)", border: "none", color: "var(--muted)" },
    // unified diff view
    ".cm-changedLine": { backgroundColor: "var(--diff-add-line) !important" },
    ".cm-changedText": { background: "var(--diff-add-text) !important" },
    ".cm-deletedChunk": { backgroundColor: "var(--diff-del-line) !important", paddingLeft: "6px" },
    ".cm-deletedChunk del, .cm-deletedText": { background: "var(--diff-del-text) !important", textDecoration: "none" },
    ".cm-changeGutter": { width: "3px", paddingLeft: "0" },
    ".cm-changedLineGutter": { background: "var(--added-bar) !important" },
    ".cm-deletedLineGutter": { background: "var(--err) !important" },
  },
  { dark: true },
);

export const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "var(--tok-keyword)" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "var(--tok-control)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--tok-string)" },
  { tag: t.comment, color: "var(--tok-comment)", fontStyle: "italic" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--tok-number)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--tok-fn)" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--tok-type)" },
  { tag: t.definition(t.variableName), color: "var(--tok-var)" },
  { tag: t.propertyName, color: "var(--tok-prop)" },
  { tag: [t.tagName, t.angleBracket], color: "var(--tok-tag)" },
  { tag: t.attributeName, color: "var(--tok-attr)" },
  { tag: t.attributeValue, color: "var(--tok-string)" },
  { tag: t.operator, color: "var(--tok-op)" },
  { tag: t.variableName, color: "var(--tok-var)" },
  { tag: [t.brace, t.bracket, t.paren, t.punctuation, t.separator], color: "var(--tok-punct)" },
  { tag: t.invalid, color: "var(--err)" },
]);

// ---- language + lint --------------------------------------------------------

function language(path: string): Extension {
  if (path.endsWith(".json")) return json();
  if (path.endsWith(".html")) return html();
  return javascript({ jsx: path.endsWith("x"), typescript: /\.tsx?$/.test(path) });
}

function lint(path: string): Extension {
  if (!isModule(path)) return [];
  return linter(
    (view): Diagnostic[] => {
      const out = transpile(path, view.state.doc.toString());
      if (!("error" in out)) return [];
      const { line, col, message } = out.error;
      const doc = view.state.doc;
      const l = doc.line(Math.min(Math.max(line, 1), doc.lines));
      const from = Math.min(l.from + col - 1, l.to);
      return [{ from, to: Math.min(from + 1, l.to) || from, severity: "error", message, source: "ts" }];
    },
    { delay: 250 },
  );
}

// ---- the editor -------------------------------------------------------------

export type OpenOptions = {
  added: LineRange[];
  /** Previous-step version, used by the diff view. */
  original: string;
  revealLine?: number;
  readOnly?: boolean;
};

type Callbacks = {
  change(path: string, text: string): void;
  cursor(line: number, col: number, selected: number): void;
};

type Entry = { state: EditorState; scroll?: StateEffect<unknown>; original: string; added: LineRange[]; diff: boolean };

export class CodeEditor {
  view: EditorView;
  private entries = new Map<string, Entry>();
  private key = "";
  private path = "";
  private diff = false;
  private diffCompartment = new Compartment();
  private tintCompartment = new Compartment();
  private suppress = false;

  constructor(parent: HTMLElement, private cb: Callbacks) {
    this.view = new EditorView({ parent, state: EditorState.create({ doc: "" }) });
  }

  private extensions(path: string, original: string, readOnly = false): Extension[] {
    return [
      readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [],
      lineNumbers(),
      foldGutter({ openText: "⌄", closedText: "›" }),
      lintGutter(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      indentUnit.of("  "),
      EditorState.tabSize.of(2),
      bracketMatching(),
      closeBrackets(),
      autocompletion({ icons: true }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      search({ top: true }),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      EditorView.lineWrapping,
      language(path),
      syntaxHighlighting(highlight),
      lint(path),
      this.tintCompartment.of(this.diff ? [] : addedField),
      spotField,
      this.diffCompartment.of(this.diff ? this.mergeExt(original) : []),
      theme,
      EditorView.updateListener.of((u) => {
        if (u.docChanged && !this.suppress) this.cb.change(this.path, u.state.doc.toString());
        if (u.selectionSet || u.docChanged || u.focusChanged) this.reportCursor();
      }),
    ];
  }

  private mergeExt(original: string): Extension {
    return unifiedMergeView({
      original,
      mergeControls: false,
      highlightChanges: false,
      gutter: true,
      syntaxHighlightDeletions: true,
    });
  }

  /** Show `path` (cached per `key`, so each file keeps undo history, selection and scroll). */
  open(key: string, path: string, text: string, opts: OpenOptions) {
    if (this.key && this.entries.has(this.key)) {
      const cur = this.entries.get(this.key)!;
      cur.state = this.view.state;
      cur.scroll = this.view.scrollSnapshot();
    }
    let entry = this.entries.get(key);
    const fresh = !entry;
    if (!entry) {
      // Load the step's code as the initial doc: it is NOT an undoable change.
      const state = EditorState.create({ doc: text, extensions: this.extensions(path, opts.original, opts.readOnly) });
      entry = { state, original: opts.original, added: opts.added, diff: this.diff };
      this.entries.set(key, entry);
    }
    this.key = key;
    this.path = path;
    this.suppress = true;
    this.view.setState(entry.state);
    this.suppress = false;

    // the diff toggle is global; bring this file's state in line with it
    if (entry.diff !== this.diff) this.applyDiff(entry);

    if (fresh) {
      this.view.dispatch({ effects: setAdded.of(opts.added) });
      const line = opts.revealLine ?? (opts.added.length ? opts.added[0].from : 1);
      this.reveal(line, opts.added.length ? "center" : "start");
    } else if (entry.scroll) {
      this.view.dispatch({ effects: entry.scroll });
    }
    this.reportCursor();
  }

  /** Replace the document (e.g. "reset file"); undoable. */
  replace(text: string) {
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: text } });
  }

  /** Forget a cached file state so it reloads from source next time. */
  forget(key: string) {
    this.entries.delete(key);
  }

  isOpen(key: string) {
    return this.key === key;
  }

  setDiff(on: boolean) {
    this.diff = on;
    const entry = this.entries.get(this.key);
    if (entry && entry.diff !== on) this.applyDiff(entry);
  }

  private applyDiff(entry: Entry) {
    const on = this.diff;
    entry.diff = on;
    this.view.dispatch({
      effects: [
        this.tintCompartment.reconfigure(on ? [] : addedField),
        this.diffCompartment.reconfigure(on ? this.mergeExt(entry.original) : []),
      ],
    });
    // the tint field was recreated empty: restore this step's added lines
    if (!on) this.view.dispatch({ effects: setAdded.of(entry.added) });
  }

  reveal(line: number, y: "center" | "start" = "center", col?: number) {
    const doc = this.view.state.doc;
    const l = doc.line(Math.min(Math.max(1, line), doc.lines));
    const pos = col ? Math.min(l.from + col - 1, l.to) : l.from;
    this.view.dispatch({
      selection: col ? { anchor: pos } : undefined,
      effects: EditorView.scrollIntoView(pos, { y }),
    });
  }

  /** Spotlight one change and bring it to the middle of the view (null clears). */
  spotlight(spot: Spot | null) {
    const doc = this.view.state.doc;
    const effects: StateEffect<unknown>[] = [setSpot.of(spot)];
    if (spot) {
      const first = Math.min(Math.max(1, spot.from), doc.lines);
      const last = Math.min(Math.max(first, spot.to), doc.lines);
      const visible = Math.floor(this.view.scrollDOM.clientHeight / this.view.defaultLineHeight) - 4;
      const tall = last - first + 1 > visible;
      const line = tall ? first : Math.round((first + last) / 2);
      effects.push(EditorView.scrollIntoView(doc.line(line).from, { y: tall ? "start" : "center", yMargin: 48 }));
    }
    this.view.dispatch({ effects });
  }

  goto(line: number, col = 1) {
    this.reveal(line, "center", col);
    this.view.focus();
  }

  focus() {
    this.view.focus();
  }

  private reportCursor() {
    const s = this.view.state;
    const r = s.selection.main;
    const line = s.doc.lineAt(r.head);
    this.cb.cursor(line.number, r.head - line.from + 1, Math.abs(r.to - r.from));
  }
}
