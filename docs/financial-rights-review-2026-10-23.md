# Official Financial Data Rights Review — 2026-10-23

This note records the official pages checked on 2026-10-23 for woori.today, an ad-supported public website. An API endpoint, free API key, public institution, or downloadable file does not by itself establish display, persistent storage, redistribution, or commercial rights. Current approval stays recorded separately for each use in the Provider Registry. No quote provider is approved by this review.

## Findings and use boundaries

| Source | Officially documented rights relevant here | What remains unconfirmed / decision |
| --- | --- | --- |
| SEC EDGAR Company Facts and submissions | SEC says its public filing content is free to access and reuse; APIs support submissions and XBRL company facts, with nightly bulk files. SEC requests must identify the caller and stay within Fair Access (currently max 10 requests/second). The Portal uses issuer-reported facts, USD, filing dates, and direct filing links. | Suitable for the existing filing-facts display and import scope; it is not a stock-price source or SEC-endorsed analysis. The SEC result count shown below is local development data, not a production import. |
| World Bank Open Data | Dataset terms grant CC BY 4.0 reuse including commercial use unless a particular dataset/indicator is marked otherwise. Attribution and third-party content exclusions apply. | Keep the existing reviewed World Bank scope and source attribution. Do not extend this blanket statement to other datasets. |
| Bank of Korea ECOS | BOK-authored statistics may be used, processed, and redistributed, including commercially, with source attribution under its portal usage guidance. Statistics authored by other institutions are subject to their own restrictions and may be noncommercial only without that institution's permission. | Eligible candidate for BOK-authored rates, inflation, FX and macro series after series-level origin, terms, attribution and API key are verified. Do not expose other-agency series until separately cleared. No API key was present in this environment. |
| OpenDART | Official API access requires a registered key, is subject to API-specific terms and quotas. | The reviewed terms do not expressly settle ad-supported display, PostgreSQL retention, long-term historical charts, or public API delivery for this Portal. Keep pending until OpenDART/FSS confirms the requested fields and uses in writing. |
| FRED | The FRED API can include series owned by third parties. FRED's terms say API access does not grant underlying series rights and restrict commercial use absent prior written consent. | Do not treat FRED as a blanket-cleared source. Clear each series owner and obtain written commercial display/storage permission before import. |
| Financial Services Commission / KRX quotes on Data.go.kr | The reviewed stock quote catalog is Public Nuri Type 4: attribution required, commercial use prohibited, modifications restricted, and third-party redistribution prohibited. The KRX states market-data services are sold through its data marketplace. | Do not use for this ad-supported display without a direct KRX commercial license. Public-data API access is not permission for this use. |

## Market price provider comparison

Prices below are official published entry prices where a clear price is shown. They are API subscription prices only; where exchange permission or a separate data-display agreement is required, that license fee is not included. No subscription was purchased.

| Provider | Market/data | Free tier | Public commercial display | Retention/history, API/redistribution | Published monthly price / next step |
| --- | --- | --- | --- | --- | --- |
| Twelve Data | US and global EOD equities, history, fundamentals; business plan page also lists real-time US. Korea exchanges appear in the exchange directory. | Basic is free but is documented for internal non-display use. | Business Venture or above is the relevant category. The US feed's separate guidance says external distribution requires the US Equities Add-on; exchange/market-specific approval may apply outside the US. | Price is not blanket permission to redistribute the original feed. Derived data may be stored only within its stated non-reconstructable scope and with attribution; raw redistribution needs a separate agreement. Written confirmation is needed for persistent raw OHLCV storage, public API, and KRX data. | Business pricing page currently presents Venture starting at $149/mo and another price/configuration selector; obtain a written quote for datasets, API credits, external distribution, markets and add-ons before choosing. |
| Financial Modeling Prep (FMP) | US/global EOD and historical prices, company fundamentals, market data; higher tiers list real-time. | Free/basic plan exists for testing, but it is not a public-display license. | FMP says public display on a multi-user website requires a specific Data Display and Licensing Agreement, even on paid plans. | Display and redistribution are distinct rights. Storage duration, public API and end-user reuse must be named in the agreement. | Consumer plans show from $19/$49/$99 for noncommercial categories, not this Portal's license. Commercial/Enterprise display price is quote-only in the reviewed source. Contact Enterprise sales. |
| Alpha Vantage | US/global price and fundamental endpoints, depending on endpoint/tier. | 25 API requests/day; free usage does not grant the Portal's commercial display rights. | Terms instruct commercial users to contact sales. Premium page distinguishes personal-market-data entitlements; it does not grant commercial site display by itself. | Storage, history, redistribution and public API must be confirmed with sales and relevant exchange licenses. | No commercial monthly price was published for this use in the reviewed official pages. Request quote and written scope. |
| Korea Exchange (KRX) | The official OPEN API exposes KOSPI/KOSDAQ daily stock and index data from 2010, with up to 10,000 requests/day per key. | The current OPEN API terms limit use to noncommercial purposes, require a KRX statistical-information credit, and forbid giving API data to third parties. That excludes woori.today ads and public data responses. | Do not use the free OPEN API for this Portal. Commercial exchange feeds are sold through the KRX/KOSCOM data distribution route; request a separate market-data agreement covering our display, cache, archive and API. | The official terms do not grant persistent third-party delivery rights. Separate written contract required. | KRX Data Marketplace does not publish a universal commercial redistribution fee. Quote via KRX/KOSCOM; see official buying and distribution pages. |
| Public Data Portal / FSC-KRX quote API | Korean stock/market quote endpoints. | API key access may be free. | The reviewed quote dataset is noncommercial (Public Nuri Type 4), so it is not cleared for woori.today. | Third-party redistribution is restricted. | Not a candidate unless KRX issues a separate commercial license. |

### Price source selection

The lowest-risk path for public markets is a written KRX license for the exact Korean datasets and a business display agreement (for example Twelve Data Venture plus the US Equities Add-on, or an FMP display agreement) for a narrowly scoped US EOD feed. These remain quotes to request, not approvals. FMP's public page explicitly calls for an agreement; Alpha Vantage's commercial price remains unpublished. Do not blend prices, market caps, dates, or sector metadata from different vendors as though they were one provider snapshot.

## Crypto provider rights matrix

| Provider | Public current price / 24h / candles | Ads, server cache, PostgreSQL and long-term history | Heatmap and own public API | Decision |
| --- | --- | --- | --- | --- |
| Upbit | Public Quotation endpoints and daily candles are technically accessible without auth; rate-limit groups are documented. | Open API terms prohibit use, copying, and distribution except as permitted by the terms. The reviewed public docs do not clearly grant ad-supported third-party quote display or long-term server storage. | Public API/data redistribution and reusable history remain unclear. | Pending written confirmation for each usage. |
| Bithumb | Public market endpoints are documented. | No official grant was located that clearly covers commercial web display, cached/retained history, and ads together. | No public API redistribution approval identified. | Pending written confirmation for each usage. |
| Binance Spot | Public market-data-only REST endpoints and candles are documented without account authentication. | Public endpoint access does not prove permission for a third-party ad-supported display or persistent archive; Binance terms prohibit resale/commercial use absent written agreement in the reviewed user terms. | No public API/data redistribution approval identified. | Pending written confirmation for each usage. |
| CoinGecko | Free public endpoints have shared, variable rate limits. Paid self-serve plans include commercial product display with prominent attribution. | Free Demo/keyless access has no commercial license. Paid plan attribution applies. The public terms reviewed do not settle the Portal's long-term raw archive or public API response; confirm these before storage. | Standard commercial plans do not include data/API redistribution, resale, or sublicense. An attributed heatmap displayed inside the site is product display; returning reusable underlying values through our API needs a custom grant. | Basic currently lists $29/mo billed yearly (100k monthly calls, 300/min); Demo is free/10k monthly calls but noncommercial. Confirm selected endpoints, retention and attribution before subscribing/importing. |

### Crypto cost comparison

| Provider | Free option | Commercial display price | Limits and additional permissions |
| --- | --- | --- | --- |
| Upbit / Bithumb / Binance Spot | Public quote endpoints exist. | No price for commercial redistribution was found in the reviewed official terms; written permission needed. | Endpoint rate limits are not a redistribution license. Obtain exact display, server cache, archive, and own-API rights. |
| CoinGecko | Demo: 10k calls/month, shared 100/min; no commercial rights. | Basic: $29/month billed yearly, 100k calls/month and 300/min, standard commercial product display with attribution. | Public API redistribution and raw historical delivery are excluded from standard commercial rights. Paid subscription is not an approval for those purposes. Enterprise custom license price is quote-only. |

## Provider-level rights checklist

The Registry must keep independent states (`confirmed`, `pending`, `restricted`, `denied`) for: API access; commercial/ad-supported public display; short cache; PostgreSQL write; long-term storage; chart/history; heatmap/derived view; public API response; CSV download; and attribution. Record official terms URL, version/date reviewed, allowed scope, required attribution, review-by date, and the written authorization reference. A `confirmed` value must cite a reviewed official clause or executed agreement. Any pending or expired right blocks the associated write and response at request time.

## Ready-to-send inquiry drafts (not sent)

### Upbit / Bithumb — Korean

**제목:** woori.today 공개 시세 표시 및 가격 데이터 보관 라이선스 문의

안녕하세요. 광고가 포함된 공개 금융 대시보드 woori.today의 운영자입니다. 귀 거래소의 공개 시세 API를 아래 범위로 이용하려고 합니다. 사용 승인 및 별도 계약·요금 조건을 확인 부탁드립니다.

1. 웹사이트에서 현재가, 24시간 등락률, 거래량, 일봉 OHLCV를 출처 링크와 함께 표시
2. Provider와 시장(예: KRW-BTC)을 구분하고 기준 시각을 표시
3. 서버의 단기 캐시와 PostgreSQL 일별 스냅샷 저장, 장기 과거 차트 제공
4. 종목 검색·상승/하락 순위·시가총액 가중 히트맵(시가총액도 귀사 원천 데이터인 경우에만 사용)
5. woori.today 자체 API가 화면 표시용 값을 이용자 요청에 응답. 원시 대량 추출, CSV 다운로드, 제3자 재배포는 기본 범위에서 제외
6. 광고 게재 및 상업적 공개 서비스, 예상 월간 페이지뷰 [ ], 이용자 수 [ ], API 호출 수 [ ]

각 항목별 허용 여부, 캐시/보관 기간, API 이용량 제한, attribution 문구·배치, 종료 시 저장 데이터 삭제 조건, 무료 또는 유료 라이선스와 예상 비용을 알려주시기 바랍니다. 가능하다면 위 범위를 명시한 서면 허가 또는 계약서를 부탁드립니다.

감사합니다.

### Binance — English

**Subject:** Commercial display and historical storage permission for Binance Spot market data

Hello, we operate woori.today, an ad-supported public financial dashboard. We would like written confirmation and a quote for using Binance Spot public market data for: (1) current prices, 24-hour changes and volume; (2) daily OHLCV; (3) short-lived server caching and PostgreSQL daily snapshots with long-term chart history; (4) attributed charts and heatmaps that preserve the exchange market and quote currency (for example BTC-USDT); and (5) responses from our own API to normal page-view requests. We will not offer raw bulk exports, CSV downloads, API-key sharing, or onward redistribution unless separately licensed.

Please confirm each permitted use, commercial/ad-supported display, retention and deletion requirements, rate limits, attribution, user/API volume limits, supported territories, and any one-time or monthly licensing fees. Please identify the governing terms or provide an executed written addendum covering this scope.

Expected monthly page views: [ ]; end users: [ ]; requests/day: [ ]; required markets/symbols: [ ].

Regards,
[Operator name / legal entity / contact]

### US / Korea equity vendor (Twelve Data, FMP, Alpha Vantage, or KRX) — English

**Subject:** Quote and licensing scope for public end-of-day equity dashboard

Hello, we operate woori.today, an ad-supported public dashboard and want to start with daily closing prices only. Please quote a production license for the following markets/symbols and uses: last completed trading date, close, previous close/change, volume, history, company name/ticker/exchange, sector, and market capitalization only when included in the licensed source.

Please separately specify commercial external display, ad-supported pages, server cache, PostgreSQL retention period, historical charts, heatmaps, calls from our own API, user lookup limits, CSV export (disabled unless granted), required attribution, exchange fees/add-ons, covered territories, API quotas, service level, and monthly cost. Please state whether index data for S&P 500, Nasdaq Composite, Dow Jones, KOSPI and KOSDAQ is included or needs separate index licensing. We will not infer market capitalization or mix sources.

Expected monthly page views: [ ]; users: [ ]; symbols: [ ]; refresh frequency: once per trading day; requested history: [ ] years.

Regards,
[Operator name / legal entity / contact]

## Official references

- SEC APIs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- SEC Fair Access and reuse: https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data and https://www.sec.gov/files/about/webmaster-faq.htm
- World Bank dataset terms: https://www.worldbank.org/ext/en/legal/terms-conditions/datasets
- Bank of Korea ECOS: https://ecos.bok.or.kr/
- OpenDART overview and terms: https://opendart.fss.or.kr/intro/main.do and https://opendart.fss.or.kr/intro/terms.do
- FRED API terms: https://fred.stlouisfed.org/docs/api/terms_of_use.html and https://fred.stlouisfed.org/legal/
- Data.go.kr reviewed quote catalog: https://www.data.go.kr/data/15094805/openapi.do
- KRX OPEN API terms and market-data contract contact path: https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO002.jsp, https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO003.jsp, https://openapi.krx.co.kr/contents/OPP/DATA/OPPDATA001.jsp, and https://openapi.krx.co.kr/contents/OPP/DATA/OPPDATA003.jsp
- Twelve Data business pricing: https://twelvedata.com/pricing-business; business usage: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage; US equities: https://support.twelvedata.com/en/articles/9935903-us-equities-market-data
- FMP commercial plans and terms: https://site.financialmodelingprep.com/pricing-plans?planType=commercial and https://site.financialmodelingprep.com/terms-of-service
- Alpha Vantage terms, usage limits and support: https://www.alphavantage.co/terms_of_service/, https://www.alphavantage.co/premium/, and https://www.alphavantage.co/support/
- CoinGecko licensing, pricing and sales contact: https://support.coingecko.com/articles/1043089972-what-are-the-differences-between-commercial-and-custom-licenses, https://www.coingecko.com/en/api/pricing, and https://www.coingecko.com/en/api/contact
- Upbit rate limits, Open API terms, and technical support inquiry: https://docs.upbit.com/kr/reference/rate-limits, https://www.upbit.com/open_api_agreement, and https://docs.upbit.com/kr/page/upbit_open_api_support
- Bithumb API docs and official customer support inquiry: https://apidocs.bithumb.com/ and https://www.bithumb.com/react/legacy/customer_support/question
- Binance public market API and terms: https://developers.binance.com/en/docs/products/spot/rest-api and https://www.binance.com/en/terms

No provider inquiry was submitted, no paid plan was purchased, and no quote provider was enabled by this review. Official inquiry paths: Upbit Open API support page; Bithumb customer support page; Binance support center https://www.binance.com/en/support; CoinGecko https://www.coingecko.com/en/api/contact; Twelve Data support@twelvedata.com / sales@twelvedata.com; FMP https://site.financialmodelingprep.com/enterprise-contact; Alpha Vantage premium@alphavantage.co; Korea stock quote licensing through KRX Data Marketplace (krxdata@krx.co.kr, 02-3774-8904) or KOSCOM market-data sales (dglee@koscome.co.kr, 02-767-8519); see the KRX market-data distribution page.
