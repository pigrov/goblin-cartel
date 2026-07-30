import type { ContentBundle, ContentRecord } from "../../api/adminApi";
import { arrayField, contentEntityTitle, stringField } from "./formState";

export function ContentEntityKpi(props: { label: string; value: number }) {
  return (
    <div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function ContentEntityPreview(props: { content: ContentBundle }) {
  const ru = props.content.localization?.ru ?? {};
  const goblins = arrayField(props.content.goblins ?? {}, "roles").slice(-3).reverse();
  const mines = props.content.mineTemplates.slice(-3).reverse();
  const builtMineTypes = (props.content.builtMineTypes ?? []).slice(-3).reverse();

  return (
    <div className="content-entity-preview">
      <ContentEntityColumn items={goblins} label="Гоблины" localization={ru} />
      <ContentEntityColumn items={mines} label="Последние рудники" localization={ru} />
      <ContentEntityColumn items={builtMineTypes} label="Типы шахт" localization={ru} />
    </div>
  );
}

function ContentEntityColumn(props: {
  items: ContentRecord[];
  label: string;
  localization: Record<string, string>;
}) {
  return (
    <section>
      <span>{props.label}</span>
      {props.items.length > 0 ? (
        props.items.map((item) => (
          <div key={stringField(item, "id")}>
            <strong>{contentEntityTitle(item, props.localization)}</strong>
            <small>{stringField(item, "id")}</small>
          </div>
        ))
      ) : (
        <p>Пока пусто</p>
      )}
    </section>
  );
}
