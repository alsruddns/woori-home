# Data source and reuse audit

Reviewed: 2026-10-21. This audit records the conditions checked for the current WDI snapshot and candidate providers. It is not a blanket license for every individual source series: the provider's metadata and source-specific notices still control.

## Current source: World Bank World Development Indicators

| Check | Result |
| --- | --- |
| Official endpoint | `https://api.worldbank.org/v2`; Indicators API v2 |
| Authentication | No key or authentication required for the public Indicators API |
| Calling limits | No fixed public numeric rate limit was found in the API documentation; this project fetches once per scheduled batch, not per visitor request |
| Commercial display and reuse | World Bank's summary terms default to CC BY 4.0, including commercial reuse, unless the data/indicator metadata specifies different conditions |
| Attribution | Identify World Bank, dataset and any source/provider in metadata; link the terms. Do not imply World Bank endorsement or use its marks as branding |
| Exceptions | Some indicators include third-party data and may have additional restrictions. Review indicator/catalog metadata before adding a series; the default license alone is insufficient |
| Update cadence | Source varies by indicator. WDI API metadata reports a dataset update date, not a publication date for each observation. Observation year is the reference period |
| Missing values | Null observations are omitted. No interpolation or forward filling |
| Collection | Monthly GitHub Actions batch; checked-in snapshot remains available if a refresh fails |

The existing six indicators and candidate series below were queried from the official API for WLD plus the 15 countries in the snapshot, 1990–2026. Counts include only non-null numeric observations and can change as WDI is revised. The snapshot now has 3,984 observations across seven indicators; it adds modeled ILO unemployment (560 observations, latest 2025). Provider strings are stored once per indicator in the normalized snapshot and shown on detail pages.

| Indicator | Definition / unit | Values | Latest year | Decision |
| --- | --- | ---: | ---: | --- |
| `NY.GDP.MKTP.KD.ZG` | GDP growth, annual % | 576 | 2025 | Withheld: source metadata includes national statistics and OECD, but the exact upstream series conditions were not confirmed |
| `FP.CPI.TOTL.ZG` | Consumer price inflation, annual % | 575 | 2025 | Withheld: source is IMF IFS; IMF requests permission for potential commercial reuse |
| `SL.UEM.TOTL.ZS` | Unemployment, modeled ILO estimate, % of labor force | 560 | 2025 | Included; ILO datasets and metadata published since 2023-05-03 are CC BY 4.0 unless otherwise indicated; label retains modeled-estimate qualifier |
| `NV.IND.TOTL.ZS` | Industry value added, % of GDP | 548 | 2025 | Candidate for economy |
| `NE.EXP.GNFS.CD` | Exports of goods and services, current US$ | 538 | 2025 | Candidate; WLD aggregate absent in this query |
| `NE.IMP.GNFS.CD` | Imports of goods and services, current US$ | 538 | 2025 | Candidate; WLD aggregate absent in this query |
| `SP.URB.TOTL.IN.ZS` | Urban population, % of total | 576 | 2025 | Withheld pending confirmation that the WUP source version and its reuse terms match this WDI series |
| `SP.POP.65UP.TO.ZS` | Population ages 65+, % of total | 576 | 2025 | Withheld pending confirmation of the exact WPP release and series reuse terms |
| `SP.POP.TOTL.FE.IN` / `SP.POP.TOTL.MA.IN` | Female / male population, people | 576 each | 2025 | Available; do not infer gender identity from these binary source series |
| `SP.DYN.IMRT.IN` | Infant mortality, deaths per 1,000 live births | 560 | 2024 | Withheld pending rights checks across UNICEF, WHO, World Bank and UN source records |
| `EG.FEC.RNEW.ZS` | Renewable energy consumption, % of total final energy consumption | 511 | 2021 | Withheld: underlying source is IEA; IEA terms for non-CC material require additional permission/licensing for some recurring or revenue-generating display uses |
| `EG.ELC.ACCS.ZS` | Population with access to electricity, % | 530 | 2024 | Withheld pending review of the specific ESMAP/Tracking SDG 7 dataset terms; access is not consumption |
| `EG.USE.PCAP.KG.OE` | Energy use per capita, kg of oil equivalent | 560 | 2024 | Withheld: underlying source is IEA; per-capita measure, not total consumption |
| `EG.USE.ELEC.KH.PC` | Electric power consumption, kWh per capita | 570 | 2025 | Withheld: underlying source is IEA; distinct from access and total energy use |
| `SP.POP.1524.TO.ZS` | Youth population share | 0 | — | Excluded: indicator unavailable for the queried range |
| `EN.ATM.CO2E.PC`, `EN.ATM.CO2E.KT` | Legacy CO₂ series | 0 | — | Excluded: no observations from these retired codes in the current API query; identify a successor series and its metadata before use |

The query establishes endpoint response shape, availability, provider attribution and recency only. The WDI API does not return a per-series license field. Before adding a new provider or series, review its data/catalog notice and any upstream terms; the default World Bank terms do not override third-party restrictions. The existing six indicators also have multi-provider source metadata; their upstream license audit remains incomplete.

## NASA APIs and media

| Check | Result |
| --- | --- |
| Official endpoints | NASA Open APIs catalog; NASA APOD and NeoWs endpoints |
| Authentication | NASA API key for higher request allowance; `DEMO_KEY` has lower limits. No key has been configured in this project |
| Usage limits | NASA documents 1,000 requests/hour for normal keys and lower demo-key limits; any batch must remain low-frequency |
| APOD | NASA announced migration from the legacy APOD API to `https://science.nasa.gov/wp-json/wp/v2/apod-basic`, with the legacy endpoint scheduled for retirement. APOD records may be images, videos, or contain third-party copyright notices |
| Media rights | NASA material is not uniformly public domain. Rights and credit vary by item; do not copy/cache/display an APOD asset until that record's copyright/credit and applicable NASA media guidance are checked |
| NEO data | NeoWs provides near-Earth object and close-approach data. Risk flags are an official classification and must not be represented as a prediction of impact or harm |
| Decision | No NASA data or media included in production snapshots yet. Implement only after validating the current endpoint contract, cache/redisplay terms, response fields and key handling |

## Other providers reviewed

| Provider | API and terms | Decision |
| --- | --- | --- |
| OECD Data Explorer | Official SDMX API is free and rate-limited; terms allow commercial reuse by default with attribution, but individual datasets may contain third-party material or additional restrictions | Do not ingest until the selected dataset's metadata and third-party rights are reviewed |
| ILOSTAT | ILO states that datasets and accompanying metadata published on/after 2023-05-03 are CC BY 4.0 unless otherwise indicated; credit ILO | Used for the WDI modeled unemployment series, with provider attribution retained |
| KOSIS | Official OpenAPI requires an issued key. KOSIS terms allow commercial/non-commercial use and redistribution with attribution, but prohibit standalone paid redistribution and restrict internationally licensed data and excessive traffic | Do not ingest international tables until table-level terms and key limits are verified |
| FRED | API key required. Its terms state that series may carry third-party rights and require a prominent non-endorsement notice | Deferred until each series' rights and required notices are verified |

## Remaining rights work

Only the ILO modeled unemployment series was added after confirming ILOSTAT's CC BY 4.0 terms. Rights for the six pre-existing WDI indicators are not fully resolved because their WDI provider metadata includes UN, OECD and national statistical sources. Energy data from IEA, ESMAP, and other providers is deliberately absent from the production snapshot until series-level display and redistribution conditions are confirmed. NASA data and media remain unimplemented.

## References

- [World Bank summary terms](https://data.worldbank.org/summary-terms-of-use)
- [World Bank Indicators API documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation)
- [NASA Open APIs](https://api.nasa.gov/)
- [NASA raw images and copyright FAQ](https://science.nasa.gov/solar-system/multimedia/raw-images-faq/)
- [OECD terms and conditions](https://www.oecd.org/en/about/terms-conditions.html)
- [OECD API guide](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html)
- [OECD API terms and conditions](https://www.oecd.org/en/about/terms-conditions.html)
- [ILO rights and permissions](https://www.ilo.org/rights-and-permissions)
- [IEA usage and rights](https://www.iea.org/help-centre/usage-and-rights)
- [IEA non-CC terms](https://www.iea.org/terms/terms-of-use-for-non-cc-material)
- [IMF copyright and data use](https://www.imf.org/en/About/copyright-and-terms)
- [Tracking SDG 7 / ESMAP terms](https://trackingsdg7.esmap.org/legal)
- [KOSIS OpenAPI terms](https://kosis.kr/openapi/introduce/introduce_02List.do)
- [KOSIS OpenAPI FAQ](https://kosis.kr/openapi/community/community_0401List.do)
- [FRED API terms](https://fred.stlouisfed.org/docs/api/terms_of_use.html)

## Phase 5 verification (2026-10-21)

### World Bank electricity access

| Check | Verified result |
| --- | --- |
| Official indicator | `EG.ELC.ACCS.ZS`, Access to electricity (% of population) |
| API | `https://api.worldbank.org/v2/country/{codes}/indicator/EG.ELC.ACCS.ZS` |
| Authentication | No key required for the Indicators API |
| Response validation | API v2 array response; numeric non-null observations only; missing years are omitted |
| Provider metadata | SDG 7.1.1 Electrification Dataset, World Bank (ESMAP); source page says the data is downloaded from ESMAP and released with a new Tracking SDG7 report |
| Rights | The indicator page explicitly labels this series CC BY 4.0. Attribution to World Bank and the named SDG 7.1.1/ESMAP source is preserved. The general WDI terms warn that other third-party indicators may have additional restrictions; this decision is specific to this indicator page and its published license label. |
| Observed availability | A direct all-country API query returned 8,122 non-null values across 261 country/aggregate codes for 1990–2026; latest non-null year was 2024. The project snapshot contains 530 values for its 15 countries plus WLD, latest year 2024. |
| Meaning | Share of population with access to electricity. This is not electricity use, energy consumption, or supply reliability. |
| Refresh | Monthly with the existing WDI job. Failed refresh does not replace the last known good snapshot. |

### NASA/JPL NeoWs

| Check | Verified result |
| --- | --- |
| Official endpoint | `https://api.nasa.gov/neo/rest/v1/feed` (NASA Open APIs catalog; asteroid data attributed to NASA JPL) |
| Authentication and limits | `DEMO_KEY` works without a project secret; NASA documents 30 requests/hour and 50/day per IP for the demo key, versus the standard documented 1,000/hour for a registered key. One batch request is scheduled daily. `NASA_API_KEY` is optional and only read by the batch process. |
| Query range | The endpoint documents `start_date` and `end_date`; a 7-day inclusive request was directly tested. The project stores the exact date list returned by the API. |
| Response fields | `id`, `name`, `close_approach_date`, `estimated_diameter.meters`, `miss_distance.kilometers`, `relative_velocity.kilometers_per_second`, `is_potentially_hazardous_asteroid`, and NASA/JPL object URL. Every stored numeric field is validated as finite. |
| Reuse assessment | NASA's official media/data guidance generally permits factual use of NASA-originated material without implying endorsement, while preserving exceptions for marked or third-party material. The NeoWs API page identifies NASA/JPL asteroid data and the project republishes only a small set of numeric facts and attribution, not imagery or raw API payloads. The NeoWs API reference itself does not state a standalone license for each record; this assessment is an interpretation of NASA's general guidance, not a per-record license grant. |
| Operating rules | The API guidance encourages modest access and caching; the project batches one request/day, keeps the result static, does not call NASA from visitor requests, validates format changes, and retains the last checked-in snapshot on failure. The checked-in sample currently contains 57 object/date records across seven UTC dates (2026-10-20 through 2026-10-26). |
| Safety text | The potentially hazardous flag is described as an official orbit/size classification, not an impact or damage forecast. Diameter values remain a range. |
| APOD | Not ingested. NASA APOD states many entries are copyrighted and require permission for public/commercial reuse; metadata may link to the original, but a feed presence is not treated as an image license. Video records are also not treated as images. |

### Phase 5 decisions and outstanding checks

- Added only the electricity-access WDI series to the public statistical snapshot. Renewable-energy consumption, energy use, electricity consumption, and legacy CO2 series remain withheld because their current WDI metadata points to IEA or retired series; an explicit compatible reuse basis was not found in this review.
- NASA NeoWs is integrated as a low-frequency, attributed numeric snapshot. The API's per-record reuse license is not explicitly surfaced by the endpoint; the general NASA-origin material guidance is the basis for this narrow factual use. Reassess if the provider identifies third-party or restricted records.
- APOD image and video embedding remains deferred pending item-specific rights checks. The Science page links source material only for the NEO records.
- Further urbanization, elderly population, inflation, trade, and emissions candidates were not added in this phase because their WDI provider notes identify upstream sources whose individual terms were not yet reconciled. No unverified license strings were inferred.

## Research metadata and commodity prices review — 2026-10-21

### Crossref REST API

- Official endpoint: `https://api.crossref.org/works`; query requests are batched in one daily workflow, not issued by visitor pages.
- Crossref states that almost all bibliographic metadata is not subject to copyright and can be reused for any purpose. It specifically warns that abstracts can be copyrighted by publishers or authors.
- The local snapshot therefore stores only DOI, title, author names, publication/index dates, journal/source title, publisher URL, registered citation count, item-level license URLs when supplied, and a conservative retraction/update flag when Crossref provides one. Abstracts, full text, PDFs, and generated summaries are excluded.
- “Popular” is not claimed. Sorting is by Crossref's registered citation count or recent index date; citations can be incomplete and are not a measure of research quality.
- Crossref may incorporate data from trusted third parties (including retraction status records). A detected update is not automatically labeled a retraction unless the record's update type explicitly says retraction/withdrawal.
- API access is public and no signup is required. Requests are sequential and retry rate-limit/transient errors. The current schedule is daily; the checked-in output remains usable offline.
- Rights status: bibliographic metadata reuse is permitted per Crossref guidance. Individual article text and abstracts remain excluded. Item license metadata is displayed as source metadata, not as a blanket license for the article.
- Source guidance: https://www.crossref.org/documentation/retrieve-metadata/rest-api/ and https://www.crossref.org/services/metadata-retrieval/.

### World Bank Commodity Price Data (Pink Sheet)

- Official source: https://www.worldbank.org/en/research/commodity-markets. The Pink Sheet provides monthly commodity price workbooks and explains series units/source definitions; monthly series are nominal US dollars, not live spot closes.
- A World Bank reproducibility catalog entry for the Pink Sheet reports CC BY 4.0 “with additional terms of use specified in the license URL.” The World Bank dataset terms also warn that some data have third-party ownership/reuse conditions and direct users to check the restricted-data list. The underlying workbook attributes many series to market-data publishers and other external sources.
- Because the exact public commercial republication permission for each gold, silver, copper, and other price series was not established, no Pink Sheet values are copied into the platform snapshot and no price chart is presented. The localized commodities page currently provides the official source link and an explicit rights-status explanation and is `noindex`.
- Reassessment required: verify each candidate series' primary source, restrictions, attribution, and commercial public-display permission. Monthly frequency must remain explicit; daily market data would need a separately licensed provider.

### Scheduled workflow branch behavior

- GitHub Actions `schedule` is evaluated from the repository's default branch; a workflow file that exists only on `develop` is not an active scheduled job yet. `workflow_dispatch` can be run against `develop` for manual verification.
- The research metadata workflow checks out and writes only `develop`, has `contents: write`, and commits only `src/data/research-papers.json` when its validated contents change. It does not merge or publish.
- The existing `publish.yml` is triggered by pushes to `main` only. Data workflow pushes to `develop` do not start that production image/deploy workflow.
- After a future, separately authorized main integration, scheduled behavior and a production data-delivery path must be reviewed. A commit to a source JSON file on `develop` is not a data delivery to a running production container. No production refresh or deployment is configured or run here.

### Phase 5 references

- [World Bank electricity access indicator and CC BY 4.0 label](https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS)
- [Tracking SDG 7 legal terms](https://trackingsdg7.esmap.org/legal)
- [NASA Open APIs / NeoWs documentation](https://api.nasa.gov/)
- [NASA API authentication and rate limits](https://api.nasa.gov/assets/html/authentication.html)
- [NASA media and data guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [NASA APOD copyright FAQ](https://science.nasa.gov/apod/apod-faq/)
- [JPL SSD/CNEOS API service and fair-use policy](https://ssd-api.jpl.nasa.gov/doc/)
