const preview = process.env.VERCEL_ENV === "preview";

export const FORGE_FLAGS = {
  v2Ui: preview || process.env.NEXT_PUBLIC_ENABLE_FORGE_V2_UI === "1",
  v2Engine: preview || process.env.NEXT_PUBLIC_ENABLE_FORGE_V2_ENGINE === "1",
  extendedCatalog:
    preview || process.env.NEXT_PUBLIC_ENABLE_EXTENDED_CATALOG === "1",
  advancedOperations:
    preview || process.env.NEXT_PUBLIC_ENABLE_ADVANCED_OPERATIONS === "1",
  experimentalSurfaces:
    preview || process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_SURFACES === "1",
  betaModels: preview || process.env.NEXT_PUBLIC_ENABLE_BETA_MODELS === "1",
} as const;

export type ForgeFlag = keyof typeof FORGE_FLAGS;
