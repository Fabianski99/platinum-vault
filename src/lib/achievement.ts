export type AchievementDetail = {
  apiName: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockTime: number | null;
  icon: string | null;
  lockedIcon: string | null;
  globalPercent: number | null;
  hidden: boolean;
};

export type GameAchievementData = {
  achievements: AchievementDetail[];
  available: boolean;
  unlocked: number;
  total: number;
  completedAt: number | null;
  note?: string;
};
