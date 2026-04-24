const STORAGE_KEY = "finance_manager_transactions_v1";

const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const monthFilterInput = document.getElementById("month-filter");
const searchFilterInput = document.getElementById("search-filter");
const exportCsvBtn = document.getElementById("export-csv-btn");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const listEl = document.getElementById("transaction-list");
const emptyStateEl = document.getElementById("empty-state");

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

let editingTransactionId = null;

function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function getMonthKey(dateString) {
  return dateString.slice(0, 7);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getVisibleTransactions(transactions) {
  const monthValue = monthFilterInput.value;
  const searchTerm = searchFilterInput.value.trim().toLowerCase();

  return transactions.filter((item) => {
    const byMonth = monthValue ? getMonthKey(item.date) === monthValue : true;
    const bySearch = searchTerm
      ? item.description.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
      : true;
    return byMonth && bySearch;
  });
}

function render(transactions) {
  const visibleTransactions = getVisibleTransactions(transactions);
  const monthValue = monthFilterInput.value;

  const summaryTransactions = monthValue
    ? transactions.filter((item) => getMonthKey(item.date) === monthValue)
    : transactions;

  let income = 0;
  let expense = 0;

  summaryTransactions.forEach((item) => {
    if (item.type === "income") income += item.amount;
    if (item.type === "expense") expense += item.amount;
  });

  const balance = income - expense;
  incomeEl.textContent = currencyFormatter.format(income);
  expenseEl.textContent = currencyFormatter.format(expense);
  balanceEl.textContent = currencyFormatter.format(balance);

  listEl.innerHTML = "";
  emptyStateEl.style.display = visibleTransactions.length === 0 ? "block" : "none";

  visibleTransactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .forEach((item) => {
      const row = document.createElement("tr");
      const amountClass = item.type === "income" ? "amount-income" : "amount-expense";
      const typeLabel = item.type === "income" ? "Thu" : "Chi";

      row.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${typeLabel}</td>
        <td class="${amountClass}">${currencyFormatter.format(item.amount)}</td>
        <td>
          <button class="edit-btn" data-action="edit" data-id="${item.id}" title="Sửa">Sửa</button>
          <button class="delete-btn" data-action="delete" data-id="${item.id}" title="Xóa">Xóa</button>
        </td>
      `;

      listEl.appendChild(row);
    });
}

function resetForm() {
  form.reset();
  dateInput.valueAsDate = new Date();
  editingTransactionId = null;
  formTitle.textContent = "Thêm giao dịch";
  submitBtn.textContent = "Lưu giao dịch";
  cancelEditBtn.classList.add("hidden");
  descriptionInput.focus();
}

const transactions = loadTransactions();
if (!dateInput.value) {
  dateInput.valueAsDate = new Date();
}
render(transactions);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const transactionPayload = {
    id: editingTransactionId || crypto.randomUUID(),
    description: descriptionInput.value.trim(),
    amount,
    type: typeInput.value,
    category: categoryInput.value.trim(),
    date: dateInput.value,
  };

  if (!transactionPayload.description || !transactionPayload.category || !transactionPayload.date) return;

  if (editingTransactionId) {
    const index = transactions.findIndex((item) => item.id === editingTransactionId);
    if (index >= 0) transactions[index] = transactionPayload;
  } else {
    transactions.push(transactionPayload);
  }

  saveTransactions(transactions);
  render(transactions);
  resetForm();
});

monthFilterInput.addEventListener("change", () => {
  render(transactions);
});

searchFilterInput.addEventListener("input", () => {
  render(transactions);
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

exportCsvBtn.addEventListener("click", () => {
  const visibleTransactions = getVisibleTransactions(transactions);
  if (visibleTransactions.length === 0) return;

  const header = ["Ngay", "Mo ta", "Danh muc", "Loai", "So tien"];
  const rows = visibleTransactions.map((item) => [
    item.date,
    `"${item.description.replaceAll('"', '""')}"`,
    `"${item.category.replaceAll('"', '""')}"`,
    item.type === "income" ? "Thu" : "Chi",
    item.amount,
  ]);

  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "giao-dich-tai-chinh.csv";
  link.click();
  URL.revokeObjectURL(url);
});

listEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  if (action === "delete") {
    const next = transactions.filter((item) => item.id !== id);
    transactions.length = 0;
    transactions.push(...next);
    if (editingTransactionId === id) resetForm();
    saveTransactions(transactions);
    render(transactions);
    return;
  }

  if (action === "edit") {
    const targetTransaction = transactions.find((item) => item.id === id);
    if (!targetTransaction) return;

    editingTransactionId = id;
    formTitle.textContent = "Chỉnh sửa giao dịch";
    submitBtn.textContent = "Cập nhật giao dịch";
    cancelEditBtn.classList.remove("hidden");

    descriptionInput.value = targetTransaction.description;
    amountInput.value = String(targetTransaction.amount);
    typeInput.value = targetTransaction.type;
    categoryInput.value = targetTransaction.category;
    dateInput.value = targetTransaction.date;
    descriptionInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
