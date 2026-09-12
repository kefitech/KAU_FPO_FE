"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingCBBOApprovalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: pending,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["cbbos", "pending"],
    queryFn: () => cbbosApi.getPending(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => cbbosApi.approveRegistration(id),
    onSuccess: () => {
      toast.success("Registration approved");
      queryClient.invalidateQueries({ queryKey: ["cbbos", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["cbbos"] });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => cbbosApi.rejectRegistration(id),
    onSuccess: () => {
      toast.success("Registration rejected");
      queryClient.invalidateQueries({ queryKey: ["cbbos", "pending"] });
    },
    onError: () => toast.error("Failed to reject"),
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <button
        type="button"
        onClick={() => router.push("/admin/cbbos")}
        className="flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to CBBO / NGO Officers
      </button>

      <div>
        <h1 className="font-bold text-2xl">Pending Approvals</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Self-registered CBBO / NGO officers awaiting review</p>
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
            {pending?.map((officer, i) => (
              <div
                key={officer.id}
                className={`flex items-center justify-between p-4 ${i !== pending.length - 1 ? "border-b" : ""}`}
              >
                <div>
                  <p className="font-medium text-sm">
                    {officer.first_name} {officer.last_name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {officer.email} &middot; {officer.phone}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {officer.organisation_name && (
                      <Badge variant="outline" className="text-[10px]">
                        {officer.organisation_name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {officer.scope === "STATE"
                        ? "State-wide"
                        : Array.isArray(officer.scope)
                          ? officer.scope.join(", ")
                          : officer.scope}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(officer.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(officer.id)}
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
