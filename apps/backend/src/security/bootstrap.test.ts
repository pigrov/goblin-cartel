import { describe, expect, it } from "vitest";
import { isBootstrapEmail, parseBootstrapEmails } from "./bootstrap.js";

describe("bootstrap emails", () => {
  it("normalizes comma separated emails", () => {
    expect(parseBootstrapEmails(" Admin@Example.com, second@example.com ")).toEqual([
      "admin@example.com",
      "second@example.com"
    ]);
  });

  it("matches bootstrap emails case-insensitively", () => {
    expect(isBootstrapEmail("ADMIN@example.com", ["admin@example.com"])).toBe(true);
    expect(isBootstrapEmail("other@example.com", ["admin@example.com"])).toBe(false);
  });
});
