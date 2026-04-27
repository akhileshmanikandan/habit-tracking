import { getTimeOfDay } from "@/lib/utils/time-of-day";

export interface LightingConfig {
  canvasOverlay: string; // rgba color for overlay
  treeMultiplier: number; // brightness multiplier for trees
  shadowAlpha: number;
  ambientColor: string;
}

export function getLighting(): LightingConfig {
  const tod = getTimeOfDay();
  switch (tod) {
    case "morning":
      return {
        canvasOverlay: "rgba(180, 200, 220, 0.08)",
        treeMultiplier: 0.95,
        shadowAlpha: 0.1,
        ambientColor: "#d4e6f1",
      };
    case "day":
      return {
        canvasOverlay: "rgba(255, 250, 230, 0.05)",
        treeMultiplier: 1.0,
        shadowAlpha: 0.15,
        ambientColor: "#fef9e7",
      };
    case "golden":
      return {
        canvasOverlay: "rgba(255, 180, 80, 0.1)",
        treeMultiplier: 1.05,
        shadowAlpha: 0.2,
        ambientColor: "#fdebd0",
      };
    case "night":
      return {
        canvasOverlay: "rgba(20, 30, 50, 0.3)",
        treeMultiplier: 0.6,
        shadowAlpha: 0.05,
        ambientColor: "#1a2332",
      };
  }
}
