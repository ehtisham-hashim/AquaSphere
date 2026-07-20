# Design System — AQUA Sphere OS

This is the visual rulebook for AQUA Sphere OS. The product is an **operations tool used at speed** — an operator answering a phone call needs to read a customer's balance in one glance, and the owner needs to trust a number on their phone without squinting. Every choice here is judged against one question: *does this help someone see the right number, fast, without doubt?*

---

## 0. Component Strategy: Tailwind CSS + Modular Architecture

To maintain a clean codebase and avoid monolithic, unmaintainable files, we strictly follow **Tailwind CSS best practices** combined with clean code principles.

### Why This Combination

| Library | Role | Why |
|---------|------|-----|
| **React** | Component framework | Modular UI, isolated state, reusable logic. |
| **Tailwind CSS** | Styling engine | Rapid styling, built-in design system constraints, fully responsive, out-of-the-box Dark Mode support. |
| **Lucide React** | Icons | Consistent, lightweight, clean icon set perfectly suited for operational dashboards. |

### Clean Code & Modular Architecture
As per the `codebase-cleanup-refactor-clean` standard:
1. **No Large Files:** Files must be strictly single-responsibility. A page like `Dashboard` should only compose smaller components (`MetricCard`, `RecentOrdersTable`), not define them inline. Keep files under 150 lines where possible.
2. **Tailwind Abstractions (`@apply`):** For highly reused elements like buttons, inputs, and cards, abstract the Tailwind classes into standard CSS classes within `index.css` using `@apply`. This keeps JSX clean and readable.
3. **Folder Structure:** Components must be neatly organized into `components/ui` (generic buttons, inputs), `components/layout` (Sidebar, Header), and `components/features` (specific business logic components).

---

## 1. Colors & Theming (Light & Dark Mode)

The app natively supports **Light and Dark themes** using Tailwind's `dark:` variant and CSS variables.

**Brand Color:** We use a refined **Green (`#059669` - Tailwind Emerald-600)**. It is vibrant enough to look modern, but dark enough to ensure **white text (`#FFFFFF`) is perfectly legible** against it (accessible contrast ratio).

### CSS Variables (`index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg-base: #F3F4F6;
    --bg-surface: #FFFFFF;
    --text-primary: #111827;
    --text-secondary: #4B5563;
    --border-color: #E5E7EB;
    
    /* Primary Brand: Green */
    --primary: #059669; /* Emerald 600 */
    --primary-hover: #047857; /* Emerald 700 */
    
    /* Status Colors */
    --success: #10B981;
    --warning: #F59E0B;
    --danger: #EF4444;
    --info: #3B82F6;
  }

  .dark {
    --bg-base: #111827;
    --bg-surface: #1F2937;
    --text-primary: #F9FAFB;
    --text-secondary: #9CA3AF;
    --border-color: #374151;
    
    --primary: #10B981; /* Lighter emerald for dark mode */
    --primary-hover: #059669;
  }
}

body {
  @apply bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-200;
}
```

**Rule:** `--warning` (amber) is reserved exclusively for soft-block situations (credit limit, bottle overage) — warning, not blocking. `--danger` (red) is reserved for actual failures.

### Division Branding
When switching between **Aquasphere** and **Wadaana Industries**:
- **Aquasphere**: Uses the primary Green brand color.
- **Wadaana Industries**: Uses a distinct, muted Purple (`#7C3AED` - Violet-600) for the top header. The rest of the UI remains consistent.

---

## 2. Typography

- **UI / body face**: **Inter** — neutral, excellent number legibility.
- **Numeric / tabular face**: Inter with `tabular-nums` Tailwind utility for columns of numbers, so digits align perfectly.

Use standard Tailwind text utilities:
- `text-xs` (12px) - Table meta, labels
- `text-sm` (14px) - Table body, forms
- `text-base` (16px) - Default text
- `text-lg` (18px) - Card titles
- `text-2xl` font-bold (32px) - Dashboard headline figures

---

## 3. Tailwind Components (`@apply` shortcuts)

To prevent HTML bloat, use `@apply` for core UI primitives in `index.css`:

```css
@layer components {
  /* Buttons */
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)];
  }
  .btn-secondary {
    @apply bg-white border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-gray-50 dark:bg-[var(--bg-surface)] dark:hover:bg-gray-800;
  }

  /* Inputs */
  .input-field {
    @apply w-full px-3 py-2 border border-[var(--border-color)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow;
  }

  /* Cards */
  .card {
    @apply bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden;
  }
}
```

---

## 4. Key UI Sections (Neat & Clean)

### Login Page
The login page must look exceptionally **neat and modern**:
- A beautifully centered `.card` on a soft gradient background (`bg-gradient-to-br from-[var(--bg-base)] to-green-50 dark:to-emerald-900/20`).
- Clean, properly labeled `.input-field` elements.
- A prominent, full-width `.btn-primary` for the login action.
- Subtle branding (AquaSphere Logo) centered above the form.

### Sidebar & Layout
The layout must be responsive, featuring a **neat sidebar**:
- **Desktop Sidebar:** Fixed width (w-64), sleek border separation, uses Lucide icons. Active states should have a subtle green background tint with green text. It should feel incredibly structured and clean.
- **Mobile Sidebar:** Hidden by default, toggled via a hamburger menu in the Header, sliding in smoothly.
- **Header:** Sticky top, contains the Dark Mode toggle, Division switcher (Aquasphere/Wadaana), and User profile dropdown.

### Tables & Data
Tables are the most-used surface.
- **Header row:** `text-xs uppercase text-[var(--text-secondary)] bg-gray-50 dark:bg-gray-800 sticky top-0`.
- **Row height:** Touch-friendly minimum height (`h-12`).
- **Borders:** Thin `.border-b border-[var(--border-color)]`. No zebra striping to avoid visual clutter.
- **Status Badges:** Rounded-full pills (`px-2 py-1 text-xs font-medium`). Green for Paid/Delivered, Gray for Pending, Amber for Soft-Blocks.

### Forms & Alerts
- Forms use standard `.input-field`.
- **Soft-block warnings** are inline alerts, NOT blocking modals. They appear above the submit button with an amber background and a `.btn-warning` "Proceed Anyway" button.

---

## 5. Summary of Architecture
1. **Small Files:** Break UI into `<Button />`, `<Sidebar />`, `<MetricCard />`.
2. **Tailwind Shortcuts:** Keep JSX readable by abstracting `.btn`, `.card`, `.input-field` into CSS.
3. **Themes:** Full Light/Dark support using CSS variables.
4. **Colors:** Legible, accessible Green primary color.
5. **Speed:** High contrast, tabular numbers, immediate visual hierarchy.
