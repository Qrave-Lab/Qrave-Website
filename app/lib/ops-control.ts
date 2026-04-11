export type OpsFeatureFlag = {
  module_key: string;
  enabled: boolean;
  rollout_percent: number;
  updated_at: string;
};

export function rolloutBadgeText(percent: number): string {
  if (percent <= 0) return "Off";
  if (percent >= 100) return "Global";
  return `${percent}%`;
}

export function toFeatureFlagsCsv(flags: OpsFeatureFlag[]): string {
  const lines = ["module_key,enabled,rollout_percent,updated_at"];
  for (const flag of flags) {
    lines.push([
      csvEscape(flag.module_key),
      flag.enabled ? "true" : "false",
      String(flag.rollout_percent),
      csvEscape(flag.updated_at),
    ].join(","));
  }
  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (!value.includes(",") && !value.includes("\"") && !value.includes("\n")) {
    return value;
  }
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
