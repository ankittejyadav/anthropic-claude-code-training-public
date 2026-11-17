import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { exportFilename, parseExportColumns, toCsv } from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

/** Scopes the client may ask for. Anything else is rejected, not defaulted. */
const SCOPES = ["filter", "all"] as const

/**
 * Exports the payments table as CSV.
 *
 * Query parameters:
 * - `columns`: comma-separated column names. Absent means the default set,
 *   which excludes the card last four.
 * - `scope`: `filter` (default) exports the active filters; `all` exports every
 *   payment.
 *
 * Every export goes through the query builder and returns every matching row.
 * The page is not applied, so the file is never one page of the table.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const columns = parseExportColumns(params.get("columns"))
  if (!columns) {
    return NextResponse.json(
      { error: "Choose at least one valid column." },
      { status: 400 },
    )
  }

  const scope = params.get("scope") ?? "filter"
  if (!(SCOPES as readonly string[]).includes(scope)) {
    return NextResponse.json({ error: "Unknown export scope." }, { status: 400 })
  }

  const filters = parseFilters(params)
  const active =
    scope === "all"
      ? { ...parseFilters(new URLSearchParams()), sort: filters.sort, direction: filters.direction }
      : filters

  const rows = sortPayments(
    filterPayments(active),
    active.sort,
    active.direction,
  )

  const label =
    scope === "all"
      ? "all"
      : filters.status && filters.status !== "all"
        ? filters.status
        : "filtered"

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(label)}"`,
    },
  })
}
