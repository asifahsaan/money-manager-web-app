// Fixed chart colors (SVG attributes can't read CSS variables reliably).
// Mid-tone shades chosen to read on both the light and the dark surface.
export const CHART = {
  income: '#10b981',
  expense: '#f43f5e',
  brand: '#6366f1',
  transfer: '#94a3b8',
};

// Axis/grid colors do depend on the theme — read the live CSS variables.
export function chartChrome() {
  const css = getComputedStyle(document.documentElement);
  const rgb = (name: string) => `rgb(${css.getPropertyValue(name).trim()})`;
  return { grid: rgb('--c-border'), axis: rgb('--c-text-muted'), surface: rgb('--c-surface-raised') };
}
