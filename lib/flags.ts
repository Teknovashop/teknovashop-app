// lib/flags.ts
export const FLAGS = {
  v2: process.env.NEXT_PUBLIC_FORGE_V2 === "1",
  laser: process.env.NEXT_PUBLIC_FORGE_LASER === "1",
  text: process.env.NEXT_PUBLIC_FORGE_TEXT === "1",
};
