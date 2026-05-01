export function getCurrentPeriodStart(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split('T')[0];
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}
