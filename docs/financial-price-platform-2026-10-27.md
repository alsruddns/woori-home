# 금융 가격 플랫폼 검토 및 실행 감사 — 2026-10-27 KST

이 기록은 공급처 접근 가능성과 데이터 사용 권한을 구분한다. 아래 검토는 계정별 계약을 대신하지 않는다. `pending`은 금지를 뜻하지 않으며, 이번 운영 목적에 필요한 허가 근거가 확보되지 않았다는 뜻이다. 실제 데이터를 다운로드하거나 적재하지 않은 항목은 성공으로 기록하지 않는다.

## 공급처 비교

모든 후보의 검토일은 2026-10-27이다. 광고 사이트 이용은 일반 상업 이용과 함께 판단하되, 원자료 API 재배포 권리는 따로 검토한다. 명시되지 않은 호출 제한·보관 기간·삭제 조건은 추정하지 않는다.

### 금 — 7개 후보

| 공급처 / 공식 근거 | 무료·키·호출 예산 | 가격·이력·갱신·서버 접근 | 공개·광고 표시 / PostgreSQL·장기 보관 | 재배포·출처·삭제 / 결과 |
| --- | --- | --- | --- | --- |
| [GoldAPI 약관](https://www.goldapi.io/kb/tos), [요금제](https://www.goldapi.io/), [Next.js 안내](https://www.goldapi.io/blog/nextjs-goldapi-integration) | Sandbox 월 300회, 키 필요. 실제 계정/키 미확보 | XAU/USD 현물 참고 관측값, troy oz. 일별 이력 안내 존재. 공식 서버 통합 안내 있음. 실제 인증 미검증 | 앱의 사용자 표시를 조건부 허용. 계정별 캐시·로컬 저장·장기 축적 범위 pending | API 재판매·키 노출·경쟁 데이터 서비스 제한. 권리 고지 보존. 종료 후 보관 권한 pending. 구현 후보 1순위, 비활성 |
| [Metals.dev 약관](https://metals.dev/policy/terms), [요금제](https://metals.dev/pricing), [문서](https://metals.dev/docs) | Free 월 100회, 키 필요, 무료 가입은 결제정보 불필요 | 집계 금속 현물 및 별도 벤치마크, 60초 갱신. 서버 REST. 이력 범위는 엔드포인트/플랜 확인 필요 | 활성 구독 중 상업 웹 표시 허용 문구. 실제 Free 계정 적용 범위와 DB·장기 보관 pending | 재판매·직접 경쟁 API 제한. 종료 후 상업 이용 중단. 정확한 출처 의무 pending. 대체 후보 |
| [Metals-API 약관](https://app.metals-api.com/terms) | Free의 상업·공개·재배포 이용 금지. 키 필요. 실제 무료 호출 수 미확인 | 금속 환율/가격 API. 현물과 환율의 역수 표현을 구별해야 함. 플랜별 이력 | 무료 운영 부적합. 유료 응답에만 상업/공개 권한 부여. 영구 상업 보관 별도 Lifetime License | 경쟁 API·소프트웨어·DB·서비스 제한. 유료 종료 후 상업 이용 중단. 무료 운영 제외 |
| [FRED 약관](https://fred.stlouisfed.org/legal/terms/), [API 조건](https://fred.stlouisfed.org/docs/api/terms_of_use.html) | 무료 API 키, 계정별 한도 미검증 | 원제공처별 경제 시계열. 금 시리즈의 저작권·최근 제공일을 따로 확인해야 함 | 제3자 원데이터 권리 우선. 일반 약관에 DB·캐시·아카이브 제한 존재. 공개 상업 가격 DB 허가 pending | FRED와 원제공처 출처 필요. API 접근이 제3자 권리를 승인하지 않음. 기본 소스 제외 |
| [World Bank Commodity Markets](https://www.worldbank.org/en/research/commodity-markets), [Dataset 조건](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets) | XLS 다운로드, 키 없음. 공개 요청 한도 미명시 | Pink Sheet 월평균·연평균, 일별 종가 아님. 최신 월별 파일 및 장기 이력 | 일반 Dataset CC BY 정책에는 제3자 예외 존재. 금 열의 정확한 원제공처/예외 적용은 pending | World Bank와 원제공처 표시. 실제 금 열 권리 확인 후 월별 장기 분석 후보. 일별 시세로 대체하지 않음 |
| [LBMA](https://www.lbma.org.uk/prices-and-data/lbma-gold-price) | 공개 설명과 데이터 라이선스 구별. 무료 운영 라이선스 미확보 | 런던 금 벤치마크, 일 2회. 현물 거래소 확정 종가와 다름 | 실시간·과거 벤치마크 이용/재배포는 IBA 라이선스 필요. 광고 사이트 DB 허가 미확보 | 원권리자 허가 없이 FRED·다른 중간 출처로 우회하지 않음. 별도 계약 필요 |
| [Gold-api.com](https://gold-api.com/docs), [요금제](https://gold-api.com/pricing), [약관](https://gold-api.com/terms) | 현재가 무제한 무료, 이력/OHLC 시간당 10회 안내. 무료 현재가는 키 없음 | XAU와 일부 코인, 실시간 참고 가격. 서버 API 안내 있음 | 약관 페이지가 web 도구와 로컬 요청에서 timeout. 저장·광고·공개·장기 보관 전부 pending | 무료/CORS 안내를 재사용 허가로 간주하지 않음. 로컬 HTTPS 연결도 실패. 비활성 |

KRX/FSC의 기존 제한 검토는 `docs/financial-data-sources.md`를 유지한다. 거래소 금 가격을 소비자 매입/판매가로 바꾸지 않는다. 한국수출입은행 환율 API는 금 자체의 가격 공급처가 아니며, 이번 작업에서 환율 환산이나 신규 계약을 추가하지 않는다.

### 코인 — 7개 후보

| 공급처 / 공식 근거 | 무료·키·호출 예산 | 가격·이력·갱신·서버 접근 | 공개·광고 / PostgreSQL·장기 보관 | 재배포·출처·삭제 / 결과 |
| --- | --- | --- | --- | --- |
| [Coinranking 약관](https://support.coinranking.com/article/131-api-terms-conditions), [상업 이용 안내](https://support.coinranking.com/article/74-can-i-use-the-coinranking-api-for-commercial-purposes), [페이지네이션](https://coinranking.com/api/documentation/pagination) | 등록된 Free 키 재사용. 사용자가 확인한 월 10,000회/초당 5회. 내부 중단 예산 8,000회 | 여러 거래소 집계 USD 관측값. Cursor 최대 3페이지로 최대 300개. 플랜별 가격 이력; OHLC는 무료 권한 아님 | 공개 공유·상업 이용 안내와 경쟁 서비스 금지 조항을 함께 적용. 실제 사이트 경쟁 서비스 허가, DB 보관 범위 pending | Coinranking 링크와 출처 요구. 재판매 제한, 요청 시 수정/삭제, 종료 시 데이터 사용 권리 종료. 기존 게이트 유지. 1순위 후보이나 운영 미승인 |
| [CoinGecko 라이선스 안내](https://support.coingecko.com/articles/1043089972-what-are-the-differences-between-commercial-and-custom-licenses), [API 약관](https://www.coingecko.com/en/api_terms) | Demo 키 필요, 무료 플랜 상업 권한 없음. 계정별 호출량 미검증 | 글로벌 집계 가격/시총/거래량, 플랜별 과거 이력 | 유료 상업 권리와 원시 데이터 재배포는 별도. 유료 활성 구독 중 저장 조건 존재 | 표시 캐시는 최소 24시간마다 갱신, 저장 보호, API 종료 시 삭제. 출처 필요. 월비용 0원 목적의 대체 소스에서 제외 |
| [CoinPaprika 요금제](https://coinpaprika.com/api), [약관](https://coinpaprika.com/api-terms-of-use/), [라이선스](https://coinpaprika.com/api/licensing) | Free 키 없음, 월 20,000회, 초당 10회, 개인용 | 집계 데이터, Free 2,000자산·일별 이력 1년·최근 확정 일봉. Free 갱신 10분 | 무료 상업 사용 불가. 유료 내부 상업 사용과 사용자 공개 재배포가 분리됨 | Enterprise 공개 배포 계약 필요. Powered by CoinPaprika 출처. 무료 운영 제외 |
| [CoinCap 약관](https://www.coincap.io/terms-of-service?tab=terms), [플랜](https://pro.coincap.io/dashboard), [문서](https://pro.coincap.io/api-docs) | 키 필요. Demo 월 500 credits·분당 5회. 응답 크기별 추가 credit | 글로벌 집계 현재가/이력, API v3. 유료 플랜별 기능 | Demo는 생산 운영용이 아니며 장기 무료 경로로 사용 불가. 저장·보관 상세 pending | 상업 라이선스 유료 플랜. Trial을 운영용으로 연장하지 않음. 무료 운영 제외 |
| [Coinbase 시장데이터 약관](https://www.coinbase.com/legal/market_data), [거래소 문서](https://docs.cdp.coinbase.com/exchange/docs/welcome) | 공개 엔드포인트와 데이터 권한 분리. 계정/경로별 한도 확인 필요 | Coinbase 거래소 가격, 글로벌 집계 아님. 거래쌍별 일봉 | 내부 개인/연구 범위, 외부 사용자 앱과 파생 차트의 공개는 서면 허가 필요 | 공개·파생물 배포 제한. 원권리자 서면 허가 미확보. 운영 제외 |
| [CoinDesk/CryptoCompare 요금제](https://developers.coindesk.com/pricing/) | 개인 무료 범위와 lifetime call 제한. 실제 키·한도 미확보 | 집계·거래소별 일별/시간별 이력, 플랜별 제공 | 무료 CC BY-NC-SA, 상업/광고 사이트용 별도 라이선스 필요 | NC 자료를 변환해 상업 DB로 재배포하지 않음. 무료 운영 제외 |
| [CoinSpectrum API](https://coin-spectrum.com/api/), [방법론](https://coin-spectrum.com/about/methodology) | 공개 JSON, 키 없음, CDN 캐시 권장 | 집계 스냅샷/라이브, 일부 필드 null. 원자료가 여러 거래소 및 제3자 스냅샷에서 유래 | 사이트는 CC BY 4.0 상업 재사용을 명시하지만 제3자 가격/스냅샷 원권리 계보가 확인되지 않음 | 공개 CC 문구만으로 원제공처 재사용 권리를 추정하지 않음. 가격 데이터 운영 승인 pending |

Binance Vision 개인 연구 DB와 기존 Upbit/Bithumb/Binance 공개 가격 미승인 상태는 유지한다. 이번 작업에서 연구 데이터를 복제하거나 유료 플랜을 신청하지 않았다.

## 선택 및 아키텍처

- 금 기본 통합 후보는 GoldAPI, 대체 후보는 Metals.dev. 둘 다 키/계정 및 PostgreSQL·장기 보관·공개 API 사용 범위가 확인되기 전까지 수집/공개 비활성이다. World Bank는 금 열의 원권리 검토 후 월평균 분석 후보로만 분류한다.
- 코인 기본 후보는 기존 Coinranking. 무료 상업·공개·DB 장기 보관을 모두 충족한 대체 공급처는 이번 검토에서 확정하지 못했다. 가격 HTTP 접근 성공을 운영 권한으로 간주하지 않는다.
- 현재가 전달 방식은 매 방문 외부 호출을 만들지 않는다. 구현 경로는 공급처 → 권리 확인/예산 예약 → 검증 → 기존 PostgreSQL UPSERT → SELECT 전용 API → UI다.
- 새 테이블이나 Migration은 추가하지 않는다. 기존 `financial_assets`, `financial_daily_prices`, `data_collection_runs`를 재사용한다. 통화/단위/거래소를 공급처 자산 ID에 포함하고 원가격은 Decimal 문자열로 보존한다.

## 구현과 강제 조건

`financial-price-policy.mjs`는 기존 `dbStorage`/`longTermRetention`을 각각 persistentStorage/historicalStorage 의미로 재사용한다. 새 Gold 경로에는 `commercialUse`와 각 권리의 URL·검토일·정확한 scope를 `financial_rights.evidence`에 추가 요구한다. JSONB 확장이라 스키마 변경은 없다. 외부 계약/증거 없이 상태를 confirmed로 채우는 명령은 제공하지 않는다.

Gold 관측값은 `spot-reference`로 저장한다. 공유 `close` 열은 저장 공간일 뿐 거래소 확정 종가를 의미하지 않으며, 기준일은 공급처 timestamp의 실제 UTC 날짜다. 원래 USD/troy-ounce와 공급처 거래소를 보존한다. UI의 gram/don 환산은 중량 변환만 수행한다. 환율 환산은 없다. 이전 확정 종가 자료가 없으면 전일 종가 대비 변화율을 만들지 않는다.

Gold 수집은 일 1회, 세션 advisory lock, 일별 성공 중복 방지, 월 270회 보수적 예약 예산, 요청 timeout 15초, 연결 1개다. 실패 요청도 예약 예산에서 차감하고 실패 감사 상태를 남긴다. 응답/키를 오류에 포함하지 않는다. 재시도를 자동으로 반복하지 않아 장애 시 쿼터를 소비하지 않는다. 새 Gold CLI는 개발 DB만 허용한다. 운영 등록/키/권리/보호된 Import 경로가 준비되기 전에는 운영 스케줄을 만들지 않는다.

Gold API는 기존 SELECT 전용 금융 연결과 Rate Limiter를 사용한다. 심볼/통화/단위/관측 종류를 제한하고, 조회 중 권리 변경에도 이전 승인 결과만으로 데이터를 읽지 않는다. 승인 또는 데이터가 없으면 503과 안전한 상태 코드만 반환한다. UI는 기존 26개 언어 문구를 재사용하며, 오래된 관측 안내 26개 번역, UTC 시각, 원출처 링크, 7/30/90/365일 이력을 지원한다. 결측 날짜의 선을 연결하지 않는다.

공통 UPSERT의 기존 행 비교 SQL에는 quote 필드가 빠져 양쪽 행 길이가 다른 결함이 있었다. 이를 공통 저장 함수로 추출해 수정하고, quote-only 수정/완전 반복/오래된 입력 거부를 PostgreSQL 통합 테스트에 추가했다. OHLC 범위 검증은 binary Number 비교를 BigInt Decimal 비교로 교체했다.

Coinranking은 지원 개수 1~300개를 수용한다. 최대 3회 요청 예산 안에서 검증 불가 가격을 제외하고 UUID별 사유를 수집 감사에 남긴다. 거래 불가 가격을 0으로 채우거나 300개를 맞추기 위해 추가 요청하지 않는다. 기존 공개/수집 권리 게이트와 8,000회 예산은 유지한다.

## Phase별 감사 상태

| Phase | 이번 실행 결과 | 운영 적용 조건/증거 |
| --- | --- | --- |
| 1 공급처 | 금 7개·코인 7개 공식 자료 비교 | 새 운영 승인 없음, 키/범위 미확인 항목 pending |
| 2 공통 기반 | 정밀도 검증, 증거 기반 권리 평가, 공통 UPSERT와 SQL 결함 수정 | 실제 PostgreSQL 16 CI, 기존 금융 회귀 검사 |
| 3 Gold | 비활성 adapter·개발 CLI·DB 전용 API·다국어 UI 연결 | 공급처 자격증명과 등록/저장/공개 승인 전 실제 적재 차단 |
| 4 Crypto | 최대 지원 개수와 유효 행 격리 개선, 기존 수집/조회/UI 재사용 | Coinranking 승인 전 실제 적재 차단 |
| 5 자동 수집 | 기존 Coinranking 스케줄 gate 유지, Gold 예약 실행 가능한 경량 CLI | Gold 운영 스케줄/Secret/Import 권한 미구축, 자동 활성화 안 함 |
| 6 릴리스 | 문서화된 직접 main PR 경로 및 필수 validate 유지 | release-scope를 자동 승격 제외와 직접 릴리스 승인으로 혼동하지 않음 |
| 7 검증 | 테스트·브라우저·CI·배포 결과는 PR/Actions 및 최종 작업 보고에 기록 | 실제 API/DB/UI 가격 활성화 여부와 코드 배포 성공을 별도 판단 |

## 기존 스냅샷의 별도 릴리스 검토

develop에만 있던 NASA/Crossref 파일 4개는 기존 수집 Workflow 결과다. 원본 Git blob SHA-256과 status checksum 및 recordCount가 일치했고 중복 키는 없다. Windows 작업 트리의 CRLF는 원본 blob checksum과 구분했다. NASA는 2026-10-26~11-01 접근 예측 39건, Crossref는 DOI 메타데이터 157건이며 논문 초록/본문은 없다. 기존 변경을 삭제하거나 재수집하지 않고 별도 main PR #64로 분리했다. 출처는 [NASA Open API](https://api.nasa.gov/), [NASA 이용 안내](https://www.nasa.gov/nasa-brand-center/images-and-media/), [Crossref REST metadata](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)를 검토했다.

보호 경로는 `docs/production-deployment.md`의 Sensitive Workflow changes 절차를 따른다. 실제 Ruleset은 `validate` 필수/strict up-to-date/PR 필수/리뷰 수 0/우회 actor 0이다. 비필수 `release-scope`의 실패는 자동 승격 제외로 그대로 보고하며, 성공으로 바꾸거나 검사를 삭제하지 않는다.

## Scheduled release guard follow-up

Financial pipeline release PR #65 merged as d704b591590eda5764a704625460b399f61f0d26 after required CI and 52 locale-page checks. An independent existing scheduled run, #40362689100, failed before SSH/database access: the second release-guard invocation lacked the opt-in schedule authorization passed to the first invocation. The follow-up supplies the identical existing schedule/variable expression at both entry points. Regression coverage executes scheduled main/disabled/non-main guards and verifies both workflow blocks match. It does not enable a schedule, change source rights, relax main-only checks, or replay any production import. Actual collection remains blocked until provider rights and protected credentials are verified.
