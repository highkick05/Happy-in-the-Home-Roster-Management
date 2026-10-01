/**
 * Utility to convert raw LaTeX mathematical formulas into clean, readable Markdown.
 * e.g. $$\frac{$1,403.39}{$102.96/\text{hr}} = 13.63\text{ hours} \longrightarrow \mathbf{13.0\text{ whole hours / week}}$$
 * into: **($1,403.39 ÷ $102.96/hr) = 13.63 hours → 13.0 whole hours / week**
 */
export function cleanFormula(formula: string): string {
  let f = formula.trim();

  // 1. Unpack nested text commands like \text{...} or \mathrm{...}
  for (let i = 0; i < 4; i++) {
    f = f.replace(/\\?(?:text|mathrm|textrm)\{([^{}]+)\}/g, "$1");
  }

  // 2. Process fractions \frac{A}{B}
  while (/\\?frac\{([^{}]+)\}\{([^{}]+)\}/.test(f)) {
    f = f.replace(/\\?frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 ÷ $2)");
  }

  // 3. Process bold and italic styling tags
  for (let i = 0; i < 4; i++) {
    f = f.replace(/\\?(?:mathbf|textbf)\{([^{}]+)\}/g, "$1");
    f = f.replace(/\\?(?:mathit|textit)\{([^{}]+)\}/g, "$1");
  }

  // 4. Mathematical and arrow symbols
  f = f.replace(/\\(longrightarrow|rightarrow|to)\b/g, "→");
  f = f.replace(/\\(longleftarrow|leftarrow)\b/g, "←");
  f = f.replace(/\\(implies|Longrightarrow)\b/g, "⇒");
  f = f.replace(/\\times\b/g, "×");
  f = f.replace(/\\div\b/g, "÷");
  f = f.replace(/\\cdot\b/g, "·");
  f = f.replace(/\\approx\b/g, "≈");
  f = f.replace(/\\neq\b/g, "≠");
  f = f.replace(/\\leq\b/g, "≤");
  f = f.replace(/\\geq\b/g, "≥");
  f = f.replace(/\\le\b/g, "≤");
  f = f.replace(/\\ge\b/g, "≥");
  f = f.replace(/\\pm\b/g, "±");
  f = f.replace(/\\%/g, "%");
  f = f.replace(/\\$/g, "$");

  // 5. Clean any remaining escaped command backslashes
  f = f.replace(/\\([a-zA-Z]+)/g, "$1");
  f = f.replace(/\\/g, "");

  return f.replace(/\s+/g, " ").trim();
}

export function formatLatexToMarkdown(text: string): string {
  if (!text || typeof text !== "string") return text;

  // Convert $$ ... $$ display blocks
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => {
    const cleaned = cleanFormula(formula);
    return `\n\n**${cleaned}**\n\n`;
  });

  // Convert \[ ... \] display blocks
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => {
    const cleaned = cleanFormula(formula);
    return `\n\n**${cleaned}**\n\n`;
  });

  // Convert inline \frac formulas
  result = result.replace(/\\?frac\{[^{}]+\}\{[^{}]+\}/g, (match) => cleanFormula(match));

  // Convert leftover \text{...} or \mathbf{...} outside block math
  result = result.replace(/\\?(?:text|mathrm|textrm)\{([^{}]+)\}/g, "$1");
  result = result.replace(/\\?(?:mathbf|textbf)\{([^{}]+)\}/g, "**$1**");

  return result;
}
