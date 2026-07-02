"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { getSchemeColumns } from "./_components/columns";

type T = Record<string, string>;

const FILTERS = [
  {
    key: "category",
    label: "Category",
    options: [
      { label: "Credit & Finance", value: "credit" },
      { label: "Insurance", value: "insurance" },
      { label: "Marketing & Trade", value: "marketing" },
      { label: "Infrastructure", value: "infrastructure" },
      { label: "Capacity Building", value: "capacity_building" },
    ],
  },
];

export default function SchemesPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_schemes,common")
      .then((data) => {
        setT(data.admin_schemes ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Schemes"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Manage government schemes and subsidies for FPOs"}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/admin/schemes/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_add ?? "Add Scheme"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="schemes"
          queryFn={adminSchemesApi.getAll}
          columns={getSchemeColumns(t, tCommon)}
          filters={FILTERS}
        />
      </Suspense>
    </div>
  );
}
