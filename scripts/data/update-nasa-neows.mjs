import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordBatchStatus, writeJsonAtomically } from "./batch-status.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "src/data/nasa-neows.json");
const today = new Date();
const startDate = today.toISOString().slice(0, 10);
const end = new Date(today.getTime() + 6 * 86400000);
const endDate = end.toISOString().slice(0, 10);
const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
const url = new URL("https://api.nasa.gov/neo/rest/v1/feed");
url.searchParams.set("start_date", startDate);
url.searchParams.set("end_date", endDate);
url.searchParams.set("api_key", apiKey);
const previousText = await readFile(output, "utf8").catch(() => null);
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchPayload() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "WOORI.TODAY data refresh/1.0 (official batch snapshot)" },
        signal: AbortSignal.timeout(45000),
      });
      if (response.ok) return response.json();
      if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === 3) throw new Error(`NASA NeoWs returned HTTP ${response.status}`);
      const retryAfter = Number(response.headers.get("retry-after"));
      await pause(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 20000) : 1000 * (attempt + 1));
    } catch (error) {
      if (error.message?.includes("HTTP") || attempt === 3) {
        if (error.message?.includes("HTTP")) throw error;
        throw new Error("NASA NeoWs network request failed or timed out");
      }
      await pause(1000 * (attempt + 1));
    }
  }
  throw new Error("NASA NeoWs request retries exhausted");
}

try {
  const payload = await fetchPayload();
  const daily = payload?.near_earth_objects;
  if (!daily || typeof daily !== "object" || Object.keys(daily).length === 0) throw new Error("NASA NeoWs response has no date groups");

  const dates = Object.keys(daily).sort();
  const objects = Object.entries(daily).flatMap(([date, asteroids]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(asteroids)) throw new Error("NASA NeoWs date group has an invalid shape");
    return asteroids.map((asteroid) => {
      const approach = asteroid.close_approach_data?.find((item) => item.close_approach_date === date);
      const minimum = asteroid.estimated_diameter?.meters?.estimated_diameter_min;
      const maximum = asteroid.estimated_diameter?.meters?.estimated_diameter_max;
      const distance = Number(approach?.miss_distance?.kilometers);
      const velocity = Number(approach?.relative_velocity?.kilometers_per_second);
      if (!approach || !asteroid.id || typeof asteroid.name !== "string" || typeof asteroid.is_potentially_hazardous_asteroid !== "boolean" || typeof asteroid.nasa_jpl_url !== "string" || !asteroid.nasa_jpl_url.startsWith("https://") || !Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum < minimum || !Number.isFinite(distance) || distance < 0 || !Number.isFinite(velocity) || velocity <= 0) {
        throw new Error("NASA NeoWs response has an incomplete asteroid record");
      }
      return {
        id: String(asteroid.id), name: asteroid.name, closeApproachDate: date,
        estimatedDiameterMinM: minimum, estimatedDiameterMaxM: maximum,
        missDistanceKm: distance, relativeVelocityKmS: velocity,
        potentiallyHazardous: asteroid.is_potentially_hazardous_asteroid,
        nasaUrl: asteroid.nasa_jpl_url,
      };
    });
  }).sort((a, b) => a.closeApproachDate.localeCompare(b.closeApproachDate) || a.id.localeCompare(b.id));
  if (objects.length === 0) throw new Error("NASA NeoWs response has no validated asteroid records");

  const comparable = (snapshot) => JSON.stringify({ startDate: snapshot.startDate, endDate: snapshot.endDate, dates: snapshot.dates, objects: snapshot.objects });
  const nextBase = { schemaVersion: 1, source: "NASA/JPL Near Earth Object Web Service", startDate, endDate, dates, objects };
  const previous = previousText ? JSON.parse(previousText) : null;
  if (previous?.schemaVersion === 1 && comparable(previous) === comparable(nextBase)) {
    console.log(`NASA NeoWs snapshot unchanged (${objects.length} records); retaining the existing file.`);
    await recordBatchStatus({ snapshotPath: output, sourceId: "nasa", datasetId: "near-earth-objects", status: "unchanged", referenceDate: endDate, recordCount: objects.length });
    process.exit(0);
  }

  const snapshot = { ...nextBase, fetchedAt: new Date().toISOString() };
  await writeJsonAtomically(output, snapshot);
  await recordBatchStatus({ snapshotPath: output, sourceId: "nasa", datasetId: "near-earth-objects", status: "success", referenceDate: endDate, recordCount: objects.length, attemptedAt: snapshot.fetchedAt });
  console.log(`Wrote ${objects.length} validated NASA NeoWs records for ${startDate} through ${endDate}.`);
} catch (error) {
  await recordBatchStatus({ snapshotPath: output, sourceId: "nasa", datasetId: "near-earth-objects", status: "failed", error });
  console.error("NASA NeoWs refresh failed; the previous checked-in snapshot was retained.");
  throw new Error(error.message?.includes("HTTP") ? error.message : "NASA NeoWs refresh failed; see the action log for the sanitized error category.");
}
