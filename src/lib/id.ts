/** Stable unique id. crypto.randomUUID is available in modern browsers + Node 18+. */
export const newId = (): string => crypto.randomUUID();
