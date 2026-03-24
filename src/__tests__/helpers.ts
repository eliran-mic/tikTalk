import { vi } from 'vitest'

// Deep mock factory for Prisma client
function createMockModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    upsert: vi.fn().mockResolvedValue({}),
  }
}

export const mockPrisma = {
  user: createMockModel(),
  session: createMockModel(),
  post: createMockModel(),
  agent: createMockModel(),
  comment: createMockModel(),
  follow: createMockModel(),
  like: createMockModel(),
  generatedTopic: createMockModel(),
  $transaction: vi.fn((args: unknown[]) => Promise.all(args)),
  $disconnect: vi.fn(),
}

// Mock the db module
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

// Helper to create a JSON request
export function createRequest(
  url: string,
  options?: RequestInit
): Request {
  return new Request(`http://localhost:3000${url}`, options)
}

// Helper to create a JSON POST request
export function createJsonRequest(
  url: string,
  body: unknown,
  options?: RequestInit
): Request {
  return new Request(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...options,
  })
}

// Reset all mocks between tests
export function resetMocks() {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset()
        }
      })
    }
  })
  // Re-establish default resolved values after reset
  for (const [key, model] of Object.entries(mockPrisma)) {
    if (key === '$transaction') {
      (model as ReturnType<typeof vi.fn>).mockImplementation((args: unknown[]) => Promise.all(args))
    } else if (key === '$disconnect') {
      (model as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    } else if (typeof model === 'object' && model !== null) {
      const m = model as Record<string, ReturnType<typeof vi.fn>>
      m.findMany?.mockResolvedValue([])
      m.findUnique?.mockResolvedValue(null)
      m.findFirst?.mockResolvedValue(null)
      m.create?.mockResolvedValue({})
      m.update?.mockResolvedValue({})
      m.delete?.mockResolvedValue({})
      m.deleteMany?.mockResolvedValue({ count: 0 })
      m.count?.mockResolvedValue(0)
      m.upsert?.mockResolvedValue({})
    }
  }
}
