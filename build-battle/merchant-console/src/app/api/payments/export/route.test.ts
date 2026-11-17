import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { GET } from "./route"

/**
 * The export route is where client input becomes a file. These tests pin the
 * server-side validation: a bad column or scope is a 400, never a silent
 * default, and the default column set never includes the card last four.
 */

function call(query: string) {
  return GET(new NextRequest(`http://localhost/api/payments/export?${query}`))
}

async function headerRow(response: Response) {
  const text = await response.text()
  return text.split("\n")[0].split(",")
}

/** Data rows in the CSV, excluding the header. */
async function countRows(response: Response) {
  const text = await response.text()
  return text.split("\n").length - 1
}

describe("GET /api/payments/export filter validation", () => {
  it("ignores an unknown merchantId rather than filtering to nothing", async () => {
    const all = await countRows(call(""))
    expect(await countRows(call("merchantId=mch_missing"))).toBe(all)
  })

  it("applies a known merchantId", async () => {
    const all = await countRows(call(""))
    const one = await countRows(call("merchantId=mch_01"))
    expect(one).toBeGreaterThan(0)
    expect(one).toBeLessThan(all)
  })

  it("ignores a malformed from or to date instead of comparing it as text", async () => {
    const all = await countRows(call(""))
    expect(await countRows(call("from=not-a-date"))).toBe(all)
    expect(await countRows(call("to=2026-13-45"))).toBe(all)
    expect(await countRows(call("from=2026-03-14'%20OR%201=1"))).toBe(all)
  })

  it("applies a well-formed from date", async () => {
    // Well past the seed data, so a valid date filters everything out.
    expect(await countRows(call("from=2999-01-01"))).toBe(0)
  })
})

describe("GET /api/payments/export", () => {
  it("returns 400 for a column name outside the allowlist", async () => {
    const response = call("columns=id,bogus")
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/column/i)
  })

  it("returns 400 for an empty column selection", async () => {
    expect(call("columns=").status).toBe(400)
    expect(call("columns=,").status).toBe(400)
  })

  it("returns 400 for an unknown scope rather than defaulting", async () => {
    const response = call("scope=everything")
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/scope/i)
  })

  it("omits the card last four when no columns are requested", async () => {
    const response = call("")
    expect(response.status).toBe(200)
    expect(await headerRow(response)).not.toContain("last4")
  })

  it("writes the requested columns in the requested order", async () => {
    const response = call("columns=amount,id")
    expect(await headerRow(response)).toEqual(["amount", "id"])
  })

  it("names the file after the status filter, or 'filtered' without one", async () => {
    const filtered = call("status=disputed")
    expect(filtered.headers.get("content-disposition")).toMatch(
      /filename="payments-disputed-\d{4}-\d{2}-\d{2}\.csv"/,
    )
    const unfiltered = call("")
    expect(unfiltered.headers.get("content-disposition")).toMatch(
      /filename="payments-filtered-\d{4}-\d{2}-\d{2}\.csv"/,
    )
  })

  it("scope=all exports every payment, ignoring the active filters", async () => {
    const countRows = async (response: Response) =>
      (await response.text()).split("\n").length - 1

    const filtered = await countRows(call("status=disputed"))
    const all = await countRows(call("status=disputed&scope=all"))

    expect(all).toBeGreaterThan(filtered)
    expect(call("status=disputed&scope=all").headers.get("content-disposition")).toMatch(
      /payments-all-/,
    )
  })
})
