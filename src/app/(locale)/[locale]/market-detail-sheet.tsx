"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Shared native modal sheet for market detail panels. Native dialogs provide
 * inert background content, Escape handling, and a contained focus sequence. */
export function MarketDetailSheet({
  open,
  title,
  closeLabel,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const historyEntryRef = useRef(false);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const currentState = window.history.state;
    window.history.pushState({ ...(currentState && typeof currentState === "object" ? currentState : {}), __marketDetailSheet: true }, "", window.location.href);
    historyEntryRef.current = true;
    const closeOnBack = () => {
      if (!historyEntryRef.current) return;
      historyEntryRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", closeOnBack);
    return () => {
      window.removeEventListener("popstate", closeOnBack);
      if (historyEntryRef.current && window.history.state?.__marketDetailSheet) {
        historyEntryRef.current = false;
        window.history.back();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const body = document.body;
    const rootOverflow = root.style.overflow;
    const bodyOverflow = body.style.overflow;
    const overscroll = body.style.overscrollBehavior;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
      body.style.overscrollBehavior = overscroll;
    };
  }, [open]);

  return <dialog ref={dialogRef} className="market-detail-sheet" aria-modal="true" aria-labelledby="market-detail-sheet-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}>
    <header className="market-detail-sheet-header">
      <h2 id="market-detail-sheet-title">{title}</h2>
      <button ref={closeRef} type="button" className="market-detail-sheet-close" onClick={onClose}>{closeLabel}</button>
    </header>
    <div className="market-detail-sheet-content">{children}</div>
  </dialog>;
}
