export function isApiKeyString(value: string): boolean {
  return /^AIza[0-9A-Za-z_\-]{10,}$/.test(value);
}


