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

  const trackingSnippet = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://metricfortune.com/tracking.js';
    script.setAttribute('data-site-id', '${siteId}');
    script.async = true;
    document.head.appendChild(script);
  })();
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
            <label className="text-sm font-medium">Tracking Script</label>
            <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-white">
              <code>{trackingSnippet}</code>
            </pre>
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
