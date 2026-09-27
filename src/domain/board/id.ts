// ID generation helper: prefers crypto.randomUUID, falls back to a counter + random suffix.

let fallbackCounter = 0;

export function generateId(prefix = 'id'): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }
  fallbackCounter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${fallbackCounter}-${random}`;
}
