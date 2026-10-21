export function pendingMigrations(entries, appliedRows) {
  const appliedTimes = new Set(appliedRows.map((row) => Number(row.created_at)));
  return entries.filter((entry) => !appliedTimes.has(Number(entry.when)));
}
