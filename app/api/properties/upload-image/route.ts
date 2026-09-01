import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { storePropertyImage, MAX_PROPERTY_IMAGE_BYTES } from '@/lib/properties/image-processing';

export const dynamic = 'force-dynamic';

/**
 * Authenticated property-image upload for the web forms. The file goes through
 * the unified pipeline (validation → WebP ≤1600px → PROPERTY_UPLOAD_DIR) and
 * the public /uploads/properties/... URL comes back.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'غير مصرح، يرجى تسجيل الدخول' }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'أرفق ملف صورة' }, { status: 400 });
  }
  if (file.size > MAX_PROPERTY_IMAGE_BYTES) {
    return NextResponse.json({ success: false, error: 'الصورة أكبر من 8MB' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await storePropertyImage(buffer);
  if (!url) {
    return NextResponse.json({ success: false, error: 'صيغة الصورة غير مدعومة (JPG أو PNG أو WebP)' }, { status: 400 });
  }

  return NextResponse.json({ success: true, url });
}
