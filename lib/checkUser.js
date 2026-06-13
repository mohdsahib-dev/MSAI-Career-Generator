import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async (userIdFromAuth) => {
  let user = null;

  try {
    user = await currentUser();
  } catch (err) {
    console.log("currentUser error:", err?.message || err);
    user = null;
  }

  // fallback if middleware issue
  if (!user && userIdFromAuth) {
    try {
      user = await clerkClient.users.getUser(userIdFromAuth);
    } catch (err) {
      console.log("clerkClient fetch error:", err?.message || err);
      return null;
    }
  }

  if (!user) return null;

  const email =
    user.emailAddresses?.[0]?.emailAddress ||
    user.primaryEmailAddress?.emailAddress ||
    null;

  if (!email) {
    console.log("No email found for user:", user.id);
    return null;
  }

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  try {
    // 🔥 BEST FIX: UPSERT (no duplicate error)
    const dbUser = await db.user.upsert({
      where: {
        email: email,
      },
      update: {
        clerkUserId: user.id,
        name: name || null,
        imageUrl: user.imageUrl || null,
      },
      create: {
        clerkUserId: user.id,
        email: email,
        name: name || null,
        imageUrl: user.imageUrl || null,
      },
    });

    return dbUser;
  } catch (error) {
    console.log("checkUser DB error:", error?.message || error);
    return null;
  }
};