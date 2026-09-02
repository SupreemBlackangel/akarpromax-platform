# Business rules that live in the database, not the code

Extracted verbatim from `AkarApp_LIVE/AkarDB.sqlite` on 2026-09-02.

These five triggers enforce three business rules. **No C# file states them.** A
port that recreates the schema from the EF model, or that writes a new Domain
layer from the services alone, will drop all three silently — the application
will simply start accepting data it has always refused.

Each rule below records what the trigger actually does, not what its name
suggests. The difference matters in every case.

---

## Rule 1 — Ownership shares may not exceed 100%

`trg_ownership_100pct_insert`, `trg_ownership_100pct_update` on `Ownerships`.

```sql
WHEN NEW.OwnershipType = 'owner'
  ... SUM(Percentage) WHERE PropertyId = NEW.PropertyId AND OwnershipType = 'owner'
      + NEW.Percentage > 100.001
  THEN RAISE(ABORT, 'مجموع نسب الملكية يتجاوز 100% لهذا العقار')
```

Three details that a restatement gets wrong:

1. **It is a ceiling, not an equality.** Shares may total *less* than 100%. A
   property with one owner at 40% is legal. Only exceeding 100% aborts. Any new
   implementation that requires shares to *equal* 100% would reject data the
   current system accepts — a behaviour change, not a fix.
2. **It applies only to `OwnershipType = 'owner'`.** Every other ownership type
   is unconstrained and does not count toward the total.
3. **The tolerance is `100.001`, not `100`.** A floating-point epsilon, so three
   shares of 33.333… do not fail. Reimplementing with `> 100` would break exact
   thirds.

The update trigger fires only `BEFORE UPDATE OF Percentage` and excludes the row
being updated (`Id != NEW.Id`), so editing a share compares against its
siblings, not against itself.

---

## Rule 2 — A lead accepts at most two active claims

`trg_max_2_lead_claims` on `LeadClaims`.

```sql
BEFORE INSERT ON LeadClaims WHEN NEW.Status = 'active'
  ... COUNT(*) WHERE LeadId = NEW.LeadId AND Status = 'active' >= 2
  THEN RAISE(ABORT, 'لا يمكن إضافة أكثر من مطالبتين نشطتين على نفس العميل المحتمل')
```

- Only **active** claims count. Withdrawn or closed claims do not occupy a slot,
  so a lead can accumulate any number of historical claims.
- The check runs **only on INSERT**.

> **This is a gap in the original, not a feature.** Nothing guards `UPDATE`. An
> existing claim can be flipped from any other status to `'active'` and the
> limit is bypassed entirely. The new implementation should enforce the rule on
> both paths — but that is a **behaviour change** and per §59 it needs to be
> recorded and agreed before it ships, not slipped in as a port detail. It is
> recorded here.

---

## Rule 3 — The client timeline is immutable

`trg_prevent_timeline_update`, `trg_prevent_timeline_delete` on `ClientTimeline`.

```sql
BEFORE UPDATE ON ClientTimeline → RAISE(ABORT, 'ClientTimeline entries are immutable and cannot be updated')
BEFORE DELETE ON ClientTimeline → RAISE(ABORT, 'ClientTimeline entries are immutable and cannot be deleted')
```

Unconditional and absolute. The timeline is append-only: a correction is a new
entry, never an edit. This is an audit guarantee — whoever added it wanted the
client history to be evidence — and it is the rule most likely to be lost,
because an ORM-generated data layer will happily expose `Update` and `Delete`
on the entity and nothing will look wrong until someone uses them.

---

## Consequences for the migration

- **The new Domain layer must state all three explicitly.** They belong in
  domain code where they can be unit-tested (§44), not only in the database.
- **Keep the triggers as well.** Defence in depth: the database is the last line
  and it has held so far. Removing them because "the domain enforces it now"
  trades a guarantee for a convention.
- **Rule 1's ceiling semantics, `'owner'` scope and `100.001` tolerance are
  behaviour to preserve**, not details to tidy.
- **Rule 2's missing UPDATE guard is a defect to fix deliberately**, with the
  change recorded, tested, and agreed.
- Error messages are Arabic and user-facing. They need to become localized
  resource keys (§22), not hardcoded strings, in all three languages.

## Not yet established

Whether any further rules live in the **XAML** — validation rules, triggers or
converter bindings — cannot be determined: the XAML is lost and the views exist
only as compiled BAML. The four readable `Converters/` are display formatting.
Anything else has to be found by running the original application.
