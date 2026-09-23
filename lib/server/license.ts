import {
  LICENSE_VERSION,
  TERMS_VERSION,
  type CommercePlan,
  licenseLabel,
} from "@/lib/commerce";

type LicenseInput = {
  plan: CommercePlan;
  designId: string;
  productName: string;
  productVersion: string;
  sha256: string;
};

export function buildLicenseText(input: LicenseInput) {
  const planRights =
    input.plan === "commercial"
      ? [
          "You may use the licensed design to manufacture physical items for commercial sale while the Commercial entitlement is valid.",
          "You may modify the design for your own manufacturing workflow.",
        ]
      : input.plan === "maker"
        ? [
            "You may use and modify the licensed design for personal, educational and non-commercial maker use while the Maker entitlement is valid.",
          ]
        : [
            "You may use and modify this specific licensed design for personal and non-commercial use.",
          ];

  return [
    "TEKNOVASHOP FORGE DIGITAL DESIGN LICENSE",
    "",
    `License version: ${LICENSE_VERSION}`,
    `Terms version: ${TERMS_VERSION}`,
    `License tier: ${licenseLabel(input.plan)}`,
    `Design ID: ${input.designId}`,
    `Product: ${input.productName}`,
    `Product version: ${input.productVersion}`,
    `STL SHA-256: ${input.sha256}`,
    "",
    "LICENSE SUMMARY",
    ...planRights.map((x) => `- ${x}`),
    "- You may not resell, redistribute, sublicense, publish or share the STL, source geometry, manifest or substantially equivalent digital design files.",
    "- You may not make the digital files available in a public or private file library for third parties.",
    "",
    "This file is a portable license summary for the downloaded design.",
    "The authoritative agreement is the Teknovashop Terms accepted at checkout for the Terms version shown above.",
    "",
    "Keep this file together with the STL and design manifest for traceability.",
    "",
  ].join("\n");
}
