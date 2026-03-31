/**
 * Unit tests for lib/signal-score.ts — computeSignalScore
 * These are pure function tests, no server needed.
 */

import { describe, it, expect } from 'vitest'
import { computeSignalScore } from '../lib/signal-score'
import type { LushaContact } from '../lib/lusha'

function makeContact(overrides: Partial<LushaContact> = {}): LushaContact {
  return {
    lushaId: 'test-123',
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    jobTitle: 'Software Engineer',
    seniority: 'staff',
    department: 'Engineering',
    linkedinUrl: '',
    companyName: 'Acme Corp',
    companyDomain: '',
    companySizeRange: '',
    companyIndustry: 'Software',
    companyLocation: 'San Francisco, US',
    city: 'San Francisco',
    country: 'US',
    emails: [],
    phones: [],
    rawPayload: {},
    ...overrides,
  }
}

describe('computeSignalScore', () => {
  it('returns low score for contact with no signals', () => {
    const { score, reasons } = computeSignalScore(makeContact())
    expect(score).toBe('low')
    expect(reasons).toHaveLength(0)
  })

  it('awards +2 for direct email', () => {
    const { reasons } = computeSignalScore(makeContact({ emails: ['jane@acme.com'] }))
    expect(reasons).toContain('Direct email available')
  })

  it('awards +2 for phone number', () => {
    const { reasons } = computeSignalScore(makeContact({ phones: ['+1-555-1234'] }))
    expect(reasons).toContain('Phone number available')
  })

  it('awards +1 for LinkedIn profile', () => {
    const { reasons } = computeSignalScore(makeContact({ linkedinUrl: 'https://linkedin.com/in/jane' }))
    expect(reasons).toContain('LinkedIn profile confirmed')
  })

  it('awards +2 for senior seniority (vp)', () => {
    const { reasons } = computeSignalScore(makeContact({ seniority: 'vp' }))
    expect(reasons).toContain('Senior decision-maker role')
  })

  it('awards +2 for senior job title (Director)', () => {
    const { reasons } = computeSignalScore(makeContact({ jobTitle: 'Director of Engineering' }))
    expect(reasons).toContain('Senior decision-maker role')
  })

  it('awards +2 for c_level seniority', () => {
    const { reasons } = computeSignalScore(makeContact({ seniority: 'c_level' }))
    expect(reasons).toContain('Senior decision-maker role')
  })

  it('awards +2 for founder in job title', () => {
    const { reasons } = computeSignalScore(makeContact({ jobTitle: 'Co-Founder & CEO' }))
    expect(reasons).toContain('Senior decision-maker role')
  })

  it('awards +1 for mid-size company (51+)', () => {
    const { reasons } = computeSignalScore(makeContact({ companySizeRange: '51-200' }))
    expect(reasons).toContain('Company size: 51-200 employees')
  })

  it('does NOT award company size for small company (1-50)', () => {
    const { reasons } = computeSignalScore(makeContact({ companySizeRange: '1-50' }))
    const sizeReason = reasons.find(r => r.includes('Company size'))
    expect(sizeReason).toBeUndefined()
  })

  it('awards +1 for verified company domain', () => {
    const { reasons } = computeSignalScore(makeContact({ companyDomain: 'acme.com' }))
    expect(reasons).toContain('Verified company domain')
  })

  it('returns strong for fully-enriched senior contact', () => {
    const { score, reasons } = computeSignalScore(makeContact({
      emails: ['jane@acme.com'],
      phones: ['+1-555-1234'],
      linkedinUrl: 'https://linkedin.com/in/jane',
      seniority: 'vp',
      companySizeRange: '201-500',
      companyDomain: 'acme.com',
    }))
    expect(score).toBe('strong')
    // 2 + 2 + 1 + 2 + 1 + 1 = 9 points → strong
    expect(reasons.length).toBeGreaterThanOrEqual(6)
  })

  it('returns medium for contact with email + phone (4 points)', () => {
    const { score } = computeSignalScore(makeContact({
      emails: ['jane@acme.com'],
      phones: ['+1-555-1234'],
    }))
    expect(score).toBe('medium')
  })

  it('returns medium for senior contact with email (6 points)', () => {
    const { score } = computeSignalScore(makeContact({
      emails: ['jane@acme.com'],
      seniority: 'director',
      companyDomain: 'acme.com',
      companySizeRange: '201-500',
    }))
    // 2 + 2 + 1 + 1 = 6 → medium
    expect(score).toBe('medium')
  })

  it('returns low for contact with only LinkedIn (1 point)', () => {
    const { score } = computeSignalScore(makeContact({
      linkedinUrl: 'https://linkedin.com/in/jane',
    }))
    expect(score).toBe('low')
  })

  it('handles empty seniority and job title gracefully', () => {
    const { score, reasons } = computeSignalScore(makeContact({
      seniority: '',
      jobTitle: '',
    }))
    expect(score).toBe('low')
    const seniorReason = reasons.find(r => r.includes('Senior'))
    expect(seniorReason).toBeUndefined()
  })

  it('handles malformed companySizeRange gracefully', () => {
    const { reasons } = computeSignalScore(makeContact({ companySizeRange: 'unknown' }))
    const sizeReason = reasons.find(r => r.includes('Company size'))
    expect(sizeReason).toBeUndefined()
  })
})
