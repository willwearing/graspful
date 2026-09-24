"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "../ui/button";

export function NewKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setError(false); }
    catch { setError(true); }
  }
  return (
    <div className="mb-6 rounded-lg border border-primary/50 bg-primary/5 p-4">
      <p className="mb-2 font-medium">Your new API key (shown once):</p>
      <code className="break-all text-sm">{value}</code>
      <Button className="ml-2" variant="outline" size="icon" onClick={copy} aria-label={copied ? "Copied" : "Copy API key"}>{copied ? <Check /> : <Copy />}</Button>
      <p className="mt-2 text-xs text-muted-foreground">Copy this key now. You will not be able to see it again.</p>
      {error && <p role="alert">Could not copy the key. Select and copy it manually.</p>}
    </div>
  );
}
