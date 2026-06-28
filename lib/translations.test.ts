import { describe, expect, it } from 'vitest'
import { tTeam } from './translations'

describe('tTeam translation utility', () => {
  it('translates team names from English to Spanish', () => {
    expect(tTeam('Germany')).toBe('Alemania')
    expect(tTeam('England')).toBe('Inglaterra')
    expect(tTeam('USA')).toBe('EE. UU.')
  })

  it('returns the original name if no translation exists', () => {
    expect(tTeam('NonExistentTeam')).toBe('NonExistentTeam')
  })
})
