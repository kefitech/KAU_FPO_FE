import { BarChart3, Building2, FileText, MapPin } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GovernmentDashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Government Portal</h1>
        <p className="text-muted-foreground">Monitor FPO activities and scheme utilization across Kerala</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Registered FPOs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">156</div>
            <p className="text-muted-foreground text-xs">Across 14 districts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Scheme Linkages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">89</div>
            <p className="text-muted-foreground text-xs">Active beneficiaries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Compliance Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">92%</div>
            <p className="text-muted-foreground text-xs">State average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Districts Covered</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">14</div>
            <p className="text-muted-foreground text-xs">All Kerala districts</p>
          </CardContent>
        </Card>
      </div>

      {/* District Overview & Scheme Utilization */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>District-wise FPO Distribution</CardTitle>
            <CardDescription>FPO count by district</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Thrissur</span>
              <span className="font-medium text-sm">24 FPOs</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Palakkad</span>
              <span className="font-medium text-sm">21 FPOs</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Wayanad</span>
              <span className="font-medium text-sm">18 FPOs</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Ernakulam</span>
              <span className="font-medium text-sm">15 FPOs</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheme Utilization</CardTitle>
            <CardDescription>Top government schemes</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-sm">PM-FME Scheme</span>
                <span className="text-muted-foreground text-xs">45 beneficiaries</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: "75%" }} />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-sm">NABARD Support</span>
                <span className="text-muted-foreground text-xs">32 beneficiaries</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: "60%" }} />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-sm">State Subsidy</span>
                <span className="text-muted-foreground text-xs">28 beneficiaries</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: "45%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
