"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { checkUser } from "@/lib/checkUser";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

/**
 * Update user onboarding + profile data
 */
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Ensure user exists in DB
  const user = await checkUser(userId);
  if (!user) throw new Error("User sync failed");

  try {
    const result = await db.$transaction(
      async (tx) => {
        // 1. Get or create industry insights
        let industryInsight = await tx.industryInsights.findUnique({
          where: {
            industry: data.industry,
          },
        });

        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await tx.industryInsights.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // 2. Update user profile
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return {
          updatedUser,
          industryInsight,
        };
      },
      {
        timeout: 10000,
      }
    );

    revalidatePath("/dashboard");

    return result;
  } catch (error) {
    console.error("updateUser error:", error?.message || error);
    throw new Error("Failed to update profile");
  }
}

/**
 * Check onboarding status
 */
export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Ensure DB user exists
  const user = await checkUser(userId);
  if (!user) {
    return {
      isOnboarded: false,
    };
  }

  try {
    return {
      isOnboarded: !!user.industry,
    };
  } catch (error) {
    console.error("onboarding status error:", error?.message || error);
    throw new Error("Failed to check onboarding status");
  }
}