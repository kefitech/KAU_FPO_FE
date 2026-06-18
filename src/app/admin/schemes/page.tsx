"use client";

import { Suspense } from "react";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";

import { getSchemeColumns } from "./_components/columns";

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

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Schemes</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Manage government schemes and subsidies for FPOs
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/admin/schemes/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Scheme
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="schemes"
          queryFn={adminSchemesApi.getAll}
          columns={getSchemeColumns()}
          filters={FILTERS}
        />
      </Suspense>
    </div>
  );
}
