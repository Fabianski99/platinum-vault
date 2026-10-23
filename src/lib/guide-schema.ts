/**
 * Contrato para la futura etapa de guías personalizadas.
 * Las etiquetas son "unknown" hasta que una fuente comprobada las confirme.
 * No inferir perdibles, NG+, dificultad o multijugador solo del nombre del logro.
 */
export type VerifiedFlag = "yes" | "no" | "unknown";

export type AchievementRequirements = {
  apiName: string;
  missable: VerifiedFlag;
  difficulty: VerifiedFlag;
  newGamePlus: VerifiedFlag;
  multiplayer: VerifiedFlag;
  downloadableContent: VerifiedFlag;
  chapter?: string;
  prerequisites?: string[];
  evidence?: { source: string; checkedAt: string }[];
};

export type GuideStage = {
  id: string;
  title: string;
  summary: string;
  achievementIds: string[];
  prerequisites: string[];
  position: number;
};

export type PlannedGuide = {
  appId: number;
  version: number;
  reviewedAt: string | null;
  requirements: AchievementRequirements[];
  stages: GuideStage[];
  confidence: "verified" | "partial" | "unreviewed";
};
