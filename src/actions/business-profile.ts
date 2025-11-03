"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customAlphabet } from "nanoid";
import { calculatePeerGroup, recalculatePeerGroupsForIndustry } from "@/services/matching/business-matcher";

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
    console.log("[CompleteProfile Action] Starting with data:", data);

    // Get authenticated user
    const session = await auth();
    console.log("[CompleteProfile Action] Session:", session?.user?.id ? `User ${session.user.id}` : "No session");

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to complete your profile",
      };
    }

    // Validate input
    const validation = completeProfileSchema.safeParse(data);
    if (!validation.success) {
      console.log("[CompleteProfile Action] Validation failed:", validation.error.issues[0].message);
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    console.log("[CompleteProfile Action] Validation passed");

    // Check if user already has a business profile
    const existingBusiness = await prisma.business.findUnique({
      where: { userId: session.user.id },
    });

    console.log("[CompleteProfile Action] Existing business:", existingBusiness ? {
      id: existingBusiness.id,
      name: existingBusiness.name,
      siteId: existingBusiness.siteId,
      industry: existingBusiness.industry,
      hasFields: !!(existingBusiness.industry && existingBusiness.revenueRange)
    } : "Not found");

    if (!existingBusiness) {
      return {
        success: false,
        error: "Business profile not found",
      };
    }

    // Check if profile is already completed (fields are filled)
    if (existingBusiness.industry && existingBusiness.revenueRange &&
        existingBusiness.productTypes.length > 0 && existingBusiness.platform) {
      console.log("[CompleteProfile Action] Profile already completed");
      return {
        success: false,
        error: "Profile already completed",
      };
    }

    console.log("[CompleteProfile Action] Profile not yet completed, proceeding...");

    // Use existing siteId or generate a new one if it doesn't exist
    let siteId = existingBusiness.siteId;

    if (!siteId) {
      // Generate unique siteId only if not already set
      siteId = generateSiteId();
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
    }

    // Update business profile
    console.log("[CompleteProfile Action] Updating business with data:", {
      industry: data.industry,
      revenueRange: data.revenueRange,
      productTypes: data.productTypes,
      platform: data.platform,
      siteId,
    });

    const updatedBusiness = await prisma.business.update({
      where: { userId: session.user.id },
      data: {
        industry: data.industry,
        revenueRange: data.revenueRange,
        productTypes: data.productTypes,
        platform: data.platform,
        siteId,
      },
    });

    console.log("[CompleteProfile Action] Business updated successfully:", {
      id: updatedBusiness.id,
      industry: updatedBusiness.industry,
      siteId: updatedBusiness.siteId,
    });

    // Calculate peer group for the business (Story 1.5 - AC #2)
    console.log("[CompleteProfile Action] Calculating peer group for business:", updatedBusiness.id);
    try {
      const peerGroupResult = await calculatePeerGroup(updatedBusiness.id);
      console.log("[CompleteProfile Action] Peer group calculated:", {
        peerGroupId: peerGroupResult.peerGroupId,
        matchCount: peerGroupResult.matchCount,
        tier: peerGroupResult.matchCriteria.tier,
      });

      // Recalculate peer groups for existing businesses in the same industry
      // This ensures existing peer groups are updated to include the new business
      console.log("[CompleteProfile Action] Triggering peer group recalculation for industry:", updatedBusiness.industry);
      recalculatePeerGroupsForIndustry(updatedBusiness.industry, updatedBusiness.id).catch((recalcError) => {
        // Log error but don't fail - recalculation is a background optimization
        console.error("[CompleteProfile Action] Peer group recalculation failed (non-critical):", recalcError);
      });
    } catch (peerGroupError) {
      // Log error but don't fail the profile completion
      // Peer group can be calculated later via backfill script if needed
      console.error("[CompleteProfile Action] Peer group calculation failed (non-critical):", peerGroupError);
    }

    return {
      success: true,
      data: { siteId },
    };
  } catch (error) {
    console.error("[CompleteProfile Action] Error:", error);
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
