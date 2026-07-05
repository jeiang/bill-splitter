const SAMPLE_STATE = {
  people: [
    { id: "person-1", name: "John" },
    { id: "person-2", name: "Mike" },
    { id: "person-3", name: "Carter" },
  ],
  items: [
    { id: "item-1", name: "Sandwich", price: 20 },
    { id: "item-2", name: "Burger", price: 30 },
    { id: "item-3", name: "Coke", price: 10 },
  ],
  quantities: {
    "person-1": { "item-1": 1, "item-2": 0, "item-3": 0 },
    "person-2": { "item-1": 0, "item-2": 1, "item-3": 0 },
    "person-3": { "item-1": 0, "item-2": 1, "item-3": 2 },
  },
  fees: [
    { id: "fee-1", name: "Service Charge", amount: 15 },
    { id: "fee-2", name: "VAT", amount: 30 },
  ],
};

const LEGACY_STORAGE_KEY = "bill-splitter-state-v1";
const LIBRARY_STORAGE_KEY = "bill-splitter-library-v2";
const initialLibrary = loadInitialLibrary();
const library = initialLibrary.library;
let activeBillId = library.activeBillId;
const state = cloneState(getActiveBill().state);
let nextId = getActiveBill().nextId;

const els = {
  peopleBody: document.querySelector("#peopleBody"),
  itemsBody: document.querySelector("#itemsBody"),
  feesBody: document.querySelector("#feesBody"),
  quantityTable: document.querySelector("#quantityTable"),
  quantityEmpty: document.querySelector("#quantityEmpty"),
  resultsTable: document.querySelector("#resultsTable"),
  resultsEmpty: document.querySelector("#resultsEmpty"),
  grandTotal: document.querySelector("#grandTotal"),
  addPerson: document.querySelector("#addPerson"),
  addItem: document.querySelector("#addItem"),
  addFee: document.querySelector("#addFee"),
  billSelector: document.querySelector("#billSelector"),
  billName: document.querySelector("#billName"),
  newBill: document.querySelector("#newBill"),
  duplicateBill: document.querySelector("#duplicateBill"),
  deleteBill: document.querySelector("#deleteBill"),
  exportBills: document.querySelector("#exportBills"),
  importBills: document.querySelector("#importBills"),
  importBillsFile: document.querySelector("#importBillsFile"),
  batchPeople: document.querySelector("#batchPeople"),
  addBatchPeople: document.querySelector("#addBatchPeople"),
  batchItems: document.querySelector("#batchItems"),
  addBatchItems: document.querySelector("#addBatchItems"),
  resetSample: document.querySelector("#resetSample"),
  clearAll: document.querySelector("#clearAll"),
  exportReceiptPdf: document.querySelector("#exportReceiptPdf"),
  exportReceiptPng: document.querySelector("#exportReceiptPng"),
  exportPdf: document.querySelector("#exportPdf"),
  exportCsv: document.querySelector("#exportCsv"),
  receiptRenderRoot: document.querySelector("#receiptRenderRoot"),
};

els.addPerson.addEventListener("click", () => {
  const person = { id: makeId("person"), name: `Person ${state.people.length + 1}` };
  state.people.push(person);
  state.quantities[person.id] = {};
  persistState();
  render();
});

els.addItem.addEventListener("click", () => {
  state.items.push({ id: makeId("item"), name: `Item ${state.items.length + 1}`, price: 0 });
  persistState();
  render();
});

els.addFee.addEventListener("click", () => {
  state.fees.push({ id: makeId("fee"), name: `Fee ${state.fees.length + 1}`, amount: 0 });
  persistState();
  render();
});

els.billSelector.addEventListener("change", () => {
  switchActiveBill(els.billSelector.value);
});

els.billName.addEventListener("input", () => {
  const bill = getActiveBill();
  bill.name = els.billName.value;
  bill.updatedAt = new Date().toISOString();
  saveLibrary();
  renderBillSelector();
});

els.newBill.addEventListener("click", () => {
  const bill = createBill(`Bill ${library.bills.length + 1}`, createEmptyState());
  library.bills.push(bill);
  switchActiveBill(bill.id);
});

els.duplicateBill.addEventListener("click", () => {
  const current = getActiveBill();
  const bill = createBill(`${displayBillName(current)} copy`, cloneState(state), nextId);
  library.bills.push(bill);
  switchActiveBill(bill.id);
});

els.deleteBill.addEventListener("click", () => {
  if (library.bills.length <= 1) {
    window.alert("At least one saved bill is required.");
    return;
  }

  const index = library.bills.findIndex((bill) => bill.id === activeBillId);
  library.bills = library.bills.filter((bill) => bill.id !== activeBillId);
  const nextBill = library.bills[Math.max(0, index - 1)] ?? library.bills[0];
  switchActiveBill(nextBill.id);
});

els.exportBills.addEventListener("click", () => {
  exportBillLibrary();
});

els.importBills.addEventListener("click", () => {
  els.importBillsFile.click();
});

els.importBillsFile.addEventListener("change", () => {
  importBillLibrary(els.importBillsFile.files?.[0]);
});

els.addBatchPeople.addEventListener("click", () => {
  addBatchPeople();
});

els.addBatchItems.addEventListener("click", () => {
  addBatchItems();
});

els.resetSample.addEventListener("click", () => {
  replaceState(cloneState(SAMPLE_STATE));
  nextId = getHighestNumericId(state) + 1;
  persistState();
  render();
});

els.clearAll.addEventListener("click", () => {
  replaceState({ people: [], items: [], quantities: {}, fees: [] });
  persistState();
  render();
});

els.exportReceiptPdf.addEventListener("click", () => {
  exportReceiptArchive("pdf");
});

els.exportReceiptPng.addEventListener("click", () => {
  exportReceiptArchive("png");
});

els.exportPdf.addEventListener("click", () => {
  openPrintableDocument("Bill Breakdown", buildBreakdownHtml(getBillSummary()), "breakdown");
});

els.exportCsv.addEventListener("click", () => {
  downloadSpreadsheet(getBillSummary());
});

function cloneState(source) {
  return JSON.parse(JSON.stringify(source));
}

function loadInitialLibrary() {
  const fallback = cloneState(SAMPLE_STATE);

  try {
    const storedLibrary = window.localStorage?.getItem(LIBRARY_STORAGE_KEY);
    if (storedLibrary) {
      const parsedLibrary = JSON.parse(storedLibrary);
      const normalizedLibrary = normalizeLibrary(parsedLibrary);
      if (normalizedLibrary) {
        return { library: normalizedLibrary };
      }
    }

    const storedLegacy = window.localStorage?.getItem(LEGACY_STORAGE_KEY);
    if (storedLegacy) {
      const parsedLegacy = JSON.parse(storedLegacy);
      if (isValidStoredState(parsedLegacy?.state)) {
        const bill = createBill("Untitled bill", parsedLegacy.state, parsedLegacy.nextId);
        return { library: { activeBillId: bill.id, bills: [bill] } };
      }
    }
  } catch {
    return { library: createDefaultLibrary(fallback) };
  }

  return { library: createDefaultLibrary(fallback) };
}

function isValidStoredState(candidate) {
  return Boolean(
    candidate
      && Array.isArray(candidate.people)
      && Array.isArray(candidate.items)
      && candidate.quantities
      && typeof candidate.quantities === "object"
      && !Array.isArray(candidate.quantities)
      && Array.isArray(candidate.fees),
  );
}

function normalizeLibrary(candidate) {
  if (!candidate || !Array.isArray(candidate.bills) || candidate.bills.length === 0) {
    return null;
  }

  const bills = candidate.bills
    .filter((bill) => bill && isValidStoredState(bill.state))
    .map((bill) => ({
      id: String(bill.id || makeStorageId("bill")),
      name: String(bill.name || "Untitled bill"),
      updatedAt: String(bill.updatedAt || new Date().toISOString()),
      state: cloneState(bill.state),
      nextId: Number.isInteger(bill.nextId) ? bill.nextId : getHighestNumericId(bill.state) + 1,
    }));

  if (bills.length === 0) {
    return null;
  }

  return {
    activeBillId: bills.some((bill) => bill.id === candidate.activeBillId) ? candidate.activeBillId : bills[0].id,
    bills,
  };
}

function createDefaultLibrary(sourceState) {
  const bill = createBill("Sample bill", sourceState);
  return { activeBillId: bill.id, bills: [bill] };
}

function createBill(name, billState, billNextId = getHighestNumericId(billState) + 1) {
  return {
    id: makeStorageId("bill"),
    name,
    updatedAt: new Date().toISOString(),
    state: cloneState(billState),
    nextId: billNextId,
  };
}

function createEmptyState() {
  return { people: [], items: [], quantities: {}, fees: [] };
}

function makeStorageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistState() {
  const bill = getActiveBill();
  bill.state = cloneState(state);
  bill.nextId = nextId;
  bill.updatedAt = new Date().toISOString();
  saveLibrary();
}

function saveLibrary() {
  try {
    window.localStorage?.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  } catch {
    // Storage can be unavailable in private browsing or restricted embeds.
  }
}

function getActiveBill() {
  return library.bills.find((bill) => bill.id === activeBillId) ?? library.bills[0];
}

function switchActiveBill(billId) {
  const bill = library.bills.find((entry) => entry.id === billId);
  if (!bill) {
    return;
  }

  activeBillId = bill.id;
  library.activeBillId = bill.id;
  replaceState(cloneState(bill.state));
  nextId = Number.isInteger(bill.nextId) ? bill.nextId : getHighestNumericId(state) + 1;
  saveLibrary();
  render();
}

function displayBillName(bill) {
  return bill.name.trim() || "Untitled bill";
}

function exportBillLibrary() {
  persistState();
  const blob = new Blob([JSON.stringify(library, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `bill-splitter-bills-${new Date().toISOString().slice(0, 10)}.json`);
}

function importBillLibrary(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = normalizeLibrary(JSON.parse(String(reader.result ?? "")));
      if (!imported) {
        throw new Error("Invalid saved bill file.");
      }

      library.activeBillId = imported.activeBillId;
      library.bills = imported.bills;
      activeBillId = imported.activeBillId;
      const bill = getActiveBill();
      replaceState(cloneState(bill.state));
      nextId = bill.nextId;
      saveLibrary();
      render();
    } catch {
      window.alert("That file is not a valid bill-splitter export.");
    } finally {
      els.importBillsFile.value = "";
    }
  });
  reader.addEventListener("error", () => {
    window.alert("Could not read that file.");
    els.importBillsFile.value = "";
  });
  reader.readAsText(file);
}

function addBatchPeople() {
  const names = parseBatchPeople(els.batchPeople.value);
  if (names.length === 0) {
    return;
  }

  const existingNames = new Set(state.people.map((person) => person.name.trim().toLowerCase()).filter(Boolean));
  let added = 0;
  names.forEach((name) => {
    const normalized = name.toLowerCase();
    if (existingNames.has(normalized)) {
      return;
    }

    const person = { id: makeId("person"), name };
    state.people.push(person);
    state.quantities[person.id] = {};
    existingNames.add(normalized);
    added += 1;
  });

  if (added > 0) {
    els.batchPeople.value = "";
    persistState();
    render();
  }
}

function addBatchItems() {
  const items = parseBatchItems(els.batchItems.value);
  if (items.length === 0) {
    return;
  }

  items.forEach((item) => {
    state.items.push({ id: makeId("item"), name: item.name, price: item.price });
  });
  els.batchItems.value = "";
  persistState();
  render();
}

function parseBatchPeople(value) {
  return value
    .split(/[,\n\r]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function parseBatchItems(value) {
  return value
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map(parseItemRow)
    .filter(Boolean);
}

function parseItemRow(row) {
  const columns = row.includes("\t") ? row.split("\t") : row.split(",");
  const name = columns[0]?.trim();
  const priceText = columns[1]?.trim();
  const price = cleanNumber(priceText);

  if (!name || !priceText || price <= 0) {
    return null;
  }

  return { name, price };
}

function getHighestNumericId(source) {
  const ids = [
    ...source.people.map((person) => person.id),
    ...source.items.map((item) => item.id),
    ...source.fees.map((fee) => fee.id),
  ];

  return ids.reduce((highest, id) => {
    const number = Number(String(id).match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(highest, number);
  }, 0);
}

function replaceState(nextState) {
  state.people = nextState.people;
  state.items = nextState.items;
  state.quantities = nextState.quantities;
  state.fees = nextState.fees;
}

function makeId(prefix) {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
}

function cleanNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function toCents(value) {
  return Math.round(cleanNumber(value) * 100);
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function render() {
  renderBillLibrary();
  renderPeople();
  renderItems();
  renderFees();
  renderQuantities();
  renderResults();
}

function renderBillLibrary() {
  renderBillSelector();
  els.billName.value = getActiveBill().name;
}

function renderBillSelector() {
  els.billSelector.replaceChildren();
  library.bills.forEach((bill) => {
    const option = document.createElement("option");
    option.value = bill.id;
    option.textContent = displayBillName(bill);
    option.selected = bill.id === activeBillId;
    els.billSelector.append(option);
  });
}

function renderPeople() {
  els.peopleBody.replaceChildren();

  state.people.forEach((person) => {
    const row = document.createElement("tr");
    row.append(
      inputCell(person.name, "Person name", (value) => {
        person.name = value;
        persistState();
        renderResults();
        renderQuantities();
      }),
      removeCell("Remove person", () => {
        state.people = state.people.filter((entry) => entry.id !== person.id);
        delete state.quantities[person.id];
        persistState();
        render();
      }),
    );
    els.peopleBody.append(row);
  });
}

function renderItems() {
  els.itemsBody.replaceChildren();

  state.items.forEach((item) => {
    const row = document.createElement("tr");
    row.append(
      inputCell(item.name, "Item name", (value) => {
        item.name = value;
        persistState();
        renderQuantities();
        renderResults();
      }),
      inputCell(item.price, "Unit price", (value) => {
        item.price = cleanNumber(value);
        persistState();
        renderResults();
      }, "number"),
      removeCell("Remove item", () => {
        state.items = state.items.filter((entry) => entry.id !== item.id);
        Object.values(state.quantities).forEach((personQuantities) => {
          delete personQuantities[item.id];
        });
        persistState();
        render();
      }),
    );
    els.itemsBody.append(row);
  });
}

function renderFees() {
  els.feesBody.replaceChildren();

  state.fees.forEach((fee) => {
    const row = document.createElement("tr");
    row.append(
      inputCell(fee.name, "Fee name", (value) => {
        fee.name = value;
        persistState();
        renderResults();
      }),
      inputCell(fee.amount, "Fee amount", (value) => {
        fee.amount = cleanNumber(value);
        persistState();
        renderResults();
      }, "number"),
      removeCell("Remove fee", () => {
        state.fees = state.fees.filter((entry) => entry.id !== fee.id);
        persistState();
        render();
      }),
    );
    els.feesBody.append(row);
  });
}

function renderQuantities() {
  els.quantityTable.replaceChildren();
  const hasGrid = state.people.length > 0 && state.items.length > 0;
  els.quantityEmpty.hidden = hasGrid;

  if (!hasGrid) {
    return;
  }

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(headerCell("Person"));
  state.items.forEach((item) => headRow.append(headerCell(item.name || "Untitled item")));
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  state.people.forEach((person) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.className = "person-col";
    nameCell.textContent = person.name || "Untitled person";
    row.append(nameCell);

    state.items.forEach((item) => {
      const quantity = state.quantities[person.id]?.[item.id] ?? 0;
      row.append(inputCell(quantity, `${person.name} ${item.name} quantity`, (value) => {
        if (!state.quantities[person.id]) {
          state.quantities[person.id] = {};
        }
        state.quantities[person.id][item.id] = cleanNumber(value);
        persistState();
        renderResults();
      }, "number"));
    });

    tbody.append(row);
  });

  els.quantityTable.append(thead, tbody);
}

function renderResults() {
  els.resultsTable.replaceChildren();
  const summary = getBillSummary();

  els.grandTotal.textContent = formatMoney(summary.grandTotal);
  els.resultsEmpty.hidden = state.people.length > 0;

  if (state.people.length === 0) {
    return;
  }

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(headerCell("Person"), headerCell("Subtotal", "numeric"));
  summary.fees.forEach((fee) => headRow.append(headerCell(fee.name, "numeric")));
  headRow.append(headerCell("Final total", "numeric"));
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  summary.people.forEach((row) => {
    const tr = document.createElement("tr");
    const personCell = document.createElement("td");
    personCell.className = "person-col";
    personCell.textContent = row.name;
    tr.append(personCell, moneyCell(row.subtotal));

    row.fees.forEach((allocation) => {
      tr.append(moneyCell(allocation));
    });

    const totalCell = moneyCell(row.total);
    totalCell.classList.add("final-total");
    tr.append(totalCell);
    tbody.append(tr);
  });

  const tfoot = document.createElement("tfoot");
  const totalsRow = document.createElement("tr");
  const totalsLabel = document.createElement("th");
  totalsLabel.scope = "row";
  totalsLabel.textContent = "Totals";
  totalsRow.append(totalsLabel, moneyCell(summary.purchaseTotal));
  summary.fees.forEach((fee) => totalsRow.append(moneyCell(fee.amount)));
  const grandTotalCell = moneyCell(summary.grandTotal);
  grandTotalCell.classList.add("final-total");
  totalsRow.append(grandTotalCell);
  tfoot.append(totalsRow);

  els.resultsTable.append(thead, tbody, tfoot);
}

function getBillSummary() {
  const people = state.people.map((person) => {
    const purchasedItems = state.items.map((item) => {
      const quantity = cleanNumber(state.quantities[person.id]?.[item.id] ?? 0);
      const unitPrice = toCents(item.price);
      const total = Math.round(quantity * unitPrice);
      return {
        name: item.name || "Untitled item",
        quantity,
        unitPrice,
        total,
      };
    }).filter((item) => item.quantity > 0 || item.total > 0);

    const subtotal = purchasedItems.reduce((sum, item) => sum + item.total, 0);
    return {
      id: person.id,
      name: person.name || "Untitled person",
      items: purchasedItems,
      subtotal,
      fees: [],
      total: subtotal,
    };
  });

  const purchaseTotal = people.reduce((sum, person) => sum + person.subtotal, 0);
  const fees = state.fees.map((fee) => {
    const amount = toCents(fee.amount);
    const allocations = allocateFee(amount, people.map((person) => person.subtotal), purchaseTotal);
    allocations.forEach((allocation, index) => {
      people[index].fees.push(allocation);
      people[index].total += allocation;
    });
    return {
      name: fee.name || "Untitled fee",
      amount,
      allocations,
    };
  });

  const feeTotal = purchaseTotal > 0 ? fees.reduce((sum, fee) => sum + fee.amount, 0) : 0;

  return {
    people,
    fees,
    purchaseTotal,
    feeTotal,
    grandTotal: purchaseTotal + feeTotal,
  };
}

function allocateFee(feeCents, subtotals, total) {
  if (feeCents <= 0 || total <= 0) {
    return subtotals.map(() => 0);
  }

  const shares = subtotals.map((subtotal, index) => {
    const exact = (feeCents * subtotal) / total;
    const floor = Math.floor(exact);
    return {
      index,
      floor,
      remainder: exact - floor,
    };
  });

  let allocated = shares.reduce((sum, share) => sum + share.floor, 0);
  const result = shares.map((share) => share.floor);

  shares
    .slice()
    .sort((a, b) => b.remainder - a.remainder || b.floor - a.floor || a.index - b.index)
    .forEach((share) => {
      if (allocated < feeCents) {
        result[share.index] += 1;
        allocated += 1;
      }
    });

  return result;
}

function buildReceiptsHtml(summary) {
  const receipts = summary.people.map((person) => `
    <article class="receipt-card">
      <h2>${escapeHtml(person.name)}</h2>
      ${buildPersonItemsTable(person)}
      ${buildPersonFeesTable(person, summary.fees)}
      <p class="receipt-total"><span>Total due</span><strong>${formatMoney(person.total)}</strong></p>
    </article>
  `).join("");

  return `${printStyles()}
    <main class="receipt-grid">
      <header class="print-header">
        <h1>Mini Receipts</h1>
        <p>Total bill: ${formatMoney(summary.grandTotal)}</p>
      </header>
      ${receipts || "<p>No people have been added.</p>"}
    </main>`;
}

function buildBreakdownHtml(summary) {
  const feeHeaders = summary.fees.map((fee) => `<th>${escapeHtml(fee.name)}</th>`).join("");
  const personRows = summary.people.map((person) => `
    <tr>
      <td>${escapeHtml(person.name)}</td>
      <td>${formatMoney(person.subtotal)}</td>
      ${person.fees.map((fee) => `<td>${formatMoney(fee)}</td>`).join("")}
      <td>${formatMoney(person.total)}</td>
    </tr>
  `).join("");

  const itemRows = summary.people.map((person) => person.items.map((item) => `
    <tr>
      <td>${escapeHtml(person.name)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${formatQuantity(item.quantity)}</td>
      <td>${formatMoney(item.unitPrice)}</td>
      <td>${formatMoney(item.total)}</td>
    </tr>
  `).join("")).join("");

  return `${printStyles()}
    <main>
      <header class="print-header">
        <h1>Bill Breakdown</h1>
        <p>Subtotal: ${formatMoney(summary.purchaseTotal)} | Final fees: ${formatMoney(summary.feeTotal)} | Total: ${formatMoney(summary.grandTotal)}</p>
      </header>
      <section>
        <h2>Totals by Person</h2>
        <table>
          <thead>
            <tr><th>Person</th><th>Subtotal</th>${feeHeaders}<th>Final total</th></tr>
          </thead>
          <tbody>${personRows || '<tr><td colspan="4">No people have been added.</td></tr>'}</tbody>
        </table>
      </section>
      <section>
        <h2>Items</h2>
        <table>
          <thead>
            <tr><th>Person</th><th>Item</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr>
          </thead>
          <tbody>${itemRows || '<tr><td colspan="5">No purchased items.</td></tr>'}</tbody>
        </table>
      </section>
    </main>`;
}

function buildPersonItemsTable(person) {
  const rows = person.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${formatQuantity(item.quantity)}</td>
      <td>${formatMoney(item.unitPrice)}</td>
      <td>${formatMoney(item.total)}</td>
    </tr>
  `).join("");

  return `
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Each</th><th>Total</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No items</td></tr>'}</tbody>
      <tfoot><tr><th colspan="3">Subtotal</th><td>${formatMoney(person.subtotal)}</td></tr></tfoot>
    </table>`;
}

function buildPersonFeesTable(person, fees) {
  const rows = fees.map((fee, index) => `
    <tr>
      <td>${escapeHtml(fee.name)}</td>
      <td>${formatMoney(person.fees[index] ?? 0)}</td>
    </tr>
  `).join("");

  if (!rows) {
    return "";
  }

  return `
    <table>
      <thead><tr><th>Final fee</th><th>Share</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function openPrintableDocument(title, bodyHtml, printMode) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Allow pop-ups to open the printable export.");
    return;
  }

  printWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(title)}</title>
      </head>
      <body data-print-mode="${printMode}">
        ${bodyHtml}
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

async function exportReceiptArchive(format) {
  const summary = getBillSummary();
  if (summary.people.length === 0) {
    window.alert("Add at least one person before exporting receipts.");
    return;
  }

  if (!hasReceiptExportDependencies(format)) {
    window.alert("Receipt export libraries are still loading. Try again in a moment.");
    return;
  }

  const zip = new JSZip();
  const usedNames = new Map();

  try {
    for (const person of summary.people) {
      const receipt = buildReceiptNode(person, summary.fees);
      els.receiptRenderRoot.replaceChildren(receipt);
      const pngDataUrl = await htmlToImage.toPng(receipt, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2,
      });
      const baseName = uniqueReceiptName(person.name, usedNames);

      if (format === "png") {
        zip.file(`${baseName}.png`, dataUrlToBase64(pngDataUrl), { base64: true });
      } else {
        const pdfBytes = createReceiptPdf(receipt, pngDataUrl);
        zip.file(`${baseName}.pdf`, pdfBytes);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `bill-receipts-${format}-${new Date().toISOString().slice(0, 10)}.zip`);
  } catch (error) {
    console.error(error);
    window.alert("Could not generate receipt files. Check the browser console for details.");
  } finally {
    els.receiptRenderRoot.replaceChildren();
  }
}

function hasReceiptExportDependencies(format) {
  const hasZipAndImage = typeof JSZip !== "undefined" && typeof htmlToImage !== "undefined";
  if (format === "png") {
    return hasZipAndImage;
  }

  return hasZipAndImage && Boolean(window.jspdf?.jsPDF);
}

function buildReceiptNode(person, fees) {
  const receipt = document.createElement("article");
  receipt.className = "receipt-export-card";
  receipt.innerHTML = `
    <h2>${escapeHtml(person.name)}</h2>
    ${buildPersonItemsTable(person)}
    ${buildPersonFeesTable(person, fees)}
    <p class="receipt-total"><span>Total due</span><strong>${formatMoney(person.total)}</strong></p>
  `;
  return receipt;
}

function createReceiptPdf(receipt, pngDataUrl) {
  const { jsPDF } = window.jspdf;
  const width = Math.ceil(receipt.offsetWidth);
  const height = Math.ceil(receipt.offsetHeight);
  const pdf = new jsPDF({
    unit: "px",
    format: [width, height],
    orientation: height >= width ? "portrait" : "landscape",
  });
  pdf.addImage(pngDataUrl, "PNG", 0, 0, width, height);
  return pdf.output("arraybuffer");
}

function dataUrlToBase64(dataUrl) {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

function uniqueReceiptName(name, usedNames) {
  const slug = slugify(name || "receipt");
  const count = (usedNames.get(slug) ?? 0) + 1;
  usedNames.set(slug, count);
  return count === 1 ? `${slug}-receipt` : `${slug}-receipt-${count}`;
}

function slugify(value) {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "receipt";
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function downloadSpreadsheet(summary) {
  const feeHeaders = summary.fees.map((fee) => `<th>${escapeHtml(fee.name)}</th>`).join("");
  const summaryRows = summary.people.map((person) => `
    <tr>
      <td>${escapeHtml(person.name)}</td>
      <td>${centsToDecimal(person.subtotal)}</td>
      ${person.fees.map((fee) => `<td>${centsToDecimal(fee)}</td>`).join("")}
      <td>${centsToDecimal(person.total)}</td>
    </tr>
  `).join("");

  const itemRows = summary.people.map((person) => {
    const items = person.items.length > 0 ? person.items : [{ name: "", quantity: "", unitPrice: 0, total: 0 }];
    return items.map((item) => `
      <tr>
        <td>${escapeHtml(person.name)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.quantity)}</td>
        <td>${centsToDecimal(item.unitPrice)}</td>
        <td>${centsToDecimal(item.total)}</td>
      </tr>
    `).join("");
  }).join("");

  const workbook = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; margin-bottom: 24px; }
          th, td { border: 1px solid #999; padding: 6px 8px; }
          th { background: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Bill Split</h1>
        <table>
          <thead><tr><th>Person</th><th>Subtotal</th>${feeHeaders}<th>Final Total</th></tr></thead>
          <tbody>${summaryRows}</tbody>
          <tfoot>
            <tr><th>Totals</th><td>${centsToDecimal(summary.purchaseTotal)}</td>${summary.fees.map((fee) => `<td>${centsToDecimal(fee.amount)}</td>`).join("")}<td>${centsToDecimal(summary.grandTotal)}</td></tr>
          </tfoot>
        </table>
        <table>
          <thead><tr><th>Person</th><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </body>
    </html>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, `bill-split-${new Date().toISOString().slice(0, 10)}.xls`);
}

function printStyles() {
  return `<style>
    body {
      margin: 0;
      color: #202124;
      font-family: Arial, sans-serif;
      line-height: 1.35;
    }
    main {
      padding: 24px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    section {
      margin-top: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    th,
    td {
      padding: 8px;
      border: 1px solid #d8d1c7;
      text-align: left;
    }
    th {
      background: #f6f3ee;
    }
    td:last-child,
    th:last-child {
      text-align: right;
    }
    .print-header {
      margin-bottom: 22px;
      border-bottom: 2px solid #202124;
      padding-bottom: 12px;
    }
    .print-header p {
      margin: 8px 0 0;
    }
    .receipt-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .receipt-grid .print-header {
      grid-column: 1 / -1;
    }
    .receipt-card {
      break-inside: avoid;
      border: 1px solid #d8d1c7;
      border-radius: 8px;
      padding: 14px;
    }
    .receipt-total {
      display: flex;
      justify-content: space-between;
      margin: 12px 0 0;
      font-size: 18px;
    }
    @media print {
      main {
        padding: 0;
      }
      .receipt-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 760px) {
      .receipt-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>`;
}

function formatQuantity(quantity) {
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
}

function centsToDecimal(cents) {
  return (cents / 100).toFixed(2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inputCell(value, label, onInput, type = "text") {
  const cell = document.createElement("td");
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.setAttribute("aria-label", label);

  if (type === "number") {
    input.min = "0";
    input.step = "0.01";
  }

  input.addEventListener("input", () => onInput(input.value));
  cell.append(input);
  return cell;
}

function removeCell(label, onClick) {
  const cell = document.createElement("td");
  cell.className = "action-cell";
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.textContent = "x";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", onClick);
  cell.append(button);
  return cell;
}

function headerCell(text, className) {
  const cell = document.createElement("th");
  cell.scope = "col";
  if (className) {
    cell.className = className;
  }
  cell.textContent = text;
  return cell;
}

function moneyCell(cents) {
  const cell = document.createElement("td");
  cell.className = "numeric";
  cell.textContent = formatMoney(cents);
  return cell;
}

render();
