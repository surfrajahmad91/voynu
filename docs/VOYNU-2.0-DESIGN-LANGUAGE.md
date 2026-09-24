# VOYNU 2.0 design language (mobile first)

Built on the existing brand system in `shared/styles/brand-theme.css` (Night navy, Voynu teal, Voynu copper, Poppins).
Do not introduce new colours. Use the `--voynu-*` CSS variables so dark mode keeps working.

## Principles
1. **One primary action per screen**, always reachable: a sticky bottom dock with the main button (52px tall), respecting the iOS/Android safe area.
2. **Thumb-first sizes**: touch targets at least 44px, inputs 50px high with 16px text (prevents mobile zoom), body text 14-15px, nothing below 12px.
3. **One column** on phones. Cards have a 20px radius, a 1px `--voynu-border` line and the soft `--voynu-shadow`.
4. **Money is prominent and consistent**: Indian grouping (`en-IN`), tabular figures, the copper accent only for "what you pay" moments.
5. **Show progress and state**: slim progress bar plus step labels, status pills (teal = active, amber = waiting, red = problem, green = good), inline `role="alert"` errors, disabled buttons while busy.
6. **Explain money in plain words**: each payment screen says what is due, when and how.
7. **Accessible by default**: real buttons, `aria-pressed` / `role="radio"` for choice chips, visible focus ring, `prefers-reduced-motion` respected.

## Tokens used
| Purpose | Variable |
|---|---|
| Page / card | `--voynu-bg` / `--voynu-surface` |
| Primary (actions, selected) | `--voynu-teal`, `--voynu-teal-deep`, `--voynu-primary-tint` |
| Money accent | `--voynu-accent`, `--voynu-accent-deep` |
| Text / muted | `--voynu-text` / `--voynu-muted` |
| Lines | `--voynu-border`, `--voynu-border-strong` |
| Primary button | `--voynu-gradient` |

## Applied so far
Customer commute request flow, confirmation screen and subscription cards. Next: Saarthi (driver) payment sheet, Admin payment queue, ride booking screens.
