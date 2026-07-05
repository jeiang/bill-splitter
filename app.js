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

const state = cloneState(SAMPLE_STATE);
let nextId = 4;

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
  resetSample: document.querySelector("#resetSample"),
  clearAll: document.querySelector("#clearAll"),
  exportReceipts: document.querySelector("#exportReceipts"),
  exportPdf: document.querySelector("#exportPdf"),
  exportCsv: document.querySelector("#exportCsv"),
};

els.addPerson.addEventListener("click", () => {
  const person = { id: makeId("person"), name: `Person ${state.people.length + 1}` };
  state.people.push(person);
  state.quantities[person.id] = {};
  render();
});

els.addItem.addEventListener("click", () => {
  state.items.push({ id: makeId("item"), name: `Item ${state.items.length + 1}`, price: 0 });
  render();
});

els.addFee.addEventListener("click", () => {
  state.fees.push({ id: makeId("fee"), name: `Fee ${state.fees.length + 1}`, amount: 0 });
  render();
});

els.resetSample.addEventListener("click", () => {
  replaceState(cloneState(SAMPLE_STATE));
  render();
});

els.clearAll.addEventListener("click", () => {
  replaceState({ people: [], items: [], quantities: {}, fees: [] });
  render();
});

els.exportReceipts.addEventListener("click", () => {
  openPrintableDocument("Mini Receipts", buildReceiptsHtml(getBillSummary()), "receipts");
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
  renderPeople();
  renderItems();
  renderFees();
  renderQuantities();
  renderResults();
}

function renderPeople() {
  els.peopleBody.replaceChildren();

  state.people.forEach((person) => {
    const row = document.createElement("tr");
    row.append(
      inputCell(person.name, "Person name", (value) => {
        person.name = value;
        renderResults();
        renderQuantities();
      }),
      removeCell("Remove person", () => {
        state.people = state.people.filter((entry) => entry.id !== person.id);
        delete state.quantities[person.id];
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
        renderQuantities();
        renderResults();
      }),
      inputCell(item.price, "Unit price", (value) => {
        item.price = cleanNumber(value);
        renderResults();
      }, "number"),
      removeCell("Remove item", () => {
        state.items = state.items.filter((entry) => entry.id !== item.id);
        Object.values(state.quantities).forEach((personQuantities) => {
          delete personQuantities[item.id];
        });
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
        renderResults();
      }),
      inputCell(fee.amount, "Fee amount", (value) => {
        fee.amount = cleanNumber(value);
        renderResults();
      }, "number"),
      removeCell("Remove fee", () => {
        state.fees = state.fees.filter((entry) => entry.id !== fee.id);
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

  els.resultsTable.append(thead, tbody);
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
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `bill-split-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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
