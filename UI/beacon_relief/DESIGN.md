# Design System Document: The Resilient Horizon

## 1. Overview & Creative North Star
**Creative North Star: "The Authoritative Calm"**

In high-stakes emergency coordination, the UI must move beyond "efficient" and into "authoritative." Most relief apps feel like spreadsheets; this design system is an editorial dashboard. It utilizes **Organic Brutalism**—the intersection of rigid, reliable data and soft, human-centric layering. 

The design breaks the traditional "box-and-line" template by using **asymmetric data density** and **tonal layering**. We prioritize the "calm in the storm" by using generous whitespace (breathing room) contrasted against high-impact, razor-sharp typography. The goal is to reduce cognitive load for users who may be operating under extreme stress or fatigue.

---

## 2. Colors & Surface Logic

### The Palette
We utilize a deep, commanding blue for stability, tempered by a "paper-white" hierarchy for clarity.
- **Primary Hub:** `primary` (#003f87) / `primary_container` (#0056b3). Use for high-priority actions.
- **The Urgency Spectrum:** `tertiary` (#88000e) for active emergencies; `error` (#ba1a1a) for system failures or blocked routes.
- **Surface Neutrals:** `surface` (#f8f9fa) to `surface_container_highest` (#e1e3e4).

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to separate sections.
Boundaries are defined through **background color shifts**. A sidebar might use `surface_container_low`, while the main map or dashboard area sits on `surface`. This creates a cleaner, more sophisticated interface that feels "built" rather than "drawn."

### Surface Hierarchy & Nesting
Treat the UI as physical layers of stacked material:
1.  **Base Layer:** `surface` (The map or background).
2.  **Middle Layer:** `surface_container_low` (Secondary info panels).
3.  **Top Layer:** `surface_container_lowest` (#ffffff) (Active data cards or modals).

### The "Glass & Gradient" Rule
To elevate the app above "standard software," use **Glassmorphism** for floating map overlays. Use a `surface` color at 80% opacity with a `backdrop-filter: blur(12px)`. 
- **Signature Texture:** Primary CTAs should use a subtle linear gradient from `primary` (#003f87) to `primary_container` (#0056b3) at a 135-degree angle to provide a "metallic" professional sheen.

---

## 3. Typography
We utilize **Inter** for structural reliability and **Public Sans** for micro-data labels.

- **Display Scale (`display-lg` to `display-sm`):** Reserved for high-level statistics (e.g., "1,240 Displaced"). These should be heavy (700-800 weight) to convey authority.
- **Headline & Title Scale:** Used for location names and section headers. 
- **Body Scale:** `body-md` (0.875rem) is our workhorse. Inter’s tall x-height ensures readability even on low-resolution field devices.
- **Label Scale:** `label-md` using **Public Sans**. These are capitalized and slightly letter-spaced (+0.05em) for "technical" data points (e.g., coordinates, timestamps).

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved by stacking tones. Place a `surface_container_lowest` card on a `surface_container` background. This creates a soft, natural lift without the "dirty" look of heavy drop shadows.

### Ambient Shadows
For floating elements (modals or emergency alerts), use **Ambient Shadows**:
- `box-shadow: 0 12px 32px -4px rgba(25, 28, 29, 0.08);`
The shadow must be a tinted version of the `on_surface` color, never pure black.

### The "Ghost Border" Fallback
If contrast is insufficient (e.g., accessibility), use a **Ghost Border**:
- `1px solid rgba(194, 198, 212, 0.2)` (using `outline_variant` at 20% opacity).

---

## 5. Components

### Navigation & Actions
- **Primary Buttons:** Gradient fill (`primary` to `primary_container`), `xl` (0.75rem) roundedness. No border.
- **Secondary Buttons:** `surface_container_high` fill with `on_surface` text.
- **Input Fields:** Forbid heavy outlines. Use `surface_container_low` as the background with a 1px `outline_variant` at 10% opacity. Upon focus, the background shifts to `surface_container_lowest`.

### Map Markers (Location Types)
These markers are the core of the app’s utility. They must be iconic and distinct:
- **Relief Hubs:** Octagonal shape, `primary`.
- **Victim Gathering Points:** Circular, `secondary_container` with a human silhouette icon.
- **Transit Points:** Arrow-heads, `secondary`.
- **Emergency Areas:** Diamond shape, `tertiary` (#88000e) with pulse animation.
- **Blocked Roads:** Thick "X" markers using `error`.
- **Food/Rest Stops:** Rounded square, `on_secondary_container` (teal-leaning).

### Cards & Lists
**Forbid divider lines.** 
Separate list items using `12px` of vertical white space or by alternating background tones (`surface_container_low` vs `surface_container_lowest`). Content is grouped by proximity, not by containment.

### Emergency Alert Toasts
Floating glass panels. Background: `tertiary_container` at 90% opacity. Backdrop-blur: 8px. Text: `on_tertiary_fixed`.

---

## 6. Do’s and Don'ts

### Do:
- **Use Intentional Asymmetry:** Align high-density data (lists) to the left and low-density data (large maps/visuals) to the right.
- **Prioritize Tonal Shifts:** Always ask, "Can I define this section with a background color change instead of a line?"
- **Use Wide Gutters:** Emergency contexts are chaotic; the UI should be the opposite. Use 24px-32px gutters between main content blocks.

### Don't:
- **Don't use pure black (#000):** It creates "vibration" against the white. Use `on_background` (#191c1d) for text.
- **Don't use standard shadows:** Avoid the default 0 2px 4px shadow. It looks cheap. Use the Ambient Shadow spec.
- **Don't use 100% opaque borders:** They clutter the view and distract from critical data.
- **Don't crowd the markers:** On the map, use "clustering" logic to prevent icon overlap, ensuring the highest-priority markers (`emergency areas`) always sit on the top Z-index.