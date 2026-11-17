import { merchantById } from "@/data/merchants"
import { Payment } from "@/data/types"
import { formatMinorUnitsPlain } from "./money"

/**
 * CSV export for the payments table.
 *
 * Ops chooses the columns (NWP-101). The card last four is excluded by default,
 * because files go to merchants and the last four should only ship on request.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** Every column except the card last four. Used when the request names none. */
export const EXPORT_DEFAULT_COLUMNS: readonly ExportColumn[] =
  EXPORT_COLUMNS.filter((column) => column !== "last4")

/**
 * Parses the `columns` query parameter. Returns the requested columns in the
 * order given, with duplicates dropped. An absent parameter gets the default
 * set. Returns null for an empty list or any name outside the allowlist.
 * The route turns null into a 400.
 */
export function parseExportColumns(raw: string | null): ExportColumn[] | null {
  if (raw === null) return [...EXPORT_DEFAULT_COLUMNS]

  const requested = raw.split(",").map((part) => part.trim())
  const allowed = new Set<string>(EXPORT_COLUMNS)
  if (requested.some((name) => !allowed.has(name))) return null

  const unique = [...new Set(requested)] as ExportColumn[]
  return unique.length > 0 ? unique : null
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMinorUnitsPlain(payment.amount)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

/**
 * `scope` is a label the route has already checked against its allowlist:
 * a payment status, "filtered", or "all". Date is UTC.
 */
export function exportFilename(scope: string, date = new Date()): string {
  return `payments-${scope}-${date.toISOString().slice(0, 10)}.csv`
}
