export function calculateLevel(xp: number): number {
  // Уровень = пол(корень(XP / 10)) + 1
  // 0 XP -> Уровень 1
  // 10 XP -> Уровень 2
  // 40 XP -> Уровень 3
  // 90 XP -> Уровень 4
  // 160 XP -> Уровень 5
  return Math.floor(Math.sqrt(xp / 10)) + 1;
}

export function getXpForNextLevel(level: number): number {
  return Math.pow(level, 2) * 10;
}

export function getXpForCurrentLevel(level: number): number {
  return Math.pow(level - 1, 2) * 10;
}
