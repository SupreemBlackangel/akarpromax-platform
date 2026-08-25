import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leads } from '@/lib/db/schemas/leads-schema';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, email, phone, subject, message, category } = body;

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: 'الاسم، البريد الإلكتروني، الموضوع والرسالة مطلوبة' },
      { status: 400 },
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'البريد الإلكتروني غير صحيح' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const [lead] = await db
      .insert(leads)
      .values({
        source: 'website_contact',
        type: category || 'contact',
        status: 'new',
        subject,
        description: message,
        contactName: name,
        contactEmail: email,
        contactPhone: phone || null,
        userId: session?.userId ?? null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'تم إرسال رسالتك بنجاح، سنتواصل معك قريباً',
    });
  } finally {
    await end();
  }
}
