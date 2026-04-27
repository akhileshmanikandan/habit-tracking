export function getTimeOfDay(): "morning" | "day" | "golden" | "night" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "golden";
  return "night";
}

export function getBackgroundGradient(): string {
  const tod = getTimeOfDay();
  switch (tod) {
    case "morning":
      return "bg-gradient-to-b from-blue-100/50 via-pink-50/30 to-cream";
    case "day":
      return "bg-gradient-to-b from-cream via-sage-light/10 to-cream";
    case "golden":
      return "bg-gradient-to-b from-amber-50/50 via-orange-50/30 to-cream-dark";
    case "night":
      return "bg-gradient-to-b from-[#1A2412] via-[#243318] to-[#1A2412]";
  }
}
