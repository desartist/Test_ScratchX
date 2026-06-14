# Task 60: Create Campaign Multi-Step Form Redesign - Implementation Plan

**Date**: June 4, 2026  
**Task**: 60 - Create Campaign Multi-Step Form Implementation  
**Status**: Starting Implementation  
**Figma Reference**: Create Campaign Page (Page 4) from Figma link  

---

## Current State Analysis

**Component Structure**:
- `app/(dashboard)/campaign/new/page.js` - Single page form component
- `page.module.css` - Form styling
- Uses single-step form with all fields on one page
- Basic validation and API integration

**Current JSX Structure**:
```jsx
<div className={styles.container}>
  <header with back button and title>
  <form with:
    - campaignName (text input)
    - description (textarea)
    - startDate (date input)
    - endDate (date input)
  />
</div>
```

**Current Fields**:
- Campaign Name ✓
- Description (not in Figma)
- Start Date ✓
- End Date ✓

**API Integration**:
- ✅ POST `/api/campaign/create` with auth headers
- ✅ Basic validation
- ✅ Error/success messaging
- ✅ Redirect after creation

---

## Figma Design Requirements

**Multi-Step Form Structure**:

### **STEP 1: Campaign Details**
```
Title: "Create Your Campaign"
Subtitle: "Let's launch your first campaign"

Fields:
1. Campaign Name * (text input, placeholder: "E.g. Summer Special")
2. Campaign Duration (two columns):
   - Start Date (date input with calendar icon)
   - End Date (date input with calendar icon)
3. Number of Display Coupons (dropdown)

Button: "Save & Continue" (gray background, navy text)
```

### **STEP 2: Setup Billing Range**
```
Title: "Setup Billing Range"
Subtitle: "Customers will receive rewards based on their purchase range."

Sections:
1. Range 1 [with edit icon]
   - Min. Amount (₹) input
   - Max. Amount (₹) input

2. Range 2 [with edit icon]
   - Min. Amount (₹) input
   - Max. Amount (₹) input

3. Range 3 → [+ Add more range]

4. Set Reward Cards (Range 1)
   - Section title with description
   - Coupon cards list
   - Each card shows:
     - Coupon name
     - Reward Type (dropdown: Fixed Amount, Percentage, etc.)
     - Reward Amount (input)

Button: "Preview & Launch" (orange gradient background, white text)
```

### **STEP 3: Campaign Preview**
```
Title: "Review & Launch"
Subtitle: "Review your campaign details before launching"

Display:
- Campaign name
- Duration
- Billing ranges summary
- Reward cards summary

Button: "Launch Campaign" (orange gradient)
```

**Layout Specifications**:
- Container: Card-based, ~600px wide, centered
- Background: #FCFDFF
- Card padding: 24px
- Card background: White (#FFFFFF) or light gray (#F9F9F9)
- Border-radius: 8-10px
- Box shadow: subtle (0 2px 8px rgba(0,0,0,0.08))

**Step Indicator**:
- Display at top: "Step 1 of 3", "Step 2 of 3", etc.
- Font: 12px, gray, uppercase
- Positioning: Above title
- Optional visual: Progress bar or step dots

**Color Specifications**:
- Background: #FCFDFF (light page background)
- Card background: #FFFFFF (white)
- Field background: #F9F9F9 (very light gray for cards/sections)
- Borders: #E8E8E8 (light gray)
- Primary text: #010F44 (navy)
- Secondary text: #637080 (muted gray)
- Required indicator: Red (*)
- Button primary: Orange gradient (#FFA500 → #F59E0B)
- Button secondary: Gray (#CCCCCC)

**Typography**:
- Title: 28px, 800 weight, Afacad, navy
- Subtitle: 14px, 400 weight, Afacad Flux, gray
- Labels: 14px, 500 weight, Afacad, navy
- Input text: 14px, 400 weight, Afacad
- Helper text: 12px, 400 weight, gray

**Input Field Specifications**:
- Height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Border-radius: 6px
- Focus: Orange border (#FFA500), 3px shadow ring
- Placeholder color: #999999
- Background: #FFFFFF
- Font: 14px, 400 weight

**Date Input**:
- Calendar icon: Right-aligned
- Icon size: 20x20px
- Icon color: #999999
- Placeholder: "DD/MM/YYYY"

**Dropdown Specifications**:
- Height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Arrow icon on right
- Background: white
- Options: Light gray hover state

**Button Specifications**:
- Step 1 button: "Save & Continue"
  - Background: #CCCCCC (gray)
  - Color: #010F44 (navy)
  - Width: 100% (full card width)
  - Height: 48px
  - Border-radius: 6px
  - Font: 14px, 600 weight
  - Hover: darker gray
- Step 2 button: "Preview & Launch"
  - Background: Orange gradient (#FFA500 → #F59E0B)
  - Color: #FFFFFF (white)
  - Same sizing as above

**Edit Icon**:
- Size: 16x16px
- Color: #999999
- Hover: #010F44
- Cursor: pointer

**Coupon Card** (in reward section):
- Background: #F9F9F9 (very light gray)
- Padding: 12px
- Border-radius: 6px
- Margin-bottom: 12px
- Layout: Flexbox with space-between

**Spacing**:
- Section to section: 28px
- Field to field: 16px
- Card padding: 24px
- Row gap: 16px between columns
- Header to content: 20px

---

## Implementation Strategy

### Phase 1: CSS Refinement
1. Update `.container` styling to match Figma specs
2. Add step indicator styling
3. Add multi-step form styling
4. Update button styling (gray and orange variants)
5. Add coupon card styling
6. Verify responsive design

### Phase 2: Form Logic Implementation
1. Convert single-form state to multi-step state
2. Implement step navigation (next/prev buttons)
3. Add form data persistence between steps
4. Implement validation per step
5. Add form submission logic for multi-step flow

### Phase 3: Step Components
1. Create Step 1: Campaign Details component
2. Create Step 2: Billing Range component
3. Create Step 3: Campaign Preview component
4. Implement step switching logic

### Phase 4: API Integration
1. Verify Step 1 creates campaign draft
2. Implement Step 2 updates campaign with billing ranges
3. Implement Step 3 launches campaign
4. Add error handling per step

---

## Files to Modify

### 1. `app/(dashboard)/campaign/new/page.module.css`
**Updates Needed**:
- Container background and styling
- Step indicator styling
- Form card styling
- Button variants (gray, orange)
- Coupon card styling
- Input field focus states
- Responsive breakpoints
- Dark mode support

### 2. `app/(dashboard)/campaign/new/page.js`
**Changes Required**:
- Convert to multi-step form with state management
- Add `currentStep` state (1, 2, 3)
- Add `formData` state for all steps
- Add step-specific validation
- Implement next/previous navigation
- Create step components or conditional rendering
- Update form submission to handle multi-step flow
- Preserve all API calls and auth logic

### 3. **New Components** (Optional, can be in main file)
- StepIndicator component
- StepOneForm component
- StepTwoForm component
- StepThreeForm component

---

## Form Data Structure

```javascript
const [formData, setFormData] = useState({
  // Step 1: Campaign Details
  campaignName: '',
  startDate: '',
  endDate: '',
  displayCoupons: 6, // default number

  // Step 2: Billing Ranges
  billingRanges: [
    { id: 1, minAmount: 500, maxAmount: 999 },
    { id: 2, minAmount: 2000, maxAmount: null },
  ],

  // Step 2: Reward Cards
  rewardCards: [
    {
      id: 1,
      rangeId: 1,
      couponName: 'Coupon 1',
      rewardType: 'fixed_amount', // or 'percentage'
      rewardAmount: 50,
    },
    // ... more cards
  ],
});
```

---

## Validation Rules

**Step 1 Validation**:
- ✅ Campaign name required and min 3 characters
- ✅ Start date required
- ✅ End date required
- ✅ End date must be after start date
- ✅ Display coupons selected

**Step 2 Validation**:
- ✅ At least one billing range
- ✅ Min amount required
- ✅ Max amount optional (for last range)
- ✅ Min < Max when both provided
- ✅ At least one reward card per range

**Step 3**:
- ✅ Review and confirm (no additional validation)

---

## API Calls

**Step 1 → Step 2**:
- Creates campaign draft with basic info
- Stores ID for subsequent updates

**Step 2 → Step 3**:
- Updates campaign with billing ranges
- Updates campaign with reward cards
- Validates data

**Step 3 → Launch**:
- Updates campaign status to "active"
- Redirects to campaign details page

---

## Logic Preservation

✅ **Preserved**:
- Authentication headers (x-user-id, x-user-role)
- Error handling and user feedback
- Success messaging
- Redirect logic
- API endpoint contracts

⚠️ **Changes**:
- Form structure: Single → Multi-step
- Form submission: One step → Three steps
- State management: Simple → Complex with multiple fields
- Validation: Simple → Per-step validation

---

## Responsive Design

**Desktop (1024px+)**:
- Card width: 600px, centered
- Two-column layouts for ranges
- Full-width buttons

**Tablet (768px-1023px)**:
- Card width: 95%, max 600px
- Single-column layouts
- Full-width buttons

**Mobile (< 768px)**:
- Card width: 90%, max 500px
- Padding reduced
- Font sizes reduced
- Full-width buttons

---

## Expected Components

### Step 1: Campaign Details
```jsx
<div className={styles.stepOneForm}>
  <input name="campaignName" ... />
  <div className={styles.dateRow}>
    <input type="date" name="startDate" ... />
    <input type="date" name="endDate" ... />
  </div>
  <select name="displayCoupons" ... />
  <button onClick={handleNextStep}>Save & Continue</button>
</div>
```

### Step 2: Billing Range
```jsx
<div className={styles.stepTwoForm}>
  {/* Range sections */}
  {billingRanges.map(range => (
    <div className={styles.rangeSection}>
      <input name="minAmount" ... />
      <input name="maxAmount" ... />
    </div>
  ))}
  
  {/* Reward cards section */}
  <div className={styles.rewardCardsSection}>
    {rewardCards.map(card => (
      <div className={styles.couponCard}>
        <input name="couponName" ... />
        <select name="rewardType" ... />
        <input name="rewardAmount" ... />
      </div>
    ))}
  </div>
  
  <button onClick={handlePrevStep}>Back</button>
  <button onClick={handleNextStep}>Preview & Launch</button>
</div>
```

### Step 3: Campaign Preview
```jsx
<div className={styles.stepThreeForm}>
  <div className={styles.summary}>
    <div>Campaign: {formData.campaignName}</div>
    <div>Ranges: {formData.billingRanges.length}</div>
    <div>Cards: {formData.rewardCards.length}</div>
  </div>
  
  <button onClick={handlePrevStep}>Back</button>
  <button onClick={handleLaunch}>Launch Campaign</button>
</div>
```

---

## Implementation Steps

1. ⏳ Create comprehensive CSS module updates
2. ⏳ Refactor page.js to support multi-step form
3. ⏳ Implement Step 1 (Campaign Details) validation
4. ⏳ Implement Step 2 (Billing Range) component
5. ⏳ Implement Step 3 (Campaign Preview) component
6. ⏳ Update API integration for multi-step flow
7. ⏳ Test form navigation and data persistence
8. ⏳ Test responsive design at all breakpoints
9. ⏳ Verify dark mode support
10. ⏳ Create completion document

---

## Success Criteria

✅ Multi-step form displays correctly
✅ Step indicator shows current step
✅ Step 1: Campaign Details form works
✅ Step 2: Billing Range form works  
✅ Step 3: Campaign Preview displays correctly
✅ Navigation between steps works
✅ Data persists between steps
✅ Validation works per step
✅ Form submission launches campaign
✅ Responsive design at all breakpoints
✅ Dark mode fully supported
✅ All API calls work correctly
✅ Error handling and user feedback works
✅ Success redirect works

---

**Status**: ✅ Analysis Complete  
**Next**: Proceed with CSS and JSX implementation

