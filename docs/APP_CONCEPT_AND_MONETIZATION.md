# Drive Alive (RoadReady) — App Concept & Monetization Strategy

**Version:** 7.0.0 · **Region:** South Africa (ZAR) · **Platforms:** iOS · Android · Web (PC browser)

---

## 1. What Drive Alive Is

Drive Alive is a **marketplace and booking platform for driving lessons in South Africa**. It connects three groups of people:

- **Students** who want to learn to drive and pass their K53 licence test.
- **Independent instructors** who teach lessons in their own vehicles.
- **Driving school companies** that employ or manage multiple instructors.

Think of it as the "Uber/Airbnb model" applied to driving lessons: instructors list themselves and their availability, students find an instructor near them, book a lesson with GPS pickup and drop-off, and pay in the app. The platform sits in the middle of every transaction — which is exactly where the money is made.

### The problem it solves

| For students | For instructors | For driving schools |
|---|---|---|
| Hard to find a trustworthy, verified instructor nearby | No easy way to advertise, manage bookings, or get paid | No software to manage instructors, schedules, and payments |
| Cash payments, no receipts, no recourse | Phone-call/WhatsApp chaos for scheduling | No visibility into instructor performance |
| No-shows and disputes with no record | No-show students mean lost income | Manual admin overhead |
| No idea which lesson type they need | Difficulty filling empty timeslots | Hard to attract new students |

### The solution (what the app actually does today)

1. **Instructor onboarding with trust built in** — instructors register with their licence number, licence codes (Code 8/10/14), SA ID number, and vehicle details. A multi-step **verification workflow** (`pending_admin → pending_company → verified`) means no instructor can take bookings until an admin (and, for company members, the company owner) has approved them. This verification layer is the platform's core trust asset.
2. **GPS-based matching** — instructors define a service radius, an operating province/city/suburb, a maximum travel distance, and a per-km surcharge beyond their radius. Students book with a pickup (and optional drop-off) location.
3. **Real scheduling** — instructors publish availability; students book lessons of a chosen type (beginner, intermediate, advanced, test preparation) and duration.
4. **In-app payments in ZAR** — Stripe today, PayFast planned. Every booking carries the lesson amount **plus a platform booking fee** (default R20, admin-configurable per instructor).
5. **A fair cancellation economy** — cancellations generate **booking credits** (100% if admin cancels, 90% if 24h+ notice, 50% inside 24h) that auto-apply to the next booking. This keeps money inside the platform instead of refunding it out.
6. **WhatsApp automation (Twilio)** — 24-hour student reminders, 15-minute instructor reminders, and daily summaries. Reduces no-shows, which protects everyone's revenue.
7. **Reviews** — 1–5 star ratings per completed lesson build instructor reputation and feed discovery.
8. **Multi-role accounts** — one person can be a student *and* an instructor (or admin) with a runtime role picker at login.
9. **Compliance** — POPIA-aware consent capture (timestamps + IP per channel), encrypted credentials at rest, JWT single-session enforcement, brute-force lockout.

### Why cross-platform matters

The app is built once in **Expo React Native + react-native-web** and runs natively on iOS and Android and in any PC/mobile browser. In the South African market this is critical:

- Students are mobile-first (often Android, often data-constrained) → native app + WhatsApp notifications.
- Instructors manage their day from a phone → native app.
- Driving school owners and admins do back-office work → web/PC browser.
- Web access means **zero install friction** for first-time users — they can browse instructors and book before ever downloading the app.

---

## 2. How the Platform Works (Roles & Flows)

```
┌─────────────┐     registers, gets verified      ┌──────────────┐
│  Instructor │ ────────────────────────────────► │    Admin     │
│  (or joins  │ ◄──────────────────────────────── │  (platform)  │
│  a Company) │        approves / rejects         └──────────────┘
└──────┬──────┘
       │ publishes availability, hourly rate
       ▼
┌─────────────┐    searches nearby, books slot    ┌──────────────┐
│   Student   │ ────────────────────────────────► │   Booking    │
│             │                                   │ lesson + fee │
└──────┬──────┘                                   └──────┬───────┘
       │ pays lesson amount + booking fee (ZAR)          │
       ▼                                                 ▼
┌─────────────┐                                  ┌──────────────┐
│   Stripe /  │   lesson amount → instructor     │   WhatsApp   │
│   PayFast   │   booking fee  → PLATFORM ✦      │  reminders   │
└─────────────┘                                  └──────────────┘
```

**The money flow per booking today:**

```
Total charged = (hourly_rate × duration in hours) + booking_fee
                └── instructor's revenue ──┘       └── YOUR revenue ──┘
```

The `booking_fee` (default **R20**, settable per instructor by the admin) is already your monetization primitive — every paid booking earns the platform money. The strategies below build on this foundation.

---

## 3. Current Revenue Model

| Stream | Mechanism | Status |
|---|---|---|
| **Hybrid commission** | Every booking earns `max(flat fee, commission% × lesson amount)` — flat fee per instructor (`Instructor.booking_fee`, default R20), commission % is a global admin setting (default 8%, Admin Settings screen) | ✅ Live (Jun 2026, `app/services/fees.py`) |
| **Cancellation retention** | 50% cancellation fee inside 24h; credits keep cash in-platform instead of refunding | ✅ Live (fee retention split is implicit) |

That's a solid start, but a flat R20 fee alone caps your upside. Below is the full monetization roadmap.

---

## 4. Monetization Strategy — How to Make Money

### 4.1 Registration & subscription revenue (recurring, predictable)

This answers "make money from each instructor, company, or student registered."

#### A. Instructor subscription tiers (highest-leverage move)

Keep a free tier so the marketplace grows, but charge for the tools that make instructors money:

| | **Free** | **Pro — R299/mo** | **Elite — R599/mo** |
|---|---|---|---|
| Listed in search | ✅ | ✅ | ✅ |
| Bookings per month | 10 | Unlimited | Unlimited |
| Booking fee charged to *their* students | R30 | R20 | R10 |
| Search ranking | Standard | Boosted | Top of results + "Featured" badge |
| WhatsApp reminders for their students | ❌ | ✅ | ✅ |
| Earnings analytics dashboard | ❌ | Basic | Full (peak hours, repeat rate, conversion) |
| Calendar sync (Google Calendar) | ❌ | ✅ | ✅ |
| Instant payouts | ❌ | ❌ | ✅ |

Notice the design: the *booking fee decreases* as the subscription increases — a busy instructor doing 40 lessons/month saves R400–R800 in fees by paying R299–R599, so upgrading is rational for them and recurring for you. The per-instructor `booking_fee` column you already have makes this trivial to implement.

#### B. Company / driving school plans (B2B — your biggest invoices)

Companies already exist in the data model (`Company`, owner approval workflow). Charge them for fleet management:

| | **Starter — R799/mo** | **School — R1,999/mo** | **Enterprise — custom** |
|---|---|---|---|
| Instructor seats | up to 3 | up to 10 | unlimited |
| Company branding page | ✅ | ✅ | ✅ + custom subdomain |
| Cross-instructor schedule view | ✅ | ✅ | ✅ |
| Performance reports per instructor | ❌ | ✅ | ✅ |
| Company-level payouts & invoicing | ❌ | ✅ | ✅ |
| White-label app (their logo) | ❌ | ❌ | ✅ |
| Priority verification of new instructors | ❌ | ✅ | ✅ |

One driving school at R1,999/mo equals 100 booking fees — and they churn far less than individuals.

#### C. Students stay free to register — charge them at the booking, not the door

**Do not charge students a registration fee.** Students are the demand side; any friction there starves the whole marketplace. Instead, monetize students through:

1. **The booking fee they already pay** (it's added on top of the lesson price).
2. **Lesson packages (prepaid bundles)** — sell 5-lesson and 10-lesson packs at a small discount to the student but with the full booking fee per lesson collected **upfront**:
   - 5 lessons: 5% off lessons, fees paid upfront → you hold the float.
   - 10 lessons: 10% off + 1 free mock-test session → larger float, higher retention.
   The existing `BookingCredit` system is 80% of the infrastructure for packages — a package is just pre-purchased credit.
3. **Premium student add-ons** (one-off purchases):
   - **K53 test-prep content** — learner's licence quiz packs, K53 yard-test video walkthroughs: R99–R149 once-off. High margin, zero marginal cost.
   - **Mock test booking** — a "test simulation" lesson type at a premium booking fee (R50 instead of R20).
   - **Priority booking** — R25 to jump the queue for a high-demand instructor's cancellation list.

### 4.2 Per-booking revenue improvements (transaction revenue)

#### D. Switch the flat fee to a percentage commission (or hybrid)

A flat R20 on a R450 lesson is ~4.4%. Industry marketplaces take 10–20%. Recommended hybrid:

```
platform_take = max(R20, 8% of lesson amount)
```

- On a R300 lesson → R24. On a R500 lesson → R40. On a R700 two-hour lesson → R56.
- The instructor still sets their own `hourly_rate`; you take the margin on top or out of it depending on tier (Elite instructors keep more — see 4.1A).
- Implementation: one change in `backend/app/routes/bookings.py` / `payments.py` where `booking_fee` is computed, plus an admin setting for the percentage.

#### E. Distance & convenience surcharges (share them)

Instructors already charge `rate_per_km_beyond_radius` (default R5/km). Take a 20% cut of that surcharge — you built the GPS matching that makes the long-distance booking possible.

#### F. Cancellation fee share

The 50% late-cancellation fee currently exists. Formalize the split: **instructor gets 70%** (their time was blocked), **platform keeps 30%** (you ran the credits/refund machinery). The non-refunded booking fee should always be retained by the platform.

#### G. Payment float & instant-payout fee

Hold instructor payouts on a weekly cycle (standard, free). Offer **instant payout for 2%** or as an Elite-tier perk. The float on weekly cycles also earns interest at scale.

### 4.3 Growth-stage revenue (once you have traffic)

| Stream | What it is | Price idea |
|---|---|---|
| **Featured placement** | Instructors/schools pay to appear top-of-search in their city | R150–R400/week |
| **Lead generation for schools** | Sell qualified student inquiries (student consented via POPIA opt-in you already capture) | R30–R60/lead |
| **Test-centre partnerships** | Referral/booking integration for licence test slots | per-referral fee |
| **Insurance & vehicle partners** | Referral fees for learner driver insurance, dual-control conversions | commission-based |
| **Certification courses** | Advanced/defensive driving certificates (model exists: `Certification`) sold through the platform | 15–20% commission |
| **White-label licensing** | License the platform to driving school chains or other countries | R10k–R50k/mo |

### 4.4 What to build first (priority order)

1. ~~**Hybrid commission (D)**~~ — ✅ **implemented (Jun 2026)**: `app/services/fees.py` computes `max(flat fee, commission% × lesson)` everywhere a fee is charged; admin sets the percent in Admin Settings; student-facing prices reflect it via `frontend/utils/bookingFees.ts`.
2. **Lesson packages (C2)** — increases student lifetime value and cash collected upfront; reuses `BookingCredit`.
3. **Instructor Pro tier (A)** — needs a `subscription_tier` column on `Instructor`, a Stripe recurring product, and tier checks in search ranking and the fee calculation. The admin per-instructor fee override already gives you the fee-by-tier mechanism.
4. **Company plans (B)** — `Company` model exists; add `plan`, seat counting, and billing.
5. **Featured placement + K53 content (4.3)** — once you have meaningful search traffic.

### 4.5 Worked example — what the numbers look like

Assume a modest single-city launch: **50 active instructors, 400 active students, 1,200 bookings/month, average lesson R400.**

| Stream | Calculation | Monthly |
|---|---|---|
| Hybrid commission | 1,200 × max(R20, 8% × R400 = R32) | **R38,400** |
| Instructor Pro (30% adopt) | 15 × R299 | **R4,485** |
| Instructor Elite (10% adopt) | 5 × R599 | **R2,995** |
| Company plans | 3 schools × R1,999 | **R5,997** |
| Late-cancellation share (5% of bookings, 30% of 50% of R400) | 60 × R60 | **R3,600** |
| K53 content (8% of students/mo) | 32 × R99 | **R3,168** |
| **Total** | | **≈ R58,600/mo** |

Same model at 5 cities / 5× volume ≈ **R290k+/mo** — and the subscription share grows faster than the support cost, because the verification + WhatsApp + payments machinery is already automated.

---

## 5. Why This Platform Can Win

1. **Trust is the moat.** The admin + company double-verification workflow, SA ID capture, licence-code validation, and review system solve the #1 fear in this market: getting into a stranger's car. Competitors that are just directories can't match a *verified, payment-backed* booking.
2. **The cancellation-credit system keeps cash in the platform.** Refunds leak revenue; credits recycle it into the next booking (where you earn another fee).
3. **WhatsApp-native reminders fit the SA market** better than email or push alone, and directly reduce no-shows — protecting the revenue of all three sides.
4. **Cross-platform from one codebase** means a student on a R2,000 Android phone, an instructor on an iPhone, and a school owner on a Windows PC all get first-class experiences with no extra dev cost.
5. **Compliance is already built** (POPIA consent trails, encryption at rest, single-session JWT) — a real barrier to entry for copycats and a requirement for school/enterprise customers.

---

## 6. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Disintermediation** — student & instructor meet once, then book off-platform in cash | Make staying on-platform worth it: credits only usable in-app, packages discounts, WhatsApp scheduling, instructor insurance/perks, reviews that build their business. Penalize via tier rules, not policing. |
| Chicken-and-egg (no students without instructors and vice versa) | Launch city-by-city; keep instructor free tier generous; subsidize first bookings with credits. |
| Payment gateway costs eating the flat fee | Hybrid % commission (4.2D) scales the take with the basket; PayFast for lower local card fees. |
| Subscription resistance from instructors | Anchor against the fee savings (Pro pays for itself at ~28 bookings/mo) and grandfather early adopters. |

---

*Document generated 2026-06-11 from codebase v7.0.0. Mechanisms referenced: `Instructor.booking_fee`, `Booking.booking_fee`, `BookingCredit`, `Company`, `Certification`, `PaymentSession`, verification workflow in `RoleTransitionPolicy` / `InstructorVerificationService`.*
