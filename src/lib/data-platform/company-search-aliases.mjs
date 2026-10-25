const aliases = {
  AAPL: ["애플", "Apple Inc.", "Apple"],
  AMZN: ["아마존", "Amazon.com, Inc.", "Amazon"],
  AVGO: ["브로드컴", "Broadcom Inc.", "Broadcom"],
  GOOG: ["구글", "알파벳", "Google", "Alphabet Inc."],
  GOOGL: ["구글", "알파벳", "Google", "Alphabet Inc."],
  META: ["메타", "Meta Platforms, Inc.", "Meta"],
  MSFT: ["마이크로소프트", "Microsoft Corporation", "Microsoft"],
  NFLX: ["넷플릭스", "Netflix, Inc.", "Netflix"],
  NVDA: ["엔비디아", "NVIDIA Corporation", "NVIDIA"],
  TSLA: ["테슬라", "Tesla, Inc.", "Tesla"],
};

export function companySearchAliases(ticker) {
  return aliases[ticker.toUpperCase()] ?? [];
}

export function normalizeCompanySearch(value) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s._,()-]+/g, "");
}
