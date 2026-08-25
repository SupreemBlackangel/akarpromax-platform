/**
 * Coordinate row accounting.
 *
 * A parcel that quietly loses a corner is the most dangerous output this
 * engine can produce: it is geometrically valid, it renders cleanly, and
 * nothing about it looks wrong. If a table detector sees six rows and the
 * extractor validates five, the result must say so — not report five points
 * and call itself a success.
 *
 * Every detected row therefore ends in exactly one of two places: the accepted
 * set, or the rejection list with a stated reason. No row may disappear.
 */

export type RowRejectionReason =
  /** The row carried no usable coordinate pair. */
  | "MISSING_COORDINATE_PAIR"
  /** A value was NaN, Infinity, or otherwise not a finite number. */
  | "NON_FINITE_VALUE"
  /** A value fell outside the range its column role permits. */
  | "OUT_OF_RANGE"
  /** The same corner had already been read from an earlier row. */
  | "DUPLICATE_OF_EARLIER_ROW"
  /** No coordinate reference system was established, so no conversion was possible. */
  | "CRS_UNRESOLVED"
  /** Conversion to WGS84 failed for this row. */
  | "CONVERSION_FAILED"
  /** The converted point contradicted the rest of the parcel or its document evidence. */
  | "FAILED_SANITY_CHECK"
  /** OCR produced two irreconcilable readings for this row. */
  | "OCR_CONFLICT";

export interface RejectedRow {
  /** Zero-based position within the detected table. */
  rowIndex: number;
  /** Corner label, when the row got far enough to have one. */
  pointId?: string;
  reason: RowRejectionReason;
  /** Free text: which value, which range, which two readings conflicted. */
  detail?: string;
  /** The row exactly as it appeared, kept so a reviewer can see the source. */
  raw?: string;
}

export interface RowAccount {
  /** Rows the table detector believes the table contains. */
  detectedRows: number;
  /** Rows that yielded a syntactically complete coordinate pair. */
  parsedRows: number;
  /** Rows that survived validation and contribute a boundary point. */
  acceptedRows: number;
  /** detectedRows - acceptedRows. Always equals rejections.length. */
  rejectedRows: number;
  rejections: RejectedRow[];
  /** True when any detected row failed to reach the accepted set. */
  reviewRequired: boolean;
  summary: string;
  summaryAr: string;
}

export interface RowAccountInput {
  detectedRows: number;
  parsedRows: number;
  acceptedRows: number;
  rejections: readonly RejectedRow[];
}

/**
 * Builds the account and, importantly, reconciles it.
 *
 * If the counts do not add up — a row vanished without a recorded reason —
 * that discrepancy is itself recorded as an unexplained rejection rather than
 * rounded away. An accounting module that can silently lose a row is worse
 * than none, because it looks authoritative.
 */
export function buildRowAccount(input: RowAccountInput): RowAccount {
  // Math.max(0, NaN) is NaN, so a non-finite count must be rejected first.
  const detectedRows = Number.isFinite(input.detectedRows)
    ? Math.max(0, Math.trunc(input.detectedRows))
    : 0;
  const parsedRows = clamp(input.parsedRows, 0, detectedRows);
  const acceptedRows = clamp(input.acceptedRows, 0, detectedRows);

  const rejections: RejectedRow[] = [...input.rejections];
  const unexplained = detectedRows - acceptedRows - rejections.length;
  for (let index = 0; index < unexplained; index += 1) {
    rejections.push({
      rowIndex: -1,
      reason: "MISSING_COORDINATE_PAIR",
      detail: "row was neither accepted nor explicitly rejected; recorded so it cannot vanish",
    });
  }

  const rejectedRows = rejections.length;
  // Several readers may reject the same physical row for different reasons
  // (an OCR conflict and a missing layout cell, say). Each rejection is a
  // detected row, so when the dispositions outnumber the detector's count the
  // count was too low — never the other way round. The invariant
  // detectedRows === acceptedRows + rejectedRows must hold in every output.
  const reconciledDetected = Math.max(detectedRows, acceptedRows + rejectedRows);
  const reviewRequired = acceptedRows < reconciledDetected;

  return {
    detectedRows: reconciledDetected,
    parsedRows,
    acceptedRows,
    rejectedRows,
    rejections,
    reviewRequired,
    summary: reviewRequired
      ? `${acceptedRows} of ${reconciledDetected} detected coordinate rows were validated.`
      : `All ${reconciledDetected} detected coordinate rows were validated.`,
    summaryAr: reviewRequired
      ? `تم التحقق من ${acceptedRows} من ${reconciledDetected} صفوف إحداثيات مكتشفة.`
      : `تم التحقق من جميع صفوف الإحداثيات المكتشفة (${reconciledDetected}).`,
  };
}

/** An empty account, for a document in which no coordinate table was found. */
export function emptyRowAccount(): RowAccount {
  return buildRowAccount({ detectedRows: 0, parsedRows: 0, acceptedRows: 0, rejections: [] });
}

/**
 * Merges the accounts of several tables or parcels into one document-level
 * account. Review is contagious: if any table lost a row, the document did.
 */
export function mergeRowAccounts(accounts: readonly RowAccount[]): RowAccount {
  if (accounts.length === 0) return emptyRowAccount();
  return buildRowAccount({
    detectedRows: sum(accounts, (a) => a.detectedRows),
    parsedRows: sum(accounts, (a) => a.parsedRows),
    acceptedRows: sum(accounts, (a) => a.acceptedRows),
    rejections: accounts.flatMap((account) => account.rejections),
  });
}

/**
 * The analysis status this account alone permits.
 *
 * Accounting can never raise a verdict — a fully accounted table is not
 * automatically verified, because CRS, topology and geometry all still have a
 * say. It can only hold one down.
 */
export function statusCeilingFor(account: RowAccount): "VERIFIED" | "REVIEW_REQUIRED" | "UNRESOLVED" {
  if (account.detectedRows === 0) return "UNRESOLVED";
  if (account.acceptedRows === 0) return "UNRESOLVED";
  return account.reviewRequired ? "REVIEW_REQUIRED" : "VERIFIED";
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}
