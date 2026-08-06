export function isDuplicateColumnError(message: string): boolean {
  return /duplicate column/i.test(message);
}

export function isDuplicateKeyError(message: string): boolean {
  return /duplicate key/i.test(message);
}
