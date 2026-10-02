export const FORGE_FLAGS = {
  v2Ui: process.env.NEXT_PUBLIC_ENABLE_FORGE_V2_UI === "1",
  v2Engine: process.env.NEXT_PUBLIC_ENABLE_FORGE_V2_ENGINE === "1",
  extendedCatalog: process.env.NEXT_PUBLIC_ENABLE_EXTENDED_CATALOG === "1",
  advancedOperations: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_OPERATIONS === "1",
  experimentalSurfaces: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_SURFACES === "1",
  betaModels: process.env.NEXT_PUBLIC_ENABLE_BETA_MODELS === "1",
} as const;

export type ForgeFlag = keyof typeof FORGE_FLAGS;
