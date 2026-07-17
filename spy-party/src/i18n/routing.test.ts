// @vitest-environment node
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./routing";

const handle = createMiddleware(routing);

describe("locale middleware", () => {
  it("redirects / to the default locale (vi)", () => {
    const res = handle(new NextRequest(new URL("http://localhost/")));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/vi");
  });

  it("redirects / to /en when the browser prefers English", () => {
    const res = handle(
      new NextRequest(new URL("http://localhost/"), {
        headers: { "accept-language": "en-US,en;q=0.9" },
      }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/en");
  });
});
