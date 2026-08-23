"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { adminMlModelsApi } from "@/app/admin/_api/ml-models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MlModelsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: models, isLoading } = useQuery({
    queryKey: ["ml-models"],
    queryFn: adminMlModelsApi.getAll,
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => adminMlModelsApi.activate(id),
    onSuccess: (result) => {
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Model version activated");
      }
      queryClient.invalidateQueries({ queryKey: ["ml-models"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Failed to activate model version");
    },
  });

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

      {isLoading ? (
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Version</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Deployed</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {models?.length ? (
                models.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.version_code}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{m.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.deployed_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          m.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {m.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!m.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={activateMutation.isPending}
                          onClick={() => activateMutation.mutate(m.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No model versions registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}