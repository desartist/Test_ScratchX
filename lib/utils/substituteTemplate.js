export function substituteTemplate(template, values = {}) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => values[key] ?? '');
}
