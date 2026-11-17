import { test, expect } from "vitest";
import { scrubEvent } from "./sentry-scrub";

test("scrubEvent redacts headers, query tokens, bodies and PII", () => {
  const e = scrubEvent({
    message: "failed for a@b.com +91 98765 43210",
    request: {
      url: "https://x.test/pay?token=abc&table=3#h",
      query_string: "otp=123456&table=3",
      headers: { Authorization: "Bearer abc", Cookie: "a=b", Accept: "json" },
      cookies: { a: "b" },
      data: { pin: "1234" },
    },
    user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4" },
  });
  expect(e.request.headers.Authorization).toBe("[redacted]");
  expect(e.request.headers.Cookie).toBe("[redacted]");
  expect(e.request.headers.Accept).toBe("json");
  expect(!e.request.query_string.includes("123456")).toBe(true);
  expect(!e.request.url.includes("abc")).toBe(true);
  expect(e.request.url.includes("table=3")).toBe(true);
  expect(e.request.data).toBe(undefined);
  expect(e.user).toEqual({ id: "u1" });
  expect(!e.message.includes("a@b.com") && !e.message.includes("98765")).toBe(true);
});
