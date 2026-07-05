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

  const subtotalRows = state.people.map((person) => {
    const subtotal = state.items.reduce((sum, item) => {
      const quantity = state.quantities[person.id]?.[item.id] ?? 0;
      return sum + toCents(quantity * cleanNumber(item.price));
    }, 0);
    return { person, subtotal };
  });

  const purchaseTotal = subtotalRows.reduce((sum, row) => sum + row.subtotal, 0);
  const allocationsByFee = state.fees.map((fee) => ({
    fee,
    allocations: allocateFee(toCents(fee.amount), subtotalRows.map((row) => row.subtotal), purchaseTotal),
  }));
  const feeTotal = state.fees.reduce((sum, fee) => sum + toCents(fee.amount), 0);

  els.grandTotal.textContent = formatMoney(purchaseTotal + (purchaseTotal > 0 ? feeTotal : 0));
  els.resultsEmpty.hidden = state.people.length > 0;

  if (state.people.length === 0) {
    return;
  }

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(headerCell("Person"), headerCell("Subtotal", "numeric"));
  state.fees.forEach((fee) => headRow.append(headerCell(fee.name || "Untitled fee", "numeric")));
  headRow.append(headerCell("Final total", "numeric"));
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  subtotalRows.forEach((row, personIndex) => {
    const tr = document.createElement("tr");
    const personCell = document.createElement("td");
    personCell.className = "person-col";
    personCell.textContent = row.person.name || "Untitled person";
    tr.append(personCell, moneyCell(row.subtotal));

    let finalTotal = row.subtotal;
    allocationsByFee.forEach(({ allocations }) => {
      const allocation = allocations[personIndex] ?? 0;
      finalTotal += allocation;
      tr.append(moneyCell(allocation));
    });

    const totalCell = moneyCell(finalTotal);
    totalCell.classList.add("final-total");
    tr.append(totalCell);
    tbody.append(tr);
  });

  els.resultsTable.append(thead, tbody);
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
