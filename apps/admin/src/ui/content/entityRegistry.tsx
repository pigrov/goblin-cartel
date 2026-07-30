import type { ReactNode } from "react";
import type { ContentBundle, ContentRecord } from "../../api/adminApi";
import {
  ContentElevatorFields,
  ContentGoblinHutFields,
  applyElevatorForm,
  applyGoblinHutForm,
  createElevatorFormState,
  createGoblinHutFormState,
  validateElevatorForm,
  validateGoblinHutForm
} from "./editors/baseUpgradesEditor";
import {
  ContentBlockTypeFields,
  applyBlockTypeForm,
  createBlockTypeFormState,
  validateBlockTypeForm
} from "./editors/blockTypesEditor";
import {
  ContentBuiltMineTypeFields,
  applyBuiltMineTypeForm,
  createBuiltMineTypeFormState,
  validateBuiltMineTypeForm
} from "./editors/builtMineTypesEditor";
import {
  ContentBossCardFields,
  applyBossCardForm,
  createBossCardFormState,
  validateBossCardForm
} from "./editors/bossCardsEditor";
import {
  ContentGoblinsFields,
  applyGoblinsForm,
  createDefaultGoblinRoles,
  createGoblinsFormState,
  validateGoblinsForm
} from "./editors/goblinsEditor";
import { ContentIconFields, applyIconsForm, createIconsFormState, validateIconsForm } from "./editors/iconsEditor";
import {
  ContentMineTemplateFields,
  applyMineTemplateForm,
  createMineTemplateFormState,
  validateMineTemplateForm
} from "./editors/mineTemplatesEditor";
import {
  ContentRewardChestTypeFields,
  applyRewardChestTypeForm,
  createRewardChestTypeFormState,
  validateRewardChestTypeForm
} from "./editors/rewardChestTypesEditor";
import { formValue, stringField, type EntityFormState } from "./formState";

export type ContentEntityKind =
  | "icons"
  | "blockTypes"
  | "bossCards"
  | "builtMineTypes"
  | "elevator"
  | "goblins"
  | "goblinHut"
  | "mineTemplates"
  | "rewardChestTypes";

export type ContentEntityApiKind =
  | "resource"
  | "uiIcons"
  | "blockType"
  | "bossCard"
  | "builtMineType"
  | "elevator"
  | "goblins"
  | "goblinHut"
  | "mineTemplate"
  | "rewardChestType";

export interface FormValidation {
  errors: string[];
  ok: boolean;
}

export interface EntityDraftUpdate {
  entity: ContentRecord;
  entityId: string;
  entityType: ContentEntityApiKind;
  localization: Record<string, string>;
  message: string;
}

interface ContentEntityDefinition {
  apply: (content: ContentBundle, selectedId: string, state: EntityFormState) => EntityDraftUpdate;
  createFormState: (entity: ContentRecord, content: ContentBundle) => EntityFormState;
  getItems: (content: ContentBundle) => ContentRecord[];
  group?: "base";
  kind: ContentEntityKind;
  label: string;
  pickerDescription?: string;
  pickerLabel?: string;
  renderFields?: (props: ContentEntityFieldsRenderProps) => ReactNode;
  showInTabs?: boolean;
  validate: (state: EntityFormState, content: ContentBundle, errors: string[]) => void;
}

interface ContentEntityFieldsRenderProps {
  content: ContentBundle;
  formState: EntityFormState;
  sessionToken: string | null;
  updateField: (field: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}

export const contentEntityOrder: ContentEntityKind[] = [
  "icons",
  "blockTypes",
  "goblins",
  "goblinHut",
  "elevator",
  "mineTemplates",
  "builtMineTypes",
  "rewardChestTypes",
  "bossCards"
];

const contentEntityDefinitions: Record<ContentEntityKind, ContentEntityDefinition> = {
  icons: {
    apply: (content, _selectedId, state) => applyIconsForm(content, state),
    createFormState: createIconsFormState,
    getItems: (content) => [content.uiIcons ?? { id: "default", resources: {}, stats: {} }],
    kind: "icons",
    label: "Иконки",
    renderFields: ({ content, formState, sessionToken, updateField }) => (
      <ContentIconFields
        content={content}
        formState={formState}
        sessionToken={sessionToken}
        updateField={updateField}
      />
    ),
    validate: validateIconsForm
  },
  blockTypes: {
    apply: applyBlockTypeForm,
    createFormState: createBlockTypeFormState,
    getItems: (content) => content.blockTypes,
    kind: "blockTypes",
    label: "Блоки",
    renderFields: ({ content, formState, updateField, updateFields }) => (
      <ContentBlockTypeFields content={content} formState={formState} updateField={updateField} updateFields={updateFields} />
    ),
    validate: validateBlockTypeForm
  },
  bossCards: {
    apply: applyBossCardForm,
    createFormState: createBossCardFormState,
    getItems: (content) => content.bossCards ?? [],
    kind: "bossCards",
    label: "Карты босса",
    renderFields: ({ content, formState, updateField }) => (
      <ContentBossCardFields content={content} formState={formState} updateField={updateField} />
    ),
    validate: validateBossCardForm
  },
  builtMineTypes: {
    apply: applyBuiltMineTypeForm,
    createFormState: createBuiltMineTypeFormState,
    getItems: (content) => content.builtMineTypes ?? [],
    kind: "builtMineTypes",
    label: "Типы шахт",
    renderFields: ({ content, formState, updateField, updateFields }) => (
      <ContentBuiltMineTypeFields content={content} formState={formState} updateField={updateField} updateFields={updateFields} />
    ),
    validate: validateBuiltMineTypeForm
  },
  elevator: {
    apply: applyElevatorForm,
    createFormState: createElevatorFormState,
    getItems: (content) => [content.elevator ?? { id: "default", nameKey: "elevator.name", levels: [] }],
    group: "base",
    kind: "elevator",
    label: "Подъемник",
    pickerDescription: "Платформа и уровни спуска",
    renderFields: ({ formState, updateField, updateFields }) => (
      <ContentElevatorFields formState={formState} updateField={updateField} updateFields={updateFields} />
    ),
    showInTabs: false,
    validate: (state, _content, errors) => validateElevatorForm(state, errors)
  },
  goblins: {
    apply: applyGoblinsForm,
    createFormState: createGoblinsFormState,
    getItems: (content) => [
      content.goblins ?? {
        id: "default",
        nameKey: "goblins.name",
        roles: createDefaultGoblinRoles(),
        skin: {}
      }
    ],
    kind: "goblins",
    label: "Гоблины",
    renderFields: ({ formState, sessionToken, updateField, updateFields }) => (
      <ContentGoblinsFields
        formState={formState}
        sessionToken={sessionToken}
        updateField={updateField}
        updateFields={updateFields}
      />
    ),
    validate: validateGoblinsForm
  },
  goblinHut: {
    apply: applyGoblinHutForm,
    createFormState: createGoblinHutFormState,
    getItems: (content) => [content.goblinHut ?? { id: "default", nameKey: "goblin_hut.name", levels: [] }],
    group: "base",
    kind: "goblinHut",
    label: "База",
    pickerDescription: "Лимит гоблинов и роли",
    pickerLabel: "Хижина",
    renderFields: ({ content, formState, updateField, updateFields }) => (
      <ContentGoblinHutFields content={content} formState={formState} updateField={updateField} updateFields={updateFields} />
    ),
    validate: validateGoblinHutForm
  },
  mineTemplates: {
    apply: applyMineTemplateForm,
    createFormState: createMineTemplateFormState,
    getItems: (content) => content.mineTemplates,
    kind: "mineTemplates",
    label: "Рудники",
    renderFields: ({ content, formState, updateField, updateFields }) => (
      <ContentMineTemplateFields content={content} formState={formState} updateField={updateField} updateFields={updateFields} />
    ),
    validate: validateMineTemplateForm
  },
  rewardChestTypes: {
    apply: applyRewardChestTypeForm,
    createFormState: createRewardChestTypeFormState,
    getItems: (content) => content.rewardChestTypes ?? [],
    kind: "rewardChestTypes",
    label: "Сундуки",
    renderFields: ({ content, formState, updateField, updateFields }) => (
      <ContentRewardChestTypeFields content={content} formState={formState} updateField={updateField} updateFields={updateFields} />
    ),
    validate: validateRewardChestTypeForm
  }
};

export const contentEntityTabOptions: Array<{ label: string; value: ContentEntityKind }> = contentEntityOrder
  .map((kind) => contentEntityDefinition(kind))
  .filter((definition) => definition.showInTabs !== false)
  .map((definition) => ({ label: definition.label, value: definition.kind }));

export const baseUpgradeEntityKinds = contentEntityOrder.filter((kind) => contentEntityDefinition(kind).group === "base");

export function contentEntityDefinition(kind: ContentEntityKind): ContentEntityDefinition {
  return contentEntityDefinitions[kind];
}

export function getContentEntityItems(content: ContentBundle, kind: ContentEntityKind): ContentRecord[] {
  return contentEntityDefinition(kind).getItems(content);
}

export function createEntityFormState(kind: ContentEntityKind, entity: ContentRecord, content: ContentBundle): EntityFormState {
  return contentEntityDefinition(kind).createFormState(entity, content);
}

export function validateEntityForm(
  kind: ContentEntityKind,
  state: EntityFormState,
  content: ContentBundle,
  selectedId: string
): FormValidation {
  const errors: string[] = [];
  const items = getContentEntityItems(content, kind);
  const id = formValue(state, "id");
  const title = formValue(state, "title");

  if (!id.trim()) {
    errors.push("ID обязателен.");
  }

  if (items.some((item) => stringField(item, "id") === id && stringField(item, "id") !== selectedId)) {
    errors.push("ID должен быть уникальным.");
  }

  if (!title.trim()) {
    errors.push("Название RU обязательно.");
  }

  contentEntityDefinition(kind).validate(state, content, errors);

  return {
    errors,
    ok: errors.length === 0
  };
}

export function applyEntityForm(
  content: ContentBundle,
  kind: ContentEntityKind,
  selectedId: string,
  state: EntityFormState
): EntityDraftUpdate {
  return contentEntityDefinition(kind).apply(content, selectedId, state);
}

export function renderEntityFields(
  kind: ContentEntityKind,
  formState: EntityFormState,
  content: ContentBundle,
  updateField: (field: string, value: string) => void,
  updateFields: (values: EntityFormState) => void,
  sessionToken: string | null
) {
  const definition = contentEntityDefinition(kind);

  if (definition.renderFields) {
    return definition.renderFields({ content, formState, sessionToken, updateField, updateFields });
  }

  return null;
}

export function isBaseUpgradeKind(kind: ContentEntityKind): boolean {
  return contentEntityDefinition(kind).group === "base";
}

export function isContentEntityTabActive(kind: ContentEntityKind, tabKind: ContentEntityKind): boolean {
  const activeDefinition = contentEntityDefinition(kind);
  const tabDefinition = contentEntityDefinition(tabKind);
  return (activeDefinition.group ?? activeDefinition.kind) === (tabDefinition.group ?? tabDefinition.kind);
}
