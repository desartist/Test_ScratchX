# Scratch Card UI Implementation

## Overview

This document describes the implementation of an interactive scratch card component with reveal animation, expiry timer, and redemption flow for the coupon campaign system.

## Components Created

### 1. ScratchCard Component
**Location:** `components/customer/ScratchCard.js`

A fully interactive React component that manages the entire scratch card lifecycle.

#### Features

**States:**
- `generating` - Initial state showing "Scratch to reveal" with canvas overlay
- `revealed` - Shows reward information after 30% scratch threshold reached
- `redeemed` - Displays success message after redemption
- `expired` - Shows expiry message when timer reaches zero
- `error` - Error state for failed API calls

**Scratch Animation:**
- Canvas-based implementation for smooth touch and mouse interactions
- Reveals content when ~30% of the surface is scratched
- Responsive to both mouse and touch events
- Real-time scratch percentage display during scratching

**Expiry Timer:**
- Countdown starting at 5 minutes (300 seconds)
- Updates every 1 second
- Color changes based on remaining time:
  - Green: > 120 seconds
  - Yellow: 60-120 seconds  
  - Red: < 60 seconds (with pulse animation)
- Automatically transitions to expired state at zero

**Reward Display:**
- Shows after reveal animation completes
- Displays: reward type, value, and description
- Yellow gradient background for prominent visibility
- Large, legible text for mobile devices

**Redeem Flow:**
- Redeem button visible only after reveal AND not expired
- Calls `POST /api/customer/scratch/redeem`
- Shows loading state during redemption
- Displays success message with expiry date on successful redemption
- Optional callback hook for parent component integration

### 2. CSS Module
**Location:** `components/customer/ScratchCard.module.css`

Comprehensive styling with:
- Gradient backgrounds (light and dark modes)
- Smooth animations and transitions
- Responsive design for mobile/tablet/desktop
- Touch-friendly interactive elements
- Dark mode support via `prefers-color-scheme`

### 3. Page Component
**Location:** `app/scratch-card/[scratchCardId]/page.js`

Server-side page component that:
- Extracts `scratchCardId` from URL params
- Renders the ScratchCard component
- Handles optional confetti celebration on redemption
- Provides metadata for SEO

## API Integration

The component integrates with three endpoints:

### Generate Scratch Card
```
POST /api/customer/scratch/generate
Content-Type: application/json

{
  "participationId": "string"
}

Response:
{
  "success": true,
  "data": {
    "scratchCard": {
      "_id": "string",
      "reward_type": "Discount|FreeItem|Cashback|Voucher",
      "reward_value": "string",
      "reward_description": "string",
      "status": "generated",
      "expires_at": "ISO 8601 timestamp",
      "expiry_duration_minutes": number
    },
    "participationStatus": "scratched"
  }
}
```

Called automatically on component mount to load scratch card details.

### Reveal Scratch Card
```
POST /api/customer/scratch/reveal
Content-Type: application/json

{
  "scratchCardId": "string",
  "participationId": "string"
}

Response:
{
  "success": true,
  "data": {
    "scratchCardId": "string",
    "status": "revealed",
    "revealedAt": "ISO 8601 timestamp",
    "reward": {
      "type": "string",
      "value": "string",
      "description": "string"
    },
    "expiresAt": "ISO 8601 timestamp"
  }
}
```

Called when user scratches ~30% of the card surface.

### Redeem Scratch Card
```
POST /api/customer/scratch/redeem
Content-Type: application/json

{
  "scratchCardId": "string",
  "participationId": "string"
}

Response:
{
  "success": true,
  "data": {
    "scratchCardId": "string",
    "status": "redeemed",
    "redeemed": true,
    "redeemedAt": "ISO 8601 timestamp",
    "message": "Coupon redeemed successfully!",
    "reward": {
      "type": "string",
      "value": "string",
      "description": "string"
    }
  }
}
```

Called when user clicks the Redeem button on a revealed, non-expired card.

## Usage

### Basic Implementation

```jsx
import ScratchCard from '@/components/customer/ScratchCard';

export default function MyPage() {
  const handleRedeemSuccess = (data) => {
    console.log('Redemption successful:', data);
    // Trigger celebration effects, redirect, etc.
  };

  return (
    <ScratchCard
      scratchCardId="scratch-123"
      participationId="participation-456"
      onRedeemSuccess={handleRedeemSuccess}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scratchCardId` | string | Yes | ID of the scratch card from the database |
| `participationId` | string | Yes | ID of the customer participation record |
| `onRedeemSuccess` | function | No | Callback fired on successful redemption with data payload |

## Testing

**Location:** `components/customer/ScratchCard.test.js`

Comprehensive test suite covering:

### State Rendering Tests
- Initial loading state
- Generating state with canvas
- Revealed state with reward info
- Redeemed state with success message
- Expired state with expiry message
- Error state on API failure

### API Integration Tests
- Generate API call on mount
- Reveal API call at 30% scratch threshold
- Redeem API call on button click
- Error handling for failed API calls

### Timer Tests
- Initial timer display (5:00)
- Countdown every second
- Color transitions based on time remaining
- Auto-expiry at zero

### Animation Tests
- Canvas scratch detection
- Scratch percentage calculation
- Reveal animation
- Redemption animation
- Expiry animation

### Interaction Tests
- Mouse scratch detection
- Touch scratch detection
- Redeem button visibility
- Redeem button click handling
- Loading states during API calls

### Responsive Tests
- Mobile layout rendering
- Touch-friendly canvas sizing
- Button sizing for mobile

## Architecture Notes

### State Management

The component uses React hooks for state management:
- `cardState` - Current lifecycle state
- `scratchCard` - Loaded card data
- `timeRemaining` - Countdown timer value
- `scratchPercentage` - Current scratch progress
- `hasRevealed` - Prevent multiple reveal calls
- `isRevealing` - API call in progress
- `isRedeeming` - API call in progress
- `error` - Error messages
- `loading` - Initial load state

### Canvas Implementation

The scratch effect uses HTML5 Canvas with:
- `clearRect()` to remove pixels as user drags
- Real-time `getImageData()` to calculate clear percentage
- Touch event handling for mobile compatibility
- Mouse event handling for desktop browsers
- Responsive canvas sizing based on container

### Timer Implementation

The countdown uses:
- `setInterval()` for 1-second updates
- Cleanup on unmount and state changes
- Color state updates based on remaining time
- Auto-transition to expired state

### Error Handling

All API calls include:
- Request validation
- Error state display
- User-friendly error messages
- Graceful fallbacks
- Console logging for debugging

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch events
- IE11: Not supported (uses modern ES6+ features)

## Accessibility

Features include:
- Semantic HTML structure
- PropTypes validation
- ARIA labels on buttons
- Keyboard navigation support
- High contrast dark mode
- Touch-friendly sizing (min 48px targets)

## Performance Considerations

### Canvas Optimization
- Canvas redraws only on scratch events
- Efficient `clearRect()` with minimal regions
- No unnecessary image data calculations

### Memory Management
- Cleanup of intervals on unmount
- No memory leaks in event handlers
- Proper ref management

### Network Optimization
- Single generate call on mount
- Reveal call only at threshold
- No polling or repeated API calls
- Proper error handling to prevent retries

## Dark Mode Support

All styles include dark mode variants using `prefers-color-scheme`:
- Background gradients adapt to color scheme
- Text colors adjust for contrast
- Icon colors updated for visibility
- Border colors refined for dark theme

## Mobile Responsiveness

Breakpoints at:
- Desktop: Default (320px+ width)
- Tablet: 768px max-width
- Mobile: 480px max-width

Adjustments include:
- Font size reductions
- Padding/margin scaling
- Canvas height optimization
- Button sizing for touch

## Known Limitations

1. Canvas API requires JavaScript enabled
2. No localStorage persistence (card state lost on reload)
3. Timer runs independently - no server synchronization
4. Single scratch card per page load
5. No animation frame optimization for maximum smoothness

## Future Enhancements

Potential improvements:
- Particle effects on reveal
- Sound effects on scratch/redeem
- Haptic feedback on mobile
- Animation frame optimization
- ServerSentEvent timer sync
- Multiple scratch cards per page
- Scratch progress bar animation
- Confetti celebration effects
- Custom card designs/themes
- Analytics tracking
- Accessibility improvements

## Dependencies

- React 18+
- Next.js 14+ (App Router)
- PropTypes for validation
- Fetch API (or axios if configured)

No external animation libraries needed - pure CSS and Canvas implementation.
