# KAU-FPO Platform - Frontend Tasks

## PHASE I — Core Platform (45 days from Work Order)

### 1. Landing Page & Onboarding Flow
- [ ] Public landing page with platform purpose and key features
- [ ] Hero section with CTAs for FPO registration and login
- [ ] Features showcase section
- [ ] Language switcher (English ↔ Malayalam)
- [ ] Mobile-responsive design
- [ ] Low-bandwidth optimized assets
- [ ] Step-by-step onboarding wizard component
- [ ] Eligibility check screen
- [ ] Contextual error messages at each step

### 2. FPO Registration Module
- [ ] Multi-step registration form wizard
- [ ] Step 1: Eligibility check form
- [ ] Step 2: Organization details form
  - Organization name
  - Registration number
  - District dropdown (14 Kerala districts)
  - Contact details (phone, email, address)
  - Commodities handled (multi-select)
  - Membership count
  - Authorized contact person details
- [ ] Step 3: Document upload
  - FPO registration certificate (PDF/JPG/PNG)
  - Bank details document
  - Government ID of authorized signatory
  - Other KAU-specified documents
- [ ] Step 4: Review & submit
- [ ] Application reference number display on success
- [ ] Email/SMS confirmation UI feedback
- [ ] Application status tracker page
- [ ] Form validation with Zod schemas

### 3. FPO Login & Personal Dashboard
- [ ] Login page (email/username + password)
- [ ] Password reset flow (via email or mobile)
- [ ] FPO Dashboard layout
- [ ] Profile summary card
- [ ] Application status widget
- [ ] Available services list
- [ ] Notifications panel
- [ ] Quick links section
- [ ] Session timeout handling with warning modal
- [ ] Bilingual content rendering

### 4. Basic Admin Dashboard
- [ ] Admin login page with 2FA UI
- [ ] Admin layout with sidebar navigation
- [ ] FPO Applications Management
  - Applications list with search & filter
  - View application details modal/page
  - Approve application with notes
  - Reject application with reason
- [ ] User Management
  - Users list
  - Add/Edit/Delete users
  - Assign roles
- [ ] Role Management (super-admin, sub-admin)
- [ ] Reports Section
  - Generate reports
  - Export to PDF
  - Export to Excel
- [ ] Summary Statistics Dashboard
  - Total registrations card
  - Pending applications card
  - Approved FPOs card
  - District-wise distribution chart

### 5. Bilingual Support (English & Malayalam)
- [ ] next-intl configuration
- [ ] English translations file (en.json)
- [ ] Malayalam translations file (ml.json)
- [ ] Language switcher component
- [ ] Language persistence (localStorage/cookie)
- [ ] System notifications in both languages
- [ ] Form labels and error messages in both languages
- [ ] Unicode compliance for Malayalam rendering

### 6. Common Infrastructure (Phase I)
- [ ] Authentication system
  - JWT token handling
  - Auth store (Zustand)
  - Protected route middleware
  - Login/Logout flow
- [ ] API client setup (Axios)
  - Request interceptors (auth token)
  - Response interceptors (error handling)
  - Token refresh logic
- [ ] React Query setup for data fetching
- [ ] Form components with React Hook Form + Zod
- [ ] File upload component (react-dropzone)
- [ ] Data tables (TanStack Table)
- [ ] Toast notifications (Sonner)
- [ ] Loading states and skeletons
- [ ] Error boundary component
- [ ] Empty state components

---

## PHASE II — Advanced AI & Market Features (60 days from Phase I)

### 7. AI-Based Recommendations
- [ ] Crop Suitability Recommendation
  - Input form (district, soil type, water availability, season)
  - AI recommendation results display
  - Explainability section (plain language reasoning)
- [ ] Business Plan Guidance
  - Input form (commodity, region, market data)
  - Guidance results display
- [ ] AI-Generated DPR (Detailed Project Report)
  - DPR viewer component
  - Export to PDF
- [ ] Loading states for AI responses (5 second target)

### 8. Government Portal
- [ ] Government official login page
- [ ] Government dashboard layout
- [ ] FPO data table with filters
- [ ] Scheme linkage status tracking
- [ ] Compliance tracking view
- [ ] District-level aggregate statistics
- [ ] Jurisdiction-based data filtering (district/state)

### 9. CBBO/NGO Portal
- [ ] CBBO/NGO login page
- [ ] CBBO/NGO dashboard layout
- [ ] FPO verification tools
  - Verification checklist
  - Approve/Flag FPO
- [ ] Progress tracking view
- [ ] Reporting features
- [ ] Jurisdiction-based access control

### 10. Analytics Dashboards
- [ ] District-level analytics page
- [ ] State-level analytics page
- [ ] Charts (using Recharts)
  - FPO performance metrics
  - Crop data trends
  - Scheme utilization rates
  - Market activity graphs
- [ ] Filters
  - Date range picker
  - Commodity filter
  - District/Geographic filter
- [ ] Drill-down functionality
- [ ] Export to PDF
- [ ] Export to Excel
- [ ] Auto-refresh (24-hour interval indicator)

### 11. Expert Directory
- [ ] Expert listing page with search
- [ ] Search filters (category, district, specialization)
- [ ] Expert profile card component
  - Name & designation
  - Specialization tags
  - Affiliated organization
  - Contact method
  - Availability status
- [ ] Contact request modal/form
- [ ] Admin: Expert management CRUD
  - Add expert form
  - Edit expert form
  - Deactivate expert

### 12. Info Hub & Market Linkage (B2B/B2C)
- [ ] Info Hub landing page
- [ ] Market opportunities listing
- [ ] Buyer requirements listing
- [ ] FPO Product Listings
  - Product listing page
  - Add product form
    - Product name
    - Pricing
    - Quantity
    - Location
    - Quality certifications
  - Edit/Delete product
- [ ] ONDC integration status indicator
- [ ] Farmer Connect integration status

### 13. AI-Assisted Buyer-Seller Matching
- [ ] Seller dashboard - Match suggestions widget
- [ ] Buyer dashboard - Match suggestions widget
- [ ] Match details modal
  - Commodity type
  - Quantity
  - Location
  - Quality parameters
  - Price range
- [ ] Accept match action
- [ ] Reject match action
- [ ] Match history page
- [ ] Feedback mechanism for match quality

### 14. Product Marketing Strategies
- [ ] AI-generated marketing strategy viewer
- [ ] Strategy customization inputs (commodity, region, target market)
- [ ] Marketing content display
- [ ] Export to PDF
- [ ] Share functionality (copy link, social)

### 15. Offline / Low-Connectivity Support
- [ ] PWA configuration (next-pwa)
- [ ] Service worker setup (Workbox)
- [ ] Offline indicator UI (banner/badge)
- [ ] IndexedDB setup (Dexie.js)
- [ ] Background sync configuration
- [ ] Sync status indicator
- [ ] Offline-capable features:
  - [ ] Product listing (create/edit)
  - [ ] Crop data entry
  - [ ] Recommendation viewing (cached)
- [ ] Data sync on reconnection

### 16. GIS Integration
- [ ] Interactive map component (React-Leaflet)
- [ ] Map controls (zoom, pan, layers)
- [ ] FPO location marker (pin on map)
- [ ] Cultivation area polygon drawing tool
- [ ] Map layers:
  - [ ] District boundaries
  - [ ] Agro-climatic zones
  - [ ] Market proximity indicators
- [ ] Bhuvan (ISRO) WMS tiles integration
- [ ] Location search functionality
- [ ] Coordinate display

### 17. Additional Phase II Infrastructure
- [ ] 2FA implementation for admin accounts
- [ ] Enhanced RBAC UI components
- [ ] Audit log viewer (admin)
- [ ] Advanced notification system
- [ ] Real-time updates (WebSocket/SSE consideration)

---

## Cross-Cutting Requirements (Both Phases)

### Security & Compliance
- [ ] SSL/TLS indicators
- [ ] Secure password input handling
- [ ] DPDP Act compliance notices
- [ ] Data consent checkboxes where required
- [ ] Audit trail UI for admins

### Performance
- [ ] Page load optimization (< 3 seconds target)
- [ ] Image optimization (next/image)
- [ ] Code splitting
- [ ] Lazy loading for heavy components
- [ ] Caching strategies

### Accessibility (WCAG 2.1 Level AA)
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast compliance
- [ ] Focus indicators
- [ ] Alt text for images
- [ ] Form label associations

### Testing
- [ ] Component unit tests
- [ ] Integration tests
- [ ] E2E tests for critical flows
- [ ] UAT test case documentation

---

## Summary

| Phase | Total Tasks | Priority |
|-------|-------------|----------|
| Phase I | ~50 tasks | HIGH |
| Phase II | ~70 tasks | MEDIUM |
| Cross-Cutting | ~20 tasks | ONGOING |

**Phase I Deadline:** 45 days from Work Order
**Phase II Deadline:** 60 days from Phase I completion
