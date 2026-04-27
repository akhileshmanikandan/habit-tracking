type HapticPattern = number | number[];

function vibrate(pattern: HapticPattern): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  /** Light tap — checkmark, simple toggle */
  light: () => vibrate(10),
  /** Medium pulse — PR hit, good log */
  medium: () => vibrate([20, 50, 20]),
  /** Heavy rumble — streak milestone, campfire ignite */
  heavy: () => vibrate([50, 30, 50, 30, 100]),
  /** Double tap — reaction received */
  double: () => vibrate([15, 40, 15]),
};
