export function isDuplicateColumnError(message: string): boolean {
  return /duplicate column|already exists/i.test(message);
}

export function isDuplicateKeyError(message: string): boolean {
  return /duplicate (key|index|column)|already exists/i.test(message);
}
