import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import type { SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?\d{7,15}$/, "invalid phone").optional(),
    password: z.string().min(8, "password must be at least 8 characters"),
    name: z.string().optional(),
    fullName: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "email or phone is required",
  });

type RegisterBody = {
  email?: string;
  phone?: string;
  password?: string;
  name?: string;
  fullName?: string;
};

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = clean(body.email, 255).toLowerCase();
  const phone = clean(body.phone, 20);
  const password = typeof body.password === "string" ? body.password : "";
  const name = clean(body.name ?? body.fullName, 190);

  const parsed = registerSchema.safeParse({ email: email || undefined, phone: phone || undefined, password, name: name || undefined, fullName: name || undefined });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const conditions: SQL[] = [];
  if (email) conditions.push(eq(users.email, email));
  if (phone) conditions.push(eq(users.phone, phone));

type CreatedUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
};

  const { db, end } = getDb();
  let existing: { id: string }[] = [];
  let created: CreatedUser | undefined;
  try {
    if (conditions.length) {
      existing = await db
        .select({ id: users.id })
        .from(users)
        .where(or(...conditions))
        .limit(1);
    }

    if (existing[0]) {
      return NextResponse.json({ error: "already_registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const [inserted] = await db
      .insert(users)
      .values({
        email: email || null,
        phone: phone || null,
        name: name || null,
        passwordHash,
        role: "user",
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        phone: users.phone,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    created = inserted;
  } finally {
    await end();
  }

  if (!created) {
    return NextResponse.json({ error: "registration_failed" }, { status: 500 });
  }

  await createSession({ userId: created.id, role: created.role, permissions: [] });

  return NextResponse.json(
    {
      user: {
        id: created.id,
        email: created.email,
        phone: created.phone,
        name: created.name,
        role: mapSessionRole(created.role),
        isActive: created.isActive,
        createdAt: created.createdAt,
        permissions: permissionsForSessionRole(created.role),
      },
    },
    { status: 201 },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS" },
  });
}
