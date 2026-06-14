# 🚀 ScratchX Figma Implementation Roadmap

**Status:** IMPLEMENTATION STARTED  
**Start Date:** June 4, 2026  
**Target Completion:** June 18, 2026 (2 weeks)  

---

## 📋 Implementation Phases

### **PHASE 1: FOUNDATION** ✅ COMPLETE
- ✅ Design system tokens created (globals.css)
- ✅ Color palette finalized
- ✅ Typography system established
- ✅ Spacing scale documented
- ✅ Shadow & border radius defined

### **PHASE 2: P0 PAGES (CRITICAL - Customer Flow)** 🔄 IN PROGRESS
**Priority:** HIGHEST - Core customer experience  
**Timeline:** Days 1-2  
**Pages:**
1. Customer Scan Page (`/scan/[campaignId]`)
2. Coupon Redemption Page (`/coupon/:couponId`)
3. Participation Form (`/participate`)

**Deliverables:**
- Mobile-optimized layouts
- Full responsive design (320px-1024px)
- Dark mode support
- Accessibility compliance

### **PHASE 3: P1 PAGES (HIGH - Dashboard/Management)** ⏳ UPCOMING
**Timeline:** Days 3-5  
**Pages:**
1. Merchant Dashboard (`/dashboard`)
2. Campaign Listing (`/campaign`)
3. Campaign Create (`/campaign/new`)
4. Campaign Live (`/campaign/:id/live`)
5. Store Listing (`/stores`)
6. Store Create (`/stores/create`)
7. Store Detail (`/stores/:id`)
8. Analytics Pages

**Deliverables:**
- Responsive grid layouts
- Data visualization matching Figma
- Form styling updates
- Dark mode support

### **PHASE 4: P2 PAGES (MEDIUM - Analytics/Secondary)** ⏳ UPCOMING
**Timeline:** Days 6-8  
**Pages:**
1. Analytics Dashboard
2. Inventory Management
3. Billing & Subscription
4. Reports & Exports

### **PHASE 5: P3 PAGES (LOW - Placeholder/Admin)** ⏳ DEFERRED
**Pages:** Admin features, settings, configuration pages  
**Timeline:** Week 2+  

---

## 🎯 Implementation Strategy

### **File Organization**
```
app/
├── globals.css (Design tokens) ✅
├── (dashboard)/
│   ├── campaign/
│   │   ├── page.js → UPDATE
│   │   ├── campaign.module.css → UPDATE
│   │   ├── [id]/
│   │   │   └── live/
│   │   │       ├── page.js → UPDATE
│   │   │       └── page.module.css → UPDATE
│   │   └── new/
│   │       ├── page.js → UPDATE
│   │       └── page.module.css → UPDATE
│   ├── stores/
│   │   ├── page.js → UPDATE ✅ (Added button)
│   │   ├── page.module.css → UPDATE ✅
│   │   ├── create/
│   │   │   ├── page.js → UPDATE
│   │   │   └── page.module.css → UPDATE
│   │   └── [id]/
│   │       ├── page.js → UPDATE
│   │       └── page.module.css → UPDATE
│   └── dashboard/
│       ├── page.js → UPDATE
│       └── page.module.css → UPDATE
├── (client)/
│   ├── scan/
│   │   ├── [campaignId]/
│   │   │   ├── page.js → UPDATE
│   │   │   └── page.module.css → UPDATE (Task 63)
│   ├── campaign/
│   │   └── [campaignId]/
│   │       ├── scratch/
│   │       │   ├── page.js → UPDATE
│   │       │   └── page.module.css → UPDATE (Task 64)
│   │       └── participate/
│   │           ├── page.js → UPDATE
│   │           └── page.module.css → UPDATE
│   └── coupon/
│       └── [couponId]/
│           ├── page.js → UPDATE
│           └── page.module.css → UPDATE
└── components/
    ├── dashboard/ (Update components)
    ├── stores/ (Update components)
    ├── forms/ (Update components)
    └── common/ (Update shared components)
```

### **Update Pattern**
For each page/component:
1. Read current implementation
2. Compare with Figma design
3. Update CSS Module with new design tokens
4. Update JSX structure if needed (minimize changes)
5. Preserve all API calls and business logic
6. Test responsive design

---

## 🔄 Task Breakdown

### **P0 Pages (3 pages)**

#### Task: Customer Scan Page
- **File:** `app/(client)/scan/[campaignId]/page.js`
- **Status:** Specification Ready (TASK_63_CUSTOMER_SCANNING_IMPLEMENTATION.md)
- **Requirements:** Mobile-first, 50/50 desktop layout
- **Estimated Time:** 1 hour

#### Task: Coupon Grid Selection
- **File:** `app/(client)/campaign/[campaignId]/scratch/page.js`
- **Status:** Specification Ready (TASK_64_COUPON_GRID_IMPLEMENTATION.md)
- **Requirements:** 3-column grid, golden background
- **Estimated Time:** 1 hour

#### Task: Participation Form
- **File:** `app/(client)/campaign/[campaignId]/participate/page.js`
- **Status:** Needs Specification
- **Requirements:** Form layout per Figma
- **Estimated Time:** 1.5 hours

---

### **P1 Pages (8 pages)**

#### Task: Merchant Dashboard
- **Current:** Basic card grid
- **Figma:** Header, stats grid, inventory card, charts
- **Estimated Time:** 2 hours

#### Task: Campaign Listing
- **Current:** Updated with new CampaignCard ✅
- **Figma:** Card redesign (COMPLETE), Grid layout ✅
- **Status:** DONE
- **Estimated Time:** 0 hours (already complete from Tasks 58-59)

#### Task: Campaign Create
- **Current:** Multi-step form
- **Figma:** Wizard-style form
- **Estimated Time:** 2 hours

#### Task: Campaign Live
- **Current:** Basic layout
- **Figma:** Campaign summary, QR display
- **Estimated Time:** 1.5 hours

#### Task: Store Listing
- **Current:** Card-based grid ✅
- **Figma:** Similar to campaigns
- **Status:** Button added ✅
- **Estimated Time:** 1.5 hours

#### Task: Store Create
- **Current:** Multi-step form
- **Figma:** Wizard with geolocation
- **Estimated Time:** 2 hours

#### Task: Store Detail
- **Current:** Store profile
- **Figma:** Updated layout
- **Estimated Time:** 1.5 hours

#### Task: Analytics
- **Current:** Basic metrics
- **Figma:** Charts and visualizations
- **Estimated Time:** 2 hours

---

## 📊 Progress Tracking

### **Completed** ✅
- [x] Design system tokens (globals.css)
- [x] Campaign Listing page (Task 59)
- [x] Campaign Card component (Task 59)
- [x] Dashboard page (Task 58)
- [x] Store Listing with Create button (Task done)

### **In Progress** 🔄
- [ ] P0 Pages (Customer Scan, Coupon Grid, Participate)

### **Pending** ⏳
- [ ] P1 Pages (8 dashboard pages)
- [ ] P2 Pages (Analytics, Billing, Inventory)
- [ ] P3 Pages (Admin, Settings)
- [ ] Comprehensive testing
- [ ] Cross-browser validation
- [ ] Dark mode verification

---

## ✨ Quality Checklist

For each page/component:
- [ ] Figma design matched pixel-perfect
- [ ] All color tokens used (no hardcoded hex values)
- [ ] Typography matches Figma specs
- [ ] Spacing uses CSS variables
- [ ] Responsive at all breakpoints (320px, 480px, 768px, 1024px)
- [ ] Dark mode fully supported
- [ ] All API calls preserved
- [ ] All validation logic intact
- [ ] Business logic unchanged
- [ ] No console errors
- [ ] Accessibility compliance (WCAG 2.1)
- [ ] Performance optimized (no unnecessary re-renders)

---

## 🚦 Next Immediate Actions

### **RIGHT NOW (Next 2 Hours)**
1. [ ] Implement Customer Scan Page CSS (Task 63)
2. [ ] Implement Coupon Grid Page CSS (Task 64)
3. [ ] Create Participation Form spec
4. [ ] Update Customer Scan JSX
5. [ ] Update Coupon Grid JSX

### **TODAY (Remaining time)**
1. [ ] Finalize P0 pages
2. [ ] Test all P0 pages mobile/desktop
3. [ ] Verify dark mode
4. [ ] Start P1 pages

### **THIS WEEK**
1. [ ] Complete all P1 pages
2. [ ] Implement analytics
3. [ ] Comprehensive testing
4. [ ] Bug fixes and polish

---

## 📝 Documentation Provided

Reference these files during implementation:
- **AUDIT_REPORT.md** - Complete page inventory
- **DESIGN_SYSTEM_SPEC.md** - Design tokens and specs
- **COMPONENT_MANIFEST.md** - Component library
- **TASK_63_CUSTOMER_SCANNING_IMPLEMENTATION.md** - Customer Scan spec
- **TASK_64_COUPON_GRID_IMPLEMENTATION.md** - Coupon Grid spec
- **FIGMA_ALIGNMENT_UPDATE.md** - Store/Campaign button update

---

## 🎯 Success Metrics

### **Visual**
- ✅ All pages pixel-perfect to Figma
- ✅ Consistent design language across app
- ✅ Proper use of design tokens
- ✅ Responsive at all breakpoints

### **Functional**
- ✅ All APIs working identically
- ✅ No broken business logic
- ✅ All validation intact
- ✅ Navigation working
- ✅ Forms submitting correctly

### **Technical**
- ✅ No hardcoded colors (use CSS variables)
- ✅ No inline styles (use CSS Modules)
- ✅ Proper component structure
- ✅ Clean, maintainable code
- ✅ No performance regressions

---

**Ready to proceed with P0 pages implementation!**

