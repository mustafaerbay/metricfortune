"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "reminder">(
    token ? "loading" : "reminder"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  const handleVerify = async (verificationToken: string) => {
    try {
      console.log("[VerifyEmail] Starting verification with token:", verificationToken.substring(0, 10) + "...");
      const result = await verifyEmail(verificationToken);
      console.log("[VerifyEmail] Result:", result);

      if (result.success) {
        setStatus("success");
        setMessage("Your email has been verified successfully! Please log in to continue.");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to verify email");
        console.error("[VerifyEmail] Verification failed:", result.error);
      }
    } catch (err) {
      setStatus("error");
      setMessage("An unexpected error occurred");
      console.error("[VerifyEmail] Exception:", err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Verifying your email..."}
            {status === "success" && "Email verified!"}
            {status === "error" && "Verification failed"}
            {status === "reminder" && "Check your email"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]"></div>
            </div>
          )}
          {status === "success" && (
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{message}</div>
          )}

          {status === "reminder" && (
            <div className="space-y-4">
              <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <div>
                    <p className="font-medium">We've sent you a verification email!</p>
                    <p className="mt-1">Please check your inbox and click the verification link to activate your account.</p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-[#4b5563]">
                <p className="font-medium mb-2">What to do next:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Check your email inbox</li>
                  <li>Look for an email from MetricFortune</li>
                  <li>Click the verification link in the email</li>
                  <li>Complete your profile setup</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-[#d1d5db]">
                <p className="text-sm text-[#6b7280]">
                  Didn't receive the email? Check your spam folder or{" "}
                  <Link href="/signup" className="text-[#7c3aed] hover:text-[#6d28d9] font-medium">
                    sign up again
                  </Link>
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              {message && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
                  {message}
                </div>
              )}
              <p className="text-sm text-[#4b5563]">
                Please check your email for the verification link or try signing up again.
              </p>
              <div className="flex gap-4">
                <Link href="/login" className="text-sm text-[#7c3aed] hover:text-[#6d28d9]">
                  Back to login
                </Link>
                <Link href="/signup" className="text-sm text-[#7c3aed] hover:text-[#6d28d9]">
                  Sign up again
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]"></div></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
