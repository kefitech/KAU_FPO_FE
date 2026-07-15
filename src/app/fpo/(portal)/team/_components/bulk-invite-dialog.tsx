"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { fpoTeamApi } from "@/app/fpo/_api/team";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const rowSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().refine((v) => v === "" || /^\d{10}$/.test(v), {
    message: "Enter a valid 10-digit phone number",
  }),
});

type MemberRow = { first_name: string; last_name: string; email: string; phone: string };
type RowErrors = Partial<Record<keyof MemberRow, string>>;
type T = Record<string, string>;

const emptyRow = (): MemberRow => ({ first_name: "", last_name: "", email: "", phone: "" });

type Tab = "json" | "file";

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkInviteDialog({ open, onOpenChange }: BulkInviteDialogProps) {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tab, setTab] = useState<Tab>("json");

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_team,common")
      .then((data) => setT(data.fpo_team ?? {}))
      .catch(() => undefined);
  }, [locale]);
  const [rows, setRows] = useState<MemberRow[]>([emptyRow()]);
  const [rowErrors, setRowErrors] = useState<RowErrors[]>([{}]);
  const [rowTouched, setRowTouched] = useState<Partial<Record<keyof MemberRow, boolean>>[]>([{}]);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [failedInvites, setFailedInvites] = useState<{ row: number; email: string; reason: string }[]>([]);
  const [showFailedDialog, setShowFailedDialog] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("json");
      setRows([emptyRow()]);
      setRowErrors([{}]);
      setRowTouched([{}]);
      setFile(null);
    }
  }, [open]);

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
    setRowErrors((prev) => [...prev, {}]);
    setRowTouched((prev) => [...prev, {}]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setRowErrors((prev) => prev.filter((_, idx) => idx !== i));
    setRowTouched((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof MemberRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setRowErrors((prev) =>
      prev.map((errs, idx) => {
        if (idx !== i) return errs;
        if (!rowTouched[i]?.[field]) return errs;
        const result = rowSchema.safeParse({ ...rows[i], [field]: value });
        if (result.success) return { ...errs, [field]: undefined };
        const fieldErr = result.error.flatten().fieldErrors[field]?.[0];
        return { ...errs, [field]: fieldErr };
      }),
    );
  }

  function touchRow(i: number, field: keyof MemberRow) {
    setRowTouched((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: true } : t)));
    const result = rowSchema.safeParse(rows[i]);
    const fieldErr = result.success ? undefined : result.error.flatten().fieldErrors[field]?.[0];
    setRowErrors((prev) => prev.map((errs, idx) => (idx === i ? { ...errs, [field]: fieldErr } : errs)));
  }

  const jsonMutation = useMutation({
    mutationFn: () => {
      const members = rows
        .filter((r) => r.first_name.trim() && r.email.trim())
        .map((r) => ({ ...r, phone: r.phone || undefined }));
      if (members.length === 0) throw new Error("Add at least one member with a name and email");
      return fpoTeamApi.bulkInvite({ members });
    },
    onSuccess: (res) => {
      if (res.data.errors?.length) {
        setFailedInvites(res.data.errors);
        setShowFailedDialog(true);
        toast.success(`${res.data.success} invited successfully, ${res.data.errors.length} failed — see details`);
      } else {
        toast.success(t.bulk_invite_toast_success ?? "Invitations sent");
      }
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message ?? (t.bulk_invite_toast_failed ?? "Failed to send invitations"));
    },
  });

  const fileMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Please select a file");
      return fpoTeamApi.bulkInviteFile(file);
    },
    onSuccess: (res) => {
      if (res.data.errors?.length) {
        setFailedInvites(res.data.errors);
        setShowFailedDialog(true);
        toast.success(`${res.data.success} invited successfully, ${res.data.errors.length} failed — see details`);
      } else {
        toast.success(t.bulk_invite_toast_success ?? "File uploaded — invitations are being processed");
      }
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message ?? (t.bulk_invite_toast_failed ?? "File upload failed"));
    },
  });

  const isPending = jsonMutation.isPending || fileMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.bulk_invite_dialog_title ?? "Bulk Invite Team Members"}</DialogTitle>
            <DialogDescription className="sr-only">
              Invite multiple team members at once by either filling in their details or uploading a file.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            {(["json", "file"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "json" ? "Add Manually" : "Upload File"}
              </button>
            ))}
          </div>

          {tab === "json" && (
            <div className="flex flex-col gap-3">
              <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_1.5fr_1fr_2rem] gap-2 px-1">
                {["First Name *", "Last Name *", "Email *", "Phone"].map((h) => (
                  <span key={h} className="text-muted-foreground text-xs font-medium">
                    {h}
                  </span>
                ))}
              </div>

              {rows.map((row, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="grid md:grid-cols-[1.2fr_1.2fr_1.5fr_1fr_2rem] grid-cols-1 items-start gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="md:hidden text-muted-foreground text-xs font-medium">First Name *</label>
                      <Input
                        placeholder="First name"
                        value={row.first_name}
                        onChange={(e) => updateRow(i, "first_name", e.target.value)}
                        onBlur={() => touchRow(i, "first_name")}
                        className={rowErrors[i]?.first_name ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {rowErrors[i]?.first_name && (
                        <p className="text-destructive text-xs">{rowErrors[i].first_name}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="md:hidden text-muted-foreground text-xs font-medium">Last Name *</label>
                      <Input
                        placeholder="Last name"
                        value={row.last_name}
                        onChange={(e) => updateRow(i, "last_name", e.target.value)}
                        onBlur={() => touchRow(i, "last_name")}
                        className={rowErrors[i]?.last_name ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {rowErrors[i]?.last_name && <p className="text-destructive text-xs">{rowErrors[i].last_name}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="md:hidden text-muted-foreground text-xs font-medium">Email *</label>
                      <Input
                        placeholder="email@example.com"
                        value={row.email}
                        onChange={(e) => updateRow(i, "email", e.target.value)}
                        onBlur={() => touchRow(i, "email")}
                        className={rowErrors[i]?.email ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {rowErrors[i]?.email && <p className="text-destructive text-xs">{rowErrors[i].email}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="md:hidden text-muted-foreground text-xs font-medium">Phone</label>
                      <Input
                        placeholder="Phone"
                        maxLength={10}
                        value={row.phone}
                        onChange={(e) => updateRow(i, "phone", e.target.value)}
                        onBlur={() => touchRow(i, "phone")}
                        className={rowErrors[i]?.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {rowErrors[i]?.phone && <p className="text-destructive text-xs">{rowErrors[i].phone}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      className="md:mt-2 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-fit">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Row
              </Button>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t.bulk_invite_btn_cancel ?? "Cancel"}
                </Button>
                <Button
                  onClick={() => jsonMutation.mutate()}
                  disabled={isPending || rows.some((_, i) => Object.values(rowErrors[i] ?? {}).some(Boolean))}
                >
                  {jsonMutation.isPending
                    ? (t.invite_btn_sending ?? "Sending…")
                    : `Send ${rows.filter((r) => r.first_name && r.email).length || ""} Invites`}
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
                    onClick={() => {
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t.bulk_invite_btn_cancel ?? "Cancel"}
                </Button>
                <Button onClick={() => fileMutation.mutate()} disabled={!file || isPending}>
                  {fileMutation.isPending ? (t.bulk_invite_btn_uploading ?? "Uploading…") : (t.bulk_invite_btn_upload ?? "Upload & Invite")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Failed invites dialog — outside the main Dialog to avoid nesting */}
      <Dialog open={showFailedDialog} onOpenChange={setShowFailedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Some Invitations Failed</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {failedInvites.length} invite{failedInvites.length > 1 ? "s" : ""} could not be sent:
            </p>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {failedInvites.map((f) => (
                <div key={f.row} className="rounded-lg border bg-destructive/5 px-3 py-2 text-sm">
                  <p className="font-medium">{f.email}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{f.reason}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowFailedDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}