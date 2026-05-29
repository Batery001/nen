import type { CharacterTemplateId } from "../types";

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
  fields: CharacterTemplateField[];
}

export const CHARACTER_TEMPLATES: CharacterTemplateDef[] = [
  {
    id: "generic",
    label: "Genérico",
    description: "Ficha libre",
    fields: [
      { key: "concept", label: "Concepto" },
      { key: "traits", label: "Rasgos", multiline: true },
      { key: "goals", label: "Objetivos", multiline: true },
    ],
  },
  {
    id: "dnd5e",
    label: "D&D 5e",
    description: "Atributos básicos",
    fields: [
      { key: "class", label: "Clase y nivel" },
      { key: "race", label: "Raza" },
      { key: "str", label: "FUE" },
      { key: "dex", label: "DES" },
      { key: "con", label: "CON" },
      { key: "int", label: "INT" },
      { key: "wis", label: "SAB" },
      { key: "cha", label: "CAR" },
      { key: "hp", label: "PV" },
      { key: "ac", label: "CA" },
      { key: "features", label: "Dotes", multiline: true },
    ],
  },
  {
    id: "pf2e",
    label: "Pathfinder 2e",
    description: "Campos PF2",
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
