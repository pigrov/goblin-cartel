import { FileJson, Loader2 } from "lucide-react";
import type { FormEvent } from "react";

import type { ContentVersion } from "../../api/adminApi";
import { formatDateTime } from "./contentPreview";

export function ContentVersionHome(props: {
  busy: boolean;
  contentLoading: boolean;
  contentMessage: string | null;
  contentNotes: string;
  contentVersionName: string;
  contentVersions: ContentVersion[];
  onContentNotesChange: (value: string) => void;
  onContentVersionNameChange: (value: string) => void;
  onCreateContentVersion: (event: FormEvent<HTMLFormElement>) => void;
  onSelectContentVersion: (id: string) => void;
}) {
  return (
    <section className="content-home">
      <section className="gc-panel content-create content-create-home">
        <header>
          <div>
            <strong>Новая версия</strong>
            <span>Создай draft или выбери уже существующую версию ниже.</span>
          </div>
        </header>
        <ContentVersionCreateForm
          busy={props.busy}
          contentNotes={props.contentNotes}
          contentVersionName={props.contentVersionName}
          onContentNotesChange={props.onContentNotesChange}
          onContentVersionNameChange={props.onContentVersionNameChange}
          onCreateContentVersion={props.onCreateContentVersion}
        />
      </section>

      <section className="content-version-home-list">
        {props.contentLoading ? (
          <article className="gc-panel content-empty">
            <Loader2 className="spin" size={20} />
            <span>Загружаем версии</span>
          </article>
        ) : props.contentVersions.length === 0 ? (
          <article className="gc-panel content-empty">
            <FileJson size={20} />
            <span>Версий пока нет</span>
          </article>
        ) : (
          props.contentVersions.map((version) => (
            <button
              className="gc-panel content-version-card"
              key={version.id}
              onClick={() => props.onSelectContentVersion(version.id)}
              type="button"
            >
              <div>
                <strong>{version.version}</strong>
                <span>{version.notes || "Без заметки"}</span>
              </div>
              <div>
                <span>{version.status}</span>
                <small>{formatDateTime(version.updatedAt)}</small>
              </div>
            </button>
          ))
        )}
      </section>

      {props.contentMessage ? <p className="form-message">{props.contentMessage}</p> : null}
    </section>
  );
}

function ContentVersionCreateForm(props: {
  busy: boolean;
  contentNotes: string;
  contentVersionName: string;
  onContentNotesChange: (value: string) => void;
  onContentVersionNameChange: (value: string) => void;
  onCreateContentVersion: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="content-create-form" onSubmit={props.onCreateContentVersion}>
      <label>
        Version
        <input
          onChange={(event) => props.onContentVersionNameChange(event.target.value)}
          placeholder="0.1.0"
          required
          type="text"
          value={props.contentVersionName}
        />
      </label>
      <label>
        Notes
        <textarea
          onChange={(event) => props.onContentNotesChange(event.target.value)}
          rows={3}
          value={props.contentNotes}
        />
      </label>
      <button className="primary-action" disabled={props.busy} type="submit">
        {props.busy ? <Loader2 className="spin" size={18} /> : <FileJson size={18} />}
        Создать draft
      </button>
    </form>
  );
}
