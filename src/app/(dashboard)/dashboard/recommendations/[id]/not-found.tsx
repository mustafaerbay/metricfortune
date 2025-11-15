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
      <Card className="border-2 border-[#e9d5ff]">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-[#faf5ff] p-3">
              <FileQuestion className="h-8 w-8 text-[#7c3aed]" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#1f2937]">
              Recommendation Not Found
            </h2>
            <p className="mb-6 max-w-md text-[#6b7280]">
              The recommendation you're looking for doesn't exist or you don't
              have permission to view it.
            </p>
            <Link href="/dashboard/recommendations">
              <Button>Back to Recommendations</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
