"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Globe, Languages, Menu, Pencil, Plus, ShieldCheck, Tag, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { languageApi } from "@/app/admin/_api/language";
import { menuApi } from "@/app/admin/_api/menu";
import { translationApi } from "@/app/admin/_api/translation";
import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { SidebarNavLayout } from "@/components/ui/sidebar-nav-layout";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";
import type { AdminMenuItem, Language, Translation, TranslationCategory } from "@/types/admin";

import { getCategoryColumns } from "./_components/category-columns";
import { getLanguageColumns } from "./_components/columns";
import { getMenuColumns } from "./_components/menu-columns";
import { getTranslationColumns } from "./_components/translation-columns";
import { TranslationExportDialog } from "./_components/translation-export-dialog";
import { TranslationImportDialog } from "./_components/translation-import-dialog";

type T = Record<string, string>;

type Tab = "languages" | "categories" | "translations" | "menu";

const NAV: { key: Tab; label: string; fallback: string; icon: React.ElementType }[] = [
  { key: "languages", label: "", fallback: "Languages", icon: Globe },
  { key: "categories", label: "", fallback: "Categories", icon: Tag },
  { key: "translations", label: "", fallback: "Translations", icon: Languages },
  { key: "menu", label: "", fallback: "Menu Items", icon: Menu },
];

const LANGUAGE_FILTERS = [
  {
    key: "is_active",
    label: "Status",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

const MENU_FILTERS = [
  {
    key: "is_active",
    label: "Status",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

const TRANSLATION_VERIFIED_FILTER = {
  key: "is_verified",
  label: "Verified",
  options: [
    { label: "Verified", value: "true" },
    { label: "Unverified", value: "false" },
  ],
};

export default function LanguagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((s) => s.locale);
  const activeTab = (searchParams.get("tab") ?? "languages") as Tab;

  const [tPage, setTPage] = useState<T>({});
  const [tLangTable, setTLangTable] = useState<T>({});
  const [tCatTable, setTCatTable] = useState<T>({});
  const [tTransTable, setTTransTable] = useState<T>({});
  const [tExportDialog, setTExportDialog] = useState<T>({});
  const [tImportDialog, setTImportDialog] = useState<T>({});
  const [tMenuTable, setTMenuTable] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(
        locale,
        "admin_languages,lang_table,cat_table,trans_table,export_dialog,import_dialog,menu_table,common",
      )
      .then((data) => {
        setTPage(data.admin_languages ?? {});
        setTLangTable(data.lang_table ?? {});
        setTCatTable(data.cat_table ?? {});
        setTTransTable(data.trans_table ?? {});
        setTExportDialog(data.export_dialog ?? {});
        setTImportDialog(data.import_dialog ?? {});
        setTMenuTable(data.menu_table ?? {});
        setTCommon(data.common ?? {});
      });
  }, [locale]);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedTranslations, setSelectedTranslations] = useState<Translation[]>([]);

  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const bulkVerifyMutation = useMutation({
    mutationFn: (ids: number[]) => translationApi.bulkVerify(ids),
    onSuccess: () => {
      toast.success(`${selectedTranslations.length} translation(s) marked as verified`);
      setSelectedTranslations([]);
      queryClient.invalidateQueries({ queryKey: ["translations"] });
    },
    onError: () => toast.error("Failed to verify translations"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => translationApi.bulkDelete(ids),
    onSuccess: () => {
      toast.success(`${selectedTranslations.length} translation(s) deleted`);
      setSelectedTranslations([]);
      queryClient.invalidateQueries({ queryKey: ["translations"] });
    },
    onError: () => toast.error("Failed to delete translations"),
  });

  function handleBulkVerify() {
    const ids = selectedTranslations.map((t) => t.id);
    bulkVerifyMutation.mutate(ids);
  }

  function handleBulkDelete() {
    confirm({
      title: "Delete Translations",
      description: `Are you sure you want to delete ${selectedTranslations.length} translation(s)? This action cannot be undone.`,
      onConfirm: () => bulkDeleteMutation.mutateAsync(selectedTranslations.map((t) => t.id)),
    });
  }

  const allVerified = useMemo(() => selectedTranslations.length > 0 && selectedTranslations.every((t) => t.is_verified), [selectedTranslations]);

  const translationBulkExtra = useMemo(
    () =>
      selectedTranslations.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">{selectedTranslations.length} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
            disabled={bulkVerifyMutation.isPending || allVerified}
            onClick={handleBulkVerify}
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            {bulkVerifyMutation.isPending ? "Verifying…" : "Verify"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
            disabled={bulkDeleteMutation.isPending}
            onClick={handleBulkDelete}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {bulkDeleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      ) : undefined,
    [selectedTranslations.length, allVerified, bulkVerifyMutation.isPending, bulkDeleteMutation.isPending, handleBulkVerify, handleBulkDelete],
  );

  const [langView, setLangView] = useState<{ open: boolean; row: Language | null }>({ open: false, row: null });
  const [catView, setCatView] = useState<{ open: boolean; row: TranslationCategory | null }>({
    open: false,
    row: null,
  });
  const [transView, setTransView] = useState<{ open: boolean; row: Translation | null }>({ open: false, row: null });
  const [menuView, setMenuView] = useState<{ open: boolean; row: AdminMenuItem | null }>({ open: false, row: null });

  const { data: languagesData } = useQuery({
    queryKey: ["languages-list"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
    enabled: activeTab === "translations",
    staleTime: 5 * 60_000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: () => translationCategoryApi.getAll({ page: 1, page_size: 100 }),
    enabled: activeTab === "translations",
    staleTime: 5 * 60_000,
  });

  const translationFilters = useMemo(
    () => [
      {
        key: "language",
        label: "Language",
        options: (languagesData?.data ?? []).map((l) => ({ label: `${l.name} (${l.code})`, value: String(l.id) })),
      },
      {
        key: "category",
        label: "Category",
        options: (categoriesData?.data ?? []).map((c) => ({ label: c.name, value: String(c.id) })),
      },
      TRANSLATION_VERIFIED_FILTER,
    ],
    [languagesData, categoriesData],
  );

  const navLabels: Record<Tab, string> = {
    languages: tPage.tab_languages ?? "Languages",
    categories: tPage.tab_categories ?? "Categories",
    translations: tPage.tab_translations ?? "Translations",
    menu: tPage.tab_menu ?? "Menu Items",
  };

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* Page header */}
      <div>
        <h1 className="font-bold text-2xl">{tPage.page_title ?? "Languages & Translations"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tPage.page_description ?? "Manage platform languages and translation categories"}
        </p>
      </div>

      <SidebarNavLayout
        items={NAV.map(({ key, fallback, icon }) => ({ key, label: navLabels[key] || fallback, icon }))}
        activeKey={activeTab}
        onNavigate={(key) => router.replace(`/admin/languages?tab=${key}`)}
        action={
          activeTab === "languages" ? (
            <Button size="sm" onClick={() => router.push("/admin/languages/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_language_btn ?? "Add Language"}
            </Button>
          ) : activeTab === "categories" ? (
            <Button size="sm" onClick={() => router.push("/admin/categories/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_category_btn ?? "Add Category"}
            </Button>
          ) : activeTab === "translations" ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setExportDialogOpen(true)}>
                <Download className="mr-1.5 h-4 w-4" />
                {tPage.export_btn ?? "Export"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                {tPage.import_btn ?? "Import"}
              </Button>
              <Button size="sm" onClick={() => router.push("/admin/translations/new")}>
                <Plus className="mr-1.5 h-4 w-4" />
                {tPage.add_translation_btn ?? "Add Translation"}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => router.push("/admin/menu-items/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tMenuTable.add_button ?? "Add Menu Item"}
            </Button>
          )
        }
      >
        {activeTab === "languages" && (
          <Suspense>
            <DataTable
              queryKey="languages"
              queryFn={languageApi.getAll}
              columns={getLanguageColumns(tLangTable, tCommon)}
              filters={LANGUAGE_FILTERS}
              onRowClick={(row) => setLangView({ open: true, row })}
            />
          </Suspense>
        )}
        {activeTab === "categories" && (
          <Suspense>
            <DataTable
              queryKey="translation-categories"
              queryFn={translationCategoryApi.getAll}
              columns={getCategoryColumns(tCatTable, tCommon)}
              onRowClick={(row) => setCatView({ open: true, row })}
            />
          </Suspense>
        )}
        {activeTab === "translations" && (
          <Suspense>
            <DataTable
              queryKey="translations"
              queryFn={translationApi.getAll}
              columns={getTranslationColumns(tTransTable, tCommon)}
              filters={translationFilters}
              onRowClick={(row) => setTransView({ open: true, row })}
              onSelectionChange={setSelectedTranslations}
              extra={translationBulkExtra}
            />
          </Suspense>
        )}
        {activeTab === "menu" && (
          <Suspense>
            <DataTable
              queryKey="menu-items"
              queryFn={menuApi.getAll}
              columns={getMenuColumns(tMenuTable, tCommon)}
              filters={MENU_FILTERS}
              onRowClick={(row) => setMenuView({ open: true, row })}
            />
          </Suspense>
        )}
      </SidebarNavLayout>

      <TranslationExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        t={tExportDialog}
        tCommon={tCommon}
      />
      <TranslationImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        t={tImportDialog}
        tCommon={tCommon}
      />
      <ViewSheet
        open={langView.open}
        onOpenChange={(open) => setLangView((s) => ({ ...s, open }))}
        title={tLangTable.view_title ?? "Language Details"}
        actions={
          langView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/languages/${langView.row?.id}/edit`),
                },
                {
                  label: tPage.add_translation_btn ?? "Add Translation",
                  icon: Plus,
                  onClick: () => router.push(`/admin/translations/new?language=${langView.row?.id}`),
                },
              ]
            : []
        }
        fields={
          langView.row
            ? [
                { label: tLangTable.col_code ?? "Code", type: "code", value: langView.row.code },
                { label: tLangTable.col_name ?? "Name", value: langView.row.name },
                { label: tLangTable.col_native_name ?? "Native Name", value: langView.row.native_name },
                { label: tLangTable.col_locale ?? "Locale", type: "code", value: langView.row.locale },
                {
                  label: tLangTable.col_status ?? "Status",
                  type: "status",
                  active: langView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                {
                  label: tLangTable.col_default ?? "Default",
                  type: "status",
                  active: langView.row.is_default,
                  activeLabel: tCommon.yes ?? "Yes",
                  inactiveLabel: tCommon.no ?? "No",
                },
                {
                  label: tLangTable.col_rtl ?? "RTL",
                  value: langView.row.is_rtl ? (tCommon.yes ?? "Yes") : (tCommon.no ?? "No"),
                },
                { label: tLangTable.col_order ?? "Display Order", value: langView.row.display_order },
                { label: tLangTable.col_translation_count ?? "Translations", value: langView.row.translation_count },
              ]
            : []
        }
      />
      <ViewSheet
        open={catView.open}
        onOpenChange={(open) => setCatView((s) => ({ ...s, open }))}
        title={tCatTable.view_title ?? "Category Details"}
        actions={
          catView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/categories/${catView.row?.id}/edit`),
                },
                {
                  label: tPage.add_translation_btn ?? "Add Translation",
                  icon: Plus,
                  onClick: () => router.push(`/admin/translations/new?category=${catView.row?.id}`),
                },
              ]
            : []
        }
        fields={
          catView.row
            ? [
                { label: tCatTable.col_code ?? "Code", type: "code", value: catView.row.code },
                { label: tCatTable.col_name ?? "Name", value: catView.row.name },
                { label: tCatTable.col_description ?? "Description", value: catView.row.description },
                { label: tCatTable.col_order ?? "Display Order", value: catView.row.display_order },
                { label: tCatTable.col_translation_count ?? "Translations", value: catView.row.translation_count },
                { label: tCommon.created_at ?? "Created At", type: "date", value: catView.row.created_at },
              ]
            : []
        }
      />
      <ViewSheet
        open={transView.open}
        onOpenChange={(open) => setTransView((s) => ({ ...s, open }))}
        title={tTransTable.view_title ?? "Translation Details"}
        actions={
          transView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/translations/${transView.row?.id}/edit`),
                },
                ...(!transView.row.is_verified
                  ? [
                      {
                        label: tTransTable.action_verify ?? "Mark Verified",
                        icon: ShieldCheck,
                        onClick: () => setTransView((s) => ({ ...s, open: false })),
                      },
                    ]
                  : []),
              ]
            : []
        }
        fields={
          transView.row
            ? [
                { label: tTransTable.col_key ?? "Key", type: "code", value: transView.row.full_key },
                {
                  label: tTransTable.col_language ?? "Language",
                  value: `${transView.row.language_name} (${transView.row.language_code})`,
                },
                { label: tTransTable.col_category ?? "Category", value: transView.row.category_name },
                { label: tTransTable.col_value ?? "Value", value: transView.row.value },
                { label: tTransTable.col_context ?? "Context", value: transView.row.context },
                {
                  label: tTransTable.col_variables ?? "Variables",
                  type: "tags",
                  tags: transView.row.variables.map((v) => `{{${v}}}`),
                },
                {
                  label: tTransTable.col_verified ?? "Verified",
                  type: "status",
                  active: transView.row.is_verified,
                  activeLabel: tCommon.badge_verified ?? "Verified",
                  inactiveLabel: tCommon.badge_unverified ?? "Unverified",
                },
              ]
            : []
        }
      />
      <ViewSheet
        open={menuView.open}
        onOpenChange={(open) => setMenuView((s) => ({ ...s, open }))}
        title={tMenuTable.view_title ?? "Menu Item Details"}
        actions={
          menuView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/menu-items/${menuView.row?.id}/edit`),
                },
              ]
            : []
        }
        fields={
          menuView.row
            ? [
                { label: tMenuTable.col_label ?? "Label", value: menuView.row.label || menuView.row.label_key },
                { label: tMenuTable.col_label_key ?? "Label Key", type: "code", value: menuView.row.label_key },
                { label: tMenuTable.col_path ?? "Path", type: "code", value: menuView.row.path },
                { label: tMenuTable.col_icon ?? "Icon", type: "code", value: menuView.row.icon },
                { label: tMenuTable.col_roles ?? "Roles", type: "tags", tags: menuView.row.role_names },
                { label: tMenuTable.col_order ?? "Order", value: menuView.row.order },
                {
                  label: tMenuTable.col_status ?? "Status",
                  type: "status",
                  active: menuView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
              ]
            : []
        }
      />
    </div>
  );
}
