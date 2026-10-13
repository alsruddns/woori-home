"use client";

import { useRef } from "react";
import type { Locale } from "@/lib/site";
import { familyContactCopy } from "@/lib/family-contact";

export default function ContactDialog({ locale }: { locale: Locale }) {
  const copy = familyContactCopy[locale];
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <>
    <button className="contact-trigger" type="button" onClick={() => dialogRef.current?.showModal()}>{copy.contact}</button>
    <dialog className="contact-dialog" ref={dialogRef} aria-labelledby="contact-dialog-title">
      <div className="contact-dialog-heading"><h2 id="contact-dialog-title">{copy.title}</h2><button className="contact-close" type="button" aria-label={copy.close} onClick={() => dialogRef.current?.close()}>×</button></div>
      <div className="contact-dialog-content"><p>{copy.intro}</p><p>{copy.details}</p><h3>{copy.typesLabel}</h3><ul>{copy.types.map((type) => <li key={type}>{type}</li>)}</ul><h3>{copy.emailLabel}</h3><p><a className="contact-email" href="mailto:krdd125@gmail.com">krdd125@gmail.com</a></p><p>{copy.response}</p></div>
    </dialog>
  </>;
}
