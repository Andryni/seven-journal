# SEVEN JOURNAL — Premium Trading Journal Web App

## PROJECT OVERVIEW
Build a fully functional, production-grade Trading Journal SPA named **Seven Journal**.
The app helps traders log, review, and analyze their trades with a premium fintech-grade UI.
No backend database — all data persists in LocalStorage with a clean abstraction layer.
The project is built in **4 sequential phases**. Each phase must be fully functional before moving to the next.

---

## TECH STACK (MANDATORY — no substitutions)

| Category | Technology |
|---|---|
| Framework | React 18+ (Vite) + TypeScript (strict mode) |
| Styling | TailwindCSS 3.4+ + shadcn/ui (Radix primitives) |
| State management | Zustand (persisted to LocalStorage) |
| Animations | Framer Motion 11+ |
| Charts | Recharts (primary) + shadcn/ui chart wrappers |
| Icons | lucide-react |
| Tables | TanStack Table v8 |
| Forms | react-hook-form + zod resolver |
| Validation | zod |
| Dates | date-fns |
| Calendar UI | react-day-picker (styled to match theme) |
| i18n | react-i18next (FR default, EN available) |
| PDF export | jsPDF + jsPDF-autotable |
| CSV export | custom utility (no library needed) |
| Routing | react-router-dom v6 |
| ID generation | crypto.randomUUID() or nanoid |

NO backend. NO Express. NO database. Pure SPA. Vite serves everything.

---

## DESIGN SYSTEM (MANDATORY — apply everywhere)

### Theme
- **Dark mode by default**. Light mode available via toggle.
- Dark palette:
  - Background: `#09090b` (zinc-950) → `#18181b` (zinc-900) for cards
  - Surface/cards: `#1c1c21` with subtle `rgba(255,255,255,0.03)` border
  - Primary accent: `#6366f1` (indigo-500) → `#818cf8` (indigo-400) gradient
  - Green (profit): `#22c55e` → `#4ade80`
  - Red (loss): `#ef4444` → `#f87171`
  - Neutral text: `#fafafa` (primary), `#a1a1aa` (secondary), `#52525b` (muted)
- Light palette: clean whites + soft grays, same accent colors but adjusted for contrast.

### Cards & Surfaces
- Border radius: `16px` (large cards), `12px` (small elements), `8px` (buttons/inputs)
- Cards: subtle `backdrop-blur-xl` + glass effect where appropriate
- Soft shadow: `0 4px 24px rgba(0,0,0,0.12)` on dark, lighter on light mode
- Hover state on cards: subtle `translateY(-2px)` + increased shadow (Framer Motion)
- 1px border with `rgba(255,255,255,0.06)` on dark cards

### Typography
- Font: `Inter` (import from Google Fonts), fallback `system-ui, sans-serif`
- Scale: 
  - Hero: `4rem / 700`
  - H1: `2.25rem / 700`
  - H2: `1.5rem / 600`
  - H3: `1.25rem / 600`
  - Body: `0.9375rem / 400`
  - Small/Caption: `0.8125rem / 400`
  - Mono (numbers): `JetBrains Mono` or `SF Mono`

### Animations (Framer Motion)
- Page transitions: fade + slide up (`y: 20 → 0`, `opacity: 0 → 1`, duration `0.4s`, ease `easeOut`)
- Card entry: staggered children (`staggerChildren: 0.08`)
- Charts: animate on mount (draw-in effect)
- Buttons: `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.98 }}`
- Modals: backdrop fade + modal scale from `0.95` to `1`
- Number counters: animated count-up on dashboard cards
- Skeleton loaders: pulse animation while data loads
- Toast notifications: slide in from top-right

### Spacing & Layout
- Page padding: `24px` desktop, `16px` mobile
- Card gap: `16px–24px`
- Consistent `8px` grid system
- Sidebar width: `260px` expanded, `72px` collapsed
- Max content width: `1400px` centered

### Logo
- Create a simple modern logo for "Seven Journal":
  - Mark: a stylized "7" integrated with a candlestick or chart motif
  - Wordmark: "Seven" in bold + "Journal" in light weight
  - Use the primary indigo accent color
  - Apply in sidebar header + landing page + favicon

---

## DATA MODEL (LOCALSTORAGE)

All data stored under namespaced keys. Use a data service layer with:
- Schema validation (zod) on every read/write
- Version field for future migrations
- Utility functions: `getAll`, `getById`, `create`, `update`, `delete`

```typescript
// ─── USER ────────────────────────────────────
interface User {
  id: string
  username: string
  email: string
  passwordHash: string           // simple hash (SHA-256 via SubtleCrypto), NOT secure — UX only
  preferredLanguage: "fr" | "en"
  theme: "dark" | "light"
  activeAccountId: string | null
  createdAt: string              // ISO 8601
}

// ─── ACCOUNT ─────────────────────────────────
interface TradingAccount {
  id: string
  userId: string
  name: string                   // e.g., "FTMO 100k", "Binance Spot"
  initialCapital: number
  currentBalance: number         // auto-calculated from trades
  currency: "USD" | "EUR" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD"
  type: "Demo" | "Real" | "Propfirm" | "Funded"
  broker: string                 // optional, e.g., "FTMO", "IC Markets"
  createdAt: string
}

// ─── TRADE ───────────────────────────────────
interface Trade {
  id: string
  accountId: string

  // ── Core fields
  pair: string                   // e.g., "EUR/USD", "BTC/USD", "NAS100"
  position: "BUY" | "SELL"
  entryPrice: number
  exitPrice: number | null       // null if Running
  lotSize: number                // lot size / contracts / units
  stopLoss: number | null        // price level
  takeProfit: number | null      // price level

  // ── Context
  timeframe: string              // "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1"
  session: "Asia" | "London" | "New York" | "Overlap" | "Off Session"
  strategy: string               // user-defined, e.g., "Order Block + FVG"
  confluence: string[]           // optional tags, e.g., ["FVG", "BOS", "Premium Zone"]

  // ── Risk Management
  riskPlanned: {
    mode: "percent" | "currency"
    value: number
  }
  rewardPlanned: {
    mode: "percent" | "currency"
    value: number
  }
  plannedRR: number              // planned Reward / Risk ratio
  actualRR: number | null        // actual ratio based on real entry/exit

  // ── Result
  result: "TP" | "SL" | "BE" | "Partial" | "Manual Close" | "Running"
  pnl: number | null             // in account currency. Auto-calculated or manually entered
  commission: number             // default 0
  netPnl: number | null          // pnl - commission

  // ── Psychology & Review
  emotionBefore: "Confident" | "Neutral" | "Anxious" | "FOMO" | "Revenge" | "Bored" | null
  emotionAfter: "Satisfied" | "Frustrated" | "Regret" | "Calm" | "Excited" | null
  tradeGrade: "A+" | "A" | "B" | "C" | "F" | null   // subjective quality grade
  tags: string[]                 // user-defined tags
  notes: string

  // ── Visuals
  setupBeforeUrl: string         // TradingView chart URL
  setupAfterUrl: string          // TradingView chart URL

  // ── Pre-trade checklist snapshot
  checklistSnapshot: {
    itemId: string
    label: string
    checked: boolean
  }[]

  // ── Meta
  openedAt: string               // ISO datetime
  closedAt: string | null        // ISO datetime, null if Running
  duration: number | null        // in minutes, auto-calculated
  createdAt: string
  updatedAt: string
}

// ─── DAILY DEBRIEF ───────────────────────────
interface DailyDebrief {
  id: string
  accountId: string
  date: string                   // "YYYY-MM-DD"

  // ── Market Analysis
  htfBias: "Bullish" | "Bearish" | "Neutral" | "No Bias"
  narrative: string              // detailed HTF analysis text
  keyLevels: string              // text describing important levels
  chartUrls: string[]            // TradingView screenshot URLs

  // ── Review
  marketRespectedPlan: "Yes" | "No" | "Partial"
  mistakes: string
  goodActions: string
  lessonsLearned: string
  emotionalState: "Focused" | "Distracted" | "Stressed" | "Calm" | "Overconfident"

  // ── Rating
  dayRating: 1 | 2 | 3 | 4 | 5  // 1=terrible, 5=excellent

  // ── Meta
  createdAt: string
  updatedAt: string
}

// ─── TRADING PLAN CHECKLIST ──────────────────
interface TradingPlanChecklist {
  id: string
  accountId: string
  items: {
    id: string
    label: string                // e.g., "HTF bias confirmed"
    category: string             // e.g., "Pre-Trade", "Risk", "Entry"
    isActive: boolean
    order: number
  }[]
  updatedAt: string
}

// ─── USER GOALS ──────────────────────────────
interface UserGoals {
  accountId: string
  monthlyPnlTarget: number | null
  maxDailyLoss: number | null    // circuit breaker
  maxDailyTrades: number | null
  minRR: number | null           // minimum R:R to take a trade
  weeklyReviewDay: "Monday" | "Friday" | "Sunday" | null
}

// ─── DEMO DATA ───────────────────────────────
// A pre-built dataset of ~40-60 trades across 3 months with realistic
// pairs (EUR/USD, GBP/USD, NAS100, BTC/USD), varied results, sessions,
// strategies, and 5-10 debrief entries. Used ONLY in Demo mode.
```

### PnL Calculation Logic
```
If exitPrice and entryPrice and lotSize are filled:
  For BUY: pnl = (exitPrice - entryPrice) × lotSize
  For SELL: pnl = (entryPrice - exitPrice) × lotSize
  netPnl = pnl - commission

If user leaves exitPrice/lotSize empty:
  Allow manual pnl entry

If result === "Running":
  pnl = null, netPnl = null

Duration = closedAt - openedAt (in minutes)
ActualRR = |pnl| / riskPlanned (calculated)
```

---

## ROUTING STRUCTURE

```
/                     → Landing Page (public)
/signin               → Sign In (public)
/signup               → Sign Up (public)
/demo                 → App Shell in Demo mode (pre-loaded data)
/app                  → App Shell (authenticated)
/app/dashboard        → Dashboard
/app/trades           → Trade Journal (table view)
/app/trades/:id       → Trade Detail
/app/trades/new       → Add Trade
/app/calendar         → Calendar View
/app/analytics        → Analytics
/app/debrief          → Daily Debrief
/app/settings         → Settings
```

Protected routes: redirect to `/signin` if no authenticated user.

---

## PAGE-BY-PAGE SPECIFICATIONS

### 1. LANDING PAGE (`/`)

**Hero Section:**
- Full viewport height
- Large headline: "Master Your Trading. One Trade at a Time."
- Sub-headline: "The premium trading journal that helps you find your edge, track your psychology, and grow your PnL."
- Two CTAs:
  - Primary (filled indigo button): "Start Free" → `/signup`
  - Secondary (outlined): "Try Demo" → `/demo` (loads demo data, no account needed)
- Background: subtle animated gradient mesh or grid pattern
- Hero visual: floating mockup of the dashboard (use a styled div that looks like the real dashboard with sample charts)

**Features Section:**
- 6 feature cards in a 3×2 grid (2-column on mobile):
  1. 📊 Smart Dashboard — "See your PnL, winrate, and edge at a glance"
  2. 📝 Trade Journal — "Log every detail of every trade"
  3. 📅 Calendar View — "Visualize your daily performance"
  4. 📈 Deep Analytics — "Breakdown by session, pair, strategy, timeframe"
  5. 🧠 Psychology Tracker — "Track emotions and discipline"
  6. 📋 Trading Plan — "Built-in checklist system for consistency"
- Each card: icon + title + description, hover lift animation

**Animated Stats Section:**
- 3 mini-cards side by side, counting up:
  - "+$12,847" (PnL)
  - "68.5%" (Winrate)
  - "2.4 R:R" (Avg RR)
- Below: an animated PnL equity curve (smooth line chart drawing itself on scroll, using sample data)

**Social Proof Section:**
- 3 testimonial cards with fake but realistic trader quotes
- Avatar placeholder + name + "Prop Trader" / "Forex Trader" / "Crypto Trader"

**CTA Banner:**
- "Ready to level up your trading?" + "Create Account" button

**Footer:**
- Minimal: Logo, "Built for traders, by traders", language switch, theme toggle
- Links: GitHub (optional), Twitter/X placeholder

---

### 2. AUTH PAGES (`/signin`, `/signup`)

**Design:**
- Split layout: left side = form, right side = decorative (gradient + logo + tagline)
- On mobile: form only, full width
- Same dark/light theme as app

**Sign Up Form:**
- Fields: Username, Email, Password, Confirm Password
- Validation (zod):
  - Username: 3-20 chars, alphanumeric
  - Email: valid format
  - Password: min 8 chars, 1 uppercase, 1 number
  - Confirm: must match
- Show/hide password toggle (eye icon)
- Submit button with loading spinner
- Link: "Already have an account? Sign in"
- On success → create user in LocalStorage → redirect `/app/dashboard`
- **New account = EMPTY journal. Zero trades, zero debriefs.**

**Sign In Form:**
- Fields: Email, Password
- Validation against LocalStorage users
- Error message: "Invalid credentials" (generic, no hints)
- Link: "Don't have an account? Sign up"

**Password storage:**
- Hash with `SubtleCrypto.digest('SHA-256', ...)` before storing.
- Add a warning comment: `// NOT production-secure — client-side demo auth only`

---

### 3. APP SHELL (layout for all `/app/*` and `/demo/*`)

**Sidebar (left):**
- Logo at top (mark + "Seven" wordmark)
- Navigation items with icons:
  - 📊 Dashboard
  - 📝 Trades
  - 📅 Calendar
  - 📈 Analytics
  - 🧠 Debrief
  - ⚙️ Settings
- Active state: indigo highlight bar on left + indigo text/icon
- Hover: subtle background tint
- Collapse/expand toggle (hamburger icon at bottom)
- Collapsed state: icons only, tooltip on hover
- Smooth width transition (Framer Motion)
- At bottom of sidebar: user avatar + username + small "Pro" badge decoration

**Topbar (horizontal):**
- Left: page title (dynamic based on current route) + breadcrumb if nested
- Right actions:
  - 🔄 Account selector dropdown (switch between trading accounts)
  - ➕ "New Trade" button (indigo, prominent) → opens Add Trade page/modal
  - 🌐 Language toggle (FR/EN, simple dropdown)
  - 🌙/☀️ Theme toggle (animated icon swap)
  - 👤 User menu dropdown (Profile, Settings, Logout)

**Demo mode banner:**
- If in `/demo`, show a fixed top banner: "🎯 Demo Mode — Exploring with sample data" + "Create Account" button
- Subtle yellow/amber background

---

### 4. DASHBOARD (`/app/dashboard`)

**Top row — KPI Cards (8 cards, responsive grid 4×2 → 2×4 on mobile):**
Each card has: icon, label, value (animated counter), trend indicator (▲▼), sparkline mini-chart

| Card | Calculation |
|---|---|
| Total Net PnL | Sum of all netPnl |
| Winrate | (Winning trades / Total closed trades) × 100 |
| Profit Factor | Gross profit / Gross loss |
| Total Trades | Count of all trades |
| Avg Win | Average netPnl of winning trades |
| Avg Loss | Average netPnl of losing trades |
| Best Session | Session with highest total PnL |
| Best Pair | Pair with highest total PnL |

- Green text for positive values, red for negative
- Each card: glass card style, hover lift

**Equity Curve Section:**
- Area chart (Recharts) showing cumulative PnL over time
- Toggle: Daily / Weekly / Monthly aggregation
- Gradient fill under the line (green if uptrend, red if downtrend)
- Interactive: hover shows tooltip with date + PnL value
- Animate on mount (line draws from left to right)

**Win/Loss Distribution:**
- Side by side:
  - Donut chart: Wins vs Losses vs BE (with counts + percentages)
  - Bar chart: Result distribution (TP / SL / BE / Partial / Manual Close)

**Performance by Session (horizontal bar chart):**
- Each session (Asia, London, New York, Overlap) with PnL bar
- Color coded green/red

**Recent Trades Table:**
- Last 10 trades, compact table
- Columns: Date, Pair, Position (colored badge), Result (colored badge), PnL, Grade
- Click row → navigate to trade detail
- "View all" link → `/app/trades`

**Quick Insights Panel (right sidebar or bottom section):**
- Cards:
  - 🔥 Current streak: "4 wins in a row" or "2 losses in a row"
  - 📊 This week: "+$340 | 6 trades | 66% WR"
  - ⚠️ Risk alert: "You've hit 80% of max daily loss" (if UserGoals set)
  - 💡 Tip: rotating trading wisdom quotes

---

### 5. TRADES — JOURNAL (`/app/trades`)

**Main View: Data Table (TanStack Table)**
- **Columns:**
  - Date/Time (formatted with date-fns)
  - Pair (bold)
  - Position (BUY=green badge, SELL=red badge)
  - Entry Price
  - Exit Price
  - Lot Size
  - Session (colored chip)
  - Strategy
  - Result (TP=green, SL=red, BE=yellow, Running=blue, Partial=orange)
  - PnL (green/red, mono font)
  - Net PnL
  - Grade (A+ to F, colored)
  - R:R
  - Actions (View, Edit, Delete icons)

- **Features:**
  - Global search bar (searches pair, strategy, notes, tags)
  - Multi-filter bar:
    - Pair (multi-select dropdown)
    - Session (multi-select)
    - Timeframe (multi-select)
    - Result (multi-select)
    - Strategy (multi-select, from existing values)
    - Date range picker
    - Grade filter
    - Tags filter
  - Column sorting (click header)
  - Column visibility toggle
  - Pagination (10/25/50/100 per page)
  - Bulk actions: delete selected, export selected
  - Empty state: illustration + "No trades yet. Add your first trade!" + CTA button

**Add Trade Page (`/app/trades/new`):**
Full-page form (not modal — too many fields). Premium form design.

- **Section 1: Trade Setup**
  - Pair (combobox with common pairs + custom input): EUR/USD, GBP/USD, USD/JPY, AUD/USD, NZD/USD, USD/CAD, USD/CHF, XAU/USD, NAS100, US30, SPX500, BTC/USD, ETH/USD + custom
  - Position: BUY / SELL toggle buttons (styled)
  - Timeframe: select (M1, M5, M15, M30, H1, H4, D1, W1)
  - Session: select (Asia, London, New York, Overlap, Off Session)
  - Strategy: combobox (suggests previous strategies + custom input)

- **Section 2: Prices & Size**
  - Entry Price (number input)
  - Stop Loss (number input, optional)
  - Take Profit (number input, optional)
  - Exit Price (number input, optional — required unless Running)
  - Lot Size (number input)

- **Section 3: Risk & Reward**
  - Risk Planned: toggle (% | currency) + value input
  - Reward Planned: toggle (% | currency) + value input
  - Planned R:R (auto-calculated, displayed as read-only chip)

- **Section 4: Result**
  - Result: radio group (TP, SL, BE, Partial, Manual Close, Running)
  - PnL: auto-calculated (shown) + manual override option
  - Commission: number input (default 0)
  - Net PnL: auto-calculated (read-only display)

- **Section 5: Pre-Trade Checklist** ⚡
  - Show all active checklist items from TradingPlanChecklist
  - Each item = checkbox + label
  - If no checklist items exist: "Set up your trading plan in Settings" link
  - Checklist state saved as snapshot with the trade

- **Section 6: Psychology**
  - Emotion Before: select (Confident, Neutral, Anxious, FOMO, Revenge, Bored)
  - Emotion After: select (Satisfied, Frustrated, Regret, Calm, Excited)
  - Trade Grade: A+ / A / B / C / F (styled radio buttons)
  - Tags: multi-input (type + Enter to add, click to remove)

- **Section 7: Screenshots**
  - Setup Before (URL input): label "Chart before entry (TradingView URL)"
  - Setup After (URL input): label "Chart after close (TradingView URL)"
  - Display as styled link cards with a chart icon + truncated URL + "Open ↗" button
  - Do NOT attempt to embed, screenshot, or preview the URL content

- **Section 8: Notes & Timing**
  - Notes: textarea (rich text optional, plain text minimum)
  - Opened At: date + time picker
  - Closed At: date + time picker (disabled if Running)

- **Form footer:**
  - "Save Trade" primary button
  - "Cancel" secondary button
  - Form validation errors shown inline per field

**Trade Detail View (`/app/trades/:id`):**
- Full page with premium layout
- Top: Pair + Position badge + Result badge + Date
- Two-column layout:
  - Left column:
    - Price card: Entry, Exit, SL, TP with visual representation
    - Risk/Reward card: Planned vs Actual R:R
    - PnL card (large, colored): Net PnL value + percentage of account
  - Right column:
    - Trade context: Session, Timeframe, Strategy, Duration
    - Psychology card: Emotion before/after, Grade, Tags
    - Checklist snapshot (what was checked before this trade)
- Setup Before/After: two link cards side by side
- Notes section (full width)
- Action buttons: Edit (pencil icon), Delete (trash icon with confirmation modal)
- "← Back to Journal" link at top

**Edit Trade:**
- Same form as Add Trade, pre-filled with existing data
- "Update Trade" button instead of "Save Trade"

**Delete Trade:**
- Confirmation modal: "Are you sure? This action cannot be undone."
- "Delete" (red) + "Cancel" buttons

---

### 6. CALENDAR (`/app/calendar`)

**Monthly Calendar Grid:**
- Full month view, Monday start
- Each day cell shows:
  - Day number
  - Number of trades (small badge)
  - Daily Net PnL (green/red text, mono font)
  - Background tint: subtle green for profit days, subtle red for loss days, neutral for no trades
- Navigation: ← Previous Month | Month Year | Next Month →
- Today: highlighted border (indigo)

**Week Summary Panel (right sidebar or top section):**
- When hovering or selecting a week row:
  - Weekly PnL
  - Total trades
  - Winrate
  - Best/Worst day

**Day Detail Panel:**
- Click a day → slide-in panel or modal showing:
  - Date
  - All trades for that day (compact list)
  - Daily PnL summary
  - Link to Debrief for that day (if exists) or "Create Debrief" button
  - Each trade row clickable → navigate to trade detail

**Month Summary Bar (top of calendar):**
- Monthly PnL | Monthly Winrate | Trading Days | Total Trades

---

### 7. ANALYTICS (`/app/analytics`)

**Top Filter Bar (sticky):**
- Account selector
- Date range picker (preset: This week, This month, Last 30 days, Last 90 days, This year, All time, Custom)
- Session filter (multi-select)
- Pair filter (multi-select)
- Timeframe filter (multi-select)
- Strategy filter (multi-select)
- All charts below react to these filters in real-time

**Section 1: Performance Over Time**
- Line/Area chart: Cumulative PnL
- Toggle: Daily / Weekly / Monthly
- Overlay option: show drawdown on same chart (inverted area)

**Section 2: Win/Loss Analysis**
- Donut chart: Win vs Loss vs BE distribution
- Bar chart: Average Win $ vs Average Loss $ (side by side)
- Metric cards: Winrate, Profit Factor, Expectancy, Avg R:R

**Section 3: Breakdown by Session**
- Grouped bar chart: PnL per session
- Table: Session | Trades | Wins | Losses | Winrate | PnL | Avg PnL

**Section 4: Breakdown by Pair**
- Horizontal bar chart: PnL per pair (sorted best to worst)
- Table: same structure as session breakdown

**Section 5: Breakdown by Strategy**
- Same format as pair breakdown

**Section 6: Breakdown by Timeframe**
- Same format

**Section 7: Day-of-Week Heatmap**
- 7 columns (Mon-Sun), color intensity = PnL
- Show: trades count + PnL per day of week
- Helps identify best/worst days

**Section 8: Time-of-Day Performance**
- Bar chart: PnL by hour (0-23)
- Identifies best trading hours

**Section 9: Psychology Insights**
- Emotion Before vs Result correlation (grouped bar)
- Trade Grade vs PnL (scatter or bar)
- Shows: "When you feel FOMO, your winrate drops to 23%"

**Section 10: Risk Management**
- Drawdown chart over time
- Max drawdown value
- Risk per trade distribution (histogram)
- Consecutive wins/losses chart

**Every chart:**
- Matches the theme perfectly (dark backgrounds, indigo/green/red colors)
- Interactive tooltips on hover
- Responsive (stacks on mobile)
- Animated on mount
- Empty state if no data for that section

---

### 8. DEBRIEF (`/app/debrief`) — "Daily Review"

**Layout: Split view**
- Left panel: Calendar/date list to select a date
- Right panel: Debrief form/view for selected date

**Date List (Left):**
- Mini calendar at top to pick date
- Below: list of existing debrief entries (date + HTF bias badge + day rating stars)
- Click entry → load it on the right
- "New Debrief" button → opens form for today (or selected date)

**Debrief Form (Right):**

- **Section 1: Market Analysis**
  - HTF Bias: radio (Bullish / Bearish / Neutral / No Bias)
  - Narrative: textarea ("Describe your higher timeframe analysis, key levels, expectations...")
  - Key Levels: textarea ("Support/resistance levels you're watching")
  - Chart URLs: dynamic list of URL inputs (add/remove), displayed as link cards

- **Section 2: Review (fill at end of day)**
  - "Did the market respect your plan?": radio (Yes / No / Partial)
  - Mistakes: textarea ("What did you do wrong today?")
  - Good Actions: textarea ("What discipline wins did you have?")
  - Lessons Learned: textarea ("Key takeaways for tomorrow")

- **Section 3: Psychology**
  - Emotional State: select (Focused, Distracted, Stressed, Calm, Overconfident)
  - Day Rating: 1-5 stars (clickable star component)

- **Section 4: Today's Trades (auto-populated, read-only)**
  - Show all trades for this date (compact list, from Trades data)
  - Summary: trades count, PnL, winrate

- **Save / Update button**

**View Mode:**
- When viewing a saved debrief, show all content in a beautiful read-only layout
- Edit button to switch to form mode

---

### 9. SETTINGS (`/app/settings`)

**Tabs layout: Profile | Accounts | Trading Plan | Goals | Data | Preferences**

**Tab: Profile**
- View/edit: Username, Email
- Change password (old + new + confirm)

**Tab: Accounts**
- List of trading accounts (cards)
- Each card: name, type badge, capital, currency, broker, created date
- Actions: Edit, Delete (with confirmation), Set as Active
- "Create New Account" button → modal form:
  - Name, Initial Capital, Currency (dropdown), Type (Demo/Real/Propfirm/Funded), Broker (optional)
- Active account highlighted with indigo border

**Tab: Trading Plan (Checklist Builder)**
- Header: "Build your pre-trade checklist. These items will appear in every trade form."
- List of checklist items with:
  - Drag handle (reorder)
  - Checkbox (active/inactive toggle)
  - Label (editable inline)
  - Category dropdown (Pre-Trade, Risk, Entry, Exit, Psychology)
  - Delete button
- "Add Item" button at bottom
- Default suggestions (user can accept or dismiss):
  - "HTF bias confirmed"
  - "Key level identified"
  - "Session active"
  - "Risk ≤ planned max"
  - "Not revenge trading"
  - "Setup matches strategy"

**Tab: Goals**
- Monthly PnL target (number input)
- Max daily loss (circuit breaker, number input)
- Max daily trades (number input)
- Minimum R:R (number input)
- Weekly review day (dropdown)
- These values are referenced in Dashboard alerts

**Tab: Data**
- **Export section:**
  - Export Trades: CSV / JSON buttons
  - Export Debriefs: JSON button
  - Export Full Backup: JSON (all data)
  - Export PDF Report: generates a styled PDF with:
    - Period selector
    - Summary stats
    - Equity curve chart (rendered to canvas → PDF)
    - Trade list table
    - "Generated by Seven Journal" footer
- **Import section:**
  - Import from JSON: file upload + preview + validation
  - Import from CSV: file upload + column mapping UI + validation
  - Conflict handling: "Skip duplicates" / "Overwrite" radio
  - Show import preview table before confirming
- **Danger Zone:**
  - "Reset All Data" button (red)
  - Confirmation modal: type "DELETE" to confirm
  - Clears all LocalStorage data for this user

**Tab: Preferences**
- Theme: Dark / Light / System (radio)
- Language: FR / EN (dropdown)
- Default timeframe (for new trades)
- Default session (for new trades)
- Date format: DD/MM/YYYY or MM/DD/YYYY
- Currency display: symbol ($) or code (USD)

---

## BUILD PHASES

### PHASE 1 — Foundation
Build and deliver a fully working app with:
- [x] Project setup: Vite + React + TS + Tailwind + shadcn/ui
- [x] Design system implemented: theme, colors, typography, card styles
- [x] Logo created and applied
- [x] Routing with react-router-dom (all routes, protected routes)
- [x] LocalStorage data layer with Zod schemas for all entities
- [x] Zustand stores (user, accounts, trades, debriefs, checklists, goals)
- [x] Auth pages: Sign Up + Sign In (client-side, SHA-256 hash)
- [x] App Shell: Sidebar (collapsible) + Topbar (account selector, new trade, theme, language, user menu)
- [x] Settings page: ALL tabs (Profile, Accounts, Trading Plan, Goals, Data, Preferences)
- [x] i18n setup (FR + EN) with all strings
- [x] Theme toggle (dark/light) working
- [x] Basic Dashboard with placeholder cards (data-ready but may show zeros)
- [x] Navigation working across all routes

### PHASE 2 — Core Trading Features
- [x] Add Trade form (full form with all fields, checklist integration, validation)
- [x] Edit Trade
- [x] Delete Trade (with confirmation)
- [x] Trades table (TanStack Table): all columns, search, filters, sorting, pagination
- [x] Trade detail page (premium layout)
- [x] Dashboard fully functional with real data: all KPI cards, equity curve, charts, recent trades, insights
- [x] PnL auto-calculation logic
- [x] All animations (card entry, chart draw-in, counters)

### PHASE 3 — Advanced Features
- [x] Calendar view (monthly grid, day detail, week summary, month summary)
- [x] Analytics page (ALL 10 chart sections, all filters)
- [x] Debrief page (form + view + date navigation + auto-trade list)
- [x] Trading plan checklist integration verified end-to-end
- [x] Goals integration (dashboard alerts)

### PHASE 4 — Landing & Polish
- [x] Landing page (hero, features, stats, testimonials, CTA, footer)
- [x] Demo mode: loads sample dataset, labeled clearly, read-only or sandboxed
- [x] Import/Export: CSV, JSON, PDF (fully working)
- [x] All micro-interactions polished (hover, press, transitions, page animations)
- [x] Responsive pass (tablet + mobile)
- [x] Empty states for all pages/sections
- [x] Error handling (graceful, user-friendly)
- [x] Final QA: every feature works, no broken routes, no placeholder content

---

## QUALITY REQUIREMENTS (MANDATORY)

- ❌ NO "TODO", "coming soon", placeholder, or stub features
- ❌ NO broken routes or empty pages
- ❌ NO unstyled elements or default browser styles leaking
- ✅ Every feature described above must be fully implemented and working
- ✅ All forms validate with zod and show inline errors
- ✅ LocalStorage read/write is wrapped in try/catch with fallbacks
- ✅ Components are modular and reusable (Button, Card, Badge, Modal, etc.)
- ✅ TypeScript strict mode — no `any` types
- ✅ Code is clean, well-structured, and follows React best practices
- ✅ All text content supports i18n (no hardcoded strings in components)
- ✅ Consistent design across every single page

---

## DELIVERABLE

Return the complete, runnable project with:
1. Full source code (all files)
2. `package.json` with all dependencies
3. Clear README with:
   - Setup instructions (`npm install` → `npm run dev`)
   - Project structure overview
   - Feature list
4. The app must work immediately after `npm install && npm run dev`
```