"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isProfileComplete } from "@/actions/business-profile";

export default function AuthRedirectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleRedirect = async () => {
      // Wait for session to load
      if (status === "loading") {
        return;
      }

      // Not authenticated - redirect to login
      if (!session?.user) {
        router.push("/login");
        return;
      }

      // Check profile completion status
      const profileCheck = await isProfileComplete();
      console.log("[AuthRedirect] Profile check:", profileCheck);

      if (profileCheck.success && !profileCheck.data?.isComplete) {
        // Profile not complete - redirect to complete-profile
        console.log("[AuthRedirect] Redirecting to complete-profile");
        router.push("/complete-profile");
      } else {
        // Profile complete - redirect to dashboard
        console.log("[AuthRedirect] Redirecting to dashboard");
        router.push("/dashboard");
      }
    };

    handleRedirect();
  }, [session, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed] mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
