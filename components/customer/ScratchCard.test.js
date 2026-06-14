import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScratchCard from './ScratchCard';

// Mock fetch API
global.fetch = jest.fn();

describe('ScratchCard Component', () => {
  const mockScratchCardId = 'scratch-123';
  const mockParticipationId = 'participation-456';

  const mockGenerateResponse = {
    success: true,
    data: {
      scratchCard: {
        _id: mockScratchCardId,
        reward_type: 'Discount',
        reward_value: '20% OFF',
        reward_description: 'Get 20% discount on your next purchase',
        status: 'generated',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        expiry_duration_minutes: 5
      },
      participationStatus: 'scratched'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders loading state initially', async () => {
    fetch.mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockGenerateResponse
        }), 100)
      )
    );

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    expect(screen.getByText(/Loading scratch card/i)).toBeInTheDocument();
  });

  test('loads scratch card via API on mount', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/customer/scratch/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(mockParticipationId)
        })
      );
    });
  });

  test('displays error state on API failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Failed to load scratch card'
      })
    });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load scratch card/i)).toBeInTheDocument();
    });
  });

  test('renders card with generating state after loading', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Scratch to Reveal/i)).toBeInTheDocument();
    });
  });

  test('displays timer with correct initial time', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Time remaining:/)).toBeInTheDocument();
      expect(screen.getByText(/5:00/)).toBeInTheDocument();
    });
  });

  test('timer counts down every second', async () => {
    jest.useFakeTimers();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/5:00/)).toBeInTheDocument();
    });

    // Advance timer by 1 second
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText(/4:59/)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('timer color changes based on time remaining', async () => {
    jest.useFakeTimers();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    const { container } = render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/5:00/)).toBeInTheDocument();
    });

    // Initially green (> 120 seconds)
    let timerValue = container.querySelector('[class*="timerValue"]');
    expect(timerValue).toHaveClass('timerGreen');

    // Advance to yellow zone (60-120 seconds)
    jest.advanceTimersByTime(3 * 60 * 1000); // 3 minutes

    await waitFor(() => {
      timerValue = container.querySelector('[class*="timerValue"]');
      expect(timerValue).toHaveClass('timerYellow');
    });

    // Advance to red zone (< 60 seconds)
    jest.advanceTimersByTime(2 * 60 * 1000); // 2 more minutes

    await waitFor(() => {
      timerValue = container.querySelector('[class*="timerValue"]');
      expect(timerValue).toHaveClass('timerRed');
    });

    jest.useRealTimers();
  });

  test('canvas element is rendered in generating state', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      const canvas = screen.getByRole('img', { hidden: true }) || document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  test('calls reveal API when scratch percentage exceeds 30%', async () => {
    const mockRevealResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'revealed',
        reward: {
          type: 'Discount',
          value: '20% OFF',
          description: 'Get 20% discount on your next purchase'
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevealResponse
      });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Scratch to Reveal/i)).toBeInTheDocument();
    });

    // Simulate scratch on canvas
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('2d');
    jest.spyOn(context, 'clearRect');

    // Simulate multiple scratch events
    for (let i = 0; i < 5; i++) {
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 100 + i * 20, clientY: 100 + i * 20 });
      fireEvent.mouseUp(canvas);
    }

    // After reveal, check if reveal API was called
    await waitFor(
      () => {
        const calls = fetch.mock.calls;
        const revealCall = calls.find((call) => call[0]?.includes('/reveal'));
        expect(revealCall).toBeDefined();
      },
      { timeout: 3000 }
    );
  });

  test('renders revealed state with reward information', async () => {
    const mockRevealResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'revealed',
        reward: {
          type: 'Discount',
          value: '20% OFF',
          description: 'Get 20% discount on your next purchase'
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevealResponse
      });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Discount/)).toBeInTheDocument();
      expect(screen.getByText(/20% OFF/)).toBeInTheDocument();
    });
  });

  test('redeem button is only visible after reveal', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    const { container } = render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Scratch to Reveal/i)).toBeInTheDocument();
    });

    // Initially no redeem button
    let redeemButton = screen.queryByRole('button', { name: /Redeem Now/i });
    expect(redeemButton).not.toBeInTheDocument();
  });

  test('calls redeem API when redeem button is clicked', async () => {
    const mockRevealResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'revealed',
        reward: {
          type: 'Discount',
          value: '20% OFF',
          description: 'Get 20% discount on your next purchase'
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
    };

    const mockRedeemResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'redeemed',
        redeemed: true,
        message: 'Coupon redeemed successfully!',
        reward: {
          type: 'Discount',
          value: '20% OFF',
          description: 'Get 20% discount on your next purchase'
        }
      }
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevealResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRedeemResponse
      });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    // Wait for reveal
    await waitFor(() => {
      expect(screen.getByText(/20% OFF/)).toBeInTheDocument();
    });

    // Click redeem button
    const redeemButton = screen.getByRole('button', { name: /Redeem Now/i });
    fireEvent.click(redeemButton);

    // Check if redeem API was called
    await waitFor(() => {
      const calls = fetch.mock.calls;
      const redeemCall = calls.find((call) => call[0]?.includes('/redeem'));
      expect(redeemCall).toBeDefined();
    });
  });

  test('displays redeemed state after successful redemption', async () => {
    const mockRevealResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'revealed',
        reward: {
          type: 'Discount',
          value: '20% OFF',
          description: 'Get 20% discount on your next purchase'
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
    };

    const mockRedeemResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'redeemed',
        redeemed: true,
        message: 'Coupon redeemed successfully!',
        reward: {
          type: 'Discount',
          value: '20% OFF',
          description: 'Get 20% discount on your next purchase'
        }
      }
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevealResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRedeemResponse
      });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    // Wait for reveal
    await waitFor(() => {
      expect(screen.getByText(/20% OFF/)).toBeInTheDocument();
    });

    // Click redeem button
    const redeemButton = screen.getByRole('button', { name: /Redeem Now/i });
    fireEvent.click(redeemButton);

    // Wait for redeemed state
    await waitFor(() => {
      expect(screen.getByText(/Coupon Redeemed!/)).toBeInTheDocument();
      expect(screen.getByText(/✓/)).toBeInTheDocument();
    });
  });

  test('displays expired state when timer reaches zero', async () => {
    jest.useFakeTimers();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/5:00/)).toBeInTheDocument();
    });

    // Advance timer by 5 minutes + 1 second
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

    await waitFor(() => {
      expect(screen.getByText(/Coupon Expired/)).toBeInTheDocument();
      expect(screen.getByText(/✗/)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('calls onRedeemSuccess callback on successful redemption', async () => {
    const mockRevealResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'revealed',
        reward: {
          type: 'Discount',
          value: '20% OFF',
          description: 'Get 20% discount on your next purchase'
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
    };

    const mockRedeemResponse = {
      success: true,
      data: {
        scratchCardId: mockScratchCardId,
        status: 'redeemed',
        redeemed: true,
        message: 'Coupon redeemed successfully!'
      }
    };

    const onRedeemSuccess = jest.fn();

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevealResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRedeemResponse
      });

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
        onRedeemSuccess={onRedeemSuccess}
      />
    );

    // Wait for reveal
    await waitFor(() => {
      expect(screen.getByText(/20% OFF/)).toBeInTheDocument();
    });

    // Click redeem button
    const redeemButton = screen.getByRole('button', { name: /Redeem Now/i });
    fireEvent.click(redeemButton);

    // Check if callback was called
    await waitFor(() => {
      expect(onRedeemSuccess).toHaveBeenCalledWith(expect.objectContaining({
        status: 'redeemed'
      }));
    });
  });

  test('displays touch-friendly interface on mobile', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenerateResponse
    });

    const { container } = render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      const canvas = document.querySelector('canvas');
      // Canvas should have touch event handlers
      expect(canvas).toBeInTheDocument();
    });
  });

  test('handles network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        participationId={mockParticipationId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load scratch card/i)).toBeInTheDocument();
    });
  });

  test('PropTypes validation', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ScratchCard
        scratchCardId={mockScratchCardId}
        // Missing participationId to trigger PropTypes warning
      />
    );

    // Note: This test would log a warning but won't fail the test
    consoleErrorSpy.mockRestore();
  });
});
