"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";

import { adminMlModelsApi } from "@/app/admin/_api/ml-models";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { getMlModelColumns } from "./_components/columns";

export default function MlModelsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">ML Model Versions</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Manage crop recommendation model versions. Only one version can be active at a time.
          </p>
        </div>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/admin/ml-models/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Register Model
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="ml-models"
          queryFn={adminMlModelsApi.getAll}
          columns={getMlModelColumns()}
          columnsLabel="Columns"
          toggleColumnsLabel="Toggle columns"
          searchPlaceholder="Search..."
          clearLabel="Clear"
        />
      </Suspense>
    </div>
  );
}