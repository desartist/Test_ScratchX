# Task 52: Dark Mode Verification Guide

## Dark Mode Color Palette

### Light Mode
- Background: #ffffff
- Text Primary: #010f44
- Text Muted: #999, #aaa
- Borders: #e0e0e0
- Buttons: linear-gradient(#ef9e1b, #d98e14)
- Cards: #f8f8f8
- Inputs: #f9f9f9

### Dark Mode (@media prefers-color-scheme: dark)
- Background: #0a0a0a, #1a1a1a
- Text Primary: #f5f5f5
- Text Muted: #aaa, #888
- Borders: rgba(255,255,255,0.1)
- Buttons: linear-gradient(#ef9e1b, #d68f1a) [same]
- Cards: #1a1a1a, #2a2a2a
- Inputs: #1a1a1a

## Component Testing

### Badge Component
- [ ] Light mode: colored backgrounds with contrasting text
- [ ] Dark mode: rgba backgrounds with light text
- [ ] All 7 variants (default, active, ending-soon, ended, pending, warning, success)
- [ ] Readable on both themes

### ProgressBar Component
- [ ] Light: white bg, #e0e0e0 border
- [ ] Dark: #2a2a2a bg, rgba(255,255,255,0.1) border
- [ ] Fill colors visible on both
- [ ] Icons (⚠️, ⛔) clear

### StatCard Component
- [ ] Light: white bg with colored borders
- [ ] Dark: #1a1a1a bg with colored borders
- [ ] Numbers: large and readable
- [ ] Skeleton animations work

### LocationStatus Component
- [ ] Spinner: orange in both modes
- [ ] Checkmark: visible on both
- [ ] Text: readable

### CountdownTimer Component
- [ ] Green (>120s): #00b0b1 visible on both
- [ ] Yellow (60-120s): #ff9800 visible on both
- [ ] Red (<60s): #ff6b6b visible on both
- [ ] Pulse animations work

### FormButton Component
- [ ] Primary: orange gradient in both modes
- [ ] Secondary: navy in light, navy-with-orange in dark
- [ ] Outline: white/transparent background
- [ ] Hover effects smooth

### FormInput Component
- [ ] Light: light bg, dark text
- [ ] Dark: dark bg, light text
- [ ] Focus: border #ef9e1b in both
- [ ] Error: red in both
- [ ] Help text: readable

### Modal Component
- [ ] Light: white bg
- [ ] Dark: #1a1a1a bg
- [ ] Title: dark in light mode, light in dark mode
- [ ] Borders: subtle in both
- [ ] Close button: clear in both

## Page-Level Testing

### Scan Page (Mobile)
- [ ] Light: white bg with dark text
- [ ] Dark: #0a0a0a with light text
- [ ] Buttons: orange gradients
- [ ] No contrast issues

### Scratch Card Page
- [ ] Card: orange gradient (stands out on both)
- [ ] Timer: color changes visible
- [ ] Text: readable on both
- [ ] Canvas: visible

### Coupon Page
- [ ] Card: prominent on both backgrounds
- [ ] Title/Value: large and readable
- [ ] Terms: readable
- [ ] Buttons: clear

### Campaign Page
- [ ] Cards: white on light, #1a1a1a on dark
- [ ] Badges: visible on both
- [ ] Progress bars: readable on both
- [ ] Grid: responsive

### Dashboard Page
- [ ] Stats grid: white cards on light, dark cards on dark
- [ ] Text: readable
- [ ] Shadows: visible on both

### Create Campaign Page
- [ ] Form: light on light, dark on dark
- [ ] Inputs: readable
- [ ] Buttons: orange gradients
- [ ] Messages: success/error colors visible

### Campaign Live Page
- [ ] Container: appropriate color
- [ ] QR code: scannable on both
- [ ] Info card: readable
- [ ] Buttons: clear

## Accessibility Checks

### Contrast Ratios
- [ ] All primary text: >12:1 ✓
- [ ] All interactive text: >4.5:1 ✓
- [ ] Muted text: >4.5:1 ✓

### Focus States
- [ ] Focus outline: #ef9e1b (orange)
- [ ] Visible on light and dark
- [ ] Sufficient thickness

### Color Blind Safe
- [ ] Timer: uses colors + text labels
- [ ] Status: uses colors + icons + text
- [ ] Errors: red + icon + text
- [ ] Success: green + icon + text

## Smooth Transitions

- [ ] No flashing when switching modes
- [ ] All components update simultaneously
- [ ] Colors transition smoothly
- [ ] System preference respected (@media prefers-color-scheme: dark)

## Testing Procedure

1. **Enable Dark Mode** via browser/OS settings
2. **Test each page**:
   - Dashboard → visible and readable
   - Campaigns → colors appropriate
   - Stores → shadows visible
   - Create Campaign → form usable
   - Campaign Live → QR visible
   - Scan Flow → mobile-friendly on dark
   - Scratch Card → card prominent
   - Coupon → all text readable

3. **Switch back to light mode** - verify no issues
4. **Rapid toggle** - check for flickering
5. **Test on multiple devices**:
   - Desktop (Chrome DevTools)
   - Mobile (system setting)

## Known Dark Mode Implementation Details

### Files Updated
- `components/dashboard/Badge.module.css` ✓
- `components/dashboard/ProgressBar.module.css` ✓
- `components/dashboard/StatCard.module.css` ✓
- `components/customer/LocationStatus.module.css` ✓
- `components/customer/CountdownTimer.module.css` ✓
- `components/common/FormButton.module.css` ✓
- `components/common/FormInput.module.css` ✓
- `components/common/Modal.module.css` ✓
- `components/layouts/DashboardLayout.module.css` ✓
- All page CSS modules ✓

### Color Scheme Strategy
- Use CSS variables from globals.css where available
- Add @media (prefers-color-scheme: dark) blocks
- Maintain sufficient contrast in both modes
- Same button gradients for brand consistency
- Darker backgrounds for cards/inputs in dark mode
- Lighter text colors for dark mode

## Verification Checklist
- [ ] All components render correctly in dark mode
- [ ] All pages readable in both light and dark
- [ ] No hardcoded colors without dark variants
- [ ] Contrast ratios meet WCAG AA
- [ ] Transitions are smooth
- [ ] System preference respected
- [ ] Mobile dark mode works
- [ ] Focus states visible
