// Small clean-ups for generated code, so a beginner can read it.

/** Blank-line runs, trailing spaces, "(x )" leftovers where types were removed. */
export function tidy(code: string): string {
  return code
    .split("\n")
    .map((l) =>
      l
        .replace(/(\w) \)/g, "$1)")
        .replace(/\) ,/g, "),")
        .replace(/^((?:import|export) \{[^}]*?),\s*\}/, "$1 }")
        .replace(/[ \t]+;$/, ";")
        .replace(/[ \t]+$/, ""),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n*$/, "\n");
}
