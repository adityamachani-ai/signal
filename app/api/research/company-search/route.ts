import { NextRequest, NextResponse } from 'next/server'

const CLEARBIT_URL = 'https://autocomplete.clearbit.com/v1/companies/suggest'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(`${CLEARBIT_URL}?query=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    const data: Array<{ name: string; domain: string; logo: string }> = await res.json()

    return NextResponse.json({
      results: data.slice(0, 8).map(c => ({
        name: c.name,
        domain: c.domain,
        logo: c.logo,
      })),
    })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
