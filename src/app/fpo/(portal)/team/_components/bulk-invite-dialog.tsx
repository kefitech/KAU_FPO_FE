"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { fpoTeamApi } from "@/app/fpo/_api/team";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { memberEmail, memberName, memberPhone } from "./member-rules";

type MemberRow = { first_name: string; last_name: string; email: string; phone: string };
type RowErrors = Partial<Record<keyof MemberRow, string>>;
type FailedInvite = { row: number; email: string; first_name?: string; last_name?: string; reason: string };
type T = Record<string, string>;

const buildRowSchema = (t: T) =>
  z.object({
    first_name: memberName(t, "first_name"),
    last_name: memberName(t, "last_name"),
    email: memberEmail(t),
    phone: memberPhone(t),
  });

const emptyRow = (): MemberRow => ({ first_name: "", last_name: "", email: "", phone: "" });

const TEMPLATE_FILENAME = "fpo_team_bulk_invite_template.xlsx";

/**
 * Fetches the styled .xlsx template from the backend (Instructions / Members
 * / Role Codes sheets) and triggers a browser download. The old client-side
 * CSV fallback is kept inside a catch block in case the server endpoint is
 * briefly unavailable (hot-deploy, outage) so the FPO still gets a usable
 * header-only file.
 */
async function downloadTemplate(onError?: (message?: string) => void) {
  try {
    const blob = await fpoTeamApi.getBulkInviteTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = TEMPLATE_FILENAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    onError?.((err as { message?: string })?.message);
  }
}

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
    translationsApi
      .getPublic(locale, "fpo_team,common")
      .then((data) => setT(data.fpo_team ?? {}))
      .catch(() => undefined);
  }, [locale]);

  // Rebuilt when translations load so validation messages follow the language
  const rowSchema = useMemo(() => buildRowSchema(t), [t]);

  const [rows, setRows] = useState<MemberRow[]>([emptyRow()]);
  const [rowErrors, setRowErrors] = useState<RowErrors[]>([{}]);
  const [rowTouched, setRowTouched] = useState<Partial<Record<keyof MemberRow, boolean>>[]>([{}]);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [failedInvites, setFailedInvites] = useState<FailedInvite[]>([]);
  const [failedSource, setFailedSource] = useState<Tab>("json");
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
    setRowTouched((prev) => prev.map((touched, idx) => (idx === i ? { ...touched, [field]: true } : touched)));
    const result = rowSchema.safeParse(rows[i]);
    const fieldErr = result.success ? undefined : result.error.flatten().fieldErrors[field]?.[0];
    setRowErrors((prev) => prev.map((errs, idx) => (idx === i ? { ...errs, [field]: fieldErr } : errs)));
  }

  const jsonMutation = useMutation({
    mutationFn: async () => {
      const sent = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.first_name.trim() && r.email.trim());
      if (sent.length === 0) {
        throw new Error(t.bulk_invite_error_no_rows ?? "Add at least one member with a name and email");
      }
      const res = await fpoTeamApi.bulkInvite({
        members: sent.map(({ r }) => ({ ...r, phone: r.phone || undefined })),
      });
      // The API numbers rows by position in `members`, which skips blank rows —
      // map each failure back to the row number the user sees in the form.
      const errors = res.data.errors?.map((e) => ({ ...e, row: (sent[e.row - 1]?.i ?? e.row - 1) + 1 }));
      return { ...res, data: { ...res.data, errors } };
    },
    onSuccess: (res) => {
      if (res.data.errors?.length) {
        setFailedInvites(res.data.errors);
        setFailedSource("json");
        setShowFailedDialog(true);
        toast.success(
          (t.bulk_invite_toast_partial ?? "{success} invited successfully, {failed} failed — see details")
            .replace("{success}", String(res.data.success))
            .replace("{failed}", String(res.data.errors.length)),
        );
      } else {
        toast.success(t.bulk_invite_toast_success ?? "Invitations sent");
      }
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message ?? t.bulk_invite_toast_failed ?? "Failed to send invitations");
    },
  });

  const fileMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error(t.bulk_invite_error_no_file ?? "Please select a file");
      return fpoTeamApi.bulkInviteFile(file);
    },
    onSuccess: (res) => {
      if (res.data.errors?.length) {
        setFailedInvites(res.data.errors);
        setFailedSource("file");
        setShowFailedDialog(true);
        toast.success(
          (t.bulk_invite_toast_partial ?? "{success} invited successfully, {failed} failed — see details")
            .replace("{success}", String(res.data.success))
            .replace("{failed}", String(res.data.errors.length)),
        );
      } else {
        toast.success(t.bulk_invite_toast_success ?? "Invitations sent");
      }
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message ?? t.bulk_invite_toast_failed ?? "File upload failed");
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
              {t.bulk_invite_description ??
                "Invite multiple team members at once by either filling in their details or uploading a file."}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            {(["json", "file"] as Tab[]).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === tabKey ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tabKey === "json"
                  ? (t.bulk_invite_tab_manual ?? "Add Manually")
                  : (t.bulk_invite_tab_file ?? "Upload File")}
              </button>
            ))}
          </div>

          {tab === "json" && (
            <div className="flex flex-col gap-3">
              <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_1.5fr_1fr_2rem] gap-2 px-1">
                {[
                  `${t.invite_field_first_name ?? "First Name"} *`,
                  `${t.invite_field_last_name ?? "Last Name"} *`,
                  `${t.invite_field_email ?? "Email"} *`,
                  t.invite_field_phone ?? "Phone",
                ].map((h) => (
                  <span key={h} className="text-muted-foreground text-xs font-medium">
                    {h}
                  </span>
                ))}
              </div>

              {rows.map((row, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="grid md:grid-cols-[1.2fr_1.2fr_1.5fr_1fr_2rem] grid-cols-1 items-start gap-2">
                    <div className="flex flex-col gap-1">
                      {/* biome-ignore lint/a11y/noLabelWithoutControl: mobile-only visual label, input is described by placeholder */}
                      <label className="md:hidden text-muted-foreground text-xs font-medium">
                        {t.invite_field_first_name ?? "First Name"} *
                      </label>
                      <Input
                        placeholder={t.invite_placeholder_first_name ?? "First name"}
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
                      {/* biome-ignore lint/a11y/noLabelWithoutControl: mobile-only visual label, input is described by placeholder */}
                      <label className="md:hidden text-muted-foreground text-xs font-medium">
                        {t.invite_field_last_name ?? "Last Name"} *
                      </label>
                      <Input
                        placeholder={t.invite_placeholder_last_name ?? "Last name"}
                        value={row.last_name}
                        onChange={(e) => updateRow(i, "last_name", e.target.value)}
                        onBlur={() => touchRow(i, "last_name")}
                        className={rowErrors[i]?.last_name ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {rowErrors[i]?.last_name && <p className="text-destructive text-xs">{rowErrors[i].last_name}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                      {/* biome-ignore lint/a11y/noLabelWithoutControl: mobile-only visual label, input is described by placeholder */}
                      <label className="md:hidden text-muted-foreground text-xs font-medium">
                        {t.invite_field_email ?? "Email"} *
                      </label>
                      <Input
                        placeholder={t.invite_placeholder_email ?? "email@example.com"}
                        value={row.email}
                        onChange={(e) => updateRow(i, "email", e.target.value)}
                        onBlur={() => touchRow(i, "email")}
                        className={rowErrors[i]?.email ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {rowErrors[i]?.email && <p className="text-destructive text-xs">{rowErrors[i].email}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                      {/* biome-ignore lint/a11y/noLabelWithoutControl: mobile-only visual label, input is described by placeholder */}
                      <label className="md:hidden text-muted-foreground text-xs font-medium">
                        {t.invite_field_phone ?? "Phone"}
                      </label>
                      <Input
                        placeholder={t.invite_placeholder_phone ?? "Phone"}
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
                      aria-label={t.aria_remove_row ?? "Remove row"}
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
                {t.bulk_invite_btn_add_row ?? "Add Row"}
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
                    : (t.bulk_invite_btn_send ?? "Send {count} Invites").replace(
                        "{count}",
                        String(rows.filter((r) => r.first_name && r.email).length || ""),
                      )}
                </Button>
              </div>
            </div>
          )}

          {tab === "file" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-sm">{t.bulk_invite_file_title ?? "Upload .xlsx or .csv file"}</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {t.bulk_invite_file_required ?? "Required columns:"}{" "}
                  <span className="font-mono">first_name, last_name, email</span>
                  <br />
                  {t.bulk_invite_file_optional ?? "Optional:"} <span className="font-mono">phone</span> —{" "}
                  {t.bulk_invite_file_header_row ?? "Row 1 must be the header row"}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    {t.bulk_invite_btn_choose_file ?? "Choose File"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      downloadTemplate((msg) =>
                        toast.error(msg ?? t.bulk_invite_toast_template_failed ?? "Failed to download template"),
                      )
                    }
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {t.bulk_invite_btn_download_template ?? "Download Template"}
                  </Button>
                </div>
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
                    aria-label={t.aria_remove_file ?? "Remove file"}
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
                  {fileMutation.isPending
                    ? (t.bulk_invite_btn_uploading ?? "Uploading…")
                    : (t.bulk_invite_btn_upload ?? "Upload & Invite")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Failed invites dialog — outside the main Dialog to avoid nesting */}
      <Dialog open={showFailedDialog} onOpenChange={setShowFailedDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.failed_dialog_title ?? "Some Invitations Failed"}</DialogTitle>
            <DialogDescription>
              {(t.failed_dialog_count ?? "{count} invite(s) could not be sent.").replace(
                "{count}",
                String(failedInvites.length),
              )}{" "}
              {failedSource === "file"
                ? (t.failed_dialog_rows_file ?? "Row numbers match the rows in your file.")
                : (t.failed_dialog_rows_manual ?? "Row numbers match the rows you entered.")}
            </DialogDescription>
          </DialogHeader>

          {/* min-w-0 + wrap-anywhere: a long email or name wraps instead of widening the dialog */}
          <div className="min-w-0 max-h-[55vh] overflow-y-auto rounded-lg border">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-14 px-3 py-2 font-medium">{t.failed_col_row ?? "Row"}</th>
                  <th className="w-[28%] px-3 py-2 font-medium">{t.col_name ?? "Name"}</th>
                  <th className="px-3 py-2 font-medium">{t.col_email ?? "Email"}</th>
                  <th className="w-[32%] px-3 py-2 font-medium">{t.failed_col_reason ?? "Reason"}</th>
                </tr>
              </thead>
              <tbody>
                {failedInvites.map((f) => (
                  <tr key={f.row} className="border-t align-top">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{f.row}</td>
                    <td className="px-3 py-2 font-medium wrap-anywhere">
                      {[f.first_name, f.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-3 py-2 wrap-anywhere">{f.email || "—"}</td>
                    <td className="px-3 py-2 text-destructive wrap-anywhere">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowFailedDialog(false)}>
              {t.btn_close ?? "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
