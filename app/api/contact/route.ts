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
  } catch (error) {
    // There was no catch here at all. The `leads` table did not exist in
    // production -- defined in lib/db/schemas, created only by the abandoned
    // drizzle-pg lineage, never by a forward migration -- so every submission
    // threw and Next answered 500 with an EMPTY BODY. The visitor saw a
    // failure with no explanation, the message was lost, and the only trace
    // was a line in the server log that nobody was reading.
    //
    // The table now exists (0008_leads_baseline.sql). This is here so the next
    // failure is legible rather than silent: the reason is logged with the
    // contact details still attached, and the visitor is told plainly that it
    // did not send, instead of being left to guess.
    console.error('[contact] could not record the enquiry', {
      email,
      subject,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error:
          'تعذّر إرسال رسالتك بسبب خطأ فني. يرجى المحاولة مرة أخرى، أو مراسلتنا مباشرةً على info@akarpromax.com',
      },
      { status: 500 },
    );
  } finally {
    await end();
  }
}
