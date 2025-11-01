import { auth } from "@/lib/auth";
import { getBusinessProfile } from "@/actions/business-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const profileResult = await getBusinessProfile();
  const siteId = profileResult.success ? profileResult.data?.siteId : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
        <p className="mt-2 text-gray-600">Here is what is happening with your business analytics</p>
      </div>

      <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Install tracking script to begin</CardTitle>
          <CardDescription className="text-blue-700">
            Once you install the tracking script, you will start seeing insights here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-white p-4">
            <p className="text-sm font-medium text-gray-900">Your Site ID:</p>
            <p className="mt-1 font-mono text-lg font-bold text-blue-600">{siteId || "Loading..."}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/install-tracking" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              View installation instructions
            </Link>
            <Link href="/dashboard/settings" className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Manage business profile
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Sessions</CardDescription>
            <CardTitle className="text-4xl text-gray-300">---</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Waiting for data...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-4xl text-gray-300">---%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Waiting for data...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg. Session Duration</CardDescription>
            <CardTitle className="text-4xl text-gray-300">--:--</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Waiting for data...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
