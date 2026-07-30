import { PlusCircle } from "lucide-react";
import type { ReactNode } from "react";

export function ContentTextField(props: {
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value?: string;
}) {
  return (
    <label>
      {props.label}
      <input
        disabled={props.disabled}
        onChange={(event) => props.onChange(props.name, event.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        value={props.value ?? ""}
      />
    </label>
  );
}

export function ContentTextAreaField(props: {
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  value?: string;
}) {
  return (
    <label>
      {props.label}
      <textarea onChange={(event) => props.onChange(props.name, event.target.value)} rows={3} value={props.value ?? ""} />
    </label>
  );
}

export function ContentSelectField(props: {
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  options: Array<{ label: string; value: string }>;
  value?: string;
}) {
  return (
    <label>
      {props.label}
      <select onChange={(event) => props.onChange(props.name, event.target.value)} value={props.value ?? ""}>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ContentNestedSection(props: {
  addLabel?: string;
  children: ReactNode;
  onAdd?: () => void;
  title: string;
}) {
  return (
    <section className="content-nested-section">
      <header>
        <strong>{props.title}</strong>
        {props.onAdd ? (
          <button onClick={props.onAdd} type="button">
            <PlusCircle size={15} />
            {props.addLabel}
          </button>
        ) : null}
      </header>
      {props.children}
    </section>
  );
}
