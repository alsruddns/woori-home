import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCountryDatasetDescription, createIndicatorDatasetDescription, datasetLocales, validateDatasetSchema } from "../src/lib/data-platform/dataset-schema.mjs";

test("Dataset description builders produce descriptive text and the supported locale list stays complete", () => {
  assert.equal(datasetLocales.length, 26);
  const country = createCountryDatasetDescription({ summary: "Explore the latest published observations and annual trends for this country.", country: "United States", iso3: "USA", measuresLabel: "Indicators", measures: ["Population", "GDP"], periodLabel: "Reference years", period: "1960–2025", source: "World Bank World Development Indicators.", caveat: "Reference years can differ by measure; missing observations are not estimated.", updatedLabel: "Last checked", updatedAt: "25 Oct 2026" });
  const indicator = createIndicatorDatasetDescription({ definition: "Gross domestic product is the market value of final goods and services produced within an economy.", interpretation: "Current-dollar values reflect both output and price changes and are not adjusted for inflation.", source: "World Bank World Development Indicators.", label: "GDP", code: "NY.GDP.MKTP.CD", periodLabel: "Reference years", period: "1960–2025" });
  assert.ok(Array.from(country).length >= 50);
  assert.ok(Array.from(indicator).length >= 50);
});

test("Dataset schema rejects short descriptions, invalid URLs, and invalid names", () => {
  const base = { name: "Population", description: "A sufficiently descriptive dataset description with more than fifty characters.", url: "https://www.woori.today/en/world/population" };
  assert.equal(validateDatasetSchema(base), base);
  assert.throws(() => validateDatasetSchema({ ...base, description: "Too short." }), /50 to 5000/);
  assert.throws(() => validateDatasetSchema({ ...base, url: "http://example.com/data" }), /HTTPS/);
  assert.throws(() => validateDatasetSchema({ ...base, name: " " }), /name/);
  assert.throws(() => validateDatasetSchema({ ...base, description: "x".repeat(5001) }), /50 to 5000/);
});

test("public ads.txt keeps the same publisher account as the AdSense client", async () => {
  const [adsText, analytics] = await Promise.all([
    readFile(new URL("../public/ads.txt", import.meta.url), "utf8"),
    readFile(new URL("../src/app/analytics.tsx", import.meta.url), "utf8"),
  ]);
  const adsPublisher = adsText.match(/^google\.com, (pub-\d+), DIRECT, f08c47fec0942fa0$/m)?.[1];
  const clientPublisher = analytics.match(/ca-(pub-\d+)/)?.[1];
  assert.ok(adsPublisher, "ads.txt must contain the authorized Google seller line");
  assert.equal(adsPublisher, clientPublisher);
});
