"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

import { governmentApi } from "@/app/admin/_api/government";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PendingGovernmentApprovalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: pending, isLoading, isError } = useQuery({
    queryKey: ["government", "pending"],
    queryFn: () => governmentApi.getPending(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => governmentApi.approveRegistration(id),
    onSuccess: () => {
      toast.success("Registration approved");
      queryClient.invalidateQueries({ queryKey: ["government", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["government"] });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => governmentApi.rejectRegistration(id),
    onSuccess: () => {
      toast.success("Registration rejected");
      queryClient.invalidateQueries({ queryKey: ["government", "pending"] });
    },
    onError: () => toast.error("Failed to reject"),
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <button
        type="button"
        onClick={() => router.push("/admin/government")}
        className="flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Government Officials
      </button>

      <div>
        <h1 className="font-bold text-2xl">Pending Approvals</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Self-registered government officials awaiting review
        </p>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">Loading...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Couldn&apos;t load pending registrations.
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            {(pending?.length ?? 0) === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">No pending registrations.</p>
            )}
            {pending?.map((official, i) => (
              <div
                key={official.id}
                className={`flex items-center justify-between p-4 ${i !== pending.length - 1 ? "border-b" : ""}`}
              >
                <div>
                  <p className="font-medium text-sm">
                    {official.first_name} {official.last_name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {official.email} &middot; {official.designation} &middot; {official.department}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{official.user_category}</Badge>
                    <Badge variant="outline" className="text-[10px]">{official.id_number}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {official.jurisdiction_type === "state"
                        ? "State-wide"
                        : official.assigned_district_display ?? official.assigned_district}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(official.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(official.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
