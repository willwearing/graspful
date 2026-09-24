"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CreateKeyDialog({ create, pending, disabled }: {
  create: (name: string) => Promise<boolean>;
  pending: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  async function submit() {
    if (await create(name)) { setOpen(false); setName(""); }
  }
  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setName(""); }}>
      <DialogTrigger render={<Button size="sm" disabled={disabled} />}><Plus />Create API Key</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>Give your key a name so you can identify it later.</DialogDescription>
        </DialogHeader>
        <Input aria-label="API key name" placeholder="e.g. My Laptop CLI" value={name}
          onChange={(event) => setName(event.target.value)} maxLength={100} autoFocus
          onKeyDown={(event) => { if (event.key === "Enter" && name.trim() && !pending) void submit(); }} />
        <DialogFooter>
          <Button onClick={submit} disabled={!name.trim() || pending}>{pending ? "Creating..." : "Create Key"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
