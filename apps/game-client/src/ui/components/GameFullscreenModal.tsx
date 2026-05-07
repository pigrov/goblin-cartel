import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import modalBgUrl from "../../assets/goblin-modal/details-bg.png";
import modalPanelUrl from "../../assets/goblin-modal/details-panel.png";
import modalTopUrl from "../../assets/goblin-modal/details-top.png";
import closeIconUrl from "../../assets/ui/icon-cross.png";

export function GameFullscreenModal(props: {
  ariaLabel: string;
  avatarSrc?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  onClose: () => void;
  title: ReactNode;
}) {
  const className = ["modal-backdrop", "game-fullscreen-modal-backdrop", props.className].filter(Boolean).join(" ");
  const contentClassName = ["game-fullscreen-modal-content", props.contentClassName].filter(Boolean).join(" ");
  const portalTarget = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".phone-frame");

  const modal = (
    <div className={className} onClick={props.onClose} role="presentation">
      <section className="game-fullscreen-modal" aria-label={props.ariaLabel} onClick={(event) => event.stopPropagation()}>
        <img alt="" className="game-fullscreen-modal-bg" draggable={false} src={modalBgUrl} />
        <header className="game-fullscreen-modal-top" style={{ "--game-fullscreen-modal-top": `url("${modalTopUrl}")` } as CSSProperties}>
          <strong>{props.title}</strong>
          <button className="game-fullscreen-modal-close" onClick={props.onClose} type="button" aria-label="Закрыть">
            <img alt="" draggable={false} src={closeIconUrl} />
          </button>
        </header>
        {props.avatarSrc ? (
          <img alt="" className="game-fullscreen-modal-avatar-art" draggable={false} src={props.avatarSrc} />
        ) : (
          <div className="game-fullscreen-modal-avatar-space" aria-hidden="true" />
        )}
        <section
          className="game-fullscreen-modal-panel"
          style={{ "--game-fullscreen-modal-panel": `url("${modalPanelUrl}")` } as CSSProperties}
        >
          <div className={contentClassName}>{props.children}</div>
        </section>
      </section>
    </div>
  );

  return portalTarget ? createPortal(modal, portalTarget) : modal;
}
