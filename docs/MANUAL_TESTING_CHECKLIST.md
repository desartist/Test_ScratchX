# ScratchX Manual Testing Checklist

Complete end-to-end manual testing for the ScratchX customer journey, covering QR code scanning, location verification, participation, scratch card reveal, and redemption.

## 1. Setup Instructions

### Development Environment Setup

- [ ] Clone the repository and install dependencies: `npm install`
- [ ] Configure environment variables in `.env.local`:
  - `MONGODB_URI` - MongoDB connection string
  - `CRON_SECRET` - Secret for background job endpoints
  - `NEXT_PUBLIC_API_URL` - API base URL (e.g., http://localhost:3000)
- [ ] Start development server: `npm run dev` (runs on http://localhost:3000)
- [ ] Server should be accessible and database connected

### Seed Test Data

**Create Merchant Account**
- [ ] Login to merchant dashboard
- [ ] Create merchant account with:
  - Business Name: "Test Retail Store"
  - Email: Unique test email
  - Phone: 9876543210
  - Store Address: "123 Business Street, Mumbai"
  - GST Number: Valid format
  - Status: Active

**Create Store Location**
- [ ] Add store with location coordinates:
  - Store Name: "Test Store Mumbai"
  - Address: "123 Business Street, Mumbai, 400001"
  - Coordinates: [72.8479, 19.0760] (Mumbai center)
  - Contact: Manager name and phone
  - Status: Active

**Create Campaign**
- [ ] Create new campaign with:
  - Name: "Integration Test Campaign"
  - Description: "Manual testing campaign"
  - Start Date: Today
  - End Date: 30 days from now
  - Scratch Cards: 100
  - Status: Active
- [ ] Verify campaign shows in dashboard

**Create Reward Ranges**
- [ ] Add range 1:
  - Bill Amount: 500 - 1000
  - Reward Type: Discount
  - Reward Value: 100
  - Description: "Flat 100 discount"
  - Status: Active
- [ ] Add range 2:
  - Bill Amount: 1000 - 2000
  - Reward Type: Discount
  - Reward Value: 250
  - Description: "Flat 250 discount"
  - Status: Active

### Cron Job Configuration

- [ ] Set CRON_SECRET environment variable to a secure value
- [ ] Test cron endpoint at: `POST /api/cron/expiry?secret={CRON_SECRET}`
- [ ] Should return successful response with processed count

---

## 2. QR Code Testing

**QR Code Generation**
- [ ] Navigate to campaign details
- [ ] Click "Generate QR Code" button
- [ ] QR code displays correctly
- [ ] QR code is downloadable as image
- [ ] QR code contains campaign ID in URL encoding

**QR Code Scanning - iOS**
- [ ] Open iPhone camera app
- [ ] Point at QR code
- [ ] Tap notification to open URL
- [ ] Browser opens to `/scan/{campaignId}`
- [ ] Page loads without errors
- [ ] Campaign details display correctly

**QR Code Scanning - Android**
- [ ] Open Android camera app (or Google Lens)
- [ ] Point at QR code
- [ ] Tap link or "Open" option
- [ ] Browser opens to `/scan/{campaignId}`
- [ ] Page loads without errors
- [ ] Campaign details display correctly

**Verify Landing Page**
- [ ] After QR scan, landing page shows:
  - Campaign name and description
  - All reward ranges with bill amounts
  - "Participate Now" button
  - "View Terms" link
- [ ] No console errors
- [ ] Page responsive on mobile (375px)

---

## 3. Location Verification Testing

**Enable Geolocation**
- [ ] Before testing, enable GPS on phone (Settings > Location)
- [ ] Allow location access when browser prompts

**Location Verification - In Range (At Store)**
- [ ] Navigate to store location (use GPS to verify you're at store)
- [ ] Click "Participate Now" button
- [ ] See location verification prompt: "Checking your location..."
- [ ] Within 5 seconds: "Location verified ✓"
- [ ] Form becomes available for input
- [ ] Message shows: "You are 0 meters away from the store"

**Location Verification - Out of Range**
- [ ] Move 3+ km away from store (at least 3000 meters)
- [ ] Click "Participate Now" button
- [ ] See location verification prompt: "Checking your location..."
- [ ] Within 5 seconds: Error message appears
- [ ] Message shows: "This QR code is not valid at your current location"
- [ ] Shows actual distance (should be > 2000 meters)
- [ ] Form does NOT become available
- [ ] See "Retry" button to re-check location
- [ ] Can click "Retry" to check again after moving closer

**Location Permission Handling**
- [ ] Deny location permission when browser prompts
- [ ] See error: "Location permission denied"
- [ ] Option to "Enable Location" or "Continue Without Location"
- [ ] If user continues, show warning: "Location verification disabled"

**Location Accuracy**
- [ ] Test with GPS enabled (outdoor with clear sky)
- [ ] Distance shown should be within +/- 100 meters of actual distance
- [ ] Test with GPS in building (indoor)
- [ ] Should still show approximate distance (may be less accurate)

---

## 4. Participation Form Testing

**Valid Form Submission**
- [ ] Fill form with valid data:
  - Customer Name: "John Doe"
  - Mobile Number: "9876543210"
  - Email: "john@example.com"
  - Bill Amount: "750"
  - Check "I consent to share my data"
- [ ] Click "Submit"
- [ ] Form validates and submits
- [ ] See success message: "Participation recorded"
- [ ] Page transitions to scratch card generation
- [ ] participationId created in database

**Mobile Number Validation**
- [ ] Try 9 digits: "987654321" - Should show error
- [ ] Try 11 digits: "98765432100" - Should show error
- [ ] Try letters: "98765ABC10" - Should show error
- [ ] Try 10 digits: "9876543210" - Should succeed

**Email Validation**
- [ ] Try invalid format: "notanemail" - Should show error
- [ ] Try valid format: "user@example.com" - Should succeed
- [ ] Leave blank (optional) - Should succeed

**Bill Amount Validation**
- [ ] Try 400 with range 500-1000: Should show "Bill amount outside range"
- [ ] Try 2500 with range 1000-2000: Should show "Bill amount outside range"
- [ ] Try 750 with range 500-1000: Should succeed
- [ ] Try 1500 with range 1000-2000: Should succeed

**Required Field Validation**
- [ ] Leave Name blank: Show "Name is required"
- [ ] Leave Mobile blank: Show "Mobile is required"
- [ ] Leave Bill Amount blank: Show "Bill amount is required"
- [ ] Leave Consent unchecked: Show "Consent is required"

**Form Reset**
- [ ] Fill form completely
- [ ] Click "Clear" or "Reset" button
- [ ] All fields clear
- [ ] Consent checkbox unchecked

---

## 5. Scratch Card Testing

**Scratch Card Generation**
- [ ] After form submission, see: "Generating your scratch card..."
- [ ] Within 3-5 seconds, scratch card appears
- [ ] Scratch card displays:
  - Animated scratch effect
  - Hidden reward value (blurred/covered)
  - "Tap to Scratch" or "Click to Reveal" text

**Timer Display**
- [ ] Timer shows "5:00" (5 minutes)
- [ ] Timer is visually prominent
- [ ] Timer should countdown every second
- [ ] Observe at least 3 seconds of countdown (5:00 -> 4:57, etc.)

**Scratch Card Reveal - Desktop**
- [ ] Move mouse over scratch card
- [ ] Cursor changes to "scratching" cursor
- [ ] Click and drag to scratch away the cover
- [ ] Scratched area reveals reward underneath
- [ ] Animation is smooth (not jerky)
- [ ] After revealing ~70%, show "Tap to Reveal Fully"

**Scratch Card Reveal - Mobile**
- [ ] Tap and drag finger over card to scratch
- [ ] Reveal animation works smoothly
- [ ] After revealing ~70%, see "Tap to Reveal Fully"
- [ ] Tap again to fully reveal reward

**Reward Display**
- [ ] After full reveal, shows:
  - Reward type (e.g., "Discount")
  - Reward value (e.g., "100 rupees off")
  - Reward description
- [ ] Card updates status to "Revealed"
- [ ] "Redeem Now" button appears

**Expiry Timer Behavior**
- [ ] Timer continues counting down during scratch
- [ ] Timer continues counting down during reveal
- [ ] If timer reaches 0:00, see "Card Expired" message
- [ ] Redeem button becomes disabled

---

## 6. Redemption Testing

**Successful Redemption**
- [ ] After revealing card, click "Redeem Now" button
- [ ] See confirmation dialog: "Confirm Redemption"
- [ ] Click "Yes, Redeem" button
- [ ] Processing message: "Processing your reward..."
- [ ] Success message: "Reward redeemed successfully!"
- [ ] Show redemption details:
  - Reward type and value
  - Redemption ID (receipt number)
  - Date and time
  - "Share" button (to share reward)
  - "Done" button

**Redemption Without Reveal**
- [ ] Create new participation
- [ ] Try to click "Redeem" without revealing card
- [ ] Button should be disabled or show error: "Please reveal card first"

**Redemption of Expired Card**
- [ ] Create participation and scratch card
- [ ] Wait for 5+ minutes without clicking anything
- [ ] See "Card Expired" message
- [ ] Try to click "Redeem" button
- [ ] Button disabled or shows error: "Card has expired"
- [ ] Cannot redeem expired card

**Multiple Redemption Attempt**
- [ ] After redeeming a card once, try to redeem again
- [ ] Show error: "This card has already been redeemed"
- [ ] Button disabled

**Redemption Receipt**
- [ ] After successful redemption, show receipt with:
  - Participation ID
  - Customer name
  - Campaign name
  - Reward details
  - Redemption timestamp
  - QR code (for redemption verification)
- [ ] Receipt downloadable as PDF
- [ ] Receipt shareable via WhatsApp/SMS/Email

---

## 7. Expiry Testing

**5-Minute Expiry Timer**
- [ ] Create new participation (time = T)
- [ ] Generate scratch card (starts 5-minute timer)
- [ ] At T+4:00, card still valid, reveal works
- [ ] At T+4:30, card still valid, redeem works
- [ ] At T+5:01, see "Card Expired" message
- [ ] Redeem button disabled

**Expiry Without Revealing**
- [ ] Create participation
- [ ] Do NOT reveal or interact with card
- [ ] Wait 5+ minutes
- [ ] At T+5:01, see "Card Expired" message
- [ ] Card state updated to 'expired' in database

**Expiry Job (Cron Test)**
- [ ] Create multiple participations with scratch cards
- [ ] Let them expire naturally or manually trigger expiry
- [ ] Call `POST /api/cron/expiry?secret={CRON_SECRET}`
- [ ] Response should show:
  - `{ "success": true, "processedCount": X, "failedCount": 0 }`
- [ ] Verify in database that all expired cards have `status: 'expired'`
- [ ] Verify in dashboard that expired cards show as expired

**Timestamp Accuracy**
- [ ] Check database timestamps:
  - `generated_at` - When card was created
  - `revealed_at` - When card was revealed (null if not revealed)
  - `redeemed_at` - When card was redeemed (null if not redeemed)
  - `expires_at` - 5 minutes after generation
- [ ] All timestamps should be within +/- 2 seconds of actual time

---

## 8. Inventory Testing

**Inventory Tracking - Dashboard**
- [ ] Navigate to campaign dashboard
- [ ] See inventory display:
  - Allocated: 100
  - Used: (increases on each QR scan)
  - Remaining: (decreases on each QR scan)
  - Redeemed: (increases on each redemption)
- [ ] Numbers update in real-time or after refresh

**Inventory Consumption on QR Scan**
- [ ] Before QR scan, note remaining_scratch_cards in dashboard
- [ ] Scan QR code (do not complete participation)
- [ ] Remaining should decrease by 1
- [ ] Verify in database: `campaign.remaining_scratch_cards` decreased

**Inventory Redemption**
- [ ] Before redemption, note redeemed_scratch_cards
- [ ] Complete participation and redeem card
- [ ] Redeemed count increases by 1
- [ ] Remaining stays same or decreases appropriately
- [ ] Verify in database

**Inventory Math Consistency**
- [ ] Check that: `remaining = allocated - used - redeemed`
- [ ] After multiple operations:
  - Allocated: 100
  - Used: 10 (after 10 QR scans)
  - Redeemed: 7 (after 7 redemptions)
  - Remaining: Should be 83 (100 - 10 - 7)

**Inventory Audit Trail**
- [ ] Check ScratchCardTransaction collection in database
- [ ] Should have records for each:
  - QR scan (action_type: 'allocated_to_campaign')
  - Redemption (action_type: 'redeemed')
- [ ] Each record shows:
  - Previous balance
  - New balance
  - Timestamp
  - Created by user ID
  - IP address

---

## 9. Responsive Design Testing

**Mobile - iPhone (375px width)**
- [ ] QR code page responsive
- [ ] Participation form fields stack vertically
- [ ] Buttons full width and easily tappable (48px+ height)
- [ ] Scratch card scales to screen width
- [ ] Timer visible and readable
- [ ] Redeem button easily accessible
- [ ] No horizontal scrolling

**Mobile - Landscape (667px width)**
- [ ] Form fields and buttons adjust layout
- [ ] Scratch card visible without scrolling
- [ ] All interactive elements accessible
- [ ] No layout breaking

**Tablet - Portrait (768px width)**
- [ ] Form fields in 2-column layout (if designed)
- [ ] Scratch card larger and clear
- [ ] Button sizes appropriate
- [ ] Good spacing and readability

**Tablet - Landscape (1024px width)**
- [ ] Form fields optimally spaced
- [ ] Multi-column layout if applicable
- [ ] Scratch card prominent
- [ ] All elements have proper spacing

**Desktop (1280px+ width)**
- [ ] Full layout with optimal spacing
- [ ] Form fields reasonably sized
- [ ] Scratch card not too large (800px max width)
- [ ] All whitespace appropriate

**Touch Target Sizing**
- [ ] All buttons at least 44-48px height on mobile
- [ ] Form inputs easily tappable
- [ ] No buttons smaller than 40px width
- [ ] Adequate spacing between interactive elements (16px+)

---

## 10. Error Scenarios

**Inactive Campaign**
- [ ] Create campaign with status: 'paused' or 'draft'
- [ ] Try to scan QR code
- [ ] See error: "Campaign is not active"
- [ ] Cannot proceed to participation form

**Expired Campaign (Outside Date Range)**
- [ ] Create campaign with endDate in the past
- [ ] Try to scan QR code
- [ ] See error: "Campaign has ended"
- [ ] Cannot proceed

**Customer Location Outside Radius**
- [ ] At store location, participation works
- [ ] Move 3+ km away
- [ ] Try to proceed with participation
- [ ] See error: "Location verification failed - you are too far from store"
- [ ] Show actual distance
- [ ] Show option to "Retry" or "Close"

**No Inventory Available**
- [ ] Create campaign with remaining_scratch_cards: 0
- [ ] Scan QR code
- [ ] See error: "No scratch cards available for this campaign"
- [ ] No participation form shown

**Form Submission Failure**
- [ ] Fill form, disable internet/network
- [ ] Click submit
- [ ] See error: "Network error - unable to submit"
- [ ] Form data preserved
- [ ] Show "Retry" button

**Server Error (500)**
- [ ] Simulate server error during participation
- [ ] See error page: "Something went wrong"
- [ ] Error details shown (for debugging)
- [ ] Option to go back or retry

**Database Connection Error**
- [ ] Stop database connection temporarily
- [ ] Try to scan QR code
- [ ] See error: "Unable to load campaign"
- [ ] Graceful error message, not technical details

---

## 11. Browser Compatibility

**Chrome/Chromium (Latest)**
- [ ] All features work correctly
- [ ] Animations smooth
- [ ] Location API works
- [ ] QR code scan trigger works
- [ ] No console errors

**Safari - iOS (15+)**
- [ ] Website loads properly
- [ ] Location permission dialog shows
- [ ] GPS works (use device GPS)
- [ ] Scratch card animations smooth
- [ ] No layout issues
- [ ] Native camera QR scan integration works

**Firefox (Latest)**
- [ ] All features functional
- [ ] Location API works (may require permission)
- [ ] Form validation works
- [ ] Scratch animations perform well

**Edge (Latest)**
- [ ] All features work
- [ ] Animations smooth
- [ ] No compatibility issues with standard web APIs

**Safari - macOS (Latest)**
- [ ] Desktop experience works
- [ ] All features functional
- [ ] Responsive design still applies at 1280px

---

## 12. Mobile Native Testing

**iPhone - iOS 15+**
- [ ] Install latest iOS version
- [ ] Open Safari browser
- [ ] Scan QR code with Camera app
- [ ] Notification appears to open link
- [ ] App opens correctly
- [ ] Enable location in Settings > Privacy > Location Services
- [ ] Location works within app
- [ ] Scratch card interactive and smooth

**Android - API Level 30+ (Android 11+)**
- [ ] Install Android 11+
- [ ] Open browser (Chrome, Samsung Internet, Firefox)
- [ ] Use Google Lens or Camera app to scan
- [ ] Browser opens with correct URL
- [ ] Enable location: Settings > Apps > [Browser] > Permissions > Location
- [ ] Location works in app
- [ ] Scratch card works with touch

**Geolocation Permission Handling**
- [ ] First time: "Allow location?" dialog shows
- [ ] Choose "Allow" - location works
- [ ] Choose "Block" - show error message
- [ ] Second time: Remember previous choice
- [ ] Can change in Settings > Permissions

**Network Conditions**
- [ ] Test with 4G LTE network
- [ ] Test with 3G network (slower)
- [ ] Test with Wifi (should be fast)
- [ ] Form submission should work on all networks
- [ ] Timeout message if network too slow (>10 sec)

---

## 13. Performance & Edge Cases

**Slow Network Simulation**
- [ ] Use browser DevTools to throttle network (3G slow)
- [ ] QR scan page loads (may take 3-5 sec)
- [ ] Form submission shows loading state
- [ ] No timeout errors (should wait up to 10 sec)
- [ ] Success once network recovers

**Rapid Clicks**
- [ ] Click "Submit" button multiple times quickly
- [ ] Only one submission goes through
- [ ] No duplicate records created
- [ ] Button disabled during submission

**Offline Scenario**
- [ ] Turn off internet/WiFi
- [ ] Try to submit form
- [ ] See "Network error - offline"
- [ ] Data preserved locally
- [ ] "Retry" after re-connecting

**Session Timeout**
- [ ] Create participation form
- [ ] Leave page open for 30+ minutes
- [ ] Try to submit form
- [ ] May show "Session expired"
- [ ] Able to restart participation

**Large Forms**
- [ ] Add 10+ text fields to form
- [ ] All fields render properly
- [ ] Form scroll works
- [ ] Submit successful with all data

**Multiple Concurrent Users**
- [ ] Have 5+ testers simultaneously scan same QR code
- [ ] All create participations
- [ ] All receive unique participation IDs
- [ ] Inventory updates correctly (not race conditions)
- [ ] All can redeem independently

---

## 14. Data Validation & Security

**XSS Prevention**
- [ ] Try entering: `<script>alert('xss')</script>` in name field
- [ ] Data saved without executing script
- [ ] Page shows name as plain text

**SQL Injection Prevention**
- [ ] Try entering SQL: `'; DROP TABLE campaigns; --` in name field
- [ ] No database error
- [ ] Data saved as plain text

**Email Validation**
- [ ] Valid emails: user@example.com, test.user@domain.co.uk
- [ ] Invalid emails: notanemail, @example.com, user@
- [ ] Case insensitive (converts to lowercase)

**Phone Number Format**
- [ ] Accepted: 10 digits only (9876543210)
- [ ] Rejected: +91 prefix, spaces, dashes

**Data Privacy - Consent**
- [ ] Without consent checkbox, cannot submit
- [ ] With consent, data saved to database
- [ ] Consent preference persisted per user
- [ ] Can view stored data (if user account created)

**Timestamp Integrity**
- [ ] Check all timestamps use server time (not client time)
- [ ] No discrepancies when clients in different timezones
- [ ] All times consistent across database views

---

## 15. Accessibility & UX

**Color Contrast**
- [ ] All text has sufficient contrast (WCAG AA)
- [ ] Use tools like WAVE or axe DevTools
- [ ] Form labels clearly visible
- [ ] Buttons clearly visible

**Keyboard Navigation**
- [ ] Can tab through all form fields
- [ ] Tab order logical and follows visual flow
- [ ] Can submit form with Enter key
- [ ] Can close dialogs with Escape key

**Screen Reader Testing**
- [ ] Test with NVDA (Windows) or JAWS
- [ ] Form labels announced correctly
- [ ] Button purposes clear
- [ ] Error messages read aloud
- [ ] Success messages read aloud

**Font Readability**
- [ ] Text size at least 16px on mobile
- [ ] Line height adequate (1.5+)
- [ ] Font family readable (sans-serif preferred)
- [ ] No excessive line lengths (600px max)

**Loading States**
- [ ] Show loading spinner during form submit
- [ ] Disable button during loading
- [ ] Show progress for slow operations
- [ ] No layout shift when loading states change

**Error Message Quality**
- [ ] Errors specific (not "Something went wrong")
- [ ] Errors actionable (tell user how to fix)
- [ ] Errors close to related field
- [ ] Errors visible on screen (not below fold)

---

## Final Verification Checklist

- [ ] All 100+ test items checked and passing
- [ ] No console errors (F12 DevTools)
- [ ] No network errors (Network tab shows 200 status)
- [ ] Database contains correct data
- [ ] Timestamps consistent
- [ ] Inventory math correct
- [ ] All user journeys complete
- [ ] No critical bugs found
- [ ] Performance acceptable (<2 sec page load)
- [ ] Mobile experience smooth and usable

**Tester Name:** ___________________

**Date Tested:** ___________________

**Overall Result:** ☐ PASS ☐ FAIL ☐ NEEDS FIXES

**Issues Found (if any):**
- Issue 1: ...
- Issue 2: ...

**Sign-off:** ___________________
