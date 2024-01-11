export function substitute (string: string, substitutions: Record<string, string>) {
  for (const entries of Object.entries(substitutions)) {
    string = string.split(`{{${entries[0]}}}`).join(entries[1])
  }
  return string
}
