const supported = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn"];

export function negotiateLocale(acceptLanguage, fallback = "ko") {
  const choices = String(acceptLanguage ?? "").split(",").map((entry, index) => {
    const [tagPart, ...params] = entry.trim().split(";");
    const q = Number(params.find((value) => value.trim().startsWith("q="))?.trim().slice(2) ?? 1);
    return { tag: tagPart.toLowerCase(), q: Number.isFinite(q) ? q : 0, index };
  }).filter((item) => item.tag && item.q > 0).sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of choices) {
    const normalized = tag.replaceAll("_", "-");
    if (normalized === "zh-tw" || normalized === "zh-hant" || normalized.startsWith("zh-hk") || normalized.startsWith("zh-mo")) return "zh-tw";
    if (normalized === "zh-cn" || normalized === "zh-sg" || normalized === "zh-hans") return "zh";
    if (normalized === "pt-br" || normalized.startsWith("pt-br-")) return "pt-br";
    const base = normalized.split("-")[0];
    if (supported.includes(base)) return base;
  }
  return supported.includes(fallback) ? fallback : "ko";
}
