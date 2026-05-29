import type { CharacterSheet, CharacterTemplateId } from "./types.js";

export interface CharacterTemplateField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

export interface CharacterTemplateDef {
  id: CharacterTemplateId;
  label: string;
  description: string;
  defaultBio: string;
  fields: CharacterTemplateField[];
}

export const CHARACTER_TEMPLATES: CharacterTemplateDef[] = [
  {
    id: "generic",
    label: "Genérico",
    description: "Ficha libre para cualquier sistema",
    defaultBio: "",
    fields: [
      { key: "concept", label: "Concepto", placeholder: "Ej. mercenario retirado" },
      { key: "traits", label: "Rasgos", multiline: true },
      { key: "goals", label: "Objetivos", multiline: true },
    ],
  },
  {
    id: "dnd5e",
    label: "D&D 5e",
    description: "Atributos y combate básico",
    defaultBio: "",
    fields: [
      { key: "class", label: "Clase y nivel", placeholder: "Ej. Guerrero 3" },
      { key: "race", label: "Raza / trasfondo" },
      { key: "str", label: "FUE" },
      { key: "dex", label: "DES" },
      { key: "con", label: "CON" },
      { key: "int", label: "INT" },
      { key: "wis", label: "SAB" },
      { key: "cha", label: "CAR" },
      { key: "hp", label: "PV" },
      { key: "ac", label: "CA" },
      { key: "features", label: "Dotes y conjuros", multiline: true },
    ],
  },
  {
    id: "pf2e",
    label: "Pathfinder 2e",
    description: "Campos mínimos PF2",
    defaultBio: "",
    fields: [
      { key: "ancestry", label: "Ascendencia" },
      { key: "class", label: "Clase" },
      { key: "level", label: "Nivel" },
      { key: "attributes", label: "Atributos", multiline: true },
      { key: "feats", label: "Dotes", multiline: true },
    ],
  },
];

export function getTemplate(id?: CharacterTemplateId): CharacterTemplateDef {
  return CHARACTER_TEMPLATES.find((t) => t.id === id) ?? CHARACTER_TEMPLATES[0];
}

export function formatSheetBio(sheet: CharacterSheet): string {
  const template = getTemplate(sheet.templateId);
  const parts: string[] = [];
  if (sheet.bio?.trim()) parts.push(sheet.bio.trim());
  const data = sheet.sheetData ?? {};
  const fieldLines = template.fields
    .map((f) => {
      const v = data[f.key]?.trim();
      return v ? `**${f.label}:** ${v}` : "";
    })
    .filter(Boolean);
  if (fieldLines.length) {
    parts.push(fieldLines.join("\n"));
  }
  return parts.join("\n\n");
}
