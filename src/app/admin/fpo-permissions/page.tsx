"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Pencil, Plus, Save, Users, Zap } from "lucide-react";
import { toast } from "sonner";

import { fpoActionsApi } from "@/app/admin/_api/fpo-actions";
import { fpoMemberRolesApi } from "@/app/admin/_api/fpo-member-roles";
import { fpoPermissionsApi } from "@/app/admin/_api/fpo-permissions";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { SidebarNavLayout } from "@/components/ui/sidebar-nav-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";
import type { FpoAction, FpoMemberRole, FpoPermissionUpdate } from "@/types/admin";

import { getActionColumns } from "./_components/action-columns";
import { ActionDialog } from "./_components/action-dialog";
import { getRoleColumns } from "./_components/role-columns";
import { RoleDialog } from "./_components/role-dialog";

type T = Record<string, string>;
type Tab = "actions" | "roles" | "matrix";

const NAV: { key: Tab; fallback: string; icon: React.ElementType }[] = [
  { key: "actions", fallback: "FPO Actions", icon: Zap },
  { key: "roles", fallback: "Member Roles", icon: Users },
  { key: "matrix", fallback: "Permissions Matrix", icon: LayoutGrid },
];

const STATUS_FILTERS = [
  {
    key: "is_active",
    label: "Status",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

function PermissionMatrix({ t }: { t: T }) {
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState<Map<string, boolean>>(new Map());

  const { data: matrix, isLoading } = useQuery({
    queryKey: ["fpo-permissions"],
    queryFn: fpoPermissionsApi.getMatrix,
  });

  const saveMutation = useMutation({
    mutationFn: (updates: FpoPermissionUpdate[]) => fpoPermissionsApi.bulkUpdate(updates),
    onSuccess: () => {
      toast.success(t.matrix_saved ?? "Permissions saved");
      setDirty(new Map());
      queryClient.invalidateQueries({ queryKey: ["fpo-permissions"] });
    },
    onError: () => toast.error(t.matrix_save_failed ?? "Failed to save permissions"),
  });

  function getCellValue(roleId: number, actionCode: string, serverValue: boolean): boolean {
    const key = `${roleId}:${actionCode}`;
    return dirty.has(key) ? (dirty.get(key) as boolean) : serverValue;
  }

  function handleToggle(roleId: number, actionCode: string, serverValue: boolean) {
    const key = `${roleId}:${actionCode}`;
    const current = dirty.has(key) ? (dirty.get(key) as boolean) : serverValue;
    const next = !current;
    setDirty((prev) => {
      const m = new Map(prev);
      if (next === serverValue) {
        m.delete(key);
      } else {
        m.set(key, next);
      }
      return m;
    });
  }

  function handleSave() {
    const updates: FpoPermissionUpdate[] = Array.from(dirty.entries()).map(([key, is_allowed]) => {
      const [roleIdStr, action_code] = key.split(":");
      return { role_id: Number(roleIdStr), action_code, is_allowed };
    });
    saveMutation.mutate(updates);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!matrix) return null;

  const actions = Array.isArray(matrix.actions) ? matrix.actions : [];
  const roles = Array.isArray(matrix.roles) ? matrix.roles : [];

  if (roles.length === 0) {
    return (
      <p className="py-6 text-muted-foreground text-sm">
        {t.matrix_empty ?? "No roles found. Add member roles first."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {roles.map((role) => (
        <div key={role.id} className="rounded-lg border">
          {/* Role header */}
          <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
            <div>
              <span className="font-semibold text-sm">{role.name}</span>
              <span className="ml-2 font-mono text-muted-foreground text-xs">{role.code}</span>
            </div>
          </div>

          {/* Permission toggles — wraps to next line automatically */}
          <div className="flex flex-wrap gap-2 p-4">
            {actions.map((action) => {
              const serverValue = role.permissions[action.code] ?? false;
              const checked = getCellValue(role.id, action.code, serverValue);
              const isDirty = dirty.has(`${role.id}:${action.code}`);
              const label = action.label;
              return (
                <label
                  key={action.id}
                  className={`flex cursor-pointer select-none items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted/50 ${
                    isDirty ? "border-ring bg-ring/5" : ""
                  } ${checked ? "text-foreground" : "text-muted-foreground"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggle(role.id, action.code, serverValue)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-foreground"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="flex items-center justify-end pt-1">
        <Button size="sm" onClick={handleSave} disabled={dirty.size === 0 || saveMutation.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {saveMutation.isPending
            ? (t.matrix_saving ?? "Saving...")
            : dirty.size > 0
              ? `${t.matrix_save_btn ?? "Save Changes"} (${dirty.size})`
              : (t.matrix_save_btn ?? "Save Changes")}
        </Button>
      </div>
    </div>
  );
}

export default function FpoPermissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const activeTab = (searchParams.get("tab") ?? "actions") as Tab;

  const [tPage, setTPage] = useState<T>({});
  const [tActionTable, setTActionTable] = useState<T>({});
  const [tRoleTable, setTRoleTable] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_permissions,fpo_action_table,fpo_role_table,common").then((data) => {
      setTPage(data.fpo_permissions ?? {});
      setTActionTable(data.fpo_action_table ?? {});
      setTRoleTable(data.fpo_role_table ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const [actionDialog, setActionDialog] = useState<{ open: boolean; editing: FpoAction | null }>({
    open: false,
    editing: null,
  });
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; editing: FpoMemberRole | null }>({
    open: false,
    editing: null,
  });
  const [actionView, setActionView] = useState<{ open: boolean; row: FpoAction | null }>({
    open: false,
    row: null,
  });
  const [roleView, setRoleView] = useState<{ open: boolean; row: FpoMemberRole | null }>({
    open: false,
    row: null,
  });

  const toggleActionMutation = useMutation({
    mutationFn: (action: FpoAction) =>
      action.is_active ? fpoActionsApi.deactivate(action.id) : fpoActionsApi.activate(action.id),
    onSuccess: (_, action) => {
      toast.success(
        action.is_active
          ? (tActionTable.deactivated ?? "Action deactivated")
          : (tActionTable.activated ?? "Action activated"),
      );
      queryClient.invalidateQueries({ queryKey: ["fpo-actions"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });

  const deleteActionMutation = useMutation({
    mutationFn: (id: number) => fpoActionsApi.delete(id),
    onSuccess: () => {
      toast.success(tActionTable.deleted ?? "Action deleted");
      queryClient.invalidateQueries({ queryKey: ["fpo-actions"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  const toggleRoleMutation = useMutation({
    mutationFn: (role: FpoMemberRole) =>
      role.is_active ? fpoMemberRolesApi.deactivate(role.id) : fpoMemberRolesApi.activate(role.id),
    onSuccess: (_, role) => {
      toast.success(
        role.is_active ? (tRoleTable.deactivated ?? "Role deactivated") : (tRoleTable.activated ?? "Role activated"),
      );
      queryClient.invalidateQueries({ queryKey: ["fpo-member-roles"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => fpoMemberRolesApi.delete(id),
    onSuccess: () => {
      toast.success(tRoleTable.deleted ?? "Role deleted");
      queryClient.invalidateQueries({ queryKey: ["fpo-member-roles"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  const actionCallbacks = {
    onEdit: (action: FpoAction) => setActionDialog({ open: true, editing: action }),
    onToggleActive: (action: FpoAction) => toggleActionMutation.mutate(action),
    onDelete: (action: FpoAction) =>
      confirm({
        title: tActionTable.delete_title ?? "Delete Action",
        description: (
          tActionTable.delete_description ?? 'Are you sure you want to delete "{name}"? This action cannot be undone.'
        ).replace("{name}", action.code),
        onConfirm: () => deleteActionMutation.mutateAsync(action.id),
      }),
  };

  const roleCallbacks = {
    onEdit: (role: FpoMemberRole) => setRoleDialog({ open: true, editing: role }),
    onToggleActive: (role: FpoMemberRole) => toggleRoleMutation.mutate(role),
    onDelete: (role: FpoMemberRole) =>
      confirm({
        title: tRoleTable.delete_title ?? "Delete Role",
        description: (
          tRoleTable.delete_description ?? 'Are you sure you want to delete "{name}"? This action cannot be undone.'
        ).replace("{name}", role.code),
        onConfirm: () => deleteRoleMutation.mutateAsync(role.id),
      }),
  };

  const navLabels: Record<Tab, string> = {
    actions: tPage.tab_actions ?? "FPO Actions",
    roles: tPage.tab_roles ?? "Member Roles",
    matrix: tPage.tab_matrix ?? "Permissions Matrix",
  };

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="font-bold text-2xl">{tPage.page_title ?? "FPO Permissions"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tPage.page_description ?? "Manage FPO actions, member roles and their permission matrix"}
        </p>
      </div>

      <SidebarNavLayout
        items={NAV.map(({ key, fallback, icon }) => ({ key, label: navLabels[key] || fallback, icon }))}
        activeKey={activeTab}
        onNavigate={(key) => router.replace(`/admin/fpo-permissions?tab=${key}`)}
        action={
          activeTab === "actions" ? (
            <Button size="sm" onClick={() => setActionDialog({ open: true, editing: null })}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_action_btn ?? "Add Action"}
            </Button>
          ) : activeTab === "roles" ? (
            <Button size="sm" onClick={() => setRoleDialog({ open: true, editing: null })}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_role_btn ?? "Add Role"}
            </Button>
          ) : undefined
        }
      >
        {activeTab === "actions" && (
          <Suspense>
            <DataTable
              queryKey="fpo-actions"
              queryFn={fpoActionsApi.getAll}
              columns={getActionColumns(tActionTable, tCommon, actionCallbacks)}
              filters={STATUS_FILTERS}
              onRowClick={(row) => setActionView({ open: true, row })}
            />
          </Suspense>
        )}
        {activeTab === "roles" && (
          <Suspense>
            <DataTable
              queryKey="fpo-member-roles"
              queryFn={fpoMemberRolesApi.getAll}
              columns={getRoleColumns(tRoleTable, tCommon, roleCallbacks)}
              filters={STATUS_FILTERS}
              onRowClick={(row) => setRoleView({ open: true, row })}
            />
          </Suspense>
        )}
        {activeTab === "matrix" && <PermissionMatrix t={tPage} />}
      </SidebarNavLayout>

      <ActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((s) => ({ ...s, open }))}
        editing={actionDialog.editing}
        t={tActionTable}
        tCommon={tCommon}
      />
      <RoleDialog
        open={roleDialog.open}
        onOpenChange={(open) => setRoleDialog((s) => ({ ...s, open }))}
        editing={roleDialog.editing}
        t={tRoleTable}
        tCommon={tCommon}
      />
      <ViewSheet
        open={actionView.open}
        onOpenChange={(open) => setActionView((s) => ({ ...s, open }))}
        title={tActionTable.view_title ?? "Action Details"}
        actions={
          actionView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => {
                    setActionDialog({ open: true, editing: actionView.row });
                    setActionView((s) => ({ ...s, open: false }));
                  },
                },
              ]
            : []
        }
        fields={
          actionView.row
            ? [
                { label: tActionTable.col_code ?? "Code", type: "code", value: actionView.row.code },
                {
                  label: tActionTable.col_translations ?? "Languages",
                  type: "tags",
                  tags: actionView.row.translations as string[],
                },
                { label: tActionTable.col_description ?? "Description", value: actionView.row.description },
                {
                  label: tActionTable.col_status ?? "Status",
                  type: "status",
                  active: actionView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tCommon.created_at ?? "Created At", type: "date", value: actionView.row.created_at },
              ]
            : []
        }
      />
      <ViewSheet
        open={roleView.open}
        onOpenChange={(open) => setRoleView((s) => ({ ...s, open }))}
        title={tRoleTable.view_title ?? "Role Details"}
        actions={
          roleView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => {
                    setRoleDialog({ open: true, editing: roleView.row });
                    setRoleView((s) => ({ ...s, open: false }));
                  },
                },
              ]
            : []
        }
        fields={
          roleView.row
            ? [
                { label: tRoleTable.col_code ?? "Code", type: "code", value: roleView.row.code },
                {
                  label: tRoleTable.col_translations ?? "Languages",
                  type: "tags",
                  tags: roleView.row.translations as string[],
                },
                {
                  label: tRoleTable.col_status ?? "Status",
                  type: "status",
                  active: roleView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tCommon.created_at ?? "Created At", type: "date", value: roleView.row.created_at },
              ]
            : []
        }
      />
    </div>
  );
}
