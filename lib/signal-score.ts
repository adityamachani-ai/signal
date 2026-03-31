import type { LushaContact } from './lusha'

/**
 * Computes a signal score and human-readable reasons from enrichment data.
 * Scoring logic:
 * - Has direct email → +2
 * - Has phone (direct or mobile) → +2
 * - Has LinkedIn → +1
 * - Senior role (VP, C-Suite, Director, Founder, Partner) → +2
 * - Mid-size+ company (51+ employees) → +1
 * - Company domain available → +1
 *
 * Score interpretation: 0-3 = low, 4-6 = medium, 7+ = strong
 */
export function computeSignalScore(contact: LushaContact): {
  score: 'strong' | 'medium' | 'low'
  reasons: string[]
} {
  let points = 0
  const reasons: string[] = []

  // Contact data quality
  if (contact.emails.length > 0) {
    points += 2
    reasons.push('Direct email available')
  }
  if (contact.phones.length > 0) {
    points += 2
    reasons.push('Phone number available')
  }
  if (contact.linkedinUrl) {
    points += 1
    reasons.push('LinkedIn profile confirmed')
  }

  // Seniority
  const seniorRoles = ['vp', 'c_level', 'c-suite', 'director', 'founder', 'partner', 'vice president']
  if (seniorRoles.some(r => contact.seniority?.toLowerCase().includes(r) || contact.jobTitle?.toLowerCase().includes(r))) {
    points += 2
    reasons.push('Senior decision-maker role')
  }

  // Company signals
  if (contact.companySizeRange) {
    const min = parseInt(contact.companySizeRange.split('-')[0] ?? '0', 10)
    if (min >= 51) {
      points += 1
      reasons.push(`Company size: ${contact.companySizeRange} employees`)
    }
  }
  if (contact.companyDomain) {
    points += 1
    reasons.push('Verified company domain')
  }

  const score = points >= 7 ? 'strong' : points >= 4 ? 'medium' : 'low'
  return { score, reasons }
}
