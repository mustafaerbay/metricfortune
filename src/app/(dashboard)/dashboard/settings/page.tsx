"use client";

import { useState, useEffect } from "react";
import { getBusinessProfile, updateBusinessProfile } from "@/actions/business-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INDUSTRIES = ["Fashion", "Electronics", "Home & Garden", "Beauty & Health", "Food & Beverage", "Sports & Outdoors", "Other"];
const REVENUE_RANGES = ["$0-500K", "$500K-1M", "$1M-5M", "$5M-10M", "$10M+"];
const PLATFORMS = ["Shopify", "WooCommerce", "Other"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [platform, setPlatform] = useState("");
  const [siteId, setSiteId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const result = await getBusinessProfile();
    if (result.success && result.data) {
      setName(result.data.name);
      setIndustry(result.data.industry);
      setRevenueRange(result.data.revenueRange);
      setPlatform(result.data.platform);
      setSiteId(result.data.siteId);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const result = await updateBusinessProfile({ name, industry, revenueRange, platform });
    if (result.success) {
      setMessage("Profile updated successfully!");
    } else {
      setMessage(result.error || "Failed to update profile");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your business profile</p>
      </div>

      {message && (
        <div className="rounded-md p-3 text-sm bg-green-50 text-green-800">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2">
              {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Revenue Range</label>
            <select value={revenueRange} onChange={(e) => setRevenueRange(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2">
              {REVENUE_RANGES.map(range => <option key={range} value={range}>{range}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2">
              {PLATFORMS.map(plat => <option key={plat} value={plat}>{plat}</option>)}
            </select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-gray-100 p-4">
            <div>
              <p className="text-sm text-gray-600">Current Site ID</p>
              <p className="font-mono text-lg font-bold">{siteId}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(siteId)}>
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
