"use client";

import { Suspense, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { AdminExpert } from "@/types/admin";

import { getExpertColumns } from "./_components/columns";
import { ExpertDetailDialog } from "./_components/expert-detail-dialog";

const FILTERS = [
  {
    key: "category",
    label: "Category",
    options: [
      { label: "Scientist / Researcher", value: "scientist" },
      { label: "Trainer / Extension Worker", value: "trainer" },
      { label: "Banker / Financial Advisor", value: "banker" },
      { label: "Facilitator / NGO", value: "facilitator" },
    ],
  },
  {
    key: "district",
    label: "District",
    options: [
      { label: "Thiruvananthapuram", value: "TVM" },
      { label: "Kollam", value: "KLM" },
      { label: "Pathanamthitta", value: "PTA" },
      { label: "Alappuzha", value: "ALP" },
      { label: "Kottayam", value: "KTM" },
      { label: "Idukki", value: "IDK" },
      { label: "Ernakulam", value: "EKM" },
      { label: "Thrissur", value: "TSR" },
      { label: "Palakkad", value: "PKD" },
      { label: "Malappuram", value: "MLP" },
      { label: "Kozhikode", value: "KZD" },
      { label: "Wayanad", value: "WYD" },
      { label: "Kannur", value: "KNR" },
      { label: "Kasaragod", value: "KSD" },
    ],
  },
];

export default function ExpertsPage() {
  const router = useRouter();
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; expert: AdminExpert | null }>({
    open: false,
    expert: null,
  });

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Expert Directory</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Manage agricultural experts and KAU specialists
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/admin/experts/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Expert
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="experts"
          queryFn={adminExpertsApi.getAll}
          columns={getExpertColumns()}
          filters={FILTERS}
          onRowClick={(row) => setDetailDialog({ open: true, expert: row })}
        />
      </Suspense>

      <ExpertDetailDialog
        open={detailDialog.open}
        onOpenChange={(open) => setDetailDialog((s) => ({ ...s, open }))}
        expert={detailDialog.expert}
      />
    </div>
  );
}
