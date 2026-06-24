"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Pencil, Plus } from "lucide-react";

import { rolesApi } from "@/app/admin/_api/roles";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Role } from "@/types/admin";

import { getRoleColumns } from "./_components/columns";
import { RoleForm } from "./_components/role-form";

type T = Record<string, string>;

export default function RolesPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  const [tTable, setTTable] = useState<T>({});
  const [tForm, setTForm] = useState<T>({});
  const [tConfirm, setTConfirm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  const [addOpen, setAddOpen] = useState(false);
  const [roleView, setRoleView] = useState<{ open: boolean; row: Role | null }>({ open: false, row: null });

  useEffect(() => {
    translationsApi.getPublic(locale, "roles_table,roles_dialog,confirm_dialog,common").then((data) => {
      setTTable(data.roles_table ?? {});
      setTForm(data.roles_dialog ?? {});
      setTConfirm(data.confirm_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{tTable.page_title ?? "Roles"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {tTable.page_description ?? "Manage user roles and access groups"}
          </p>
        </div>

        {/* Opens dialog instead of navigating to /admin/roles/new */}
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {tTable.add_button ?? "Add Role"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="roles"
          queryFn={rolesApi.getAll}
          columns={getRoleColumns(tTable, tConfirm, tCommon)}
          onRowClick={(row) => setRoleView({ open: true, row })}
        />
      </Suspense>

      {/* ── Add Role Dialog ──────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{tForm.add_title ?? "Add Role"}</DialogTitle>
          </DialogHeader>
          <RoleForm
            mode="create"
            t={tForm}
            tCommon={tCommon}
            onSuccess={() => setAddOpen(false)}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ViewSheet
        open={roleView.open}
        onOpenChange={(open) => setRoleView((s) => ({ ...s, open }))}
        title={tTable.view_title ?? "Role Details"}
        actions={
          roleView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/roles/${roleView.row?.id}/edit`),
                },
              ]
            : []
        }
        fields={
          roleView.row
            ? [
                { label: tTable.col_id ?? "ID", type: "code", value: roleView.row.id },
                { label: tTable.col_name ?? "Name", value: roleView.row.name },
              ]
            : []
        }
      />
    </div>
  );
}
