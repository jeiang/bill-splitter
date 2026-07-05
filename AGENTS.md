# Agent Maintenance Contract

This repo intentionally exposes an AI automation contract. Treat it as public API.

## Required When Changing Behavior

When changing UI behavior, storage shape, calculation logic, exports, or saved-bill behavior:

- Preserve existing `data-testid` values unless there is a strong reason to version the contract.
- Update `#automation-metadata` in `index.html` when selectors, storage keys, or harness methods change.
- Update `ai-context.json` and `llms.txt` when the agent-facing contract changes.
- Update `AUTOMATION.md` with new selectors, methods, or workflows.
- Keep `window.BillSplitterHarness.getSummary()` aligned with the visible results table.

## Harness Rules

- Mutating harness methods must persist state and re-render, matching normal UI actions.
- Read-only harness methods must return cloned data, not direct mutable references.
- Invalid bill/person/item references should throw clear errors.
- Do not remove existing harness methods without adding a documented replacement.

## Selector Rules

- Prefer `data-testid` for automation selectors.
- Dynamic people, items, fees, quantities, and results should expose entity IDs:
  - `data-person-id`
  - `data-item-id`
  - `data-fee-id`
- Results cells should expose `data-result-column`.

## Verification

Before finishing automation-related changes:

- Run `node --check app.js`.
- Verify the page links to `llms.txt` and `ai-context.json`.
- Verify `window.BillSplitterHarness` exists in the browser.
- Verify key selectors from `ai-context.json` resolve.
- Confirm sample totals still match the visible results table.
