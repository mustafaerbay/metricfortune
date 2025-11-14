import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function RecommendationNotFound() {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/recommendations">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Recommendations
        </Button>
      </Link>

      {/* Not Found Card */}
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-2 border-[#e9d5ff] bg-[#faf5ff]">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7c3aed]">
                <FileQuestion className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Recommendation Not Found
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              This recommendation doesn&apos;t exist or you don&apos;t have
              permission to view it.
            </p>
            <Link href="/dashboard/recommendations">
              <Button className="w-full">Back to Recommendations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
