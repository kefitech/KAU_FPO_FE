"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { Code2, FileText, FlaskConical, Pencil, Plus, Radio } from "lucide-react";

import { languageApi } from "@/app/admin/_api/language";
import { channelSettingsApi } from "@/app/admin/_api/notification-channel-settings";
import { notificationTemplateApi } from "@/app/admin/_api/notification-template";
import { notificationTemplateCodeApi } from "@/app/admin/_api/notification-template-code";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { SidebarNavLayout } from "@/components/ui/sidebar-nav-layout";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { ChannelSetting, NotificationTemplate, NotificationTemplateCode } from "@/types/admin";

import { getChannelSettingsColumns } from "./_components/channel-settings-columns";
import { ChannelSettingsTestDialog } from "./_components/channel-settings-test-dialog";
import { getTemplateCodeColumns } from "./_components/template-code-columns";
import { getTemplateColumns } from "./_components/template-columns";
import { TemplateTestRenderDialog } from "./_components/template-test-render-dialog";

type T = Record<string, string>;
type Tab = "codes" | "templates" | "channels";

const NAV: { key: Tab; fallback: string; icon: React.ElementType }[] = [
  { key: "codes", fallback: "Template Codes", icon: Code2 },
  { key: "templates", fallback: "Templates", icon: FileText },
  { key: "channels", fallback: "Channel Settings", icon: Radio },
];

const CODE_FILTERS = [
  {
    key: "channel",
    label: "Channel",
    options: [
      { label: "Email", value: "email" },
      { label: "SMS", value: "sms" },
      { label: "In-App", value: "in_app" },
      { label: "Push", value: "push" },
    ],
  },
  {
    key: "is_active",
    label: "Status",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

const CHANNEL_SETTINGS_FILTERS = [
  {
    key: "channel",
    label: "Channel",
    options: [
      { label: "Email", value: "email" },
      { label: "SMS", value: "sms" },
      { label: "In-App", value: "in_app" },
    ],
  },
  {
    key: "is_active",
    label: "Status",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((s) => s.locale);
  const activeTab = (searchParams.get("tab") ?? "codes") as Tab;

  const [tPage, setTPage] = useState<T>({});
  const [tCodeTable, setTCodeTable] = useState<T>({});
  const [tTmplTable, setTTmplTable] = useState<T>({});
  const [tTestRender, setTTestRender] = useState<T>({});
  const [tChannelTable, setTChannelTable] = useState<T>({});
  const [tChannelTest, setTChannelTest] = useState<T>({});
  const [tConfirm, setTConfirm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(
        locale,
        "admin_notifications,tmpl_code_table,tmpl_table,test_render_dialog,channel_settings_table,channel_settings_test_dialog,confirm_dialog,common",
      )
      .then((data) => {
        setTPage(data.admin_notifications ?? {});
        setTCodeTable(data.tmpl_code_table ?? {});
        setTTmplTable(data.tmpl_table ?? {});
        setTTestRender(data.test_render_dialog ?? {});
        setTChannelTable(data.channel_settings_table ?? {});
        setTChannelTest(data.channel_settings_test_dialog ?? {});
        setTConfirm(data.confirm_dialog ?? {});
        setTCommon(data.common ?? {});
      });
  }, [locale]);

  const [testRenderTemplate, setTestRenderTemplate] = useState<NotificationTemplate | null>(null);
  const [testingChannel, setTestingChannel] = useState<ChannelSetting | null>(null);

  const [codeView, setCodeView] = useState<{ open: boolean; row: NotificationTemplateCode | null }>({
    open: false,
    row: null,
  });
  const [tmplView, setTmplView] = useState<{ open: boolean; row: NotificationTemplate | null }>({
    open: false,
    row: null,
  });
  const [channelView, setChannelView] = useState<{ open: boolean; row: ChannelSetting | null }>({
    open: false,
    row: null,
  });

  const { data: codesData } = useQuery({
    queryKey: ["notification-template-codes-list"],
    queryFn: () => notificationTemplateCodeApi.getAll({ page: 1, page_size: 100 }),
    enabled: activeTab === "templates",
  });

  const { data: languagesData } = useQuery({
    queryKey: ["languages-list"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
    enabled: activeTab === "templates",
  });

  const templateFilters = [
    {
      key: "template_code",
      label: "Template Code",
      options: (codesData?.data ?? []).map((c) => ({ label: `${c.name} (${c.code})`, value: String(c.id) })),
    },
    {
      key: "language",
      label: "Language",
      options: (languagesData?.data ?? []).map((l) => ({ label: `${l.name} (${l.code})`, value: String(l.id) })),
    },
    {
      key: "is_active",
      label: "Status",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
  ];

  const navLabels: Record<Tab, string> = {
    codes: tPage.tab_codes ?? "Template Codes",
    templates: tPage.tab_templates ?? "Templates",
    channels: tPage.tab_channel_settings ?? "Channel Settings",
  };

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* Page header */}
      <div>
        <h1 className="font-bold text-2xl">{tPage.page_title ?? "Notifications"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tPage.page_description ?? "Manage notification template codes and language content"}
        </p>
      </div>

      <SidebarNavLayout
        items={NAV.map(({ key, fallback, icon }) => ({ key, label: navLabels[key] || fallback, icon }))}
        activeKey={activeTab}
        onNavigate={(key) => router.replace(`/admin/notifications?tab=${key}`)}
        action={
          activeTab === "codes" ? (
            <Button size="sm" onClick={() => router.push("/admin/notification-template-codes/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_code_btn ?? "Add Template Code"}
            </Button>
          ) : activeTab === "templates" ? (
            <Button size="sm" onClick={() => router.push("/admin/notification-templates/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_template_btn ?? "Add Template"}
            </Button>
          ) : (
            <Button size="sm" onClick={() => router.push("/admin/notification-channel-settings/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tPage.add_channel_btn ?? "Add Channel"}
            </Button>
          )
        }
      >
        {activeTab === "codes" && (
          <Suspense>
            <DataTable
              queryKey="notification-template-codes"
              queryFn={notificationTemplateCodeApi.getAll}
              columns={getTemplateCodeColumns(tCodeTable, tConfirm, tCommon)}
              filters={CODE_FILTERS}
              onRowClick={(row) => setCodeView({ open: true, row })}
            />
          </Suspense>
        )}
        {activeTab === "templates" && (
          <Suspense>
            <DataTable
              queryKey="notification-templates"
              queryFn={notificationTemplateApi.getAll}
              columns={getTemplateColumns(setTestRenderTemplate, tTmplTable, tConfirm, tCommon)}
              filters={templateFilters}
              onRowClick={(row) => setTmplView({ open: true, row })}
            />
          </Suspense>
        )}
        {activeTab === "channels" && (
          <Suspense>
            <DataTable
              queryKey="channel-settings"
              queryFn={channelSettingsApi.getAll}
              columns={getChannelSettingsColumns(setTestingChannel, tChannelTable, tConfirm, tCommon)}
              filters={CHANNEL_SETTINGS_FILTERS}
              onRowClick={(row) => setChannelView({ open: true, row })}
            />
          </Suspense>
        )}
      </SidebarNavLayout>

      <TemplateTestRenderDialog
        open={!!testRenderTemplate}
        onClose={() => setTestRenderTemplate(null)}
        template={testRenderTemplate}
        t={tTestRender}
        tCommon={tCommon}
      />
      <ChannelSettingsTestDialog
        open={!!testingChannel}
        onClose={() => setTestingChannel(null)}
        setting={testingChannel}
        t={tChannelTest}
        tCommon={tCommon}
      />
      <ViewSheet
        open={codeView.open}
        onOpenChange={(open) => setCodeView((s) => ({ ...s, open }))}
        title={tCodeTable.view_title ?? "Template Code Details"}
        actions={
          codeView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/notification-template-codes/${codeView.row?.id}/edit`),
                },
                {
                  label: tPage.add_template_btn ?? "Add Template",
                  icon: Plus,
                  onClick: () => router.push(`/admin/notification-templates/new?code=${codeView.row?.id}`),
                },
              ]
            : []
        }
        fields={
          codeView.row
            ? [
                { label: tCodeTable.col_code ?? "Code", type: "code", value: codeView.row.code },
                { label: tCodeTable.col_name ?? "Name", value: codeView.row.name },
                { label: tCodeTable.col_channel ?? "Channel", value: codeView.row.channel_display },
                { label: tCodeTable.col_description ?? "Description", value: codeView.row.description },
                {
                  label: tCodeTable.col_variables ?? "Variables",
                  type: "tags",
                  tags: codeView.row.variables.map((v) => `{{${v}}}`),
                },
                {
                  label: tCodeTable.col_status ?? "Status",
                  type: "status",
                  active: codeView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tCodeTable.col_template_count ?? "Templates", value: codeView.row.template_count },
              ]
            : []
        }
      />
      <ViewSheet
        open={tmplView.open}
        onOpenChange={(open) => setTmplView((s) => ({ ...s, open }))}
        title={tTmplTable.view_title ?? "Template Details"}
        actions={
          tmplView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/notification-templates/${tmplView.row?.id}/edit`),
                },
                {
                  label: tPage.test_render_btn ?? "Test Render",
                  icon: FlaskConical,
                  onClick: () => {
                    setTestRenderTemplate(tmplView.row);
                    setTmplView((s) => ({ ...s, open: false }));
                  },
                },
              ]
            : []
        }
        fields={
          tmplView.row
            ? [
                {
                  label: tTmplTable.col_template_code ?? "Template Code",
                  value: tmplView.row.template_code_detail?.name,
                },
                {
                  label: tTmplTable.col_language ?? "Language",
                  value: `${tmplView.row.language_name} (${tmplView.row.language_code})`,
                },
                { label: tTmplTable.col_channel ?? "Channel", value: tmplView.row.channel_display },
                {
                  label: tTmplTable.col_status ?? "Status",
                  type: "status",
                  active: tmplView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: tTmplTable.col_subject ?? "Subject", value: tmplView.row.subject },
                {
                  label: tTmplTable.col_body ?? "Body",
                  type: "node",
                  node: (
                    <pre className="whitespace-pre-wrap rounded bg-muted p-2 text-left font-mono text-xs">
                      {tmplView.row.body}
                    </pre>
                  ),
                },
                {
                  label: tTmplTable.col_variables ?? "Variables",
                  type: "tags",
                  tags: tmplView.row.variables.map((v) => `{{${v}}}`),
                },
              ]
            : []
        }
      />
      <ViewSheet
        open={channelView.open}
        onOpenChange={(open) => setChannelView((s) => ({ ...s, open }))}
        title={tChannelTable.view_title ?? "Channel Setting Details"}
        actions={
          channelView.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => router.push(`/admin/notification-channel-settings/${channelView.row?.id}/edit`),
                },
                {
                  label: tCommon.send_test ?? "Send Test",
                  onClick: () => {
                    setTestingChannel(channelView.row);
                    setChannelView((s) => ({ ...s, open: false }));
                  },
                },
              ]
            : []
        }
        fields={
          channelView.row
            ? [
                { label: tChannelTable.col_channel ?? "Channel", value: channelView.row.channel_display },
                {
                  label: tChannelTable.col_status ?? "Status",
                  type: "status",
                  active: channelView.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                ...Object.entries(
                  typeof channelView.row.config === "string"
                    ? JSON.parse(channelView.row.config || "{}")
                    : channelView.row.config,
                ).map(([key, val]) => ({
                  label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                  value: ["password", "api_key"].includes(key) ? "••••••••" : String(val ?? "—"),
                })),
              ]
            : []
        }
      />
    </div>
  );
}
