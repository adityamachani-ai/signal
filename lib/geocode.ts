// Resolve city names to their official/canonical form for Lusha API compatibility.
// Layer 1: Static alias map (instant, no network)
// Layer 2: OpenStreetMap Nominatim geocoding (free, global coverage)
// Layer 3: In-memory cache (auto-populated, avoids repeat lookups)

const CITY_ALIASES: Record<string, string> = {
  // Indian cities
  'bangalore': 'Bengaluru',
  'bombay': 'Mumbai',
  'madras': 'Chennai',
  'calcutta': 'Kolkata',
  'poona': 'Pune',
  'trivandrum': 'Thiruvananthapuram',
  'pondicherry': 'Puducherry',
  'baroda': 'Vadodara',
  'cochin': 'Kochi',
  'vizag': 'Visakhapatnam',
  'benares': 'Varanasi',
  'mangalore': 'Mangaluru',
  'mysore': 'Mysuru',
  'simla': 'Shimla',
  'ooty': 'Udhagamandalam',
  // International aliases
  'nyc': 'New York',
  'sf': 'San Francisco',
  'la': 'Los Angeles',
  'dc': 'Washington',
  'philly': 'Philadelphia',
  'vegas': 'Las Vegas',
}

// Runtime cache — grows automatically as new cities are resolved
const cityCache = new Map<string, string>()

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

async function queryNominatim(city: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      q: city,
      format: 'json',
      limit: '1',
      featuretype: 'city',
      addressdetails: '1',
    })

    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'SignalApp/1.0' },
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) return null

    const data = await res.json() as Array<{
      name?: string
      address?: { city?: string; town?: string; village?: string }
    }>

    if (data.length === 0) return null

    // Prefer address.city, then address.town, then the top-level name
    const entry = data[0]
    return entry.address?.city ?? entry.address?.town ?? entry.name ?? null
  } catch {
    // Network error or timeout — fail silently
    return null
  }
}

/**
 * Resolve a city name to its canonical/official form.
 * Checks static aliases first, then in-memory cache, then Nominatim.
 * Falls back to the original input if all else fails.
 */
export async function resolveCity(city: string): Promise<string> {
  const key = city.toLowerCase().trim()
  if (!key) return city

  // Layer 1: Static alias map
  const alias = CITY_ALIASES[key]
  if (alias) return alias

  // Layer 2: Runtime cache
  const cached = cityCache.get(key)
  if (cached) return cached

  // Layer 3: Nominatim geocoding
  const resolved = await queryNominatim(city)
  if (resolved && resolved.toLowerCase() !== key) {
    cityCache.set(key, resolved)
    return resolved
  }

  // If Nominatim returns the same name or nothing, cache and return original
  cityCache.set(key, city)
  return city
}
