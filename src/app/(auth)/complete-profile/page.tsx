"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { completeProfile, isProfileComplete } from "@/actions/business-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INDUSTRIES = [
  "Fashion",
  "Electronics",
  "Home & Garden",
  "Beauty & Health",
  "Food & Beverage",
  "Sports & Outdoors",
  "Other",
];

const REVENUE_RANGES = [
  "$0-500K",
  "$500K-1M",
  "$1M-5M",
  "$5M-10M",
  "$10M+",
];

const PLATFORMS = ["Shopify", "WooCommerce", "Other"];

const PRODUCT_TYPES = [
  "Physical Products",
  "Digital Products",
  "Services",
  "Subscriptions",
  "Wholesale",
  "Dropshipping",
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { data: session, update, status } = useSession();
  const [industry, setIndustry] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if user is authenticated and if profile is already complete
  useEffect(() => {
    const checkProfileStatus = async () => {
      // Wait for session to load
      if (status === "loading") {
        return;
      }

      // Redirect to login if not authenticated
      if (!session?.user) {
        router.push("/login");
        return;
      }

      // Check if profile is already complete
      const profileCheck = await isProfileComplete();
      if (profileCheck.success && profileCheck.data?.isComplete) {
        // Profile already complete - redirect to dashboard
        router.push("/dashboard");
        return;
      }

      setChecking(false);
    };

    checkProfileStatus();
  }, [session, status, router]);

  const toggleProductType = (type: string) => {
    if (productTypes.includes(type)) {
      setProductTypes(productTypes.filter((t) => t !== type));
    } else {
      setProductTypes([...productTypes, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await completeProfile({
        industry,
        revenueRange,
        productTypes,
        platform,
      });

      if (!result.success) {
        setError(result.error || "Failed to complete profile");
        setLoading(false);
        return;
      }

      // Update session to include new businessId
      await update();

      // Redirect to tracking installation page
      router.push("/install-tracking");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Show loading while checking profile status
  if (checking || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Business Profile</CardTitle>
          <CardDescription>
            Help us match you with similar businesses for better insights
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Industry */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Revenue Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Annual Revenue Range</label>
              <select
                value={revenueRange}
                onChange={(e) => setRevenueRange(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select revenue range...</option>
                {REVENUE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Types (Multi-select) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Product Types <span className="text-gray-500">(select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_TYPES.map((type) => (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center space-x-2 rounded-md border p-3 transition-colors ${
                      productTypes.includes(type)
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={productTypes.includes(type)}
                      onChange={() => toggleProductType(type)}
                      disabled={loading}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
              {productTypes.length === 0 && (
                <p className="text-xs text-red-600">Please select at least one product type</p>
              )}
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <label className="text-sm font-medium">E-commerce Platform</label>
              <div className="flex gap-4">
                {PLATFORMS.map((plat) => (
                  <label
                    key={plat}
                    className={`flex flex-1 cursor-pointer items-center justify-center space-x-2 rounded-md border p-3 transition-colors ${
                      platform === plat
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="platform"
                      value={plat}
                      checked={platform === plat}
                      onChange={(e) => setPlatform(e.target.value)}
                      disabled={loading}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium">{plat}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || productTypes.length === 0}
            >
              {loading ? "Saving profile..." : "Continue to tracking setup"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
