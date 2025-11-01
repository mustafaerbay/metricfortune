"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customAlphabet } from "nanoid";

// Create custom nanoid generator for siteId (alphanumeric, 12 characters)
const generateSiteId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
);

// Type definitions
export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Validation schemas
const completeProfileSchema = z.object({
  industry: z.string().min(1, "Industry is required"),
  revenueRange: z.string().min(1, "Revenue range is required"),
  productTypes: z.array(z.string()).min(1, "At least one product type is required"),
  platform: z.string().min(1, "Platform is required"),
});

const updateProfileSchema = z.object({
  name: z.string().min(1, "Business name is required").optional(),
  industry: z.string().min(1, "Industry is required").optional(),
  revenueRange: z.string().min(1, "Revenue range is required").optional(),
  productTypes: z.array(z.string()).min(1, "At least one product type is required").optional(),
  platform: z.string().min(1, "Platform is required").optional(),
});

/**
 * Complete user's business profile after signup
 */
export async function completeProfile(data: {
  industry: string;
  revenueRange: string;
  productTypes: string[];
  platform: string;
}): Promise<ActionResult<{ siteId: string }>> {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to complete your profile",
      };
    }

    // Validate input
    const validation = completeProfileSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    // Check if user already has a business profile with siteId
    const existingBusiness = await prisma.business.findUnique({
      where: { userId: session.user.id },
    });

    if (existingBusiness && existingBusiness.siteId) {
      return {
        success: false,
        error: "Profile already completed",
      };
    }

    // Generate unique siteId
    let siteId = generateSiteId();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure siteId is unique (retry up to maxAttempts times)
    while (attempts < maxAttempts) {
      const existing = await prisma.business.findUnique({
        where: { siteId },
      });

      if (!existing) {
        break;
      }

      siteId = generateSiteId();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return {
        success: false,
        error: "Failed to generate unique site ID. Please try again.",
      };
    }

    // Update business profile
    await prisma.business.update({
      where: { userId: session.user.id },
      data: {
        industry: data.industry,
        revenueRange: data.revenueRange,
        productTypes: data.productTypes,
        platform: data.platform,
        siteId,
      },
    });

    return {
      success: true,
      data: { siteId },
    };
  } catch (error) {
    console.error("Complete profile error:", error);
    return {
      success: false,
      error: "An error occurred while completing your profile. Please try again.",
    };
  }
}

/**
 * Update user's business profile
 */
export async function updateBusinessProfile(data: {
  name?: string;
  industry?: string;
  revenueRange?: string;
  productTypes?: string[];
  platform?: string;
}): Promise<ActionResult<void>> {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to update your profile",
      };
    }

    // Validate input
    const validation = updateProfileSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    // Check if user has a business profile
    const business = await prisma.business.findUnique({
      where: { userId: session.user.id },
    });

    if (!business) {
      return {
        success: false,
        error: "Business profile not found",
      };
    }

    // Update business profile with only provided fields
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.revenueRange !== undefined) updateData.revenueRange = data.revenueRange;
    if (data.productTypes !== undefined) updateData.productTypes = data.productTypes;
    if (data.platform !== undefined) updateData.platform = data.platform;

    await prisma.business.update({
      where: { userId: session.user.id },
      data: updateData,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Update business profile error:", error);
    return {
      success: false,
      error: "An error occurred while updating your profile. Please try again.",
    };
  }
}

/**
 * Regenerate user's siteId (WARNING: breaks existing tracking)
 */
export async function regenerateSiteId(): Promise<ActionResult<{ siteId: string }>> {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to regenerate your site ID",
      };
    }

    // Check if user has a business profile
    const business = await prisma.business.findUnique({
      where: { userId: session.user.id },
    });

    if (!business) {
      return {
        success: false,
        error: "Business profile not found",
      };
    }

    // Generate unique siteId
    let siteId = generateSiteId();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await prisma.business.findUnique({
        where: { siteId },
      });

      if (!existing) {
        break;
      }

      siteId = generateSiteId();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return {
        success: false,
        error: "Failed to generate unique site ID. Please try again.",
      };
    }

    // Update siteId
    await prisma.business.update({
      where: { userId: session.user.id },
      data: { siteId },
    });

    return {
      success: true,
      data: { siteId },
    };
  } catch (error) {
    console.error("Regenerate siteId error:", error);
    return {
      success: false,
      error: "An error occurred while regenerating your site ID. Please try again.",
    };
  }
}

/**
 * Get current user's business profile
 */
/**
 * Check if user's business profile is complete
 */
export async function isProfileComplete(): Promise<ActionResult<{ isComplete: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in",
      };
    }

    const business = await prisma.business.findUnique({
      where: { userId: session.user.id },
    });

    if (!business) {
      return {
        success: true,
        data: { isComplete: false },
      };
    }

    // Profile is complete if all required fields are filled (not empty strings)
    const isComplete = !!(
      business.industry &&
      business.revenueRange &&
      business.productTypes.length > 0 &&
      business.platform
    );

    return {
      success: true,
      data: { isComplete },
    };
  } catch (error) {
    console.error("Check profile complete error:", error);
    return {
      success: false,
      error: "An error occurred",
    };
  }
}

export async function getBusinessProfile(): Promise<
  ActionResult<{
    id: string;
    name: string;
    industry: string;
    revenueRange: string;
    productTypes: string[];
    platform: string;
    siteId: string;
  }>
> {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to view your profile",
      };
    }

    // Get business profile
    const business = await prisma.business.findUnique({
      where: { userId: session.user.id },
    });

    if (!business) {
      return {
        success: false,
        error: "Business profile not found",
      };
    }

    return {
      success: true,
      data: {
        id: business.id,
        name: business.name,
        industry: business.industry,
        revenueRange: business.revenueRange,
        productTypes: business.productTypes,
        platform: business.platform,
        siteId: business.siteId,
      },
    };
  } catch (error) {
    console.error("Get business profile error:", error);
    return {
      success: false,
      error: "An error occurred while fetching your profile. Please try again.",
    };
  }
}
