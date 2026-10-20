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
