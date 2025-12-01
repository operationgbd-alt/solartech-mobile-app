# Design Guidelines: Photovoltaic Technician Field App

## Architecture Decisions

### Authentication
**Auth Required** - Multi-user enterprise application where each technician must have their own account.

**Implementation:**
- Use SSO (Single Sign-On) for easy onboarding
- Include Apple Sign-In (iOS) and Google Sign-In (Android/cross-platform)
- Mock auth flow in prototype using local state
- Login screen with company branding
- Account screen includes:
  - Technician profile (name, ID, avatar)
  - Logout (with confirmation: "Sei sicuro di voler uscire?")
  - Settings access
  - Privacy policy & terms of service links (placeholder URLs)

### Navigation Structure
**Tab Navigation** (4 tabs + Floating Action Button)

The app has 4 distinct feature areas with a core action (Create New):

1. **Home Tab** (Casa) - Dashboard with upcoming appointments and recent activities
2. **Sopralluoghi Tab** (Sopralluoghi) - List of all surveys/inspections
3. **Installazioni Tab** (Installazioni) - List of all work orders/installations
4. **Profilo Tab** (Profilo) - Technician profile and app settings

**Floating Action Button (FAB):** Positioned bottom-right for creating new Sopralluogo or Installazione (opens action sheet to choose type)

### Screen Specifications

#### 1. Home Dashboard
- **Purpose:** Quick overview of today's work and recent activities
- **Header:** Transparent, title "Dashboard", right button: notifications icon
- **Layout:**
  - Scrollable root view
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components:**
  - Welcome card with technician name and current date
  - "Appuntamenti Oggi" section with horizontal scrollable cards
  - "Attività Recenti" list (last 5 sopralluoghi/installazioni)
  - Quick stats: pending surveys, scheduled installations

#### 2. Sopralluoghi List
- **Purpose:** View and manage all surveys/inspections
- **Header:** Custom header with search bar, filter icon (right)
- **Layout:**
  - FlatList as root component
  - Top inset: Spacing.xl (header is not transparent)
  - Bottom inset: tabBarHeight + Spacing.xl + 60 (FAB clearance)
- **Components:**
  - Search bar in header
  - Filter chips: Tutti, Da Completare, Completati
  - Survey cards with: client name, address, status badge, date, quick action icons
  - Empty state with illustration when no surveys exist

#### 3. Sopralluogo Detail/Form (Modal Stack)
- **Purpose:** Create or edit survey with digitized checklist
- **Header:** Default navigation with "Annulla" (left) and "Salva" (right)
- **Layout:**
  - Scrollable form
  - Top inset: Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Sections (matching PDF checklist):**
  - Cliente Info: Name, Address, CAP, Comune
  - Installatore: Tecnico name
  - Prodotto: Checkbox group (SMALL, MEDIUM, LARGE, etc.)
  - A1 Section: Collapsible accordion with verification items (A1.1-A1.11) - each with SI/NO radio buttons and text input for notes
  - A2 Section: Storage verification (A2.1-A2.4)
  - B Section: Base information (B1-B11) with various input types
  - Photo Gallery: Grid of attached photos with + button
  - Documenti Allegati: List of attached documents
- **Form Controls:**
  - Large tap targets (min 44pt)
  - Radio buttons for SI/NO choices
  - Checkboxes for multiple selections
  - Text areas for notes (expandable)
  - Camera FAB floating on photo section

#### 4. Installazioni List
- **Purpose:** View and manage all work orders (ODL)
- **Layout:** Same structure as Sopralluoghi List
- **Components:**
  - Installation cards with: client name, intervention type, date, status, cost indicator
  - Status badges: Programmata, In Corso, Completata

#### 5. Installazione Detail/Form (Modal Stack)
- **Purpose:** Create or edit work order (digitized ODL)
- **Header:** "Annulla" (left), "Salva" (right)
- **Layout:** Scrollable form
- **Sections:**
  - Intervento N. & Data
  - Tecnico Specializzato: Auto-filled from logged-in user
  - Dati del Cliente: Name, Address, Phone, Email
  - Tipologia di Intervento: Radio group with checkboxes for detail options
  - Dettaglio Impianti: Text area
  - Dettaglio Intervento: Text area
  - Elenco Interventi: Dynamic list with + button to add items (description + cost)
  - Importo Totale: Auto-calculated
  - Prescrizioni: SI/NO radio with conditional text input
  - Photo attachments
  - Firma Cliente: Signature pad (optional in MVP)

#### 6. Calendario
- **Purpose:** View appointments in calendar format
- **Header:** Transparent, title "Calendario", right button: filter icon
- **Layout:**
  - Calendar component at top (fixed)
  - Scrollable list of appointments below
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components:**
  - Month view calendar with dots for days with appointments
  - Selected day appointments list
  - Appointment cards: time, client, location, type (Sopralluogo/Installazione)

#### 7. Create Appointment (Modal)
- **Purpose:** Schedule new appointment
- **Header:** "Annulla" (left), "Crea" (right)
- **Layout:** Scrollable form
- **Fields:**
  - Tipo: Sopralluogo or Installazione
  - Cliente: Text input or selection from existing
  - Data e Ora: Date/time pickers
  - Luogo: Address input
  - Note: Text area
  - Notifica: Toggle with time options (15min, 30min, 1h, 1 day before)

#### 8. Profilo/Settings
- **Purpose:** Manage technician profile and app preferences
- **Header:** Default with title "Profilo"
- **Layout:** Scrollable list/form
- **Components:**
  - Profile header: Avatar (customizable), Name, Technician ID
  - Settings groups:
    - Notifiche: Toggle for push notifications, sound preferences
    - Preferenze: Language (Italian default), theme
    - Account: Logout button (red), Delete account (nested under Settings > Account)

## Design System

### Color Palette
**Primary Theme:** Professional blue (solar/energy industry)
- **Primary:** #0066CC (Strong blue for CTAs, active states)
- **Primary Light:** #E6F2FF (Background tints, selected states)
- **Secondary:** #FF9500 (Warning/attention, pending status)
- **Success:** #34C759 (Completed status, confirmations)
- **Danger:** #FF3B30 (Errors, delete actions, critical alerts)
- **Neutral:**
  - Background: #F5F5F7 (Light gray for app background)
  - Surface: #FFFFFF (Cards, forms, modals)
  - Border: #D1D1D6 (Dividers, input borders)
  - Text Primary: #1C1C1E
  - Text Secondary: #8E8E93
  - Text Tertiary: #C7C7CC

### Typography
**System Fonts:** SF Pro (iOS), Roboto (Android)

- **Heading 1:** 28pt, Bold (Screen titles)
- **Heading 2:** 22pt, Semibold (Section headers)
- **Heading 3:** 18pt, Semibold (Card titles)
- **Body:** 16pt, Regular (Form labels, body text)
- **Body Small:** 14pt, Regular (Helper text, metadata)
- **Caption:** 12pt, Regular (Timestamps, fine print)
- **Button:** 16pt, Semibold (All buttons)

### Spacing Scale
- **xs:** 4pt
- **sm:** 8pt
- **md:** 12pt
- **lg:** 16pt
- **xl:** 24pt
- **xxl:** 32pt

### Component Specifications

#### Buttons
**Primary Button:**
- Min height: 48pt (large tap target for field use)
- Border radius: 12pt
- Background: Primary color
- Text: White, 16pt Semibold
- Press feedback: Opacity 0.8, scale 0.98

**Secondary Button:**
- Same sizing as primary
- Background: Primary Light
- Text: Primary color
- Press feedback: Opacity 0.7

**Floating Action Button (FAB):**
- Size: 56pt diameter
- Position: Bottom-right, 16pt from edges
- Background: Primary color
- Icon: Plus (white)
- Shadow: **EXACT specs**
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- Press feedback: Scale 0.95

#### Cards
**List Item Card:**
- Border radius: 12pt
- Background: Surface (white)
- Padding: 16pt
- Shadow: None (use subtle border instead)
- Border: 1px solid Border color
- Press feedback: Background to Primary Light (10% opacity)

**Status Badges:**
- Border radius: 8pt
- Padding: 4pt horizontal, 2pt vertical
- Font: 12pt Semibold
- Colors:
  - Da Completare: Orange background, white text
  - Completata: Green background, white text
  - In Corso: Blue background, white text

#### Form Inputs
**Text Input:**
- Height: 48pt
- Border radius: 10pt
- Border: 1px Border color
- Padding: 12pt horizontal
- Focus state: Border 2px Primary color
- Background: Surface

**Checkbox/Radio:**
- Size: 24pt
- Active color: Primary
- Inactive: Border color with white fill
- Press area: 44pt minimum

**Textarea:**
- Min height: 100pt
- Border radius: 10pt
- Expandable with content

#### Photo Gallery
- Grid: 3 columns with 8pt gap
- Item aspect ratio: 1:1
- Border radius: 8pt
- Add button: Dashed border, camera icon centered

### Icons
- Use **Feather** icon set from @expo/vector-icons
- Standard size: 24pt
- Color: Text Secondary (inactive), Primary (active)
- Key icons:
  - Home: home
  - Sopralluoghi: clipboard
  - Installazioni: tool
  - Profilo: user
  - Calendar: calendar
  - Camera: camera
  - Attach: paperclip
  - Filter: filter
  - Search: search
  - Add: plus
  - Edit: edit-2
  - Delete: trash-2
  - Check: check-circle
  - Alert: alert-circle

### Assets to Generate
1. **App Icon:** Solar panel with tools motif in primary blue
2. **Empty State Illustrations:**
   - No surveys (clipboard with sun)
   - No installations (wrench with panel)
   - No appointments (calendar with sun)
3. **Technician Avatar Presets (5 options):**
   - Professional worker illustrations in company colors
   - Diverse representations
   - Hard hat + tool belt aesthetic
   - Clean, modern illustration style

### Accessibility
- All interactive elements: min 44pt tap target
- Text contrast ratio: min 4.5:1 for body text
- Form labels always visible (no placeholder-only inputs)
- Error messages: Color + icon (not color alone)
- Loading states with clear feedback
- Offline indicator when no network

### Visual Feedback
- All touchables: Opacity or scale animation on press
- Form validation: Real-time with inline error messages below input
- Save confirmation: Toast message "Salvato con successo"
- Delete confirmation: Alert with "Annulla" and "Elimina" (red)
- Pull to refresh on lists