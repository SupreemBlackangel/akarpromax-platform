# Tools UI/UX Audit

Phase 6 baseline — all issues classified by severity.

## Architecture Issues

| ID | Severity | Issue | Fix |
|---|---|---|---|
| ARCH-001 | CRITICAL | No shared calculator shell — each tool reimplements header/form/result/actions/help/related | Create `ToolCalculatorShell` |
| ARCH-002 | HIGH | No shared result card — each tool renders results differently | Create `ToolResultCard` |
| ARCH-003 | HIGH | No shared select input — each tool has custom dropdown | Create `ToolSelectInput` |
| ARCH-004 | HIGH | No shared advanced options container — inconsistent collapsible behavior | Create `ToolAdvancedOptions` |
| ARCH-005 | HIGH | No shared secondary actions — each tool reimplements save/share/copy/reset | Create `ToolSecondaryActions` |
| ARCH-006 | MEDIUM | No shared help section — inconsistent help rendering | Create `ToolHelpSection` |
| ARCH-007 | MEDIUM | No shared related tools — each tool reimplements navigation | Create `ToolRelatedTools` |

## Mobile / Calculation Safe Zone Violations

| ID | Severity | Issue | Fix |
|---|---|---|---|
| MOB-001 | CRITICAL | Tool ads (`tools_hero`) render above results on mobile | Move ads below result card or remove from calculator tools |
| MOB-002 | CRITICAL | No calculation safe zone — non-essential content can appear before result on mobile | Enforce safe zone in `ToolCalculatorShell` |
| MOB-003 | HIGH | 2-column grid too narrow at 320px — labels overlap inputs | Use 1-column on smallest breakpoints |
| MOB-004 | HIGH | No progressive disclosure on mobile — all inputs visible at once | Advanced options collapsed by default on mobile |
| MOB-005 | HIGH | Select inputs not full-width on mobile | Full-width selects below `md:` breakpoint |
| MOB-006 | MEDIUM | Calculate button not full-width on mobile | Full-width button below `sm:` breakpoint |
| MOB-007 | MEDIUM | Inputs small for touch targets | Minimum 44px height on inputs |

## Accessibility Issues

| ID | Severity | Issue | Fix |
|---|---|---|---|
| A11Y-001 | CRITICAL | `NumInput` has no `aria-describedby` for error state | Add error state with aria |
| A11Y-002 | CRITICAL | Selects have no `aria-label` | Add aria-label to all selects |
| A11Y-003 | HIGH | Results not announced to screen readers | Add `aria-live="polite"` to result card |
| A11Y-004 | HIGH | Advanced toggle not keyboard accessible | Ensure full keyboard support |
| A11Y-005 | MEDIUM | No `inputMode` on numeric inputs | Add `inputMode="decimal"` or `"numeric"` |

## RTL Issues

| ID | Severity | Issue | Fix |
|---|---|---|---|
| RTL-001 | HIGH | `dir="rtl"` only on wrapper — no per-element RTL | Use RTL-aware utilities throughout |
| RTL-002 | MEDIUM | Number fields not visually right-aligned in RTL | Ensure proper alignment |

## Dark Mode Issues

| ID | Severity | Issue | Fix |
|---|---|---|---|
| DM-001 | MEDIUM | Result backgrounds use Tailwind `dark:` overrides that may not match design | Verify against dark palette |

## Performance Issues

| ID | Severity | Issue | Fix |
|---|---|---|---|
| PERF-001 | HIGH | Each tool is a full client component — no code splitting within tool | Consider splitting result from form |
| PERF-002 | MEDIUM | No virtualization of tool grid | Keep 14 tools — no issue yet |
