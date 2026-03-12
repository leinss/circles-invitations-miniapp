/** Escape HTML entities to prevent XSS when interpolating into innerHTML */
export function esc(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
