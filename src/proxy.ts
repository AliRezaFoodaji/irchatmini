import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hostnameFrom(hostHeader: string): string {
  if (hostHeader.startsWith("[")) {
    const end = hostHeader.indexOf("]");
    return end > -1 ? hostHeader.slice(1, end) : hostHeader;
  }
  return hostHeader.split(":")[0];
}

/**
 * During local development, browsers only grant camera/mic access on HTTPS.
 * The `npm run dev:phone` script serves the app over HTTPS on port 3443.
 * When a phone (or any LAN device) opens the plain HTTP page on the PC's
 * LAN IP, we redirect it to the HTTPS version automatically. Production
 * deployments already run behind nginx which handles http->https itself.
 */
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.next();
  }

  // Requests that already went through the dev-phone HTTPS proxy carry
  // x-forwarded-proto: https — never redirect those.
  if (request.headers.get("x-forwarded-proto") === "https") {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";
  const hostname = hostnameFrom(host);
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next();
  }

  const httpsPort = process.env.HTTPS_PORT ?? "3443";
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(
    `https://${hostname}:${httpsPort}${pathname}${search}`,
  );
}

export const config = {
  matcher:
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
};