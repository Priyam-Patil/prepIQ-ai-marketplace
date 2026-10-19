
"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/data";

export async function completeOnboarding(data) {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized. Please sign in.",
      };
    }

    const { role, title, company, yearsExp, bio, categories } = data;
    const categoryValues = CATEGORIES.map((category) => category.value).filter(Boolean);

    if (!["INTERVIEWEE", "INTERVIEWER"].includes(role)) {
      return {
        success: false,
        error: "Invalid role selected.",
      };
    }

    if (role === "INTERVIEWER") {
      if (
        !title?.trim() ||
        title.trim().length > 100 ||
        !company?.trim() ||
        company.trim().length > 100 ||
        !Number.isInteger(Number(yearsExp)) ||
        Number(yearsExp) < 1 ||
        Number(yearsExp) > 60 ||
        !bio?.trim() ||
        bio.trim().length > 300 ||
        !Array.isArray(categories) ||
        categories.length === 0 ||
        categories.length > categoryValues.length ||
        categories.some((category) => !categoryValues.includes(category)) ||
        new Set(categories).size !== categories.length
      ) {
        return {
          success: false,
          error: "Please complete all required profile fields.",
        };
      }
    }

    const existingUser = await db.user.findUnique({
      where: { clerkUserId: user.id },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return {
        success: false,
        error: "User not found. Please try again.",
      };
    }

    if (existingUser.role !== "UNASSIGNED") {
      return {
        success: false,
        error: "Your role has already been selected.",
      };
    }

    await db.user.update({
      where: { clerkUserId: user.id },
      data: {
        role,
        ...(role === "INTERVIEWER" && {
          title: title.trim(),
          company: company.trim(),
          yearsExp: Number(yearsExp),
          bio: bio.trim(),
          categories,
        }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Onboarding error:", error);

    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
