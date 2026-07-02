import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncMatchesFromApi } from './sync-matches'

// Mock Supabase
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null })
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  update: mockUpdate,
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('syncMatchesFromApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock-supabase.url'
  })

  it('throws an error if SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    await expect(syncMatchesFromApi()).rejects.toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.'
    )
  })

  it('performs synchronization when data is retrieved from API', async () => {
    // Mock fetch responses
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      let matches: any[] = []
      if (url.includes('action=all')) {
        matches = [{ id: 0, status: 'finished', score: [2, 1] }]
      } else if (url.includes('action=today')) {
        matches = [{ id: 1, status: 'live', score: [1, 1] }]
      } else if (url.includes('action=live')) {
        matches = [{ id: 2, status: 'playing', score: [0, 0] }]
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ matches }),
      })
    })
    globalThis.fetch = mockFetch as any

    // Mock DB response
    mockSelect.mockResolvedValueOnce({
      data: [
        { id: 1, status: 'pending', home_score: null, away_score: null, score_manually_set: false, home_team: '1º Grupo E', away_team: '3º Grupo F', home_penalty: null, away_penalty: null },
        { id: 2, status: 'pending', home_score: null, away_score: null, score_manually_set: false, home_team: 'USA', away_team: 'Bosnia', home_penalty: null, away_penalty: null },
        { id: 3, status: 'pending', home_score: null, away_score: null, score_manually_set: false, home_team: 'Belgium', away_team: 'Senegal', home_penalty: null, away_penalty: null },
      ],
      error: null,
    })

    // Mock update behavior
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: eqMock })

    const result = await syncMatchesFromApi()

    expect(result.success).toBe(true)
    expect(result.count).toBe(3)
    expect(mockFrom).toHaveBeenCalledWith('matches')
    expect(mockUpdate).toHaveBeenCalledTimes(3)
  })
})
