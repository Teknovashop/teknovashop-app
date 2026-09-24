export const LEGAL = {
  brand: "Teknovashop Forge",
  operator: process.env.NEXT_PUBLIC_LEGAL_NAME || "PENDIENTE: titular legal",
  taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID || "PENDIENTE: NIF/CIF",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "PENDIENTE: domicilio",
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "PENDIENTE: email legal",
  country: process.env.NEXT_PUBLIC_LEGAL_COUNTRY || "España",
  version: "2026-09-24.1",
};

export const LEGAL_READY = Boolean(
  process.env.NEXT_PUBLIC_LEGAL_NAME &&
  process.env.NEXT_PUBLIC_LEGAL_TAX_ID &&
  process.env.NEXT_PUBLIC_LEGAL_ADDRESS &&
  process.env.NEXT_PUBLIC_LEGAL_EMAIL
);
