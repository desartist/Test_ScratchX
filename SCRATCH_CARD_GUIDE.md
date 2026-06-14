# Scratch Card - Quick Start Guide

## What's New

A complete scratch card system with interactive reveal animation, countdown timer, and redemption flow for coupon campaigns.

## Files Created

```
components/customer/
  ├── ScratchCard.js           (12.5KB) - Main component
  ├── ScratchCard.module.css   (9.7KB)  - Styling
  └── ScratchCard.test.js      (16KB)   - Tests

app/scratch-card/[scratchCardId]/
  ├── page.js                  - Page component
  └── page.module.css          - Page styling
```

## Quick Start

### 1. Import and Use

```jsx
import ScratchCard from '@/components/customer/ScratchCard';

export default function ParticipationPage({ scratchCardId, participationId }) {
  return (
    <ScratchCard 
      scratchCardId={scratchCardId}
      participationId={participationId}
      onRedeemSuccess={(data) => console.log('Redeemed!', data)}
    />
  );
}
```

### 2. Access via URL

Navigate to: `/scratch-card/[scratchCardId]`

The page will:
- Load the scratch card data via API
- Render the interactive card
- Handle all user interactions
- Manage redemption flow

## Component States

1. **Loading** - Initial data fetch
2. **Generating** - Ready to scratch with canvas overlay
3. **Revealed** - Shows reward after 30% scratched
4. **Redeemed** - Success message after redemption
5. **Expired** - Timer reached zero
6. **Error** - API failure or validation error

## Key Features

### Canvas Scratch Animation
- Real-time reveal on mouse/touch drag
- ~30% threshold triggers full reveal
- Smooth pixel-by-pixel clearing effect

### 5-Minute Timer
- Countdown display: "4:55"
- Color coding:
  - Green (>2 min)
  - Yellow (1-2 min)
  - Red (<1 min) with pulse animation
- Auto-expire when timer hits zero

### Reward Display (Revealed)
- Bold, prominent display
- Shows: Type, Value, Description
- Yellow background for visibility
- On mobile: Optimized sizing

### Redemption Button
- Only visible when:
  - Card is revealed
  - Timer hasn't expired
- Loading state during API call
- Success confirmation with details

### Responsive Design
- Desktop: 320px max-width card
- Tablet: Full width, adjusted padding
- Mobile: Touch-optimized, enlarged buttons
- Dark mode support included

## API Endpoints Used

### POST /api/customer/scratch/generate
Called automatically on mount.
```json
{
  "participationId": "string"
}
```

### POST /api/customer/scratch/reveal
Called when ~30% scratched.
```json
{
  "scratchCardId": "string",
  "participationId": "string"
}
```

### POST /api/customer/scratch/redeem
Called when user clicks "Redeem Now".
```json
{
  "scratchCardId": "string",
  "participationId": "string"
}
```

## Testing

Run tests:
```bash
npm test ScratchCard.test.js
```

Test coverage includes:
- All state transitions
- API integration
- Timer countdown
- Scratch detection
- Mobile responsiveness
- Error handling

## Styling Customization

### Colors
Edit `ScratchCard.module.css` for:
- Timer colors: `.timerGreen`, `.timerYellow`, `.timerRed`
- Reward section: `.rewardSection`
- Button: `.redeemButton`

### Sizing
- Card width: `.card { max-width: 320px }`
- Canvas height: `.scratchCanvas { height: 200px }`
- Button padding: `.redeemButton { padding: 14px 20px }`

### Animations
- Reveal: `@keyframes scaleIn`
- Timer pulse: `@keyframes pulse`
- Scratch hint fade: `@keyframes fadeInUp`

## Props Reference

```javascript
<ScratchCard
  // Required
  scratchCardId="string"          // Database ID
  participationId="string"        // Customer participation ID

  // Optional
  onRedeemSuccess={function}      // Called on successful redemption
/>
```

## Error Handling

The component handles:
- Network errors - Shows error message
- API failures - Displays specific error
- Invalid responses - Shows generic error
- Expired cards - Shows expiry state
- Invalid IDs - Shows not found error

Users can see what went wrong and understand next steps.

## Dark Mode

Automatically adapts to system preferences:
```css
@media (prefers-color-scheme: dark) {
  /* Dark variants for all elements */
}
```

No configuration needed - works automatically.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with ES6 support
- Touch events supported on all devices

## Performance

- Component: ~12.5KB (minified)
- CSS: ~9.7KB (module scoped)
- No external dependencies
- Canvas optimized for smooth scratching
- Cleanup on unmount prevents memory leaks

## Accessibility

Features:
- Semantic HTML
- PropTypes validation
- High contrast text
- Touch-friendly sizing
- Keyboard navigation ready
- Error messages visible

## Common Use Cases

### 1. Campaign Participation Page
```jsx
import ScratchCard from '@/components/customer/ScratchCard';

export default function CampaignPage({ params }) {
  const { participationId } = params;
  
  return (
    <ScratchCard
      scratchCardId={participationId}
      participationId={participationId}
    />
  );
}
```

### 2. With Success Handling
```jsx
const handleSuccess = (data) => {
  // Show celebration
  showConfetti();
  
  // Update user state
  setCouponCode(data.couponCode);
  
  // Redirect after delay
  setTimeout(() => router.push('/dashboard'), 3000);
};

return (
  <ScratchCard
    scratchCardId={id}
    participationId={id}
    onRedeemSuccess={handleSuccess}
  />
);
```

### 3. With Custom Wrapper
```jsx
export default function ScratchCardPage() {
  return (
    <div className="page">
      <header>
        <h1>Scratch Your Reward</h1>
        <p>Drag to reveal what you've won!</p>
      </header>
      
      <ScratchCard {...props} />
      
      <footer>
        <p>Terms apply. Valid for 5 minutes.</p>
      </footer>
    </div>
  );
}
```

## Troubleshooting

### Canvas Not Appearing
- Check browser console for errors
- Ensure canvas is within viewport
- Verify scratchCardId is valid

### Timer Not Counting Down
- Check browser tab is active
- Verify no errors in console
- Confirm JavaScript is enabled

### API Calls Failing
- Check network tab in DevTools
- Verify correct participationId
- Check API endpoint accessibility

### Touch Not Working
- Ensure touch events are enabled
- Check for CSS `pointer-events: none`
- Verify touch-action CSS

## File Structure

```
coupon_campaigns/
├── components/customer/
│   ├── ScratchCard.js          ← Main component
│   ├── ScratchCard.module.css  ← Styling
│   └── ScratchCard.test.js     ← Tests
├── app/scratch-card/
│   └── [scratchCardId]/
│       ├── page.js             ← Page route
│       └── page.module.css     ← Page styling
├── SCRATCH_CARD_IMPLEMENTATION.md  ← Full docs
└── SCRATCH_CARD_GUIDE.md            ← This file
```

## Next Steps

1. Test the component in your application
2. Customize colors/styling as needed
3. Update your campaign flow to use the new component
4. Monitor performance and user engagement
5. Gather feedback and iterate

## Support

For issues or questions, refer to:
- `SCRATCH_CARD_IMPLEMENTATION.md` - Technical details
- Component test file - Usage examples
- API route files - Endpoint documentation
