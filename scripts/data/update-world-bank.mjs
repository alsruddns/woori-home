import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWorldBankIndicator } from "./world-bank-adapter.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "src/data/world-bank.json");
const countries = ["WLD", "USA", "CHN", "IND", "JPN", "KOR", "DEU", "GBR", "FRA", "BRA", "IDN", "MEX", "ZAF", "NGA", "AUS", "CAN"];
const indicators = ["SP.POP.TOTL", "NY.GDP.MKTP.CD", "NY.GDP.PCAP.CD", "SP.DYN.TFRT.IN", "SP.DYN.LE00.IN", "SP.POP.GROW"];
const now = new Date().toISOString();
const fallback = await readFile(output, "utf8").catch(() => null);

try {
  const observations = [];
  for (const indicator of indicators) {
    const result = await fetchWorldBankIndicator({ indicator, countries, startYear: 1990, endYear: new Date().getUTCFullYear(), checkedAt: now });
    observations.push(...result.observations);
  }
  if (observations.length < countries.length * indicators.length) throw new Error("Snapshot validation failed: too few observations");
  observations.sort((a, b) => a.indicator.localeCompare(b.indicator) || a.country.localeCompare(b.country) || a.year - b.year);
  const snapshot = { schemaVersion: 1, source: "World Bank", generatedAt: now, observations };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(snapshot)}\n`, "utf8");
  console.log(`Wrote ${observations.length} validated observations from ${indicators.length} World Bank indicators.`);
} catch (error) {
  if (fallback) await writeFile(output, fallback, "utf8");
  console.error("World Bank refresh failed; the last checked-in snapshot was retained.");
  throw error;
}
