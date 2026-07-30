import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentAssetUploadField } from "../ContentAssetUploadField";
import { ContentNestedSection, ContentTextField } from "../formFields";
import {
  contentEntityTitle,
  formValue,
  recordField,
  stringField,
  type EntityFormState
} from "../formState";

const statIconFields = [
  { field: "statIconPower", key: "power", label: "Иконка силы", defaultAssetId: "ui_icon_pickaxe_v1" },
  { field: "statIconSpeed", key: "speed", label: "Иконка скорости", defaultAssetId: "ui_icon_boot_v1" },
  { field: "statIconControl", key: "control", label: "Иконка контроля", defaultAssetId: "ui_icon_clock_v1" }
] as const;

const controlIconFields = [
  {
    field: "controlSettingsButtonFrame",
    key: "settingsButtonFrame",
    label: "Подложка кнопки настроек",
    defaultAssetId: "ui_settings_button_frame_v1"
  },
  { field: "controlSettingsIcon", key: "settingsIcon", label: "Иконка настроек", defaultAssetId: "ui_settings_gear_v1" }
] as const;

export function ContentIconFields(props: {
  content: ContentBundle;
  formState: EntityFormState;
  sessionToken: string | null;
  updateField: (field: string, value: string) => void;
}) {
  const ru = props.content.localization?.ru ?? {};

  return (
    <>
      <ContentNestedSection title="Иконки ресурсов">
        <p className="content-form-note">Эти PNG используются в шапке ресурсов и в ценах найма/улучшений.</p>
        <div className="content-form-grid content-hire-card-skin-grid">
          {props.content.resources.map((resource) => {
            const resourceId = stringField(resource, "id");
            const field = iconResourceField(resourceId);
            const value = formValue(props.formState, field) || stringField(resource, "iconAssetId");

            return (
              <div className="content-list-row content-list-row-wide" key={resourceId}>
                <ContentTextField label={contentEntityTitle(resource, ru)} name={field} onChange={props.updateField} value={value} />
                <ContentAssetUploadField
                  assetId={value}
                  label={contentEntityTitle(resource, ru)}
                  onAssetIdChange={(assetId) => props.updateField(field, assetId)}
                  token={props.sessionToken}
                  uploadLabel="Загрузить PNG"
                />
              </div>
            );
          })}
        </div>
      </ContentNestedSection>

      <ContentNestedSection title="Иконки параметров гоблина">
        <div className="content-form-grid content-hire-card-skin-grid">
          {statIconFields.map((item) => {
            const value = formValue(props.formState, item.field) || item.defaultAssetId;

            return (
              <div className="content-list-row content-list-row-wide" key={item.field}>
                <ContentTextField label={item.label} name={item.field} onChange={props.updateField} value={value} />
                <ContentAssetUploadField
                  assetId={value}
                  label={item.label}
                  onAssetIdChange={(assetId) => props.updateField(item.field, assetId)}
                  token={props.sessionToken}
                  uploadLabel="Загрузить PNG"
                />
              </div>
            );
          })}
        </div>
      </ContentNestedSection>

      <ContentNestedSection title="Иконки интерфейса">
        <div className="content-form-grid content-hire-card-skin-grid">
          {controlIconFields.map((item) => {
            const value = formValue(props.formState, item.field) || item.defaultAssetId;

            return (
              <div className="content-list-row content-list-row-wide" key={item.field}>
                <ContentTextField label={item.label} name={item.field} onChange={props.updateField} value={value} />
                <ContentAssetUploadField
                  assetId={value}
                  label={item.label}
                  onAssetIdChange={(assetId) => props.updateField(item.field, assetId)}
                  token={props.sessionToken}
                  uploadLabel="Загрузить PNG"
                />
              </div>
            );
          })}
        </div>
      </ContentNestedSection>
    </>
  );
}

export function createIconsFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const controls = recordField(entity, "controls");
  const resources = recordField(entity, "resources");
  const stats = recordField(entity, "stats");
  const state: EntityFormState = {
    id: "default",
    title: "Иконки"
  };

  for (const resource of content.resources) {
    const resourceId = stringField(resource, "id");
    state[iconResourceField(resourceId)] = stringField(resources, resourceId) || stringField(resource, "iconAssetId");
  }

  for (const item of statIconFields) {
    state[item.field] = stringField(stats, item.key) || item.defaultAssetId;
  }

  for (const item of controlIconFields) {
    state[item.field] = stringField(controls, item.key) || item.defaultAssetId;
  }

  return state;
}

export function validateIconsForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  for (const resource of content.resources) {
    const resourceId = stringField(resource, "id");
    if (!formValue(state, iconResourceField(resourceId)).trim()) {
      errors.push(`${contentEntityTitle(resource, content.localization?.ru ?? {})}: Asset ID иконки обязателен.`);
    }
  }

  for (const item of statIconFields) {
    if (!formValue(state, item.field).trim()) {
      errors.push(`${item.label}: Asset ID обязателен.`);
    }
  }

  for (const item of controlIconFields) {
    if (!formValue(state, item.field).trim()) {
      errors.push(`${item.label}: Asset ID обязателен.`);
    }
  }
}

export function applyIconsForm(
  content: ContentBundle,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "uiIcons";
  localization: Record<string, string>;
  message: string;
} {
  const resourceIcons = Object.fromEntries(
    content.resources.map((resource) => {
      const resourceId = stringField(resource, "id");
      return [resourceId, formValue(state, iconResourceField(resourceId)).trim()];
    })
  );
  const statIcons = Object.fromEntries(statIconFields.map((item) => [item.key, formValue(state, item.field).trim()]));
  const controlIcons = Object.fromEntries(controlIconFields.map((item) => [item.key, formValue(state, item.field).trim()]));

  return {
    entity: {
      controls: controlIcons,
      id: "default",
      resources: resourceIcons,
      stats: statIcons
    },
    entityId: "default",
    entityType: "uiIcons",
    localization: {},
    message: "Иконки сохранены как draft."
  };
}

function iconResourceField(resourceId: string): string {
  return `iconResource_${resourceId.replace(/[^a-zA-Z0-9_]/gu, "_")}`;
}
