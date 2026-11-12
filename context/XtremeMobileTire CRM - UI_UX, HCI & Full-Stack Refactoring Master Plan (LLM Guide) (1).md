# **XtremeMobileTire (xtremeCRM) — Complete Step-by-Step UI/UX, HCI & Backend Guide** 

# **SYSTEM INSTRUCTIONS FOR GEMINI 3.8 (READ FIRST)**

You are refactoring the **XtremeMobileTire** codebase (`Landingpage/` Next.js app \+ `CRM Portal` Frontend \+ `Backend API`).  
Follow these 4 Golden Rules on every file you touch:

1. **DO NOT BREAK ANY FEATURES:** Never delete `useState`, `useEffect`, API calls (`fetch`/`axios`), Socket.io events, database queries, or route links. Only update the UI classes, layout containers, and text formatters.  
2. **NO SCREEN OVERFLOW (100% RESPONSIVE):** Every page must fit cleanly on Mobile (`320px`), Tablet (`768px`), Laptop (`1024px–1366px`), and Desktop (`1920px`). No button or table is allowed to get cut off on the right side of the screen.  
3. **SIMPLE HCI COLOR RULES (EASY TO READ):**  
   * **Page Background:** Light gray-white (`bg-slate-50` / `#F8FAFC`) so cards stand out clearly.  
   * **Cards:** Pure white (`bg-white`) with a clear border (`border border-slate-200 shadow-xs rounded-xl`).  
   * **Text Contrast:**  
     * Main headings & data values: Darkest slate (`text-slate-900 font-bold`).  
     * Subtitles & secondary text: Medium-dark slate (`text-slate-600`).  
     * Small uppercase labels: Slate (`text-slate-500 font-semibold uppercase tracking-wider text-xs`). NEVER use unreadable light gray (`text-slate-300` or `text-gray-400`).  
   * **Button Color Rule (Very Important):**  
     * **Red Button (`bg-red-600 hover:bg-red-700 text-white`):** Use ONLY for the **1 main button** on a page (`+ New Fleet Job`, `Auto-FIFO`, `+ Add Expense`, `+ Add Driver`).  
     * **Dark Slate Button (`bg-slate-900 hover:bg-slate-800 text-white`):** Use for table row buttons and card actions (`Assign Driver`, `Dispatch Driver`, `Enter Campaign & Start Dialing`). Do NOT use light pink buttons in table rows.  
     * **Status Badges:**  
       * Red/Rose (`bg-rose-50 text-rose-700 border-rose-200`): ONLY for `Overdue` or `Urgent Breakdown`.  
       * Amber (`bg-amber-50 text-amber-800 border-amber-200`): For `Pending` or `Pending Verification`.  
       * Blue (`bg-blue-50 text-blue-700 border-blue-200`): For `In Progress`.  
       * Green (`bg-emerald-50 text-emerald-700 border-emerald-200`): For `Completed`, `Authorized`, `Active`, or `Net Profit`.  
       * Neutral Gray (`bg-slate-100 text-slate-600 border-slate-200`): For empty placeholders like `No Plate`, `Spec TBD`, or `Not recorded`.  
4. **ALIGN ALL NUMBERS:** Add the `tabular-nums` class to all phone numbers, prices (`CA$4,648.73`), unit counts, timers (`18m overdue`), and dates so numbers line up neatly.

# **PART 1: CREATE THE SHARED FORMATTER FILE FIRST**

Before editing any pages, create `src/utils/displayFormatters.ts` (in CRM Frontend) and `Landingpage/lib/formatters.ts` (in Landingpage). Also copy these helper functions into `server/utils/textSanitizer.ts` (in Backend).

```ts
// displayFormatters.ts — Simple helper functions to clean messy text and numbers

// 1. Fixes broken symbols like "Durham Regional Police Service â€” DRPS HQ" -> "Durham Regional Police Service — DRPS HQ"
export function cleanText(input?: string | null): string {
  if (!input) return "";
  return String(input)
    .replace(/^\uFEFF/, "")
    .replace(/â€”|â€"|â€“|\uFFFD/g, "—")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€\x9d/g, '"')
    .replace(/Â /g, " ")
    .trim();
}

// 2. Fixes duplicate "Unit unit 18" -> "Unit 18"
export function formatUnitLabel(unit?: string | number | null): string {
  if (unit === undefined || unit === null || String(unit).trim() === "") {
    return "Unit Unassigned";
  }
  const clean = String(unit).trim().replace(/^unit\s+/i, "").trim();
  return `Unit ${clean}`;
}

// 3. Fixes lowercase vehicle names ("honda civic 2026" -> "Honda Civic 2026") while keeping GMC, CR-V, NRR, CE uppercase
const KEEP_UPPER = new Set(["GMC", "BMW", "VW", "RAM", "SUV", "NRR", "CE", "LE", "SE", "CR-V", "HR-V", "F-150", "DRPS", "HQ", "LTD"]);
export function formatVehicleName(name?: string | null): string {
  if (!name || !name.trim()) return "Unspecified Vehicle";
  return cleanText(name)
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (KEEP_UPPER.has(upper) || /^[A-Z0-9]{2,}-\d+$/i.test(word)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// 4. Fixes Plate badge (Catches bug where vehicle name "TOYOTA COROLLA CE" was saved inside the plate field)
export function formatPlateBadge(plate?: string | null, vehicleName?: string | null): { text: string; isPlaceholder: boolean } {
  const raw = (plate || "").trim();
  if (
    !raw ||
    /^no\s*plate$/i.test(raw) ||
    /^n\/?a$/i.test(raw) ||
    (vehicleName && raw.toLowerCase() === vehicleName.trim().toLowerCase())
  ) {
    return { text: "No Plate", isPlaceholder: true };
  }
  return { text: raw.toUpperCase(), isPlaceholder: false };
}

// 5. Fixes Tire Spec badge ("TBD" -> neutral gray placeholder instead of red error badge)
export function formatTireSpecBadge(spec?: string | null): { text: string; isPlaceholder: boolean } {
  const raw = (spec || "").trim();
  if (!raw || /^tbd$/i.test(raw) || /^not\s*recorded$/i.test(raw) || /^n\/?a$/i.test(raw)) {
    return { text: "Spec TBD", isPlaceholder: true };
  }
  return { text: raw.toUpperCase(), isPlaceholder: false };
}

// 6. Fixes duplicate Region badge ("CA CA (CANADA)" -> "CA • Canada")
export function formatRegionBadge(region?: string | null): { code: string; label: string; currency: "CAD" | "USD" | "GBP" } {
  const r = (region || "CA").toUpperCase().trim();
  if (r.startsWith("US") || r.includes("UNITED STATES")) return { code: "US", label: "US • United States", currency: "USD" };
  if (r.startsWith("UK") || r.startsWith("GB") || r.includes("KINGDOM")) return { code: "GB", label: "GB • United Kingdom", currency: "GBP" };
  return { code: "CA", label: "CA • Canada", currency: "CAD" };
}

// 7. Formats money with commas ("CA$4648.73" -> "CA$4,648.73")
export function formatMoney(amount?: number | string | null, currency: "CAD" | "USD" | "GBP" = "CAD"): string {
  const num = Number(amount ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safe);
  if (currency === "CAD") return `CA$${formatted}`;
  if (currency === "GBP") return `£${formatted}`;
  return `$${formatted}`;
}

// 8. Splits long pipe-separated "LEAD & EQUIPMENT NOTES" into clean key-value badges
export function parseLeadNotes(notes?: string | null): { key: string; value: string }[] {
  const cleaned = cleanText(notes);
  if (!cleaned) return [];
  return cleaned.split(/\s*\|\s*/).filter(Boolean).map((part) => {
    const idx = part.indexOf(":");
    if (idx > 0 && idx < 35) {
      return { key: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() };
    }
    return { key: "Detail", value: part.trim() };
  });
}
```

# **PART 2: ALL CRM PORTAL PAGES — PAGE-BY-PAGE FIXES**

## **Page 1: Global Layout, Sidebar & Top Header (DashboardLayout.tsx, Sidebar.tsx, TopHeader.tsx)**

* **What is broken:** Wide tables and long titles push the right side of the page off-screen. On mobile/tablet, the sidebar takes up fixed space.  
* **How Gemini 3.8 must fix it:**  
  * On the outer wrapper in `DashboardLayout.tsx`, use: `flex min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900`.  
  * On the `<main>` content wrapper, you MUST add `min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8`. (`min-w-0` stops flex items from overflowing the screen).  
  * On `Sidebar.tsx`: Show fixed sidebar on desktop (`hidden lg:flex lg:w-64 lg:shrink-0`), and use a slide-out drawer (`Sheet` / mobile menu overlay) on screens `< 1024px`.  
  * On `TopHeader.tsx`: Use `flex items-center justify-between gap-2 px-4 sm:px-6 h-16 bg-white border-b border-slate-200`. Wrap right-side profile and currency items in `flex items-center gap-2 shrink-0`.

## **Page 2: Virtual Assistant / Call Agent — 1-Lead Focus Mode (Leads Queue Page)**

* **What is broken (from Screenshot 1):**  
  * The `"Edit"` button on the right of `Durham Regional Police Service...` is cut off on the right edge.  
  * The title has broken encoding: `â€” DRPS` in a red box.  
  * The 12 numbered contact cards (`1. PRIMARY PHONE` to `12. TIRE SIZES`) have very light gray labels that are hard to read.  
  * The yellow `LEAD & EQUIPMENT NOTES (IMPORTED)` box is a wall of text separated by `|`.  
* **How Gemini 3.8 must fix it:**  
  * **Fix Header & Edit Button:** Put the title and the `Edit` button inside `<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-4">`. Put `min-w-0 flex-1 break-words` on the `<h1>` title, and put `shrink-0` on the `Edit` button wrapper so it NEVER gets pushed off-screen.  
  * **Fix Title Text:** Wrap the lead title in `cleanText(lead.companyName)` so `â€”` becomes a clean `—`.  
  * **Fix the 12 Contact Cards Grid:** Use `<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 my-5">`. Change the small numbered label class to `text-xs font-bold uppercase tracking-wider text-slate-500`. Change the value class to `text-sm sm:text-base font-semibold text-slate-900 tabular-nums truncate`. If a value is `"Not recorded"`, style it with `text-slate-400 italic font-normal`.  
  * **Fix the Imported Notes Box:** Use `parseLeadNotes(lead.notes)` to display each `|` segment (`Unit`, `Tire Spec`, `Condition`, `Plate`, `VIN`, `Odometer`, `Assigned Operator`) as a clean grid of mini white badges (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2`) inside the amber box.

## **Page 3: Call Agent — Cold Outreach Hub & My Callbacks Pool (Leads Page)**

* **What is broken (from Screenshot 4):**  
  * Two stacked bars both have upload buttons (`Upload CSV` on top, `Upload Spreadsheet` right below it), which confuses the user.  
  * Campaign cards say `CA CA (CANADA)` (duplicate `CA`).  
  * Campaign names like `"new btach"` look unpolished.  
* **How Gemini 3.8 must fix it:**  
  * **Remove Duplicate Upload Button:** Keep `Upload CSV` and `Sync Queue` in the top right toolbar. Remove the duplicate `Upload Spreadsheet` button from the second bar so `Auto-FIFO (Any Batch) ->` stands out clearly as the primary red action button.  
  * **Fix Country Badge:** Use `formatRegionBadge(campaign.region).label` so the badge displays `CA • Canada` instead of `CA CA (CANADA)`.  
  * **Responsive Campaign Cards:** Place campaign cards in `<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">`.

## **Page 4: Call Agent — Roadside Intake & Fleet Intake Pages**

* **What to check & fix:**  
  * Wrap all form sections in clean white cards (`bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs`).  
  * Use `grid grid-cols-1 sm:grid-cols-2 gap-4` for form inputs so they stack into 1 column on mobile/split-screen and 2 columns on desktop.  
  * Make all `<input>` and `<select>` fields `h-11` (`44px` minimum height) with `border-slate-300 focus:ring-2 focus:ring-red-600`.

## **Page 5: Super Admin — Dashboard, Jobs (Roadside), & Fleet Jobs (Commercial Work Orders)**

* **What is broken (from Screenshot 2):**  
  * The 4 top KPI cards (`PENDING FLEET JOBS`, `IN PROGRESS`, `UNVERIFIED FLEET BOOKINGS`, `COMPLETED FLEET JOBS`) have washed-out pastel borders and the `TRIAGE ->` text wraps awkwardly.  
  * Too many red buttons compete for attention (`+ New Fleet Job`, `CA` selector, `18m overdue`, `+ Dispatch Driver`, `Assign Driver`).  
  * The 7-column table squeezes text on laptop screens.  
* **How Gemini 3.8 must fix it:**  
  * **Fix the 4 KPI Cards:** Use `<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">`. Make each card `bg-white border border-slate-200 rounded-xl p-4 shadow-xs border-l-4` (`border-l-amber-500` for Pending, `border-l-blue-600` for In Progress, `border-l-purple-600` for Unverified, `border-l-emerald-600` for Completed). Make the big number `text-3xl font-extrabold text-slate-900 tabular-nums mt-2`.  
  * **Fix Button Colors in Table Rows:**  
    * Keep `+ New Fleet Job` (top right) as **Brand Red** (`bg-red-600 hover:bg-red-700 text-white`).  
    * Keep `18m overdue` badge as **Rose Alert** (`bg-rose-50 text-rose-700 border border-rose-200`).  
    * Change `+ Dispatch Driver` and `Assign Driver` buttons inside the table rows from light pink to **Dark Slate** (`bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs`).  
  * **Fix Filter Bar & Table Responsiveness:**  
    * Put `flex flex-wrap items-center justify-between gap-3` on the filter bar so dropdowns and the search box wrap onto a second line on smaller laptops instead of overflowing.  
    * Wrap the table in `<div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">`.  
    * Format the `VEHICLE / UNIT` column using `formatVehicleName()` and `formatUnitLabel()`.

## **Page 6: Super Admin — Bookings, Dispatch (Live Map/Queue), Fleets, Drivers, Customer, & Developer Pages**

* **What to check & fix across all remaining Admin pages:**  
  * Apply the exact same table wrapper (`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white`) and filter bar wrapping (`flex flex-wrap gap-3`) to `Bookings`, `Fleets`, `Drivers`, and `Customer` tables.  
  * Apply `formatVehicleName()`, `formatUnitLabel()`, `formatPlateBadge()`, and `formatMoney()` to every row in `Bookings`, `Dispatch`, `Fleets`, and `Drivers`.  
  * Ensure modals (Assign Driver Modal, New Fleet Job Modal, View Details Drawer) have `max-h-[90dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-2xl` so they never clip on mobile or small laptops.

## **Page 7: Accountant & Super Admin — Accounting (Reconciliation Ledger) & Invoices Pages**

* **What is broken (from Screenshot 5):**  
  * The 3 Region Cards (`Canada`, `United States`, `United Kingdom`) each have 3 inner boxes (`REVENUE`, `DIRECT COGS`, `NET PROFIT`) side-by-side. On laptop screens (`1024px–1366px`), 9 boxes across one row crushes the currency numbers (`CA$4648.73`).  
  * Numbers are missing commas (`CA$4648.73` instead of `CA$4,648.73`).  
* **How Gemini 3.8 must fix it:**  
  * **Fix Region Cards Grid:** Use `<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 my-5">`.  
  * **Fix Inner Revenue/COGS/Profit Boxes:** Inside each region card, use `grid grid-cols-1 sm:grid-cols-3 gap-2.5`. Format all amounts with `formatMoney(amount, currency)` and add `tabular-nums text-sm sm:text-base font-extrabold truncate`.  
  * **Fix Expense Audit Table Badges:** Put `Pending Verification` and `Verify Cash` in a neat `flex flex-wrap items-center gap-1.5 mt-1`. Style `State COGS` button with a clear border (`border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs px-3 py-1.5 rounded-lg`).

## **Page 8: Fleet Manager Portal — Vehicles & My Drivers (fleet-dashboard)**

* **What is broken (from Screenshots 6 & 7):**  
  * `Unit unit 18` repeats the word "Unit".  
  * `honda civic 2026` is all lowercase.  
  * `TBD` tire spec is colored bright red like an error badge, and `NO PLATE` is raw uppercase text.  
  * In `My Drivers`, the top-right button has two plus signs: `+ + Add Driver`.  
  * In `My Drivers`, `Alex Romanov` has `Plate: TOYOTA COROLLA CE` (the car name was saved into the license plate field\!).  
* **How Gemini 3.8 must fix it:**  
  * **In Vehicles Page:**  
    * Use `formatUnitLabel(vehicle.unitNumber)` so `Unit unit 18` becomes `Unit 18`.  
    * Use `formatVehicleName(vehicle.name)` so `honda civic 2026` becomes `Honda Civic 2026`.  
    * Use `formatPlateBadge(vehicle.plate, vehicle.name)` for the plate pill.  
    * Use `formatTireSpecBadge(vehicle.tireSpec)` for the Tire Spec pill:  
      * When `isPlaceholder` is `true` (`Spec TBD`), use neutral gray (`bg-slate-100 text-slate-600 border border-slate-200`).  
      * When `isPlaceholder` is `false` (`11R22.5`), use crisp dark/red spec styling (`bg-red-50 text-red-700 border border-red-200 font-bold tabular-nums`).  
  * **In My Drivers Page:**  
    * Remove the extra `+` from `+ + Add Driver` so it reads `+ Add Driver`.  
    * Use `formatPlateBadge(driver.plate, driver.vehicleName)` on the `Plate:` badge. When `driver.plate` accidentally contains `"TOYOTA COROLLA CE"`, `formatPlateBadge` automatically detects that it matches the vehicle name and displays `"No Plate"` in neutral gray instead of repeating the car model\!

## **Page 9: Fleet Manager & Mobile — Request Service, Service Status, Pending Invoices, & Paid Invoices**

* **What is broken (from Screenshot 3 — Mobile View):**  
  * On mobile screens, the `"Direct Dispatch"` pill badge squeezes the main heading `"Request Roadside & Fleet Service"`.  
  * The `ARRIVE BETWEEN (START)` and `AND (END WINDOW)` hour/minute dropdowns and `AM/PM` buttons are too small to tap comfortably on a phone.  
* **How Gemini 3.8 must fix it:**  
  * **Stack Badge Above Title on Mobile:** Use `flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between` on the header so `"Direct Dispatch"` sits cleanly above the title on phones and to the right on desktop.  
  * **Enlarge Time Controls for Mobile Touch (Fitts's Law):** Set all `<select>` dropdowns (hours/minutes), date inputs, and `AM/PM` toggle buttons to `h-11` (`44px` height) with `min-w-[64px] text-sm font-semibold tabular-nums`.

# **PART 3: ALL 53 Landingpage/ FILES — END-TO-END CHECKLIST**

Gemini 3.8 must also check and update these files in the `Landingpage/` folder so the public website matches the CRM portal:

5. **Global Styles & Layout (`app/globals.css`, `app/layout.tsx`, `components/layout/page-shell.tsx`):**  
   * Add `overflow-x: hidden; max-width: 100vw;` to `html, body` in `globals.css`.  
   * Darken `--muted-foreground` in `globals.css` to `#475569` (light mode) so gray text is easy to read on white backgrounds.  
   * Add `.tabular-nums { font-variant-numeric: tabular-nums; }`.  
6. **Header, Navbar & Announcement Bar (`components/layout/announcement-bar.tsx`, `components/home/navbar.tsx`, `components/home/header.tsx`):**  
   * Make `announcement-bar.tsx` wrap cleanly on small phones (`flex flex-wrap text-center px-3 py-2 text-xs sm:text-sm`).  
   * Make the mobile hamburger button in `navbar.tsx` at least `44x44px` (`h-11 w-11`) and give the open mobile menu `max-h-[calc(100dvh-4rem)] overflow-y-auto`.  
7. **Home Page & Hero (`app/page.tsx`, `components/home/home-view.tsx`, `hero-section.tsx`, `hero-badge.tsx`, `hero-dynamic-phone-bar.tsx`, `hero/hero-interactive-hub.tsx`, `hero/circuit-connectors.tsx`, `hero/laptop-mockup.tsx`):**  
   * Hide or scale SVG lines in `circuit-connectors.tsx` on mobile (`hidden md:block`) so they never push the mobile screen wider than `100vw`.  
   * Add `tabular-nums` to phone numbers in `hero-dynamic-phone-bar.tsx` and `dispatch-contact-bar.tsx`.  
8. **Home Sections (`services-cards.tsx`, `mobile-tire-showcase.tsx`, `fleet-banner.tsx`, `fleet-members-bar.tsx`, `account-type-comparison.tsx`, `account-type/*`, `testimonials.tsx`):**  
   * Ensure all card grids use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`.  
   * In `account-type-comparison.tsx`, stack the accordion and preview card vertically on mobile/tablet (`grid-cols-1 lg:grid-cols-12 gap-6`).  
9. **Booking, Fleet Solutions, Services, About & Auth Pages (`app/booking/*`, `components/booking/*`, `app/fleet-solutions/*`, `components/fleet/*`, `app/services/*`, `components/services/*`, `app/about/*`, `components/about/*`, `app/signin/page.tsx`, `app/signup/page.tsx`):**  
   * In `fleet-create-account.tsx` and `booking-modal.tsx`, change all 2-column form grids to `grid grid-cols-1 sm:grid-cols-2 gap-4` and set all inputs/buttons to `h-11` (`44px` height) with clear `text-slate-700` labels.  
   * In `about-brands-marquee.tsx`, ensure the parent container has `overflow-hidden w-full` so the scrolling brand logos never create a horizontal scrollbar.  
   * Keep stub files (`components/layout/footer.tsx`, `header.tsx`, `navbar.tsx`, `components/sections/*.tsx`, `app/grill-me/*`) untouched so existing imports do not break.

# **PART 4: BACKEND CODE REVIEW & WHERE TO UPDATE OTHER PAGES FOR CONSISTENCY**

When you change backend code or database data, you **MUST** update all connected frontend pages so data looks identical everywhere. Follow this exact map:

## **Backend Change 1: Fix Broken Symbols (â€”) in CSV Upload & Leads API**

* **Where to change in Backend:** `leadsController.ts` / `csvUploadService.ts` (or wherever CSV files are parsed).  
* **What to change:**  
  * Decode uploaded CSV file buffers explicitly as UTF-8: `const csvText = cleanText(fileBuffer.toString("utf8"));`  
  * Before saving a Lead to the database (`prisma.lead.create` / `createMany`), pass `companyName`, `fleetManager`, `ceoName`, `address`, and `notes` through `cleanText()`.  
* **Where to update in Frontend Pages to stay consistent:**  
  * `Call Agent -> 1-Lead Focus Mode` (Lead Title, 12 Contact Cards, Imported Notes box)  
  * `Call Agent -> Cold Outreach Hub` (Campaign card titles)  
  * `Call Agent -> My Callbacks Pool` (Callback list rows)  
  * `Super Admin -> Leads Page` (All rows in Leads table \+ Edit Lead Modal)  
  * `Super Admin -> Fleet Jobs Page` (When a lead is converted into a trial Fleet Job)

## **Backend Change 2: Fix "Unit unit 18", "honda civic 2026", and Driver Plate Swap**

* **Where to change in Backend:** `fleetController.ts`, `vehicleController.ts`, and `driverController.ts`.  
* **What to change:**  
  * When saving a **Vehicle** (`POST /api/fleet/vehicles` or `PUT`):  
    * Clean `unitNumber`: `unitNumber = String(req.body.unitNumber || "").replace(/^unit\s+/i, "").trim();` (stores `"18"` instead of `"unit 18"`).  
    * Clean `vehicleName` / `makeModel`: `makeModel = formatVehicleName(req.body.makeModel);` (stores `"Honda Civic 2026"`).  
  * When saving a **Driver** (`POST /api/fleet/drivers` or `PUT`):  
    * Fix the field mapping bug where `vehicleName` was accidentally saved into `plate`\! Ensure `plate: req.body.plateNumber` and `vehicleName: req.body.vehicleName` are saved to their own separate database columns.  
* **Where to update in Frontend Pages to stay consistent (All 6 Pages):**  
  * `Fleet Manager -> Vehicles Page` (Unit badge, Vehicle name heading, Plate badge, Tire Spec badge)  
  * `Fleet Manager -> My Drivers Page` (`Plate:` badge and `Vehicle:` badge on each driver row)  
  * `Fleet Manager -> Request Service Page` (Vehicle dropdown selector options)  
  * `Fleet Manager -> Service Status & Invoices Pages` (Vehicle & Unit descriptions)  
  * `Super Admin -> Fleet Jobs Page` (`VEHICLE / UNIT` column in the main work orders table)  
  * `Accountant -> Reconciliation Ledger Page` (`CUSTOMER / VEHICLE` column in the Expense Audit table)

## **Backend Change 3: Standardize Region (CA, US, UK) & Currency (CAD, USD, GBP)**

* **Where to change in Backend:** `accountingController.ts`, `jobsController.ts`, and `campaignsController.ts`.  
* **What to change:**  
  * Always return clean uppercase ISO codes: `region: "CA" | "US" | "GB"` and `currency: "CAD" | "USD" | "GBP"`. Never return `"CA CA"` in the region string.  
* **Where to update in Frontend Pages to stay consistent:**  
  * **Top Header Bar** (Global currency/region dropdown switcher)  
  * **Call Agent \-\> Cold Outreach Hub** (Region badge on Campaign cards)  
  * **Super Admin \-\> Fleet Jobs Page** (`CA | US | UK` toggle buttons & job pricing)  
  * **Accountant \-\> Reconciliation Ledger Page** (Region filter pills, the 3 Region Summary Cards, and the Expense Audit table)  
  * **Invoices Page** (Super Admin, Accountant, and Fleet Manager views)