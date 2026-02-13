# HandyCall UI Component Inventory

## Theme source
- `packages/web/src/app/globals.css`
- Purpose: single source of design tokens (neutrals, core palette, radii, shadows, motion).

## Core primitives (`packages/web/src/components/ui`)
- `button.tsx`
- Usage: primary actions (`variant="primary"`/default), secondary actions (`variant="secondary"`), low-emphasis actions (`variant="ghost"`), destructive actions (`variant="danger"`), loading state (`loading`).

- `input.tsx`
- Usage: single-line fields with optional leading icon (`leadingIcon`) and error styling (`error`).

- `textarea.tsx`
- Usage: multiline entry in forms/settings/test panels.

- `select.tsx`
- Usage: controlled selection menus with fully custom styling.

- `card.tsx`
- Usage: section containers and panelized content blocks.

- `badge.tsx`
- Usage: status chips (`success`, `warning`, `destructive`, `info`, `secondary`).

- `tabs.tsx`
- Usage: lightweight segmented view controls for local page state.

- `table.tsx`
- Usage: tabular records with sticky header and row hover states.

- `dialog.tsx`
- Usage: modal workflows (confirmations, editing, compare dialogs).

- `toast.tsx`
- Usage: non-blocking feedback in bottom-right viewport.

- `skeleton.tsx`
- Usage: perceived-loading placeholders across dashboards/inboxes/lists.

- `tooltip.tsx`
- Usage: concise hover/focus hints for compact actions.

## Layout system
- `packages/web/src/components/app-shell/app-shell.tsx`
- Components:
  - `AppShell`: top-level dashboard shell container.
  - `AppSidebar`: grouped primary navigation with active state styling.
  - `AppTopBar`: sticky top bar with global search, status chip, notifications/profile slot.

## Portal utility components
- `packages/web/src/components/portal/page-header.tsx`
- Usage: consistent page title + subtitle + actions pattern.

- `packages/web/src/components/portal/empty-state.tsx`
- Usage: standardized empty/loading fallback messaging with optional action.
