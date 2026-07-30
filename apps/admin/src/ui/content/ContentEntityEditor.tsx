import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import type { ContentBundle } from "../../api/adminApi";
import {
  applyEntityForm,
  baseUpgradeEntityKinds,
  contentEntityDefinition,
  contentEntityTabOptions,
  createEntityFormState,
  getContentEntityItems,
  isBaseUpgradeKind,
  isContentEntityTabActive,
  renderEntityFields,
  validateEntityForm,
  type ContentEntityKind,
  type EntityDraftUpdate
} from "./entityRegistry";
import { contentEntityTitle, stringField, type EntityFormState } from "./formState";

export function ContentEntityEditor(props: {
  busy: boolean;
  canEdit: boolean;
  content: ContentBundle;
  kind: ContentEntityKind;
  onApply: (update: EntityDraftUpdate) => void | Promise<void>;
  onKindChange: (kind: ContentEntityKind) => void;
  onSelectedIdChange: (id: string) => void;
  selectedId: string;
  sessionToken: string | null;
}) {
  const isBaseUpgradeEditor = isBaseUpgradeKind(props.kind);
  const items = getContentEntityItems(props.content, props.kind);
  const selectedEntity = isBaseUpgradeEditor
    ? items[0] ?? null
    : items.find((item) => stringField(item, "id") === props.selectedId) ?? items[0] ?? null;
  const selectedEntityId = selectedEntity ? stringField(selectedEntity, "id") || "default" : props.selectedId;
  const [formState, setFormState] = useState<EntityFormState>(() =>
    selectedEntity ? createEntityFormState(props.kind, selectedEntity, props.content) : {}
  );

  useEffect(() => {
    setFormState(selectedEntity ? createEntityFormState(props.kind, selectedEntity, props.content) : {});
  }, [props.content, props.kind, selectedEntity]);

  const validation = useMemo(
    () =>
      selectedEntity
        ? validateEntityForm(props.kind, formState, props.content, selectedEntityId)
        : { ok: false, errors: ["Сущность не выбрана."] },
    [formState, props.content, props.kind, selectedEntity, selectedEntityId]
  );

  function updateField(field: string, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateFields(values: EntityFormState) {
    setFormState((current) => ({
      ...current,
      ...values
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEntity || !validation.ok) {
      return;
    }

    void props.onApply(applyEntityForm(props.content, props.kind, selectedEntityId, formState));
  }

  return (
    <section className="content-entity-editor">
      <div className="content-entity-tabs" role="tablist" aria-label="Тип сущности">
        {contentEntityTabOptions.map((option) => (
          <button
            aria-selected={isContentEntityTabActive(props.kind, option.value)}
            className={isContentEntityTabActive(props.kind, option.value) ? "active" : ""}
            key={option.value}
            onClick={() => props.onKindChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="content-entity-editor-body">
        <aside className="content-entity-picker" aria-label="Список сущностей">
          {isBaseUpgradeEditor ? (
            <>
              {baseUpgradeEntityKinds.map((kind) => {
                const definition = contentEntityDefinition(kind);

                return (
                  <button
                    className={props.kind === kind ? "active" : ""}
                    key={kind}
                    onClick={() => props.onKindChange(kind)}
                    type="button"
                  >
                    <strong>{definition.pickerLabel ?? definition.label}</strong>
                    <span>{definition.pickerDescription ?? stringField(getContentEntityItems(props.content, kind)[0] ?? {}, "id")}</span>
                  </button>
                );
              })}
            </>
          ) : items.length > 0 ? (
            items.map((item) => {
              const id = stringField(item, "id");

              return (
                <button
                  className={id === props.selectedId ? "active" : ""}
                  key={id}
                  onClick={() => props.onSelectedIdChange(id)}
                  type="button"
                >
                  <strong>{contentEntityTitle(item, props.content.localization?.ru ?? {})}</strong>
                  <span>{id}</span>
                </button>
              );
            })
          ) : (
            <p>Сущностей пока нет</p>
          )}
        </aside>

        <form className="content-entity-form" onSubmit={handleSubmit}>
          {selectedEntity ? (
            renderEntityFields(props.kind, formState, props.content, updateField, updateFields, props.sessionToken)
          ) : (
            <p className="content-tool-message">Выбери или создай сущность.</p>
          )}

          {validation.errors.length > 0 ? (
            <div className="content-entity-validation">
              {validation.errors.map((error) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          ) : null}

          <button disabled={!props.canEdit || props.busy || !selectedEntity || !validation.ok} type="submit">
            {props.busy ? <Loader2 className="spin" size={16} /> : null}
            Сохранить draft
          </button>
        </form>
      </div>
    </section>
  );
}
