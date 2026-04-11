import { describe, expect, it } from "vitest";
import { rolloutBadgeText, toFeatureFlagsCsv } from "./ops-control";

describe("ops control helpers", () => {
  it("formats rollout badges", () => {
    expect(rolloutBadgeText(0)).toBe("Off");
    expect(rolloutBadgeText(10)).toBe("10%");
    expect(rolloutBadgeText(100)).toBe("Global");
  });

  it("exports feature flags as csv", () => {
    const csv = toFeatureFlagsCsv([
      {
        module_key: "offline_pos_sync",
        enabled: true,
        rollout_percent: 30,
        updated_at: "2026-04-11T10:00:00Z",
      },
    ]);

    expect(csv).toContain("module_key,enabled,rollout_percent,updated_at");
    expect(csv).toContain("offline_pos_sync,true,30,2026-04-11T10:00:00Z");
  });
});
