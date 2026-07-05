# Bill Splitter Automation

This app exposes a stable automation contract for browser agents and scripted agents.

## Entry Points

- Page metadata: `#automation-metadata`
- Agent context: `ai-context.json`
- LLM guide: `llms.txt`
- Browser harness: `window.BillSplitterHarness`

Prefer the harness for setup and result extraction. Prefer `data-testid` selectors for UI validation and export button clicks.

## Harness API

```js
const h = window.BillSplitterHarness;

h.clearActiveBill();
h.addPeople(["Alice", "Bob"]);
h.addItems([{ name: "Burger", price: 30 }, { name: "Coke", price: 10 }]);
h.setQuantity("Alice", "Burger", 1);
h.setQuantity("Bob", "Coke", 2);
h.setFee("Service Charge", 6);
h.getSummary();
```

Read-only methods:
- `getState()`
- `getLibrary()`
- `getSummary()`
- `getMetadata()`

Mutating methods:
- `setActiveBillState(state, options?)`
- `resetSample()`
- `clearActiveBill()`
- `createBill(name, state?)`
- `switchBill(id)`
- `renameActiveBill(name)`
- `deleteActiveBill()`
- `addPeople(names)`
- `addItems(items)`
- `setQuantity(personIdOrName, itemIdOrName, quantity)`
- `setFee(name, amount)`

Mutating methods persist to localStorage and re-render the page.

## State Shape

```js
{
  people: [{ id: "person-1", name: "Alice" }],
  items: [{ id: "item-1", name: "Burger", price: 30 }],
  quantities: {
    "person-1": { "item-1": 1 }
  },
  fees: [{ id: "fee-1", name: "Service Charge", amount: 5 }]
}
```

Money inputs are stored as decimal dollar values in app state. Summaries return cents-based totals.

## Stable Selectors

Use these selectors instead of DOM order:

```js
[data-testid="bill-selector"]
[data-testid="bill-name-input"]
[data-testid="people-table"]
[data-testid="items-table"]
[data-testid="quantity-table"]
[data-testid="fees-table"]
[data-testid="results-table"]
[data-testid="person-row"]
[data-testid="item-row"]
[data-testid="fee-row"]
[data-testid="quantity-input"]
[data-testid="result-cell"]
[data-testid="results-total-row"]
[data-testid="export-receipts-pdf"]
[data-testid="export-receipts-png"]
[data-testid="export-breakdown-pdf"]
[data-testid="export-spreadsheet"]
```

Dynamic rows and cells also expose:

- `data-person-id`
- `data-item-id`
- `data-fee-id`
- `data-result-column`

Example:

```js
document.querySelector('[data-testid="result-cell"][data-result-column="grand-total"]')
  .textContent;
```

## Storage

- Current saved-bill library: `bill-splitter-library-v2`
- Legacy single-bill state: `bill-splitter-state-v1`

Do not write localStorage directly unless testing migration behavior. Prefer the harness.

## Exports

Downloads are browser side effects. For deterministic automated checks, validate setup using `getSummary()` and use button clicks only when the test specifically covers downloads.

Export buttons:

- `[data-testid="export-bills"]`
- `[data-testid="export-receipts-pdf"]`
- `[data-testid="export-receipts-png"]`
- `[data-testid="export-breakdown-pdf"]`
- `[data-testid="export-spreadsheet"]`
