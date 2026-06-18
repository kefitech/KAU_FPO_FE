"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { fpoTeamApi } from "@/app/fpo/_api/team";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type MemberRow = { first_name: string; last_name: string; email: string; phone: string };

const emptyRow = (): MemberRow => ({ first_name: "", last_name: "", email: "", phone: "" });

type Tab = "json" | "file";

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkInviteDialog({ open, onOpenChange }: BulkInviteDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("json");
  const [rows, setRows] = useState<MemberRow[]>([emptyRow()]);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTab("json");
      setRows([emptyRow()]);
      setFile(null);
    }
  }, [open]);

  function updateRow(i: number, field: keyof MemberRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const jsonMutation = useMutation({
    mutationFn: () => {
      const members = rows
        .filter((r) => r.first_name.trim() && r.email.trim())
        .map((r) => ({ ...r, phone: r.phone || undefined }));
      if (members.length === 0) throw new Error("Add at least one member with a name and email");
      return fpoTeamApi.bulkInvite({ members });
    },
    onSuccess: () => {
      toast.success("Invitations sent");
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message ?? "Failed to send invitations");
    },
  });

  const fileMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Please select a file");
      return fpoTeamApi.bulkInviteFile(file);
    },
    onSuccess: () => {
      toast.success("File uploaded — invitations are being processed");
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message ?? "File upload failed");
    },
  });

  const isPending = jsonMutation.isPending || fileMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Invite Team Members</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {(["json", "file"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "json" ? "Add Manually" : "Upload File"}
            </button>
          ))}
        </div>

        {tab === "json" && (
          <div className="flex flex-col gap-3">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_2rem] gap-2 px-1">
              {["First Name *", "Last Name *", "Email *", "Phone"].map((h) => (
                <span key={h} className="text-muted-foreground text-xs font-medium">{h}</span>
              ))}
            </div>

            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_2rem] items-center gap-2">
                <Input
                  placeholder="First name"
                  value={row.first_name}
                  onChange={(e) => updateRow(i, "first_name", e.target.value)}
                />
                <Input
                  placeholder="Last name"
                  value={row.last_name}
                  onChange={(e) => updateRow(i, "last_name", e.target.value)}
                />
                <Input
                  placeholder="email@example.com"
                  value={row.email}
                  onChange={(e) => updateRow(i, "email", e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  maxLength={10}
                  value={row.phone}
                  onChange={(e) => updateRow(i, "phone", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-fit">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Row
            </Button>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => jsonMutation.mutate()} disabled={isPending}>
                {jsonMutation.isPending ? "Sending…" : `Send ${rows.filter((r) => r.first_name && r.email).length || ""} Invites`}
              </Button>
            </div>
          </div>
        )}

        {tab === "file" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-sm">Upload .xlsx or .csv file</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Required columns: <span className="font-mono">first_name, last_name, email</span>
                <br />
                Optional: <span className="font-mono">phone</span> — Row 1 must be the header row
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => fileRef.current?.click()}
              >
                Choose File
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {file && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="truncate font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => fileMutation.mutate()} disabled={!file || isPending}>
                {fileMutation.isPending ? "Uploading…" : "Upload & Invite"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
