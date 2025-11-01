"use server";

import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { signIn as nextAuthSignIn } from "@/lib/auth";
import { Resend } from "resend";
import { VerifyEmailTemplate } from "@/emails/verify-email";

const resend = new Resend(process.env.RESEND_API_KEY);

// Type definitions
export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one symbol"),
  businessName: z.string().min(1, "Business name is required"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

/**
 * Sign up a new user with email, password, and business name
 */
export async function signUp(
  email: string,
  password: string,
  businessName: string
): Promise<ActionResult<{ userId: string }>> {
  try {
    // Validate input
    const validation = signUpSchema.safeParse({ email, password, businessName });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Hash password (10 rounds minimum per security requirements)
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token (cryptographically secure)
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    // Generate unique siteId (alphanumeric, URL-safe)
    const siteId = `site_${nanoid(16)}`;

    // Create user with business placeholder
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerificationToken,
        emailVerified: false,
        business: {
          create: {
            name: businessName,
            // Placeholder values - will be filled in during profile completion
            industry: "",
            revenueRange: "",
            productTypes: [],
            platform: "",
            siteId: siteId,
          },
        },
      },
    });

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${emailVerificationToken}`;

    // In development, log the verification URL instead of sending email
    if (process.env.NODE_ENV === "development") {
      console.log("🔐 Email Verification URL:", verificationUrl);
    } else {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: email,
          subject: "Verify your email address",
          react: VerifyEmailTemplate({ verificationUrl }),
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail the signup if email fails - user can request new verification email
      }
    }

    return {
      success: true,
      data: { userId: user.id },
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error: "An error occurred during sign up. Please try again.",
    };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(
  email: string,
  password: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    // Validate input
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    // Attempt to sign in using NextAuth
    const result = await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      error: "An error occurred during sign in. Please try again.",
    };
  }
}

/**
 * Verify user's email address using verification token
 */
export async function verifyEmail(
  token: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    console.log("[VerifyEmail Action] Starting verification for token:", token.substring(0, 10) + "...");

    // Validate input
    const validation = verifyEmailSchema.safeParse({ token });
    if (!validation.success) {
      console.log("[VerifyEmail Action] Validation failed:", validation.error.issues[0].message);
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    // Find user with matching token
    console.log("[VerifyEmail Action] Searching for user with token...");
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      console.log("[VerifyEmail Action] No user found with this token");
      return {
        success: false,
        error: "Invalid or expired verification token. The token may have already been used or is incorrect.",
      };
    }

    console.log("[VerifyEmail Action] User found:", user.email, "Already verified:", user.emailVerified);

    // Check if already verified
    if (user.emailVerified) {
      console.log("[VerifyEmail Action] Email already verified");
      return {
        success: true,
        data: { success: true },
      };
    }

    // Mark user as verified and clear token
    console.log("[VerifyEmail Action] Updating user verification status...");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    console.log("[VerifyEmail Action] Verification successful for:", user.email);
    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error("[VerifyEmail Action] Error:", error);
    return {
      success: false,
      error: "An error occurred during email verification. Please try again.",
    };
  }
}

/**
 * Resend verification email to user
 */
export async function resendVerificationEmail(
  email: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        data: { success: true },
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        error: "Email is already verified",
      };
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken },
    });

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${emailVerificationToken}`;

    if (process.env.NODE_ENV === "development") {
      console.log("🔐 Email Verification URL:", verificationUrl);
    } else {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: email,
          subject: "Verify your email address",
          react: VerifyEmailTemplate({ verificationUrl }),
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        return {
          success: false,
          error: "Failed to send verification email. Please try again.",
        };
      }
    }

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error("Resend verification email error:", error);
    return {
      success: false,
      error: "An error occurred. Please try again.",
    };
  }
}
