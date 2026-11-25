# CSS and layout gotchas

Facts confirmed by computed-style and rect measurements in this repo. Use the probe; do not eyeball a
screenshot and guess.

## Tailwind Preflight makes every SVG a block element

`tailwindcss` Preflight contains:

```css
img, svg, video, canvas, audio, iframe, embed, object {
  display: block;
  vertical-align: middle;
}
```

Consequences:

- An SVG inside an `inline-block` container starts a new line box. HeroUI's
  `.disclosure__trigger` is `inline-block`, so `查看` and the chevron stack vertically.
- Do **not** add a global `svg { display: inline }` rule. It changes icons across the app.
- Fix component-scoped: make the trigger a flex container.

## HeroUI layer order

`@heroui/styles/dist/index.css` declares:

```css
@layer theme, base, components, utilities;
```

Component styles are in `components`; Tailwind utilities are in `utilities`, which wins. So the
utility `inline-flex` overrides `.disclosure__trigger { @apply inline-block; }` without `!important`.
The same reasoning applies before adding custom CSS: prefer utilities on the component.

## Disclosure markup

- `Disclosure.Trigger` renders a React Aria `Button` with `data-slot="disclosure-trigger"` and
  classes `disclosure__trigger <your classes>`.
- `Disclosure.Indicator` renders the HeroUI chevron SVG with `data-slot="disclosure-indicator"` and
  `data-expanded="true|false"`.
- `.disclosure__indicator` is `size-4 shrink-0 ms-auto` and rotates 180° when expanded.
- `.disclosure__content` stays mounted while collapsed: `height: 0; overflow: clip; opacity: 0`.
- `Disclosure.Body` renders `.disclosure__body` (padding) around `.disclosure__body-inner`.

## Why the chevron wraps (measured)

Standalone reproduction of the audit table at `1280x900` before the fix:

| Measurement | Before | After `inline-flex items-center gap-1` |
|---|---|---|
| trigger rect | 24 × 32 | 44 × 16 |
| chevron offset from trigger top | 16 px | 0 px |
| chevron computed `display` | `block` | `block` |
| chevron `margin-inline-start` | 8 px (auto resolved in 24 px box) | 0 px |

The SVG stays `display: block`; flex layout makes it a flex item on the same line. Do not assert that
the SVG becomes non-block; assert the trigger `display` and the chevron offset.

## HeroUI tables use auto layout and stay influenceable by content

`.table__content` is `w-full border-separate` with no `table-layout: fixed`, so the browser's table
algorithm sizes columns from their content.

In the audit page, `Disclosure.Content` is mounted even when collapsed, so its `<pre>` always
contributes to the intrinsic width of the detail column. `w-full max-w-2xl` does **not** prevent
growth: it caps the `<pre>` at 672 px, but the column still grows to fit it:

Measured on the standalone reproduction at `1280x900`:

| Measurement | Collapsed | Expanded, `w-full max-w-2xl` |
|---|---|---|
| table width | 1208 px | 1282.38 px |
| detail column | 437 px | 720 px |
| other columns | 173/77/160/106/255 | 82/47/140/69/224 (compressed) |

`720 = 672 (max-w-2xl) + 32 (cell px-4 both sides) + 16 (body p-2 both sides)`.

Fix: decouple the expanded content from intrinsic sizing.

```html
<pre class="w-0 min-w-full overflow-x-auto whitespace-pre-wrap break-words ...">
```

- `width: 0` makes the `<pre>` contribute 0 to the column's intrinsic width.
- `min-width: 100%` is a percentage, ignored during intrinsic sizing and resolved against the cell's
  used width at layout time, so the `<pre>` fills the column.
- `overflow-x-auto` handles any token that still cannot wrap.

Measured after the fix: table 1208 px collapsed and expanded; detail column 437 px in both; table
height grows (expected). On the real admin page at `1440x900` after the fix: table 1176 px, columns
`174/75/155/102/423/247`, identical collapsed and expanded.

## Measurement recipe

Probe these selectors and fields:

- container: `table`, `{ rect.width, computed.tableLayout }`
- affected column: `table thead th:nth-child(n)`, `rect.width`
- component: `[data-slot="disclosure-trigger"]` with child
  `[data-slot="disclosure-indicator"]`, `rect`, `computed.display`, child `offset.top`
- wrapper: the `<pre>` or its parent, `computed.width`, `computed.minWidth`, `computed.maxWidth`,
  `computed.overflowX`

Record rects for every snapshot; compare `initial` vs `final`.

## Assertion rules

- Assert **deltas**: table width and affected column width change ≤ 1 px between collapsed/expanded.
- Assert component-level facts: trigger `computed.display === "inline-flex"`, chevron
  `children.chevron.offset.top <= 2`, trigger `rect.height < 24`.
- Do not assert absolute pixel widths across machines or font stacks.
- Do not assert table height; expanding content legitimately increases it.
- Do not assert SVG `display`; Preflight keeps it `block`.
- Use `reducedMotion: true` and wait for `[data-expanded="true"]` before the final snapshot.