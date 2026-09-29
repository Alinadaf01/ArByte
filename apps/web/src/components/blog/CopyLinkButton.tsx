"use client";

import { useEffect, useState } from "react";
import { blogPostPage } from "@arbyte/contracts";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(window.location.href)
          .catch(() => undefined);
        setCopied(true);
      }}
      className={`text-body font-emphasis inline-flex min-h-11 items-center gap-2 rounded-tile border px-4 transition-colors ${copied ? "border-brand-tint-2 bg-brand-tint-1 text-brand-active" : "border-border-input text-primary bg-surface"}`}
    >
      <span aria-live="polite">
        {copied ? blogPostPage.copied : blogPostPage.copyLink}
      </span>
    </button>
  );
}
