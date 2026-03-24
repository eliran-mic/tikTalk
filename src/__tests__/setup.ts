import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock next/headers cookies
const mockCookieStore = new Map<string, { name: string; value: string }>()

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => mockCookieStore.get(name),
    set: (name: string, value: string) => {
      mockCookieStore.set(name, { name, value })
    },
    delete: (name: string) => {
      mockCookieStore.delete(name)
    },
  })),
}))

// Export for test use
export { mockCookieStore }
