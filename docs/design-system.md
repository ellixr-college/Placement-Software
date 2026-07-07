# Ellixr — Design System & Platform Split

[← Overview](./00-overview.md)

## Platform Split (important)

Ellixr ships **one Next.js 15 app** with **two distinct experiences**, gated by role:

| Audience                                               | Experience                                                         | Layout                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Student**                                            | **Mobile-first** — designed for phones, app-like. PWA-installable. | Mobile shell: top app bar, card/timeline content, **floating bottom pill nav** |
| **Placement Officer / College Admin / Platform Admin** | **Desktop web** — dense, productive admin UI                       | Web shell: left sidebar nav, top bar, data tables, multi-column dashboards     |

- Implemented via **role-based route groups** sharing one auth/session and one component library:
  - `app/(student)/*` → mobile shell (`max-w-md` centered, bottom nav, large touch targets)
  - `app/(admin)/*` → desktop shell (sidebar + topbar, responsive grid, tables)
- Same coral theme + design tokens across both; the **student side leans into the reference
  mockup** (rounded cards, soft shadows, timeline, pastel category tints), the **admin side** uses a
  lighter, more neutral application of the same palette for long working sessions.
- Student PWA: `manifest.json` + service worker so students can "install" Ellixr to the home screen.

## Visual Language (from reference mockup)

Warm, friendly, rounded, airy. Coral primary on a soft peach canvas, white elevated cards, pastel
category tints, generous rounding, soft diffuse shadows, stacked avatars, rounded sans typography.

## Color Tokens

```css
/* Brand / primary — coral */
--primary-50: #fff3ec;
--primary-100: #ffe3d4;
--primary-200: #ffc9ad;
--primary-300: #fba983;
--primary-400: #f5926b;
--primary-500: #f0764a; /* main brand / buttons / active nav */
--primary-600: #e85e2c;
--primary-700: #c9471b;
/* Primary gradient (headers, hero cards, bottom nav) */
--gradient-primary: linear-gradient(135deg, #f89b6c 0%, #f0764a 100%);

/* Canvas / surfaces */
--bg-app: #fdf3ea; /* soft peach page background */
--bg-card: #ffffff; /* elevated white cards */
--bg-muted: #f7f4f1;

/* Pastel category tints (timeline / class cards) */
--tint-lavender: #eef0fb;
--tint-lavender-fg: #5b5fc7;
--tint-mint: #e6f4ed;
--tint-mint-fg: #2fa37a;
--tint-cream: #fbf3e2;
--tint-cream-fg: #c99a3b;

/* Text */
--text-strong: #2b2b33; /* headings */
--text-body: #4a4a52;
--text-muted: #9a9aa3; /* secondary / timestamps */
--text-on-primary: #ffffff;

/* Feedback */
--success: #2fa37a;
--warning: #e8a13a;
--danger: #e5484d;
--info: #5b5fc7;
```

## Typography

- Font: **Poppins** (or Plus Jakarta Sans / Inter as fallback) via `next/font`.
- Scale: page title `text-2xl/3xl font-semibold`; section `text-lg font-semibold`; body
  `text-sm/base`; meta/timestamps `text-xs text-muted`.

## Shape, Elevation, Spacing

```css
--radius-card: 1.5rem; /* 24px — cards (rounded-3xl) */
--radius-md: 1rem; /* 16px — inputs, small cards */
--radius-pill: 9999px; /* nav, chips, avatars */
--shadow-card: 0 10px 30px -12px rgba(240, 118, 74, 0.18), 0 4px 12px -6px rgba(0, 0, 0, 0.06);
--shadow-nav: 0 12px 28px -8px rgba(240, 118, 74, 0.45);
/* Spacing: 4px base grid; card padding ~20–24px; comfortable touch targets ≥44px on mobile */
```

## Tailwind / Shadcn mapping

- Extend `tailwind.config` with the tokens above (`colors.primary.*`, `colors.tint.*`,
  `backgroundImage.gradient-primary`, `borderRadius.card`, `boxShadow.card/nav`).
- Shadcn theme CSS variables overridden to the coral palette (light mode primary = `--primary-500`).
- Shared primitives live in `packages/ui`; both shells consume them.

## Key Components

**Shared:** Button (primary gradient / outline / ghost), Card (rounded-3xl + shadow-card), Avatar +
AvatarStack ("+N members"), Badge/Chip (pastel tint variants), Input/Select/Textarea, Modal/Sheet,
Toast, EmptyState, Skeleton loader.

**Student (mobile):** TopAppBar (hamburger + title + notification bell with dot), FloatingBottomNav
(coral pill: Home / Messages / Profile / Settings), TimelineList (hour rail + class cards), ClassCard
(category-tinted, professor + avatar stack), HeroCard (gradient, "next/featured" item),
DetailSheet (sticky gradient header + scrollable white sheet body), AttachmentRow (icon + name +
download/share).

**Admin (desktop):** Sidebar (collapsible, coral active state), Topbar (search, notifications, user
menu), DataTable (sortable, filterable, paginated, row actions), StatCard (metric + trend),
Charts (placement %, funnel, breakdowns — coral/pastel series), KanbanBoard (ATS pipeline by stage),
FilterBar, FormLayout (multi-section), SlideOver (detail/edit panels).

## Reference mockup → Ellixr mapping

| Mockup element                            | Ellixr usage                                                         |
| ----------------------------------------- | -------------------------------------------------------------------- |
| "Today's Classes" timeline                | Student **dashboard / upcoming interviews + applications** timeline  |
| Gradient hero card ("History of Physics") | Student **next interview / featured job** hero card                  |
| Pastel class cards w/ members             | Student **application / interview cards** (status = tint)            |
| Class detail sheet + attachments          | **Job detail / interview detail** sheet with attachments (JD, links) |
| Floating bottom pill nav                  | Student app **bottom nav**                                           |
| Notification bell w/ dot                  | Shared **notification center** entry point                           |

## Accessibility

- Maintain WCAG AA contrast — coral on white passes for large/bold; use `--primary-600/700` for
  small text on light, never light coral text on peach.
- Touch targets ≥44px on the student app; visible focus rings; respect `prefers-reduced-motion`.
