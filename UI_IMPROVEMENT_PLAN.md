# HandyCall UI Improvement Plan

## Overview
Transform the HandyCall application UI to be more simplistic and polished with:
- Smooth transitions and animations
- Logo integration (SVG with words in headers, icon in compact areas)
- User profile with name display
- Name collection during password change flow
- Black & white color scheme with accent color from logo

## User Preferences
- **Name fields**: Separate First & Last Name fields
- **Profile location**: Top-right header with dropdown
- **Logo placement**: Mixed - words in headers, icon in compact areas
- **Color scheme**: Black & white with one accent color from logo

---

## Phase 1: Backend - Add Name to Password Change Flow

### 1.1 Update ChangePasswordDto
**File**: `packages/backend/src/modules/auth/dto/change-password.dto.ts`
- Add `first_name?: string` field (optional for admin pool)
- Add `last_name?: string` field (optional for admin pool)
- Add validation decorators

### 1.2 Update AuthService Password Change Logic
**File**: `packages/backend/src/modules/auth/auth.service.ts`
- Update `changePassword()` method signature to accept first_name and last_name
- For users pool: If name provided, store in Cognito attributes (given_name, family_name)
- Create or update User record in DynamoDB with name fields
- Return user object in response

### 1.3 Update AuthController
**File**: `packages/backend/src/modules/auth/auth.controller.ts`
- Update change-password endpoint to accept name fields from DTO
- Return user object in response payload

### 1.4 Update CognitoService (if needed)
**File**: `packages/backend/src/modules/auth/cognito.service.ts`
- Ensure updateUserAttributes supports given_name and family_name
- Extract name attributes from Cognito response

---

## Phase 2: Frontend - Auth Flow Updates

### 2.1 Update Login Page Password Change Modal
**File**: `packages/web/src/app/login/page.tsx`
- Add firstName and lastName state variables
- Add First Name input field in modal
- Add Last Name input field in modal
- Send firstName and lastName to changePassword API call
- Only require names for users pool (conditional like company_name)

### 2.2 Update Auth Store
**File**: `packages/web/src/stores/auth-store.ts`
- Update changePassword method signature to accept firstName and lastName
- Store user object from response (currently only storing company)
- Add user to state after successful password change

### 2.3 Update API Client
**File**: `packages/web/src/lib/api-client.ts`
- Update changePassword method to send first_name and last_name
- Ensure response typing includes user object

---

## Phase 3: Logo Integration

### 3.1 Move Logo Files to Public Directory
- Create `packages/web/public/images/` directory
- Move logo files from root:
  - `handycall-logo-svg-small-words.svg` → `public/images/logo-words.svg`
  - `handycall-icon-svg-big-no-words.svg` → `public/images/logo-icon.svg`
  - Keep PNG files as fallbacks if needed

### 3.2 Create Logo Component
**File**: `packages/web/src/components/ui/logo.tsx`
- Create reusable Logo component with variants: "words" | "icon"
- Accept size prop for responsive sizing
- Use Next.js Image or inline SVG for optimization
- Support className prop for custom styling

### 3.3 Update Login Page
**File**: `packages/web/src/app/login/page.tsx`
- Replace "HandyCall" text with Logo component (words variant)
- Position appropriately in header section
- Ensure proper sizing and contrast

### 3.4 Update Dashboard Sidebar
**File**: `packages/web/src/app/dashboard/layout.tsx`
- Replace "HandyCall" text with Logo component (icon variant in compact mode)
- Consider collapsible sidebar with icon-only when collapsed
- Add smooth transition for logo

### 3.5 Update Admin Header
**File**: `packages/web/src/app/admin/page.tsx`
- Add Logo component (words variant) to header
- Replace or supplement "Admin Dashboard" text
- Ensure consistent styling with login page

---

## Phase 4: Profile Component with Dropdown

### 4.1 Create Avatar Component
**File**: `packages/web/src/components/ui/avatar.tsx`
- Install Radix UI Avatar if not present
- Create avatar component showing user initials
- Support custom background colors
- Circular design with proper contrast

### 4.2 Create Profile Dropdown Component
**File**: `packages/web/src/components/profile-dropdown.tsx`
- Use Radix UI Dropdown Menu
- Show avatar with user's first and last name
- Display user email (optional)
- Include logout button
- Add smooth open/close animations
- Style with black/white theme

### 4.3 Add Profile to Dashboard Layout
**File**: `packages/web/src/app/dashboard/layout.tsx`
- Add top header bar (if not present)
- Position ProfileDropdown in top-right corner
- Ensure proper spacing and alignment
- Add transitions for header appearance

### 4.4 Add Profile to Admin Page
**File**: `packages/web/src/app/admin/page.tsx`
- Add ProfileDropdown to existing header
- Position in top-right (replace or enhance current Logout button)
- Ensure consistent styling with dashboard

### 4.5 Fetch User Data
- Update auth store to fetch and store current user details
- Create API endpoint to get current user (if not exists)
- Populate user state on login, password change, and checkAuth

---

## Phase 5: Color Scheme Update

### 5.1 Identify Accent Color from Logo
- Extract primary color from logo (likely blue, orange, or brand color)
- Define as CSS variable for consistency

### 5.2 Update Tailwind Config
**File**: `packages/web/tailwind.config.ts`
- Update color palette to black/white/grays
- Define accent color from logo
- Remove or minimize current blue primary color
- Keep destructive red for errors
- Update border-radius for simplicity (consider more subtle)

### 5.3 Update Global CSS
**File**: `packages/web/src/app/globals.css`
- Update CSS custom properties for new color scheme:
  - `--background`: white (#ffffff)
  - `--foreground`: near-black (#0a0a0a or #1a1a1a)
  - `--primary`: accent color from logo
  - `--secondary`: light gray (#f5f5f5 or #f0f0f0)
  - `--muted`: medium gray (#a0a0a0 or #999)
  - `--border`: light gray (#e5e5e5 or #d0d0d0)
  - `--accent`: same as primary or slightly different shade
- Ensure dark mode support if needed

### 5.4 Update Component Styles
- Review all components for color usage
- Replace blue colors with new accent color
- Ensure proper contrast ratios (WCAG compliance)
- Update focus states with accent color

---

## Phase 6: Transitions and Animations

### 6.1 Button Transitions
**File**: `packages/web/src/components/ui/button.tsx`
- Add smooth color transitions (duration-200)
- Add subtle scale transform on hover (scale-[1.02])
- Add active state with scale-[0.98]
- Add focus ring with accent color
- Ensure disabled state is clear

### 6.2 Card Hover Effects
**File**: `packages/web/src/components/ui/card.tsx`
- Add subtle shadow on hover for interactive cards
- Add smooth transition for shadow (duration-300)
- Consider subtle border color change on hover
- Keep non-interactive cards static

### 6.3 Navigation Link Transitions
**File**: `packages/web/src/app/dashboard/layout.tsx`
- Enhance NavLink hover effect
- Add smooth background color transition
- Add subtle left border or indicator for active state
- Consider icon color transition on hover

### 6.4 Input Focus States
**File**: `packages/web/src/components/ui/input.tsx`
- Add smooth border color transition on focus
- Add subtle shadow or glow with accent color
- Ensure transition-colors or transition-all

### 6.5 Page Transition Effects
**File**: `packages/web/src/app/layout.tsx` or create layout wrapper
- Add fade-in animation when pages load
- Use Next.js app router animations if supported
- Keep subtle - duration-300 to 500ms max
- Consider slide-in from bottom for modals/dialogs

### 6.6 Loading States
**File**: Multiple components
- Enhance spinner animation with accent color
- Add skeleton loaders for data fetching states
- Add smooth opacity transitions for content appearance
- Use Tailwind animate-pulse for placeholders

### 6.7 Dialog/Modal Animations
**File**: `packages/web/src/components/ui/dialog.tsx`
- Enhance existing animations
- Ensure smooth backdrop fade
- Add subtle scale animation for dialog content
- Keep duration-200 for snappy feel

### 6.8 Admin Dashboard Cards
**File**: `packages/web/src/app/admin/page.tsx`
- Add hover effects to stat cards
- Add hover effects to company table rows
- Add smooth transitions for status badges
- Consider animated number counters for stats (optional)

---

## Phase 7: Additional UI Refinements

### 7.1 Create Consistent Spacing System
- Review all pages for spacing consistency
- Use Tailwind's spacing scale systematically
- Ensure proper padding/margin on all containers

### 7.2 Typography Improvements
- Ensure consistent font sizes across pages
- Use font-weight variations for hierarchy
- Ensure proper line-height for readability
- Keep minimal, clean typography

### 7.3 Form Improvements
- Ensure all inputs have consistent styling
- Add proper error states with smooth transitions
- Add success states where appropriate
- Ensure label positioning is consistent

### 7.4 Responsive Design Check
- Ensure all changes work on mobile/tablet
- Test profile dropdown on small screens
- Test logo scaling on different viewport sizes
- Ensure sidebar is mobile-friendly

---

## Implementation Order (Recommended)

1. **Backend Changes** (Phase 1) - Foundation for name collection
2. **Frontend Auth** (Phase 2) - Enable name collection in password flow
3. **Logo Files** (Phase 3.1-3.2) - Prepare assets and components
4. **Color Scheme** (Phase 5) - New foundation before adding components
5. **Logo Integration** (Phase 3.3-3.5) - Apply logos to all pages
6. **Profile Component** (Phase 4) - User identity display
7. **Transitions & Animations** (Phase 6) - Polish and refinement
8. **Final Refinements** (Phase 7) - Consistency and responsive tweaks

---

## Testing Checklist

- [ ] Password change flow collects and stores first_name and last_name
- [ ] User name appears in profile dropdown on dashboard
- [ ] User name appears in profile dropdown on admin page
- [ ] Logos display correctly on all pages (login, dashboard, admin)
- [ ] Color scheme is black/white with accent color throughout
- [ ] All buttons have smooth hover transitions
- [ ] All navigation links have smooth transitions
- [ ] Cards have appropriate hover effects
- [ ] Inputs have smooth focus states
- [ ] Modals/dialogs animate smoothly
- [ ] Page transitions are smooth
- [ ] Loading states are polished
- [ ] Mobile responsive design works correctly
- [ ] Profile dropdown works on mobile
- [ ] All interactive elements are accessible (keyboard navigation)

---

## Notes

- Keep animations subtle and fast (200-300ms) for professional feel
- Maintain accessibility standards (WCAG 2.1 AA minimum)
- Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- Ensure color contrast meets accessibility requirements
- Consider adding dark mode toggle in future iteration
- Keep bundle size in check - use Next.js Image optimization
- Use Radix UI for accessible primitives (already in use)
- Leverage Tailwind's built-in animation utilities where possible
