from pathlib import Path
import os, shutil, sys

ROOT = Path.cwd()
BACKUP = Path(os.environ['AUCTIONS_F2_BACKUP'])

FILES = [
    Path('app/api/auctions/[id]/end/route.ts'),
    Path('app/api/auctions/organizers/route.ts'),
    Path('app/api/auctions/[id]/contract/route.ts'),
    Path('app/api/auctions/[id]/route.ts'),
    Path('tests/auctions-hardening-f1.test.mjs'),
]

for rel in FILES:
    src = ROOT / rel
    if not src.exists():
        print(f'FAIL: missing {rel.as_posix()}')
        sys.exit(10)
    dst = BACKUP / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def read(rel):
    p = ROOT / rel
    raw = p.read_bytes()
    nl = '\r\n' if b'\r\n' in raw else '\n'
    return p, raw.decode('utf-8-sig').replace('\r\n', '\n'), nl


def write(p, text, nl):
    if nl == '\r\n':
        text = text.replace('\n', '\r\n')
    p.write_bytes(text.encode('utf-8'))


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        print(f'FAIL: patch anchor not found: {label}')
        sys.exit(11)
    return text.replace(old, new, 1)

# ------------------------------------------------------------------
# 1. END route: only seller of open auction, verified organizer admin
#    of closed auction, or platform super-admin may finalize.
# ------------------------------------------------------------------
rel = Path('app/api/auctions/[id]/end/route.ts')
p, text, nl = read(rel)
text = replace_once(
    text,
    "import { settleAuction } from '@/lib/auctions/settlement';",
    "import { settleAuction } from '@/lib/auctions/settlement';\nimport { getClosedAuctionOrganizer } from '@/lib/auctions/policy';",
    'end policy import',
)
text = replace_once(
    text,
    """      if (!property) throw new Error('PROPERTY_NOT_FOUND');
      if (!property.isAuction) throw new Error('NOT_AUCTION');

      if (['awarded', 'ended_no_bids', 'rejected', 'cancelled'].includes(property.auctionStatus || '')) {""",
    """      if (!property) throw new Error('PROPERTY_NOT_FOUND');
      if (!property.isAuction) throw new Error('NOT_AUCTION');

      const platformAdmin = session.role === 'super_admin' || session.permissions.includes('*');
      let canFinalize = platformAdmin;

      if (!canFinalize && property.auctionType === 'open') {
        canFinalize = property.userId === session.userId;
      }

      if (!canFinalize && property.auctionType === 'fixed' && property.auctionOrganizerOrganizationId) {
        const organizer = await getClosedAuctionOrganizer(
          tx,
          property.auctionOrganizerOrganizationId,
          session.userId,
        );
        canFinalize = Boolean(organizer);
      }

      if (!canFinalize) throw new Error('AUCTION_END_FORBIDDEN');

      if (['awarded', 'ended_no_bids', 'rejected', 'cancelled'].includes(property.auctionStatus || '')) {""",
    'end authorization',
)
text = replace_once(
    text,
    """    if (code === 'NOT_AUCTION') return NextResponse.json({ error: 'هذا العقار ليس مزاداً' }, { status: 400 });
    if (code === 'AUCTION_NOT_ACTIVE')""",
    """    if (code === 'NOT_AUCTION') return NextResponse.json({ error: 'هذا العقار ليس مزاداً' }, { status: 400 });
    if (code === 'AUCTION_END_FORBIDDEN') return NextResponse.json({ error: 'غير مصرح لك بإنهاء هذا المزاد' }, { status: 403 });
    if (code === 'AUCTION_NOT_ACTIVE')""",
    'end forbidden mapping',
)
write(p, text, nl)

# ------------------------------------------------------------------
# 2. Organizer discovery: never advertise unverified organizers.
# ------------------------------------------------------------------
rel = Path('app/api/auctions/organizers/route.ts')
p, text, nl = read(rel)
text = replace_once(
    text,
    "import { organizationMembers, organizations } from '@/lib/db/schema';",
    "import { organizationMembers, organizations } from '@/lib/db/schema';\nimport { getClosedAuctionOrganizer } from '@/lib/auctions/policy';",
    'organizer policy import',
)
text = replace_once(
    text,
    """    return NextResponse.json({ success: true, data: rows }, { headers: { 'Cache-Control': 'private, no-store' } });""",
    """    const eligible = [];
    for (const row of rows) {
      const verified = await getClosedAuctionOrganizer(db, row.id, session.userId);
      if (verified) eligible.push(row);
    }

    return NextResponse.json({ success: true, data: eligible }, { headers: { 'Cache-Control': 'private, no-store' } });""",
    'organizer verification filter',
)
write(p, text, nl)

# ------------------------------------------------------------------
# 3. Contract privacy: organizer access requires current verified
#    owner/admin/manager eligibility, not just any membership.
# ------------------------------------------------------------------
rel = Path('app/api/auctions/[id]/contract/route.ts')
p, text, nl = read(rel)
text = replace_once(text, "import { and, eq } from 'drizzle-orm';", "import { eq } from 'drizzle-orm';", 'contract drizzle import')
text = text.replace("import { organizationMembers } from '@/lib/db/schema';\n", "")
text = replace_once(
    text,
    "import { auctionContracts } from '@/lib/db/schemas/auction-hardening-schema';",
    "import { auctionContracts } from '@/lib/db/schemas/auction-hardening-schema';\nimport { getClosedAuctionOrganizer } from '@/lib/auctions/policy';",
    'contract policy import',
)
text = replace_once(
    text,
    """    if (!allowed && contract.organizerOrganizationId) {
      const [membership] = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, contract.organizerOrganizationId),
            eq(organizationMembers.userId, session.userId),
            eq(organizationMembers.status, 'active'),
          ),
        )
        .limit(1);
      allowed = Boolean(membership);
    }""",
    """    if (!allowed && contract.organizerOrganizationId) {
      allowed = Boolean(
        await getClosedAuctionOrganizer(db, contract.organizerOrganizationId, session.userId),
      );
    }""",
    'contract organizer authorization',
)
write(p, text, nl)

# ------------------------------------------------------------------
# 4. Detail action hints must mirror server authorization.
# ------------------------------------------------------------------
rel = Path('app/api/auctions/[id]/route.ts')
p, text, nl = read(rel)
text = replace_once(
    text,
    "import { getActiveAuctionTerms } from '@/lib/auctions/policy';",
    "import { getActiveAuctionTerms, getClosedAuctionOrganizer } from '@/lib/auctions/policy';",
    'detail policy import',
)
text = replace_once(
    text,
    """    if (property.auctionStatus === 'pending_seller_terms' && !privileged) {
      return NextResponse.json({ error: 'المزاد غير متاح بعد' }, { status: 404 });
    }

    const [offers, bids, bidderTerms, contract] = await Promise.all([""",
    """    if (property.auctionStatus === 'pending_seller_terms' && !privileged) {
      return NextResponse.json({ error: 'المزاد غير متاح بعد' }, { status: 404 });
    }

    let canFinalizeExpiredAuction = false;
    const expiredActive = Boolean(
      session &&
      property.auctionStatus === 'active' &&
      property.auctionEndDate &&
      new Date(property.auctionEndDate).getTime() <= Date.now()
    );

    if (session && expiredActive) {
      canFinalizeExpiredAuction = session.role === 'super_admin' || session.permissions.includes('*');

      if (!canFinalizeExpiredAuction && property.auctionType === 'open') {
        canFinalizeExpiredAuction = property.userId === session.userId;
      }

      if (!canFinalizeExpiredAuction && property.auctionType === 'fixed' && property.auctionOrganizerOrganizationId) {
        canFinalizeExpiredAuction = Boolean(
          await getClosedAuctionOrganizer(db, property.auctionOrganizerOrganizationId, session.userId),
        );
      }
    }

    const [offers, bids, bidderTerms, contract] = await Promise.all([""",
    'detail finalize authorization',
)
text = replace_once(
    text,
    """          canFinalizeExpiredAuction: Boolean(session && property.auctionStatus === 'active' && property.auctionEndDate && new Date(property.auctionEndDate).getTime() <= Date.now()),""",
    """          canFinalizeExpiredAuction,""",
    'detail viewer action',
)
write(p, text, nl)

# ------------------------------------------------------------------
# 5. Keep F1 contract test aligned with the stronger authorization.
# ------------------------------------------------------------------
rel = Path('tests/auctions-hardening-f1.test.mjs')
p, text, nl = read(rel)
text = text.replace("assert.match(src, /organizationMembers/);", "assert.match(src, /getClosedAuctionOrganizer/);")
write(p, text, nl)

print('AUCTIONS F2 SECURITY PATCH: APPLIED')
