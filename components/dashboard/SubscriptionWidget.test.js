import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import SubscriptionWidget from './SubscriptionWidget'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('SubscriptionWidget Component', () => {
  let mockRouter

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      push: jest.fn(),
    }
    useRouter.mockReturnValue(mockRouter)
    global.fetch.mockClear()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Loading State', () => {
    test('renders loading skeleton initially', () => {
      global.fetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolve to keep loading state
            setTimeout(() => {
              resolve({
                json: () =>
                  Promise.resolve({
                    success: true,
                    hasActivePlan: true,
                  }),
              })
            }, 1000)
          })
      )

      render(<SubscriptionWidget />)

      // Skeleton elements should be present
      const container = screen.getByRole('article', { hidden: true }) || document.querySelector('[class*="widget"]')
      expect(container).toBeInTheDocument()
    })
  })

  describe('No Active Plan State', () => {
    test('shows "No Active Plan" message when hasActivePlan is false', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: false,
            plan: null,
            platformAccess: null,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('No Active Plan')).toBeInTheDocument()
      })

      expect(
        screen.getByText(
          'Get started with a subscription plan to unlock unlimited features and grow your business.'
        )
      ).toBeInTheDocument()
    })

    test('"View Plans" button navigates to subscription page when no plan', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: false,
          }),
      })

      render(<SubscriptionWidget />)

      const viewPlansButton = await screen.findByText('View Plans')
      await userEvent.click(viewPlansButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/subscription')
    })
  })

  describe('Active Plan State', () => {
    test('displays plan name and platform access when plan exists', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: true,
            remainingDays: 45,
            unlimitedScratchesExpiryDate: '2026-07-25T00:00:00.000Z',
            scratchRemaining: 'UNLIMITED',
            scratchPurchased: 0,
            scratchConsumed: 0,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('CORE')).toBeInTheDocument()
      })

      expect(screen.getByText('LIFETIME')).toBeInTheDocument()
    })

    test('displays ACTIVE badge when unlimited scratches are active', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'SMART',
            platformAccess: 'LIFETIME',
            unlimitedScratches: true,
            remainingDays: 60,
            unlimitedScratchesExpiryDate: '2026-08-09T00:00:00.000Z',
            scratchRemaining: 'UNLIMITED',
            scratchPurchased: 0,
            scratchConsumed: 0,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument()
      })
    })

    test('displays remaining days countdown', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: true,
            remainingDays: 30,
            unlimitedScratchesExpiryDate: '2026-07-10T00:00:00.000Z',
            scratchRemaining: 'UNLIMITED',
            scratchPurchased: 0,
            scratchConsumed: 0,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument()
      })
    })

    test('displays expiry date in correct format', async () => {
      const expiryDate = '2026-07-25T00:00:00.000Z'
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: true,
            remainingDays: 45,
            unlimitedScratchesExpiryDate: expiryDate,
            scratchRemaining: 'UNLIMITED',
            scratchPurchased: 0,
            scratchConsumed: 0,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('Jul 25, 2026')).toBeInTheDocument()
      })
    })
  })

  describe('Expired Scratches State', () => {
    test('displays EXPIRED badge when unlimited scratches are not active', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: false,
            remainingDays: null,
            unlimitedScratchesExpiryDate: null,
            scratchRemaining: 50,
            scratchPurchased: 100,
            scratchConsumed: 50,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('EXPIRED')).toBeInTheDocument()
      })
    })

    test('displays purchased scratches count when expired', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: false,
            remainingDays: null,
            unlimitedScratchesExpiryDate: null,
            scratchRemaining: 25,
            scratchPurchased: 100,
            scratchConsumed: 75,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('25 / 100')).toBeInTheDocument()
      })
    })

    test('"Purchase Scratches" button appears when unlimited scratches expired', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: false,
            remainingDays: null,
            unlimitedScratchesExpiryDate: null,
            scratchRemaining: 0,
            scratchPurchased: 100,
            scratchConsumed: 100,
          }),
      })

      render(<SubscriptionWidget />)

      const purchaseScratchesButton = await screen.findByText('Purchase Scratches')
      expect(purchaseScratchesButton).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    test('"Manage Plan" button navigates to subscription page', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: true,
            remainingDays: 45,
            unlimitedScratchesExpiryDate: '2026-07-25T00:00:00.000Z',
            scratchRemaining: 'UNLIMITED',
            scratchPurchased: 0,
            scratchConsumed: 0,
          }),
      })

      render(<SubscriptionWidget />)

      const managePlanButton = await screen.findByText('Manage Plan')
      await userEvent.click(managePlanButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/subscription')
    })

    test('"Manage Plan" button does not show "Purchase Scratches" when unlimited active', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: true,
            remainingDays: 45,
            unlimitedScratchesExpiryDate: '2026-07-25T00:00:00.000Z',
            scratchRemaining: 'UNLIMITED',
            scratchPurchased: 0,
            scratchConsumed: 0,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('Manage Plan')).toBeInTheDocument()
      })

      expect(screen.queryByText('Purchase Scratches')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    test('displays error message when fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Failed to fetch subscription',
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Subscription')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to fetch subscription')).toBeInTheDocument()
    })

    test('retry button retries the fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Failed to fetch subscription',
          }),
      })

      const { rerender } = render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Subscription')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      expect(retryButton).toBeInTheDocument()

      // Mock successful response for retry
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: true,
            plan: 'CORE',
            platformAccess: 'LIFETIME',
            unlimitedScratches: true,
            remainingDays: 45,
            unlimitedScratchesExpiryDate: '2026-07-25T00:00:00.000Z',
            scratchRemaining: 'UNLIMITED',
            scratchPurchased: 0,
            scratchConsumed: 0,
          }),
      })

      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('CORE')).toBeInTheDocument()
      })
    })
  })

  describe('API Integration', () => {
    test('fetches data from /api/subscription/status endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            hasActivePlan: false,
          }),
      })

      render(<SubscriptionWidget />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/subscription/status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      })
    })
  })
})
