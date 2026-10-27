export function formatCryptoUsdPrice(value, locale) {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  const numeric = Number(value);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: numeric >= 1 ? 2 : 0,
    maximumFractionDigits: Math.min(numeric >= 1 ? 2 : Math.max(2, (value.split(".")[1] ?? "").replace(/0+$/, "").length), 20),
  });
  const parts = formatter.formatToParts(1);
  const symbol = (parts.find((part) => part.type === "currency")?.value ?? "$").replace(/^US\$/, "$");
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
  const [integerRaw, fractionRaw = ""] = value.split(".");
  let integerValue = BigInt(integerRaw);
  let fraction = fractionRaw;
  if (numeric >= 1) {
    let cents = integerValue * BigInt(100) + BigInt((fractionRaw + "00").slice(0, 2));
    if (Number((fractionRaw + "000")[2]) >= 5) cents += BigInt(1);
    integerValue = cents / BigInt(100);
    fraction = String(cents % BigInt(100)).padStart(2, "0");
  }
  const integer = integerValue.toLocaleString(locale);
  if (fraction) {
    const zero = new Intl.NumberFormat(locale, { useGrouping: false }).format(0);
    const localized = BigInt(fraction).toLocaleString(locale, { useGrouping: false });
    fraction = zero.repeat(Math.max(0, fraction.length - localized.length)) + localized;
  }
  const number = `${integer}${fraction ? decimal + fraction : ""}`;
  const currencyPart = parts.findIndex((part) => part.type === "currency");
  const numericPart = parts.findIndex((part) => part.type === "integer");
  return currencyPart < numericPart ? `${symbol}${number}` : `${number}${parts.find((part) => part.type === "literal")?.value ?? ""}${symbol}`;
}
