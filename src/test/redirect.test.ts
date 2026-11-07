import { describe, expect, it } from "vitest";

import { safeRedirect } from "@/lib/redirect";

describe("after-sign-in redirect", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirect("/history")).toBe("/history");
  });

  it("rejects other websites", () => {
    expect(safeRedirect("https://evil.example")).toBe("/analyze");
    expect(safeRedirect("//evil.example")).toBe("/analyze");
    expect(safeRedirect("/\\evil.example")).toBe("/analyze");
  });

  it("never loops back to the sign-in page", () => {
    expect(safeRedirect("/auth?redirect=/x")).toBe("/analyze");
  });
});
