"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBusinessProfile } from "@/actions/business-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function InstallTrackingPage() {
  const router = useRouter();
  const [siteId, setSiteId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const result = await getBusinessProfile();
    if (result.success && result.data) {
      setSiteId(result.data.siteId);
    }
    setLoading(false);
  };

  const trackingSnippet = `<!-- MetricFortune Tracking Script -->
<script src="https://metricfortune.vercel.app/tracking.js" data-site-id="${siteId}"></script>`;

  const manualSnippet = `<!-- MetricFortune Tracking Script (Manual) -->
<script src="https://metricfortune.vercel.app/tracking.js"></script>
<script>
  MetricFortune.init({ siteId: '${siteId}' });
</script>`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Install Tracking Script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Your Site ID</p>
            <p className="mt-1 font-mono text-lg font-bold text-blue-600">{siteId}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Installation Instructions</label>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Copy the tracking script below</li>
              <li>Paste it in your website's HTML before the closing <code>&lt;/head&gt;</code> tag</li>
              <li>Deploy your website</li>
              <li>Visit your website to start tracking events</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tracking Script (Recommended)</label>
            <p className="text-xs text-gray-500">Simple one-line installation with auto-initialization</p>
            <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-white">
              <code>{trackingSnippet}</code>
            </pre>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(trackingSnippet);
              }}
            >
              Copy to Clipboard
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Alternative: Manual Initialization</label>
            <p className="text-xs text-gray-500">Use this method if you need more control over initialization timing</p>
            <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-white">
              <code>{manualSnippet}</code>
            </pre>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(manualSnippet);
              }}
            >
              Copy Manual Version
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push("/dashboard")}>
            Continue to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
