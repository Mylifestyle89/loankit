import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Admin endpoint to change another user's email and/or password */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      userId?: string;
      email?: string;
      newPassword?: string;
      globalCustomerAccess?: boolean;
    };

    if (!body.userId) {
      return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Update email if provided
    if (body.email && body.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        return NextResponse.json({ ok: false, error: "Email already in use" }, { status: 409 });
      }
      await prisma.user.update({ where: { id: body.userId }, data: { email: body.email } });
    }

    // Set password if provided (admin override — no current password needed)
    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
      }
      const { hashPassword } = await import("better-auth/crypto");
      const hashed = await hashPassword(body.newPassword);
      await prisma.account.updateMany({
        where: { userId: body.userId, providerId: "credential" },
        data: { password: hashed },
      });
    }

    if (body.globalCustomerAccess !== undefined) {
      await prisma.user.update({
        where: { id: body.userId },
        data: { globalCustomerAccess: body.globalCustomerAccess },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    console.error("[ADMIN-MANAGE]", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
