import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        emailVerified: true,
        passwordHash: true,
      },
    });

    // If user doesn't exist, return false (don't reveal user existence)
    if (!user) {
      return NextResponse.json({ isUnverified: false });
    }

    // If password is provided, verify it matches before revealing verification status
    if (password) {
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        // Wrong password - don't reveal verification status
        return NextResponse.json({ isUnverified: false });
      }
    }

    // User exists and password is correct (or not checked)
    // Return true if email is NOT verified
    return NextResponse.json({
      isUnverified: !user.emailVerified
    });

  } catch (error) {
    console.error("[CheckVerification] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
