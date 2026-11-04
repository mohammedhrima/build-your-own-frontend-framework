import type { DomNode } from "../types/protocol";

export type Mark = { id: number; label: string };

const meaningful = (kids?: DomNode[]) =>
  (kids ?? []).filter((k) => (k.k === 1 ? k.tag !== "script" && k.tag !== "style" : k.k === 3 ? !!k.text?.trim() : false));

const bodyOf = (t: DomNode | null) => t?.kids?.find((k) => k.tag === "body") ?? null;

/**
 * What looks different on the page between two DOM snapshots (the previous
 * step's app and this one's). Children are matched by position; the first
 * difference on a branch is marked, not everything below it.
 */
export function uiDiff(before: DomNode | null, after: DomNode | null, max = 8): Mark[] {
  const a = bodyOf(before);
  const b = bodyOf(after);
  if (!a || !b) return [];
  const out: Mark[] = [];
  const walk = (o: DomNode | undefined, n: DomNode) => {
    if (!o || o.k !== n.k || o.tag !== n.tag) return void out.push({ id: n.id, label: "new" });
    if (n.k === 3) return void (o.text !== n.text && out.push({ id: n.id, label: "" }));
    if (JSON.stringify(o.attrs ?? []) !== JSON.stringify(n.attrs ?? [])) return void out.push({ id: n.id, label: "changed" });
    const ok = meaningful(o.kids);
    meaningful(n.kids).forEach((c, i) => walk(ok[i], c));
  };
  const ok = meaningful(a.kids);
  meaningful(b.kids).forEach((c, i) => walk(ok[i], c));
  if (out.length <= max) return out;
  // too many small changes: mark the app container once
  const root = meaningful(b.kids).find((k) => k.k === 1);
  return root ? [{ id: root.id, label: "changed" }] : [];
}
