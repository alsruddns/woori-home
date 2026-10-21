import { NextResponse, type NextRequest } from "next/server";
import { negotiateLocale } from "@/lib/locale-negotiation.mjs";
import { isLocale } from "@/lib/site";

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const crawler = /bot|crawler|spider|crawling|slurp|facebookexternalhit|twitterbot/i.test(userAgent);
  const preferred = request.cookies.get("woori-locale")?.value;
  const locale = !crawler && preferred && isLocale(preferred)
    ? preferred
    : crawler ? "ko" : negotiateLocale(request.headers.get("accept-language"));
  const response = NextResponse.redirect(new URL(`/${locale}`, request.url), 307);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: "/" };
