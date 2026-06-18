import { AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CbboDashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">CBBO/NGO Portal</h1>
        <p className="text-muted-foreground">Verify FPOs and track progress in your assigned districts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Assigned FPOs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">28</div>
            <p className="text-muted-foreground text-xs">In your jurisdiction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-yellow-600">8</div>
            <p className="text-muted-foreground text-xs">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">18</div>
            <p className="text-muted-foreground text-xs">Successfully verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Requires Revision</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-orange-600">2</div>
            <p className="text-muted-foreground text-xs">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Verification Queue & Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verification Queue</CardTitle>
            <CardDescription>FPOs awaiting your verification</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Thrissur Organic Farmers</p>
                <p className="text-muted-foreground text-xs">Submitted 2 days ago</p>
              </div>
              <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Pending</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Kodungallur FPO</p>
                <p className="text-muted-foreground text-xs">Submitted 3 days ago</p>
              </div>
              <span className="rounded bg-blue-100 px-2 py-1 text-blue-800 text-xs">In Progress</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Irinjalakuda Farmers Collective</p>
                <p className="text-muted-foreground text-xs">Submitted 5 days ago</p>
              </div>
              <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Pending</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
            <CardDescription>This month's verification metrics</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm">Verifications Completed</span>
                <span className="font-medium text-sm">12</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-green-500" style={{ width: "80%" }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm">Average Verification Time</span>
                <span className="font-medium text-sm">2.5 days</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: "70%" }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm">Approval Rate</span>
                <span className="font-medium text-sm">85%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: "85%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
