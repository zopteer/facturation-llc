const NUMBER_RE = /^(\d{4})-(\d{3,})$/;

export function nextDocumentNumber(lastNumber: string | null, year: number): string {
  const pad = (n: number) => String(n).padStart(3, '0');
  if (!lastNumber) return `${year}-${pad(1)}`;
  const match = NUMBER_RE.exec(lastNumber);
  if (!match || Number(match[1]) !== year) return `${year}-${pad(1)}`;
  return `${year}-${pad(Number(match[2]) + 1)}`;
}
