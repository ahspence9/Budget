/* ================= DIARY HELPERS (GLOBAL) ======================= */


window.hasDiaryNote = function (isoDate) {
  let diary = {};
  try {
    diary = JSON.parse(localStorage.getItem("diaryNotes")) || {};
  } catch (e) {
    console.error("Invalid diaryNotes JSON", e);
    
    return false;
  }
  return !!diary[isoDate];
};


document.addEventListener("DOMContentLoaded", () => {

  
/* ================= STORAGE ================= */
const STORAGE_KEY = "budget";
let categories = JSON.parse(localStorage.getItem("categories")) || [];
window.transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; 

const SAVINGS_POTS_KEY = "savingsPots";
const SAVINGS_START_DATE_KEY =
  "savingsStartDate";

let savingsPots =
  JSON.parse(localStorage.getItem(SAVINGS_POTS_KEY)) || [];
let savingsStartDate =
  localStorage.getItem(SAVINGS_START_DATE_KEY);

if (!savingsStartDate) {

  savingsStartDate =
    new Date().toISOString().split("T")[0];

  localStorage.setItem(
    SAVINGS_START_DATE_KEY,
    savingsStartDate
  );
}
  
let startDate = localStorage.getItem("startDate") || "";
let openingBalance = parseFloat(localStorage.getItem("openingBalance")) || 0;
let editingIndex = null;
let nudges = JSON.parse(localStorage.getItem("nudges")) || {};
let scrollBeforeHelp = 0;
let transactionSortAscending = true;
let transactionSortMode = "date"; // "date" or "category"
let inlineEditIndex = null;
let transactionFilterMode = null; 
let salaryFilter = "all"; // "all" | "monthly" | "4-weekly"
let whatIfAmount = 0;
let whatIfActive = false;
let buffer = 20;
let summaryMonths = 24;



  
// null | "monthly" | "4-weekly" | "targeted"
  
/* ================= DOM ================ */

const txCategorySelect = document.getElementById("tx-category");
const newCategoryInput = document.getElementById("new-category");
const addCategoryButton = document.getElementById("add-category");

const txDesc = document.getElementById("tx-desc");
const txAmount = document.getElementById("tx-amount");
const txType = document.getElementById("tx-type");
const txFrequency = document.getElementById("tx-frequency");
const txDate = document.getElementById("tx-date");
const addTxButton = document.getElementById("add-transaction");

const startDateInput = document.getElementById("start-date");
const openingBalanceInput = document.getElementById("opening-balance");
const saveConfigButton = document.getElementById("save-config");

const transactionTableBody = document.querySelector("#transaction-table tbody");
const projectionTbody = document.querySelector("#projection-table tbody");

const editCategorySelect = document.getElementById("edit-category-select");
const editCategoryInput = document.getElementById("edit-category-name");
const renameCategoryButton = document.getElementById("rename-category");
const MAX_PAST_NUDGE_DAYS = 7;
const txEndDate = document.getElementById("tx-end-date");


  const CACHE_VERSION = "v1.8.0";
const CACHE_NAME = `budget-app-${CACHE_VERSION}`;
const APP_VERSION = `budget-app-${CACHE_VERSION}`;

  const versionEl = document.getElementById("app-version");
if (versionEl) {
  versionEl.textContent = `Version: ${APP_VERSION}`;
}

/* ========= APP VERSION FOR CONSOLE ========== */
  console.info(
  `Home Budget App v${APP_VERSION} (${new Date().toISOString()})`
);
  /* ---- temporary code for last backup time ------- */
  console.log(
  "lastJsonBackup =",
  localStorage.getItem("lastJsonBackup")
);
  
/* ===================== */
document.querySelectorAll(".tx-filter").forEach(el => {
  el.addEventListener("click", () => {
    const mode = el.dataset.filter;

    if (mode === "all") {
      transactionFilterMode = null;
    } else {
      transactionFilterMode =
        transactionFilterMode === mode ? null : mode;
    }

    renderTransactionTable();
    updateFilterUI();
    
  });
});
/* ================ HELPER FUNCTION FOR BACKUP STATUS ================= */
function updateBackupStatus() {

  const el = document.getElementById("backup-status");
  if (!el) return;

  const lastBackup =
    localStorage.getItem("lastJsonBackup");

  if (!lastBackup) {
    el.textContent = "Last Transactions Backup: Never";
    return;
  }

  const d = new Date(lastBackup);

  const formatted =
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) +
    " " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });

  el.textContent =
    `Last Transaction Backup: ${formatted}`;
}
/* ================ */
  window.handleOpeningBalanceKeydown = function(event) {

  if (event.key === "Enter") {

    event.preventDefault();

    event.target.blur();
  }
};
/* ================= AGGREGATE REPORT ============ */
 function generateSummaryReport() {
  if (!startDate) {
    alert("Start date not set");
    return;
  }

  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);

  const end = new Date(start);
 end.setMonth(end.getMonth() + summaryMonths);
   
  // Key: category||description
  const summaryMap = {};

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISO(d);

    transactions.forEach(tx => {
      // ❌ exclude irregular (adjust if your flag differs)
      const isRecurring =
  tx.frequency === "monthly" ||
  tx.frequency === "4-weekly" ||
  tx.frequency === "weekly";

if (!isRecurring) return;

      if (!occursOn(tx, iso)) return;
/*const months = 24;*/

/* ------ added to show monthly cost ------- */
     /* const monthlyIncome = r.income ? r.income / months : 0;*/
      /*const monthlyExpense = r.expense ? r.expense / months : 0;*/
/*---------*/      
      const key = `${tx.category || "Uncategorised"}||${tx.description}`;

      if (!summaryMap[key]) {
        summaryMap[key] = {
          category: tx.category || "Uncategorised",
          description: tx.description,
          income: 0,
          expense: 0,
          frequency: tx.frequency   // ✅ ADD THIS
        };
      }

      if (tx.type === "income") {
        summaryMap[key].income += tx.amount;
      } else {
        summaryMap[key].expense += tx.amount;
      }
    });
  }

  // Convert to array + sort
  const rows = Object.values(summaryMap).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.description.localeCompare(b.description);
  });

  return rows;
} 
  /* ------- */
  document.getElementById("summary-btn").onclick = renderSummaryReport;
  document
  .getElementById("savings-summary-btn")
  .onclick = renderSavingsSummary;

  document
  .getElementById("save-opening-balances")
  .onclick = saveOpeningBalances;
/* ===== SUMMARY BUTTONS + THEMES ===== */

const btn12 = document.getElementById("summary-12-btn");
const btn24 = document.getElementById("summary-24-btn");

/* THIS is the pale yellow popup box */
const summaryBox = document.querySelector("#summary-popup .modal-content");


btn12.onclick = () => {

  summaryMonths = 12;

  /* button styles */
  btn12.classList.add("active");
  btn24.classList.remove("active");

  /* popup background */
  summaryBox.classList.remove("summary-theme-24");
  summaryBox.classList.add("summary-theme-12");

  renderSummaryReport();
};


btn24.onclick = () => {

  summaryMonths = 24;

  /* button styles */
  btn24.classList.add("active");
  btn12.classList.remove("active");

  /* popup background */
  summaryBox.classList.remove("summary-theme-12");
  summaryBox.classList.add("summary-theme-24");

  renderSummaryReport();
};
/* =============== */
  function renderSavingsSummary() {

  const tbody =
    document.getElementById("savings-summary-body");

  const totalEl =
    document.getElementById("savings-summary-total");

  tbody.innerHTML = "";

  let grandTotal = 0;

  savingsPots.forEach(pot => {

    const current =
  calculateSavingsPotBalance(pot.id);

const contributions =
  current - (pot.openingBalance || 0);

grandTotal += current;

const tr = document.createElement("tr");

tr.innerHTML = `
  <td>${pot.name}</td>
  <td>
  £
  <input
    type="number"
    inputmode="decimal"
    step="0.01"
    class="opening-balance-input"
    data-pot-id="${pot.id}"
    value="${(pot.openingBalance || 0).toFixed(2)}"
    onclick="this.select()"
    onkeydown="handleOpeningBalanceKeydown(event)"
    style="width:90px;"
  >
</td>
  <td>£${contributions.toFixed(2)}</td>
  <td>£${current.toFixed(2)}</td>
`;

    tbody.appendChild(tr);
  });

  totalEl.textContent =
    `£${grandTotal.toFixed(2)}`;

  document
    .getElementById("savings-summary-popup")
    .classList.remove("hidden");

  document.body.classList.add("modal-open");
}

/* =============== */
function renderSummaryReport() {
  const rows = generateSummaryReport();
  console.log("Summary clicked", rows?.length);
  document.getElementById("summary-title").textContent =
  `Summary (${summaryMonths} months)`;

  if (!rows || rows.length === 0) {
    alert("No summary data found");
    return;
  }

  const tbody = document.getElementById("summary-table-body");
  tbody.innerHTML = "";

  let currentCategory = null;

  let catIncome = 0;
  let catExpense = 0;
  let catMonthlyIncome = 0;
  let catMonthlyExpense = 0;

  let grandIncome = 0;
  let grandExpense = 0;
  let grandMonthlyIncome = 0;
  let grandMonthlyExpense = 0;

  rows.forEach((r, idx) => {

  /*const divisor = r.frequency === "4-weekly"*/
 /* ? (summaryMonths / 12) * 26*/
/*  : summaryMonths; */
    
const divisor =
  r.frequency === "4-weekly"
    ? (summaryMonths / 12) * 13
    : summaryMonths;
    // ---- Grand totals ----
    grandIncome += r.income || 0;
    grandExpense += r.expense || 0;
    grandMonthlyIncome += (r.income || 0) / divisor;
    grandMonthlyExpense += (r.expense || 0) / divisor;

    // ---- Category change → insert subtotal ----
    if (currentCategory && r.category !== currentCategory) {
      const subtotalRow = document.createElement("tr");
      subtotalRow.style.fontWeight = "bold";
      subtotalRow.style.background = "#f0f0f0";

      subtotalRow.innerHTML = `
        <td colspan="2">Total ${currentCategory}</td>
        <td>${catIncome ? catIncome.toFixed(2) : ""}</td>
        <td>${catExpense ? catExpense.toFixed(2) : ""}</td>
        <td>${catMonthlyIncome.toFixed(2)}</td>
        <td>${catMonthlyExpense.toFixed(2)}</td>
      `;

      tbody.appendChild(subtotalRow);

      // reset
      catIncome = 0;
      catExpense = 0;
      catMonthlyIncome = 0;
      catMonthlyExpense = 0;
    }

    currentCategory = r.category;

    // ---- Category totals ----
    catIncome += r.income || 0;
    catExpense += r.expense || 0;
    catMonthlyIncome += (r.income || 0) / divisor;
    catMonthlyExpense += (r.expense || 0) / divisor;

    const monthlyIncome = r.income ? r.income / divisor : 0;
    const monthlyExpense = r.expense ? r.expense / divisor : 0;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.category}</td>
      <td>${r.description}</td>
      <td>${r.income ? r.income.toFixed(2) : ""}</td>
      <td>${r.expense ? r.expense.toFixed(2) : ""}</td>
      <td>${monthlyIncome ? monthlyIncome.toFixed(2) : ""}</td>
      <td>${monthlyExpense ? monthlyExpense.toFixed(2) : ""}</td>
    `;

    tbody.appendChild(tr);

    // ---- Final category subtotal ----
    if (idx === rows.length - 1) {
      const subtotalRow = document.createElement("tr");
      subtotalRow.style.fontWeight = "bold";
      subtotalRow.style.background = "#f0f0f0";

      subtotalRow.innerHTML = `
        <td colspan="2">Total ${currentCategory}</td>
        <td>${catIncome ? catIncome.toFixed(2) : ""}</td>
        <td>${catExpense ? catExpense.toFixed(2) : ""}</td>
        <td>${catMonthlyIncome.toFixed(2)}</td>
        <td>${catMonthlyExpense.toFixed(2)}</td>
      `;

      tbody.appendChild(subtotalRow);
    }
  });

  // ---- GRAND TOTAL ----
  const grandRow = document.createElement("tr");

  grandRow.style.fontWeight = "bold";
  grandRow.style.background = "#dfefff";
  grandRow.style.borderTop = "3px solid #333";

  grandRow.innerHTML = `
    <td colspan="2">GRAND TOTAL</td>
    <td>${grandIncome.toFixed(2)}</td>
    <td>${grandExpense.toFixed(2)}</td>
    <td>${grandMonthlyIncome.toFixed(2)}</td>
    <td>${grandMonthlyExpense.toFixed(2)}</td>
  `;

  tbody.appendChild(grandRow);

  const netTotal = grandIncome - grandExpense;
/*const avgMonthlyNet = netTotal / 24;*/
  const avgMonthlyNet = netTotal / summaryMonths;

const netRow = document.createElement("tr");

netRow.style.fontWeight = "bold";
netRow.style.background = "#fff7e6";

netRow.innerHTML = `
  <td colspan="2">UNALLOCATED (NET)</td>
  <td>${netTotal.toFixed(2)}</td>
  <td></td>
  <td>${avgMonthlyNet.toFixed(2)}</td>
  <td></td>
`;

tbody.appendChild(netRow);

  // ---- Show popup ----
  document.getElementById("summary-popup").classList.remove("hidden");
  document.body.classList.add("modal-open");
}
/* ================= CODE TO CALCULATE MAXIMUM SAVING WITHIN A BUFFER ======== */
function calculateMaxSaving(startDate, buffer = 20) {
  let low = 0;
  let high = openingBalance || 2000;

  let best = 0;
  let bestLowest = 0;

  while (high - low > 0.5) {
    const mid = (low + high) / 2;

    const result = isSafe(mid, startDate, buffer);

    if (result.safe) {
      best = mid;
      bestLowest = result.lowest;
      low = mid;
    } else {
      high = mid;
    }
  }

  return {
    max: Math.floor(best),
    lowest: bestLowest
  };
}

  /* ======= AGGREGATE CLOSE HANDLER =======-*/
  // ===== SUMMARY POPUP CLOSE =====

document.addEventListener("click", (e) => {

  // Close button
  if (e.target.id === "summary-close") {
    document.getElementById("summary-popup").classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  // Click outside (backdrop)
  if (e.target.id === "summary-popup") {
    e.target.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

});

  document
  .getElementById("close-savings-summary")
  .onclick = () => {

    document
      .getElementById("savings-summary-popup")
      .classList.add("hidden");

    document.body.classList.remove("modal-open");
};
  
  /* ====TOAST======*/
  function showToast(message, type = "success", duration = 2000) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}
  /* ================================ */
function isSafe(amount, whatIfStartDate, buffer) {
  let balance = openingBalance;
  let lowest = Infinity;
  let lowestDate = null;

  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 24);

  const txList = getTransactionsSortedByDate();

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {

    const iso = toISO(d);

    // ✅ Use SAME transaction logic as projection table
    const todaysTx = [];

// EXACT same logic as renderProjectionTable
txList.forEach(tx => {
  for (let checkIso = iso; checkIso === iso; ) {
    if (!occursOn(tx, iso)) break;

    const id = txId(tx);
    const nudgeKey = `${id}|${iso}`;

    if (nudges[nudgeKey]) {
      const targetIso = nudges[nudgeKey];
      if (targetIso === iso) {
        todaysTx.push(tx);
      }
    } else {
      todaysTx.push(tx);
    }

    break;
  }
});

// sort same as table
todaysTx.sort((a, b) =>
  a.type === b.type ? 0 : a.type === "income" ? -1 : 1
);

    // Apply transactions (income first)
    todaysTx.forEach(tx => {
      balance += tx.type === "income" ? tx.amount : -tx.amount;
      balance = Math.round(balance * 100) / 100;
    });

    // ===== WHAT IF (ISO-based, no Date objects) =====
    const [y, m, dDay] = iso.split("-").map(Number);
    const [sy, sm, sDay] = whatIfStartDate.split("-").map(Number);

    const monthsDiff = (y - sy) * 12 + (m - sm);

    if (monthsDiff >= 0) {
      const lastDay = new Date(y, m, 0).getDate();
      const targetDay = Math.min(sDay, lastDay);

      if (dDay === targetDay) {
        balance -= amount;
        balance = Math.round(balance * 100) / 100;
      }
    }
// 🚨 FIRST: enforce buffer rule
if (balance < buffer) {
  return { safe: false, lowest, lowestDate };
}

// ✅ ONLY track lowest if still valid
if (balance < lowest) {
  lowest = balance;
  lowestDate = new Date(iso);
}
  }

  return { safe: true, lowest, lowestDate };
}
/* ============================= */
function getTransactionsForDate(iso, txList) {
  const todaysTx = [];

  txList.forEach(tx => {
    if (!occursOn(tx, iso)) return;

    const id = txId(tx);
    const nudgeKey = `${id}|${iso}`;

    if (nudges[nudgeKey]) {
      if (nudges[nudgeKey] === iso) {
        todaysTx.push(tx);
      }
    } else {
      todaysTx.push(tx);
    }
  });

  return todaysTx.sort((a, b) =>
    a.type === b.type ? 0 : a.type === "income" ? -1 : 1
  );
}
  

/* ================= WHAT IF ================= */

const whatIfBtn = document.getElementById("whatif-btn");
const whatIfPopup = document.getElementById("whatif-popup");

const dateInput = document.getElementById("whatif-date");

  

/* ---------- BUTTON ---------- */

whatIfBtn.onclick = () => {

  // sync state
  whatIfActive = transactions.some(t => t.__whatIf);
  console.log("WhatIf clicked"); // 👈 add this
  if (!whatIfActive) {
    // OPEN MODAL
    
    dateInput.value = toISO(new Date());

    document.body.classList.add("modal-open");
    whatIfPopup.classList.remove("hidden");

    return; // 🔴 IMPORTANT — stop here
  }

  // CLEAR What If
  transactions = transactions.filter(t => !t.__whatIf);
  whatIfActive = false;

  updateWhatIfUI();
};


/* ---------- CONFIRM ---------- */

document.getElementById("whatif-confirm").onclick = () => {

  const start = dateInput.value;

  if (!start) {
    alert("Select a start date");
    return;
  }

  const targetMonthlyBuffer = 10; // or whatever feels right

// Convert monthly buffer → balance buffer
const buffer = targetMonthlyBuffer * 1.5;

  // 🔥 Calculate automatically
  const result = calculateMaxSaving(start, buffer);

  // 🔥 Remove any existing What If
  transactions = transactions.filter(t => !t.__whatIf);

  // 🔥 Add new What If transaction
  transactions.push({
    description: "What If Saving",
    amount: result.max,
    type: "expense",
    frequency: "monthly",
    date: start,
    category: "What If",
    __whatIf: true
  });

  whatIfActive = true;

  // Close modal
  document.body.classList.remove("modal-open");
  whatIfPopup.classList.add("hidden");

  showToast(
  `Max safe saving £${result.max} `,
  result.lowest < 50 ? "warning" : "success"
);

  // Refresh UI
  updateWhatIfUI();
};


/* ---------- CANCEL ---------- */

document.getElementById("whatif-cancel").onclick = () => {
  whatIfPopup.classList.add("hidden");
  document.body.classList.remove("modal-open");
};


/* ---------- UI UPDATE ---------- */

function updateWhatIfUI() {
  renderProjectionTable();

  const whatIfTx = transactions.find(t => t.__whatIf);

  whatIfBtn.textContent = whatIfTx
    ? `❌ Clear What If (£${whatIfTx.amount.toFixed(2)})`
    : "✏️ What If";

  whatIfBtn.classList.toggle("whatif-on", !!whatIfTx);

  whatIfBtn.classList.remove("whatif-active");
  void whatIfBtn.offsetWidth;
  whatIfBtn.classList.add("whatif-active");
}


/* ---------- OPTIONAL CLEAR ---------- */

function clearWhatIf() {
  transactions = transactions.filter(tx => !tx.__whatIf);
  updateWhatIfUI();
}
/*document.getElementById("clear-whatif-btn").onclick = clearWhatIf;*/
/*.  */
function updateFilterUI() {
  document.querySelectorAll(".tx-filter").forEach(el => {
    const mode = el.dataset.filter;

    const isActive =
      (mode === "all" && transactionFilterMode === null) ||
      mode === transactionFilterMode;

    el.classList.toggle("active", isActive);
  });
}
  /* ======icon helper=== */
 function frequencyIcon(tx) {
  // 🎯 Targeted ALWAYS wins
  if (tx.endDate) return "🎯︎ ";

  const freq = (tx.frequency || "").toLowerCase();

  if (freq === "monthly")    return "🔁︎ ";
  if (freq === "4-weekly")   return "📆︎ ";
  if (freq === "irregular")  return "⚡️ ";

  return "";
}
  /* ========== */
function updateFilterBadge() {
  const badge = document.getElementById("tx-filter-badge");
  if (!badge) return;

  if (!transactionFilterMode) {
    badge.classList.add("hidden");
    badge.textContent = "";
    return;
  }

  const label =
    transactionFilterMode === "monthly"
      ? "Monthly"
      : transactionFilterMode === "4-weekly"
        ? "4-Weekly"
      : transactionFilterMode === "Irregular"
        ? "Irregular"
        : "Targeted";

  badge.textContent = `Filter: ${label}`;
  badge.classList.remove("hidden");
}
  /* ============= */


if (localStorage.getItem("dismissedVersion") === APP_VERSION) {
  document
    .getElementById("update-banner")
    ?.classList.add("hidden");
}

/* ===================================================== */
function scrollWithOffset(targetId, offset = 0) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const y =
    el.getBoundingClientRect().top +
    window.pageYOffset +
    offset;

  window.scrollTo({
    top: y,
    behavior: "smooth"
  });

  // ✨ subtle visual confirmation
  el.classList.add("jump-highlight");
  setTimeout(() => el.classList.remove("jump-highlight"), 800);
}
   
/*==========--EVENT LISTENER FOR END TARGETED ===========*/
document.addEventListener("click", e => {
  // 🚫 Ignore Refresh button clicks completely
  if (e.target.closest("[data-ignore-global-click]")) return;
  const el = e.target.closest(".tx-ends");
  if (!el) return;

  const endIso = el.dataset.end;
  const name = el.dataset.name || "Transaction";

  if (!endIso) return;

  const popup = document.getElementById("tx-end-popup");
  const text = document.getElementById("tx-end-popup-text");

  const formatted = new Date(endIso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  text.innerHTML = `<strong>${name}</strong><br>Ends on ${formatted}`;

  popup.classList.remove("hidden");
  document.body.classList.add("modal-open");
});
  /* ============ FINAL FIX? ========= */
  const banner = document.getElementById("update-banner");
const dismissed = localStorage.getItem("dismissedVersion");

// SHOW banner only if version changed
if (dismissed !== APP_VERSION) {
  banner?.classList.remove("hidden");
} else {
  banner?.classList.add("hidden");
}
  /* ============= */
document
  .getElementById("refresh-app-btn")
  ?.addEventListener("click", async e => {
    e.preventDefault();

    // Remember dismissal for this version
    localStorage.setItem("dismissedVersion", APP_VERSION);

    // Hide banner immediately
    document
      .getElementById("update-banner")
      ?.classList.add("hidden");

    // Activate waiting SW if present
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    // Reload cleanly
    setTimeout(() => {
      window.location.reload();
    }, 300);
  });
/* ========================*/
  /* ========= TX END MODAL CLOSE HANDLERS ========= */
document.addEventListener("click", e => {
  // 🚫 Ignore Refresh button clicks completely
  if (e.target.closest("[data-ignore-global-click]")) return;
  // Close button
  if (e.target.matches("#tx-end-popup-close")) {
    const popup = document.getElementById("tx-end-popup");
    popup.classList.add("hidden");
    document.body.classList.remove("modal-open");
    return;
  }

  // Click on backdrop (outside modal content)
  if (e.target.matches("#tx-end-popup")) {
    e.target.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
});
/* -------- helper function for popups salary -1 and negative balances -------- */
function getTransactionsSortedByDate() {
  return transactions
    .filter(tx => !tx.__whatIf)   // ✅ EXCLUDE What If
    .sort((a, b) => {
      const dA = new Date(a.date);
      const dB = new Date(b.date);
      return dA - dB;
    });
}

/* ----------Diary button ----------------------- */
const diaryBtn = document.getElementById("diary-popup-btn");

diaryBtn.onclick = () => {
  openDiaryForDate();
};



  function openDiaryForDate(date) {
  if (!date) {
    date = new Date().toISOString().slice(0, 10);
  }

  window.location.href = `notes.html?date=${date}`;
}
/* target date end helper */
  function isFinalOccurrence(tx, iso) {
  if (!tx.endDate) return false;

  // If it occurs on this date, but NOT on the next valid occurrence,
  // then this is the final one.
  const next = new Date(iso);

  if (tx.frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (tx.frequency === "4-weekly") {
    next.setDate(next.getDate() + 28);
  } else {
    return false; // irregular handled elsewhere
  }

  const nextIso = toISO(next);

  return occursOn(tx, iso) && !occursOn(tx, nextIso);
}
 
  
/* ============================================== */
/* added edit category code*/
  renameCategoryButton.onclick = () => {
  const oldName = editCategorySelect.value;
  const newName = editCategoryInput.value.trim();

  if (!oldName) return alert("Select a category to rename");
  if (!newName) return alert("Enter a new category name");
  if (categories.includes(newName)) return alert("Category already exists");

  // Update category list
  categories = categories.map(c => c === oldName ? newName : c);
  localStorage.setItem("categories", JSON.stringify(categories));

  // Update all transactions using that category
  transactions.forEach(tx => {
    if (tx.category === oldName) {
      tx.category = newName;
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

  editCategoryInput.value = "";

  updateCategoryDropdown();
  updateEditCategoryDropdown();
  renderTransactionTable();
  renderProjectionTable();
    

  alert(`Category "${oldName}" renamed to "${newName}"`);
};

/* =================================================== */
function nudgeKey(id, iso) {
  return `${id}|${iso}`;
}
/* =================================================== */
function getDisplayedTransactionDate(tx) {
  if (!tx.date) return "";

  // Monthly or irregular → show original day
  if (tx.frequency !== "4-weekly") {
    return formatDayOnly(tx.date);
  }

  // 4-weekly → roll forward to next occurrence ≥ TODAY
  let d = new Date(tx.date);
  d.setHours(12, 0, 0, 0);

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  while (d < today) {
    d.setDate(d.getDate() + 28);
  }

  return d.getDate() + getOrdinalSuffix(d.getDate());
}
/* =================================================== */
function getEffectiveDayOfMonth(tx) {
  if (!tx.date) return 0;

  // Monthly / irregular
  if (tx.frequency !== "4-weekly") {
    return new Date(tx.date).getDate();
  }

  // 4-weekly → roll forward to >= today
  let d = new Date(tx.date);
  d.setHours(12, 0, 0, 0);

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  while (d < today) {
    d.setDate(d.getDate() + 28);
  }

  return d.getDate();
}
  
/* =================================================== */
function saveNudges() {
  localStorage.setItem("nudges", JSON.stringify(nudges));
}
/* =================================================== */
  function toISO(d) {
  if (!d) return "";
  const x = new Date(d);
  x.setHours(12,0,0,0);
  return x.toISOString().slice(0,10);
}
/* =================================================== */
function formatDayOnly(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.getDate() + getOrdinalSuffix(d.getDate());
}
/* =================================================== */
function getOrdinalSuffix(n) {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
/* ===================================================*/
function jumpToProjectionDate(iso) {
  const rows = document.querySelectorAll("#projection-table tbody tr");

  for (const row of rows) {
    const cell = row.querySelector("td");
    if (!cell) continue;

    const text = cell.textContent.trim();
    if (normalizeSearch(text).includes(normalizeSearch(formatDate(iso)))) {
      row.classList.add("projection-jump-highlight");
      row.scrollIntoView({ behavior: "smooth", block: "center" });

      // Remove highlight after a moment
      setTimeout(() => {
        row.classList.remove("projection-jump-highlight");
      }, 1500);

      break;
    }
  }
}
/* ====== NEW DATE FORMAT =======*/
function formatDate(iso) {
  const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(iso).toLocaleDateString("en-GB", options).replace(',', '');
}

/* ==============================*/

function normalizeSearch(str) {
  return str
    .toLowerCase()
    // normalise all dash types
    .replace(/[\u2010-\u2015\u2212\-]/g, "")
    // remove slashes
    .replace(/[\/]/g, "")
    // collapse whitespace
    .replace(/\s+/g, "");
}
/* ===================================================*/

function highlightMatch(row, searchText) {

  if (!searchText) return;

  const escaped = searchText.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(`(${escaped})`, "gi");

  row.querySelectorAll("td").forEach(td => {

    // ONLY process plain text nodes
    const walker = document.createTreeWalker(
      td,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach(node => {

      if (!regex.test(node.textContent)) return;

      const span = document.createElement("span");

      span.innerHTML = node.textContent.replace(
        regex,
        `<mark class="find-highlight">$1</mark>`
      );

      node.parentNode.replaceChild(span, node);
    });
  });
}
  
/*function hasNudgedAwayTransaction(iso) {
  return Object.keys(nudges).some(key => key.endsWith("|" + iso));
}*/

/* ================= CATEGORIES ================= */
function updateCategoryDropdown() {
  txCategorySelect.innerHTML = '<option value="">Select</option>';
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    txCategorySelect.appendChild(opt);
  });
}
/* ===================================================*/
function updateEditCategoryDropdown() {
  if (!editCategorySelect) return;

  editCategorySelect.innerHTML = '<option value="">Select</option>';
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    editCategorySelect.appendChild(opt);
  });
}

addCategoryButton.onclick = () => {
  const c = newCategoryInput.value.trim();
  if (!c) return;
  if (!categories.includes(c)) {
    categories.push(c);
    localStorage.setItem("categories", JSON.stringify(categories));
  }
  newCategoryInput.value = "";
  updateCategoryDropdown();
};
/* ===================================================*/
/* WE THINK THIS FUNCTION IS NOT USED, COMMENT OUT FOR THE MOMENT */
/*function ensureStartConfig() {
  if (!startDate) {
    document.body.classList.remove("modal-open");
    alert("Start date not set");
    return false;
  }
  return true;
}*/

/* ================= CONFIG ================= */
saveConfigButton.onclick = () => {
  startDate = startDateInput.value;
  openingBalance = parseFloat(openingBalanceInput.value) || 0;
  localStorage.setItem("startDate", startDate);
  localStorage.setItem("openingBalance", openingBalance);
  /*alert("Saving config");*/
  renderProjectionTable();
};

startDateInput.value = startDate;
openingBalanceInput.value = openingBalance || "";

/* ==============HELP============ */
const helpButton = document.getElementById("help");
const helpModal = document.getElementById("help-modal");
const helpClose = document.getElementById("help-close");

const frame = document.querySelector(".modal-frame");

if (frame && frame.contentWindow) {
  frame.contentWindow.location.hash = "";
  frame.contentWindow.scrollTo(0, 0);
}
  


/* ===== ADDITION ======*/
  
if (helpButton) {
  helpButton.addEventListener("click", () => {
    document.body.classList.add("modal-open");
    helpModal.classList.remove("hidden");
  });
}

helpClose.addEventListener("click", () => {
  helpModal.classList.add("hidden");
  document.body.classList.remove("modal-open");

  window.scrollTo({
    top: scrollBeforeHelp,
    behavior: "auto"
  });
});

// Click outside to close
helpModal.addEventListener("click", e => {
  if (e.target === helpModal) {
    helpModal.classList.add("hidden");
    document.body.classList.remove("modal-open");

    window.scrollTo({
      top: scrollBeforeHelp,
      behavior: "auto"
    });
  }
});


/* ================= TRANSACTIONS ================= */
function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}


  function saveOpeningBalances() {

  const inputs = document.querySelectorAll(
    ".opening-balance-input"
  );

  inputs.forEach(input => {

    const potId = input.dataset.potId;

    const pot = savingsPots.find(
      p => p.id === potId
    );

    if (!pot) return;

    pot.openingBalance =
      parseFloat(input.value) || 0;

  });

  saveSavingsPots();

  renderSavingsSummary();
}
  function saveSavingsPots() {
  localStorage.setItem(
    SAVINGS_POTS_KEY,
    JSON.stringify(savingsPots)
  );
}

  if (savingsPots.length === 0) {

  savingsPots = [
    {
      id: "carLease",
      name: "Savings New Car Lease",
      openingBalance: 0
    },
    {
      id: "funeral",
      name: "Savings Funeral",
      openingBalance: 0
    },
    {
      id: "christmas",
      name: "Savings Christmas",
      openingBalance: 0
    },
    {
      id: "carBudget",
      name: "Savings Car Budget",
      openingBalance: 0
    }
  ];

  saveSavingsPots();
}

  function calculateSavingsPotBalance(potId) {

  const pot = savingsPots.find(p => p.id === potId);

  if (!pot) return 0;

  let balance = pot.openingBalance || 0;

  transactions.forEach(tx => {

  const txDate = new Date(tx.date);

  const trackingDate =
    new Date(savingsStartDate);

  if (txDate < trackingDate) {
    return;
  }

  if (tx.savingsPotId !== potId) return;

  if (tx.type === "expense") {
    balance += Number(tx.amount);
  }

  if (tx.type === "income") {
    balance -= Number(tx.amount);
  }

});
    
  return Math.round(balance * 100) / 100;
}


addTxButton.onclick = () => {
  const tx = {
    description: txDesc.value.trim(),
    amount: parseFloat(txAmount.value) || 0,
    type: txType.value,
    frequency: txFrequency.value,
    date: txDate.value,
    endDate: txEndDate.value || null, // ← NEW
    category: txCategorySelect.value,
    savingsPotId: null
  };
  if (tx.category === "Savings") {

  if (tx.description.includes("Car Lease")) {
    tx.savingsPotId = "carLease";
  }

  else if (tx.description.includes("Funeral")) {
    tx.savingsPotId = "funeral";
  }

  else if (tx.description.includes("Christmas")) {
    tx.savingsPotId = "christmas";
  }

  else if (tx.description.includes("Car Budget")) {
    tx.savingsPotId = "carBudget";
  }
}

  if (!tx.description) return alert("Description required");
  if (!tx.category) return alert("Category required");
  if ((tx.frequency !== "irregular") && !tx.date)
    return alert("Start date required");

  if (editingIndex !== null) {
    transactions[editingIndex] = tx;
    editingIndex = null;
    addTxButton.textContent = "Add Transaction";
  } else {
    transactions.push(tx);
  }

  saveTransactions();
  renderTransactionTable();
  renderProjectionTable();
  

  txDesc.value = txAmount.value = txDate.value = "";
  txEndDate.value = "";   // ← ADD THIS
  txCategorySelect.value = "";
};

/* =========== inline edit helper ======== */
  function buildCategoryOptions(selected) {
  return categories
    .map(
      c =>
        `<option value="${c}" ${c === selected ? "selected" : ""}>${c}</option>`
    )
    .join("");
}
/* =====- helper ====== */
  function attachInlineEditKeys(index) {
  document.addEventListener("keydown", function handler(e) {

    if (inlineEditIndex !== index) {
      document.removeEventListener("keydown", handler);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector(".save-btn")?.click();
    }

    if (e.key === "Escape") {
      e.preventDefault();
      document.querySelector(".cancel-btn")?.click();
    }
  });
}
/* ================ Render Transacfions ============= */
/* ================ Render Transactions ============= */
function renderTransactionTable() {

  /* ---------- SORT HEADER BINDINGS ---------- */

  const dateSortHeader = document.getElementById("date-sort-header");
  const dateSortIndicator = document.getElementById("date-sort-indicator");
  const categorySortHeader = document.getElementById("category-sort-header");
  const categorySortIndicator = document.getElementById("category-sort-indicator");
  const descriptionSortHeader =
    document.getElementById("description-sort-header");
  const descriptionSortIndicator =
    document.getElementById("description-sort-indicator");

  // ---- Date sort
  if (dateSortHeader && !dateSortHeader.dataset.bound) {
    dateSortHeader.dataset.bound = "true";
    dateSortHeader.onclick = () => {
      transactionSortMode = "date";
      transactionSortAscending = !transactionSortAscending;
      dateSortIndicator.textContent =
        transactionSortAscending ? "▲" : "▼";
      if (categorySortIndicator) categorySortIndicator.textContent = "";
      if (descriptionSortIndicator) descriptionSortIndicator.textContent = "";
      renderTransactionTable();
    };
  }

  // ---- Description sort
  if (descriptionSortHeader && !descriptionSortHeader.dataset.bound) {
    descriptionSortHeader.dataset.bound = "true";
    descriptionSortHeader.onclick = () => {
      transactionSortMode = "description";
      transactionSortAscending = !transactionSortAscending;
      descriptionSortIndicator.textContent =
        transactionSortAscending ? "▲" : "▼";
      if (dateSortIndicator) dateSortIndicator.textContent = "";
      if (categorySortIndicator) categorySortIndicator.textContent = "";
      renderTransactionTable();
    };
  }

  // ---- Category sort
  if (categorySortHeader && !categorySortHeader.dataset.bound) {
    categorySortHeader.dataset.bound = "true";
    categorySortHeader.onclick = () => {
      transactionSortMode = "category";
      transactionSortAscending = !transactionSortAscending;
      categorySortIndicator.textContent =
        transactionSortAscending ? "▲" : "▼";
      if (dateSortIndicator) dateSortIndicator.textContent = "";
      if (descriptionSortIndicator) descriptionSortIndicator.textContent = "";
      renderTransactionTable();
    };
  }

  /* ---------- TABLE BODY ---------- */

  transactionTableBody.innerHTML = "";

  /* ---------- BUILD SORTED VIEW (Safari-safe) ---------- */

  const filtered = transactions.filter(tx => {
  if (!transactionFilterMode) return true;

  if (transactionFilterMode === "targeted") {
    return !!tx.endDate;
  }

  if (transactionFilterMode === "monthly") {
    return tx.frequency === "monthly" && !tx.endDate;
  }

  return tx.frequency === transactionFilterMode;
});

const indexed = filtered
  .map(tx => ({ tx, index: transactions.indexOf(tx) }))
  .sort((a, b) => {
    // existing sort logic unchanged

      // Description
      if (transactionSortMode === "description") {
        const dA = (a.tx.description || "").toLowerCase();
        const dB = (b.tx.description || "").toLowerCase();
        const diff = dA.localeCompare(dB);
        return transactionSortAscending ? diff : -diff;
      }

      // Category
      if (transactionSortMode === "category") {
        const cA = (a.tx.category || "").toLowerCase();
        const cB = (b.tx.category || "").toLowerCase();
        const diff = cA.localeCompare(cB);
        return transactionSortAscending ? diff : -diff;
      }

      // Date (effective day-of-month logic)
      const dayA = getEffectiveDayOfMonth(a.tx);
      const dayB = getEffectiveDayOfMonth(b.tx);

      if (dayA !== dayB) {
        return transactionSortAscending ? dayA - dayB : dayB - dayA;
      }

      // Tie-breaker
      const cA = (a.tx.category || "").toLowerCase();
      const cB = (b.tx.category || "").toLowerCase();
      return cA.localeCompare(cB);
    });

  /* ---------- RENDER ROWS ---------- */

  indexed.forEach(({ tx, index }) => {

    const tr = document.createElement("tr");
    // Frequency class for styling
if (tx.frequency === "monthly") tr.classList.add("freq-monthly");
if (tx.frequency === "4-weekly") tr.classList.add("freq-4weekly");
if (tx.frequency === "Targeted") tr.classList.add("freq-targeted");

    /* ===== INLINE EDIT MODE ===== */
    if (inlineEditIndex === index) {

      tr.classList.add("inline-editing");

      tr.innerHTML = `
   <td>
  <input type="date" id="ie-date-${index}" value="${tx.date}">
  ${
    tx.endDate
      ? `<input
           type="date"
           id="ie-enddate-${index}"
           value="${tx.endDate}"
           title="End date"
           style="margin-top:4px;"
         >`
      : ""
  }
</td>

        <td>
          <input id="ie-desc-${index}" value="${tx.description}">
        </td>

        <td>
          <select id="ie-type-${index}">
            <option value="expense" ${tx.type === "expense" ? "selected" : ""}>expense</option>
            <option value="income" ${tx.type === "income" ? "selected" : ""}>income</option>
          </select>
        </td>

        <td>
          <input type="number" step="0.01" id="ie-amount-${index}" value="${tx.amount}">
        </td>

        <td>
          <select id="ie-category-${index}">
            ${buildCategoryOptions(tx.category)}
          </select>
        </td>

        <td>
          <button class="save-btn">Save</button>
          <button class="cancel-btn">Cancel</button>
        </td>
      `;

      tr.querySelector(".save-btn").onclick = () => {
        tx.date =
          document.getElementById(`ie-date-${index}`).value;
        tx.endDate =
          document.getElementById(`ie-enddate-${index}`)?.value || null;
        tx.description =
          document.getElementById(`ie-desc-${index}`).value;
        tx.type =
          document.getElementById(`ie-type-${index}`).value;
        tx.amount =
          parseFloat(
            document.getElementById(`ie-amount-${index}`).value
          ) || 0;
        tx.category =
          document.getElementById(`ie-category-${index}`).value;

        saveTransactions();
        inlineEditIndex = null;
        renderTransactionTable();
        renderProjectionTable();
      };

      tr.querySelector(".cancel-btn").onclick = () => {
        inlineEditIndex = null;
        renderTransactionTable();
      };

    } else {

      /* ===== NORMAL VIEW MODE ===== */

      tr.innerHTML = `
        <td>
  <div class="tx-date-cell">
    <span class="tx-date-text">
      ${getDisplayedTransactionDate(tx)}
    </span>
    <span class="tx-date-icon">
      ${frequencyIcon(tx)}
    </span>
  </div>
</td>

        <td>${tx.description}</td>
        <td>${tx.type}</td>
        <td>${tx.amount.toFixed(2)}</td>
        <td>${tx.category}</td>

        <td>
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </td>
      `;

      tr.querySelector(".edit-btn").onclick = () => {
        inlineEditIndex = index;
        renderTransactionTable();
        attachInlineEditKeys(index);
      };

      tr.querySelector(".delete-btn").onclick = () => {
       /* if (!confirm(`Delete "${tx.description}"?`)) return;*/
        if (!confirm(
  `Delete "${tx.description}" on ${getDisplayedTransactionDate(tx)} for £${tx.amount.toFixed(2)}?`
)) return;
        transactions.splice(index, 1);
        saveTransactions();
        renderTransactionTable();
        renderProjectionTable();
      };
    }

    if (tx.type === "expense") tr.classList.add("expense-row");
    if (tx.frequency === "4-weekly") tr.classList.add("freq-4weekly");

    transactionTableBody.appendChild(tr);
  });
  updateFilterBadge();

  console.log("Frequencies:", [...new Set(transactions.map(t => t.frequency))]);
  
}
/* ================= RECURRENCE ================= */
function occursOn(tx, iso) {
  // Irregular transactions = one-off, unchanged
  if (tx.frequency === "irregular") {
    return tx.date === iso;
  }

  // START DATE check (existing behaviour)
  if (iso < tx.date) return false;

  // 🔴 END DATE check (NEW)
  if (tx.endDate && iso > tx.endDate) return false;

  const start = new Date(tx.date);
  const current = new Date(iso);

  if (tx.frequency === "monthly") {
    return (
      start.getDate() === current.getDate()
    );
  }

  if (tx.frequency === "4-weekly") {
    const diffDays =
      Math.floor((current - start) / 86400000);
    return diffDays >= 0 && diffDays % 28 === 0;
  }

  return false;
}
/* ================= NUDGE HELPERS ================= */

// A stable unique ID for each transaction occurrence
function txId(tx) {
  return `${tx.date}|${tx.frequency}|${tx.description}|${tx.amount}|${tx.type}`;
}

// Was this transaction nudged away from THIS date?
function isNudgedAway(tx, iso) {
  return nudges.hasOwnProperty(nudgeKey(tx, iso));
}

function isNudgedHere(tx, iso) {
  return Object.values(nudges).includes(iso) &&
    Object.keys(nudges).some(k =>
      k.startsWith(txId(tx) + "|") && nudges[k] === iso
    );
}
  
    /* ========== DIARY ICON CLICK ========== */
projectionTbody.addEventListener("click", e => {
  const icon = e.target.closest(".diary-icon");
  if (!icon) return;

  e.stopPropagation(); // prevents row select / nudge interference

  const iso = icon.dataset.iso;
  window.location.href = `notes.html?date=${iso}&from=projection`;
});

  
window.renderProjectionTable = function () {
  projectionTbody.innerHTML = "";

  if (!startDate) {
    document.body.classList.remove("modal-open");
    alert("Start date not set");
    return;
  }

  let balance = openingBalance;

  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);

  const todayIso = toISO(new Date());

  const end = new Date(start);
  end.setMonth(end.getMonth() + 24);

  /* ---------- Build day map ---------- */
  const dayMap = {};
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dayMap[toISO(d)] = [];
  }

  /* ---------- Place transactions ---------- */
  transactions.forEach(tx => {
    for (let iso in dayMap) {
      if (!occursOn(tx, iso)) continue;

      const id = txId(tx);
      const nudgeKey = `${id}|${iso}`;

      if (nudges[nudgeKey]) {
        const targetIso = nudges[nudgeKey];
        if (dayMap[targetIso]) {
          dayMap[targetIso].push(tx);
        }
      } else {
        dayMap[iso].push(tx);
      }
    }
  });

  /* ===== PRE-PASS: find lowest balance until next income ===== */
let tempBalance = openingBalance;
let lowestUpcomingBalance = Infinity;
let lowestUpcomingIso = null;
let foundNextIncome = false;

Object.keys(dayMap).sort().forEach(iso => {
  const todaysTx = [...dayMap[iso]].sort((a, b) =>
    a.type === b.type ? 0 : a.type === "income" ? -1 : 1
  );

  const isTrackingWindow = iso >= todayIso;

  todaysTx.forEach(tx => {
    const isIncome = tx.type === "income";

    tempBalance += isIncome ? tx.amount : -tx.amount;

    const isMajorIncome = isIncome && tx.amount >= 200;

    if (isTrackingWindow && !foundNextIncome) {
      if (tempBalance < lowestUpcomingBalance) {
        lowestUpcomingBalance = tempBalance;
        lowestUpcomingIso = iso;
      }
    }

    if (iso > todayIso && isMajorIncome) {
      foundNextIncome = true;
    }
  });
});

  /* ===== SUMMARY ===== */
  const summaryEl = document.getElementById("projection-summary");

  if (summaryEl) {
    if (lowestUpcomingIso) {
      const lowestDateFormatted = formatDate(lowestUpcomingIso);

      const daysUntilLow = Math.round(
        (new Date(lowestUpcomingIso) - new Date(todayIso)) / 86400000
      );

      const bufferNeeded =
        lowestUpcomingBalance < 0
          ? Math.abs(lowestUpcomingBalance)
          : 0;

      summaryEl.innerHTML = `
        <strong>Lowest before next income:</strong> £${lowestUpcomingBalance.toFixed(2)}
        on ${lowestDateFormatted}
        (${daysUntilLow} days)
        ${bufferNeeded > 0 ? ` — <strong>Buffer needed:</strong> £${bufferNeeded.toFixed(2)}` : ""}
      `;

/*      if (transactions.some(t => t.__whatIf)) {*/
 /* summaryEl.innerHTML += `<br>🧪 What If active`;*/
/*}*/
const whatIfTx = transactions.find(t => t.__whatIf);

if (whatIfTx) {
  const startFormatted = formatDate(whatIfTx.date);
  summaryEl.innerHTML += `
    <br>🧪 What If active: £${whatIfTx.amount.toFixed(2)} / month
    from ${startFormatted}
  `;
}
      summaryEl.classList.remove(
        "summary-danger",
        "summary-warning",
        "summary-ok"
      );

      if (lowestUpcomingBalance < 0) {
        summaryEl.classList.add("summary-danger");
      } else if (lowestUpcomingBalance < 100) {
        summaryEl.classList.add("summary-warning");
      } else {
        summaryEl.classList.add("summary-ok");
      }
    } else {
      summaryEl.innerHTML = "";
      summaryEl.classList.remove(
        "summary-danger",
        "summary-warning",
        "summary-ok"
      );
    }
  }

  /* ---------- Render day by day ---------- */
  Object.keys(dayMap).forEach(iso => {
    const todaysTx = dayMap[iso];
    let dateRendered = false;

    /* ===== NO TRANSACTIONS ===== */
    if (todaysTx.length === 0) {
      const tr = document.createElement("tr");

      if (iso === todayIso) tr.classList.add("today-row");
      if ([0, 6].includes(new Date(iso).getDay()))
        tr.classList.add("weekend-row");

      if (iso === lowestUpcomingIso) {
        tr.classList.add("lowest-balance");
      }

      tr.innerHTML = `
        <td>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>${formatDate(iso)}</span>
            ${iso === todayIso ? '<span class="today-label">Today</span>' : ""}
            ${iso === lowestUpcomingIso ? '<span class="low-label">Low</span>' : ""}
            ${
              hasDiaryNote(iso)
                ? `<span class="diary-icon" data-iso="${iso}">📅</span>`
                : ""
            }
          </div>
        </td>
        <td></td><td></td><td></td>
        <td><strong>${balance.toFixed(2)}</strong></td>
      `;

      projectionTbody.appendChild(tr);
      return;
    }

    /* ---------- Income first ---------- */
    todaysTx.sort((a, b) =>
      a.type === b.type ? 0 : a.type === "income" ? -1 : 1
    );
    /* added what-if processing */
    // WHAT IF: add monthly saving on same day-of-month as startDate (today)


   
    /* ===== TRANSACTIONS ===== */
    todaysTx.forEach((tx, index) => {

  const isIncome = tx.type === "income";
  balance += isIncome ? tx.amount : -tx.amount;

  const tr = document.createElement("tr");

if (tx.__whatIf) {
  const start = new Date(tx.date);
  const current = new Date(iso);

  // Not before start date
  if (current < start) return;

  // Work out month difference
  const monthsDiff =
    (current.getFullYear() - start.getFullYear()) * 12 +
    (current.getMonth() - start.getMonth());

  if (monthsDiff < 0) return;

  // Only trigger once per month on same day-of-month
  const lastDay = new Date(
  current.getFullYear(),
  current.getMonth() + 1,
  0
).getDate();

const targetDay = Math.min(start.getDate(), lastDay);

if (current.getDate() !== targetDay) return;

  // ✅ Styling ONLY after it passes checks
  tr.classList.add("whatif-row");
}

  if (iso === todayIso) tr.classList.add("today-row");
  if ([0, 6].includes(new Date(iso).getDay()))
    tr.classList.add("weekend-row");
  if (balance < 0) tr.classList.add("negative");
      const today = new Date(toISO(new Date()));
      const diffDays = Math.round((new Date(iso) - today) / 86400000);

      const showNudge =
        (diffDays >= 0 && diffDays <= 7) ||
        (diffDays < 0 && diffDays >= -MAX_PAST_NUDGE_DAYS);

      if (
        tx.description.toLowerCase().includes("pension") ||
        tx.description.toLowerCase().includes("salary")
      ) {
        tr.classList.add("highlight-pension");
      }

      if (tx.description.toLowerCase().includes("savings")) {
        tr.classList.add("highlight-savings");
      }

      if (
        iso === lowestUpcomingIso &&
        index === todaysTx.length - 1
      ) {
        tr.classList.add("lowest-balance");
      }

      tr.innerHTML = `
        <td>
          ${
            !dateRendered
              ? (() => {
                  dateRendered = true;
                  return `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>${formatDate(iso)}</span>
                      ${iso === todayIso ? '<span class="today-label">Today</span>' : ""}
                      ${iso === lowestUpcomingIso ? '<span class="low-label">Low</span>' : ""}
                      ${
                        hasDiaryNote(iso)
                          ? `<span class="diary-icon" data-iso="${iso}">📅</span>`
                          : ""
                      }
                    </div>
                  `;
                })()
              : ""
          }
        </td>

        <td>
          <div class="projection-item ${tx.type}">
            <span class="desc">
              ${frequencyIcon(tx)}${tx.description}
              ${
                isFinalOccurrence(tx, iso) && tx.endDate
                  ? `<span class="tx-ends"
                       data-end="${tx.endDate}"
                       data-name="${tx.description}">
                       🎯 ends</span>`
                  : ""
              }
            </span>
            <span class="cat">${tx.category || ""}</span>
            ${
              showNudge
                ? `<button class="nudge-btn"
                     data-id="${txId(tx)}"
                     data-iso="${iso}">+1</button>`
                : ""
            }
          </div>
        </td>

        <td>${isIncome ? tx.amount.toFixed(2) : ""}</td>
        <td>${!isIncome ? tx.amount.toFixed(2) : ""}</td>
        <td>${
          index === todaysTx.length - 1
            ? `<strong>${balance.toFixed(2)}</strong>`
            : balance.toFixed(2)
        }</td>
      `;

      projectionTbody.appendChild(tr);
    });
  });

  /* ===== FINAL PASS: highlight last transaction today ===== */
  projectionTbody
    .querySelectorAll("tr.auto-highlight")
    .forEach(row => row.classList.remove("auto-highlight"));

  const todayRows = projectionTbody.querySelectorAll("tr.today-row");

  if (todayRows.length > 0) {
    const lastRow = todayRows[todayRows.length - 1];
    lastRow.classList.add("auto-highlight");
  }
};
/* ================= STICKY FIND CUMULATIVE TOTAL HELPER ======== */
  function extractRowAmount(row) {
  const tds = row.querySelectorAll("td");
  if (tds.length < 4) return null;

  const incomeText = tds[2]?.textContent.trim();
  const expenseText = tds[3]?.textContent.trim();

  const income = incomeText ? parseFloat(incomeText) : 0;
  const expense = expenseText ? parseFloat(expenseText) : 0;

  // 🚫 Ignore rows with no financial impact
  if (!income && !expense) return null;

  return income - expense;
}
  
/* ================= STICKY FIND ================= */
const findInput=document.getElementById("projection-find-input");
const findNext=document.getElementById("projection-find-next");
const findPrev=document.getElementById("projection-find-prev");
const findCounter=document.getElementById("find-counter");
const findClear = document.getElementById("projection-find-clear");
  findClear.onclick = () => {
  findInput.value = "";
  matches = [];
  findIdx = -1;

  // remove highlights
  document
    .querySelectorAll(".projection-match-highlight")
    .forEach(r => r.classList.remove("projection-match-highlight"));

  updateCounter();
};

let matches=[], findIdx=-1;
let matchTotals = [];
function collectMatches() {

  // ===== CLEAR OLD HIGHLIGHTS =====

  document.querySelectorAll("mark.find-highlight")
    .forEach(mark => {
      mark.replaceWith(
        document.createTextNode(mark.textContent)
      );
    });

  document.querySelectorAll(".date-search-highlight")
    .forEach(el => {
      el.classList.remove("date-search-highlight");
    });

  document.querySelectorAll("#projection-table tbody tr")
    .forEach(r => {
      r.classList.remove("projection-match-highlight");
      r.normalize();
    });

  matches = [];
  matchTotals = [];
  findIdx = -1;

  const rawQuery = findInput.value.trim();
  const q = normalizeSearch(rawQuery);

  if (!q) {
    updateCounter();
    return;
  }

  let runningTotal = 0;

  document
    .querySelectorAll("#projection-table tbody tr")
    .forEach(r => {

      const rowText = normalizeSearch(r.textContent);

      // ===== DATE SUPPORT =====

      let isoMatch = false;

      const dateCell = r.querySelector("td");

      if (dateCell) {

        const displayedDate =
          dateCell.textContent.trim();

        const parsed = new Date(displayedDate);

        if (!isNaN(parsed)) {

          const iso =
            parsed.getFullYear() + "-" +
            String(parsed.getMonth() + 1).padStart(2, "0") + "-" +
            String(parsed.getDate()).padStart(2, "0");

          if (normalizeSearch(iso).includes(q)) {
            isoMatch = true;
          }
        }
      }

      // ===== MATCH FOUND =====

      if (rowText.includes(q) || isoMatch) {

        matches.push(r);

        // Text highlight
        if (rowText.includes(q)) {
          highlightMatch(r, rawQuery);
        }

        // Date highlight
        if (isoMatch && dateCell) {
          dateCell.classList.add("date-search-highlight");
        }

        const amt = extractRowAmount(r);

        if (amt !== null) {
          runningTotal += amt;
        }

        matchTotals.push(runningTotal);
      }
    });

  updateCounter();
}

function updateCounter(){
  if (!matches.length) {
    findCounter.textContent = "0/0";
    return;
  }

  const base = `${findIdx + 1}/${matches.length}`;

  if (findIdx >= 0) {
    const total = matchTotals[findIdx] || 0;
    findCounter.textContent = `${base} · £${total.toFixed(2)}`;
  } else {
    findCounter.textContent = base;
  }
}

function showMatch(){
  matches.forEach(r=>r.classList.remove("projection-match-highlight"));
  if(findIdx<0||findIdx>=matches.length)return;
  matches[findIdx].classList.add("projection-match-highlight");
  matches[findIdx].scrollIntoView({behavior:"smooth",block:"center"});
}

findInput.oninput=collectMatches;
findNext.onclick=()=>{if(matches.length){findIdx=(findIdx+1)%matches.length;showMatch();updateCounter();}};
findPrev.onclick=()=>{if(matches.length){findIdx=(findIdx-1+matches.length)%matches.length;showMatch();updateCounter();}};

/* ========== 24 MONTH PROJECTION (TOP) ========== */
document.getElementById("back-to-top")?.addEventListener("click", () => {
  scrollWithOffset("app-top", -80);
});
/*. ------ */
  
  
/* ============== VIEW TRANSACTIONS =========== */
document.getElementById("TopofApp")?.addEventListener("click", () => {
  scrollWithOffset("tohere", -80);
});
  
//* ================== MENU BUTTON =========== */
document.getElementById("menucategory")?.addEventListener("click", () => {
  scrollWithOffset("jump-here", -80);
});

  
  const floatingFind = document.getElementById("floating-find");

function lockFindBar() {
  if (!floatingFind) return;

  const y =
    window.visualViewport
      ? window.visualViewport.pageTop
      : window.scrollY;

  floatingFind.style.top = y + "px";
}

// iOS-safe listeners
window.addEventListener("scroll", lockFindBar, { passive: true });
window.addEventListener("resize", lockFindBar);
if (window.visualViewport) {
  window.visualViewport.addEventListener("scroll", lockFindBar);
  window.visualViewport.addEventListener("resize", lockFindBar);
}

// initial position
lockFindBar();
/* ================= CSV IMPORT (AUTO CATEGORY) ================= */
const csvInput = document.getElementById("csv-import");
const importBtn = document.getElementById("import-btn");

if (importBtn) {
  importBtn.onclick = () => {

    if (!csvInput) return alert("CSV input missing");
if (!csvInput.files.length) return alert("Choose CSV");

    const rows = csvInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const lines = reader.result.trim().split(/\r?\n/);

      if (
        lines.shift().trim() !==
        "Date,Amount,Income/Expense,Category,Description,Frequency"
      ) {
        return alert("Invalid CSV header");
      }

      categories = [...new Set(categories)];
      transactions = [];

      lines.forEach(line => {
        const [date, amount, typeRaw, cat, desc, freq] = line.split(",");

        if (!categories.includes(cat)) categories.push(cat);

        const normalizedType = typeRaw.trim().toLowerCase();

        if (normalizedType !== "income" && normalizedType !== "expense") {
          throw new Error(`Invalid Income/Expense value: "${typeRaw}"`);
        }

        transactions.push({
          date: date.trim(),
          description: desc.trim(),
          category: cat.trim(),
          amount: parseFloat(amount),
          type: normalizedType,
          frequency: freq.trim().toLowerCase()
        });
      });

      localStorage.setItem("categories", JSON.stringify(categories));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

      updateCategoryDropdown();
      updateEditCategoryDropdown();
      renderTransactionTable();
      renderProjectionTable();

      alert("CSV import successful");
    };

    reader.readAsText(rows);
  };
}

/* ================= EXPORT 24-MONTH PROJECTION ================= */

document.getElementById("export-projection-btn").onclick = () => {
if (!startDate) {
  document.body.classList.remove("modal-open");
  alert("Start date not set");
  return;
}

  let csv = "Date,Description,Category,Income,Expense,Balance\n";

  let balance = openingBalance;
  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 24);

  // ===== BUILD dayMap EXACTLY like projection =====
const dayMap = {};

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  dayMap[toISO(d)] = [];
}

transactions.forEach(tx => {
  for (let iso in dayMap) {
    if (!occursOn(tx, iso)) continue;

    const id = txId(tx);
    const nudgeKey = `${id}|${iso}`;

    if (nudges[nudgeKey]) {
      const targetIso = nudges[nudgeKey];
      if (dayMap[targetIso]) {
        dayMap[targetIso].push(tx);
      }
    } else {
      dayMap[iso].push(tx);
    }
  }
});

// ===== EXPORT per transaction =====
Object.keys(dayMap).forEach(iso => {

  const todaysTx = [...dayMap[iso]].sort((a, b) =>
    a.type === b.type ? 0 : a.type === "income" ? -1 : 1
  );

  todaysTx.forEach(tx => {

    const isIncome = tx.type === "income";

    balance += isIncome ? tx.amount : -tx.amount;
    balance = Math.round(balance * 100) / 100;

    csv += [
      iso,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${(tx.category || "").replace(/"/g, '""')}"`,
      isIncome ? tx.amount.toFixed(2) : "",
      !isIncome ? tx.amount.toFixed(2) : "",
      balance.toFixed(2)
    ].join(",") + "\n";

  });
});
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "24-month-projection.csv";
  a.click();

  URL.revokeObjectURL(url);
};
/* ================= NEGATIVE BALANCES POPUP ================= */

const negativeBtn = document.getElementById("negative-popup-btn");
const negativePopup = document.getElementById("negative-popup");
const negativePopupBody = document.getElementById("negative-popup-body");
const negativeClose = document.getElementById("negative-popup-close");

negativeBtn.onclick = () => {
  negativePopupBody.innerHTML = "";
  document.body.classList.add("modal-open");

  if (!startDate) {
    document.body.classList.remove("modal-open");
    alert("Start date not set");
    return;
  }

  let foundAny = false;
  let balance = openingBalance;

  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 24);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISO(d);

    getTransactionsSortedByDate().forEach(tx => {
  const id = txId(tx);
  const natural = occursOn(tx, iso);
  const nudgedAway = nudges[`${id}|${iso}`];
  const nudgedHere = Object.entries(nudges).some(
    ([key, target]) => key.startsWith(id + "|") && target === iso
  );

  if ((natural && !nudgedAway) || (!natural && nudgedHere)) {
    balance += tx.type === "income" ? tx.amount : -tx.amount;
  }
});

    if (balance < 0) {
      foundAny = true;

      const tr = document.createElement("tr");
      tr.classList.add("negative");
      tr.style.cursor = "pointer";

      tr.innerHTML = `
        <td class="salary-date">
          <span class="salary-date-text">${formatDate(iso)}</span>
          <span class="salary-jump-icon">🔍</span>
        </td>
        <td style="text-align:right">
          <strong>${balance.toFixed(2)}</strong>
        </td>
      `;

      tr.onclick = () => {
        negativePopup.classList.add("hidden");
        document.body.classList.remove("modal-open");
        setTimeout(() => jumpToProjectionDate(iso), 200);
      };

      negativePopupBody.appendChild(tr);
    }
  }

  if (!foundAny) {
    document.body.classList.remove("modal-open");
    alert("No negative balances in the next 24 months");
    return;
  }

  negativePopup.classList.remove("hidden");
};

negativeClose.onclick = () => {
  negativePopup.classList.add("hidden");
  document.body.classList.remove("modal-open");
  /* alex spence */
  window.scrollTo({top:1500,behavior:"smooth"});
};

negativePopup.addEventListener("click", e => {
  if (e.target === negativePopup) {
    negativePopup.classList.add("hidden");
    document.body.classList.remove("modal-open");
    /* alex spence */
  window.scrollTo({top:1500,behavior:"smooth"});
  }
});
/* ========== DIARY ALERTS =========== */
  function checkDiaryAlerts() {
  const NOTES_KEY = "diaryNotes";
  const notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // LOCAL date (not UTC)
  const tomorrowIso =
    tomorrow.getFullYear() + "-" +
    String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" +
    String(tomorrow.getDate()).padStart(2, "0");

  if (notes[tomorrowIso]) {
    const preview = notes[tomorrowIso].slice(0, 80);
    alert(
      `📓 Diary reminder for tomorrow (${tomorrowIso})\n\n` +
      preview +
      (notes[tomorrowIso].length > 80 ? "…" : "")
    );
  }
}

/* =================================== */
/* ================= SALARY -1 DAY POPUP ================= */

/* ================= SALARY -1 DAY POPUP ================= */

const salaryBtn = document.getElementById("salary-popup-btn");
const salaryPopup = document.getElementById("salary-popup");
const salaryPopupBody = document.getElementById("salary-popup-body");
const salaryClose = document.getElementById("salary-popup-close");

const salaryMinusOne = new Map(); // iso → Set of frequencies

let salaryRows = [];
let salarySortKey = "balance";
let salarySortAsc = true;

/* assumes you already have this globally */
/// let salaryFilter = "all";

salaryBtn.onclick = () => {
  document.body.classList.add("modal-open");
  salaryPopupBody.innerHTML = "";
  salaryRows = [];
  salaryMinusOne.clear();

  if (!startDate) {
    document.body.classList.remove("modal-open");
    alert("Start date not set");
    return;
  }

  /* ---------- FILTER CONTROLS ---------- */
  const filterRow = document.createElement("tr");
  const filterCell = document.createElement("td");
  filterCell.colSpan = 2;
  filterCell.style.textAlign = "center";
  filterCell.style.padding = "8px 0";

  filterCell.innerHTML = `
    <button data-filter="all">All</button>
    <button data-filter="monthly">🔁 Monthly</button>
    <button data-filter="4-weekly">📆 4-weekly</button>
  `;

  filterRow.appendChild(filterCell);
  salaryPopupBody.appendChild(filterRow);

  filterCell.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      salaryFilter = btn.dataset.filter;

      // highlight active filter
      filterCell.querySelectorAll("button").forEach(b => {
        b.style.fontWeight = b.dataset.filter === salaryFilter ? "bold" : "normal";
      });

      renderSalaryRows();
    };
  });

  /* ---------- HEADER ROW ---------- */
  const header = document.createElement("tr");
  header.innerHTML = `
    <th style="cursor:pointer">
      Date <span id="salary-date-arrow"></span>
    </th>
    <th style="text-align:right; cursor:pointer">
      Balance <span id="salary-balance-arrow"></span>
    </th>
  `;
  salaryPopupBody.appendChild(header);

  header.children[0].onclick = () => toggleSort("date");
  header.children[1].onclick = () => toggleSort("balance");

  /* ---------- COLLECT SALARY -1 DATES ---------- */
  const orderedTx = getTransactionsSortedByDate();

  orderedTx.forEach(tx => {
    if (tx.type === "income") {
      const start = new Date(tx.date);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 24);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (occursOn(tx, toISO(d))) {
          const prev = new Date(d);
          prev.setDate(prev.getDate() - 1);
          const prevIso = toISO(prev);

          if (!salaryMinusOne.has(prevIso)) {
            salaryMinusOne.set(prevIso, new Set());
          }

          let freq = (tx.frequency || "").toLowerCase().trim();

          if (freq === "monthly") {
            salaryMinusOne.get(prevIso).add("monthly");
          } else if (freq.includes("4")) {
            salaryMinusOne.get(prevIso).add("4-weekly");
          }
        }
      }
    }
  });

  /* ---------- CALCULATE BALANCES ---------- */
  let balance = openingBalance;
  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 24);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISO(d);

    orderedTx.forEach(tx => {
      const id = txId(tx);
      const natural = occursOn(tx, iso);
      const nudgedAway = nudges[`${id}|${iso}`];
      const nudgedHere = Object.entries(nudges).some(
        ([key, target]) => key.startsWith(id + "|") && target === iso
      );

      if ((natural && !nudgedAway) || (!natural && nudgedHere)) {
        balance += tx.type === "income" ? tx.amount : -tx.amount;
      }
    });

    if (salaryMinusOne.has(iso)) {
      salaryRows.push({
        iso,
        date: new Date(iso),
        balance,
        frequencies: salaryMinusOne.get(iso)
      });
    }
  }

  renderSalaryRows();
  salaryPopup.classList.remove("hidden");
};

/* ---------- SORT + RENDER ---------- */

function toggleSort(key) {
  if (salarySortKey === key) {
    salarySortAsc = !salarySortAsc;
  } else {
    salarySortKey = key;
    salarySortAsc = true;
  }
  renderSalaryRows();
}

function renderSalaryRows() {
  // remove only data rows
  salaryPopupBody.querySelectorAll("tr.data-row").forEach(tr => tr.remove());

  salaryRows.sort((a, b) => {
    const val =
      salarySortKey === "balance"
        ? a.balance - b.balance
        : a.date - b.date;

    return salarySortAsc ? val : -val;
  });

  // safe arrow update
  const dateArrow = document.getElementById("salary-date-arrow");
  const balanceArrow = document.getElementById("salary-balance-arrow");

  if (dateArrow) {
    dateArrow.textContent =
      salarySortKey === "date" ? (salarySortAsc ? " ▲" : " ▼") : "";
  }

  if (balanceArrow) {
    balanceArrow.textContent =
      salarySortKey === "balance" ? (salarySortAsc ? " ▲" : " ▼") : "";
  }

  salaryRows.forEach(({ iso, balance, frequencies }) => {

    /* ---------- APPLY FILTER ---------- */
    if (salaryFilter !== "all") {
      if (!frequencies || !frequencies.has(salaryFilter)) return;
    }

    const tr = document.createElement("tr");
    tr.classList.add("data-row");

    if (balance < 0) tr.classList.add("negative");

    let freqIcons = "";

    if (frequencies) {
      if (frequencies.has("monthly")) freqIcons += " 🔁";
      if (frequencies.has("4-weekly")) freqIcons += " 📆";
    }

    tr.innerHTML = `
      <td class="salary-date">
        ${formatDate(iso)}${freqIcons}
        <span class="salary-jump-icon">🔍</span>
      </td>
      <td style="text-align:right">
        <strong>${balance.toFixed(2)}</strong>
      </td>
    `;

    tr.style.cursor = "pointer";
    tr.onclick = () => {
      salaryPopup.classList.add("hidden");
      document.body.classList.remove("modal-open");
      setTimeout(() => jumpToProjectionDate(iso), 200);
    };

    salaryPopupBody.appendChild(tr);
  });
}

/* ---------- CLOSE ---------- */

salaryClose.onclick = () => {
  salaryPopup.classList.add("hidden");
  document.body.classList.remove("modal-open");
};

salaryPopup.addEventListener("click", e => {
  if (e.target === salaryPopup) {
    salaryPopup.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
});
/* ========== NUDGE ========== */
  projectionTbody.addEventListener("click", e => {
  const btn = e.target.closest(".nudge-btn");
  if (!btn) return;

  const id = btn.dataset.id;
  const visibleIso = btn.dataset.iso;

  // Find existing nudge (if any) for this transaction
  let sourceIso = visibleIso;

  for (const [key, target] of Object.entries(nudges)) {
    if (key.startsWith(id + "|") && target === visibleIso) {
      // This transaction was already nudged here
      sourceIso = key.split("|").slice(-1)[0];
      break;
    }
  }

  // Calculate next day
  const next = new Date(visibleIso);
  next.setDate(next.getDate() + 1);
  const toIso = toISO(next);

  // Remove all existing nudges for this transaction
  Object.keys(nudges).forEach(k => {
    if (k.startsWith(id + "|")) delete nudges[k];
  });

  // Add the new nudge using the ORIGINAL source date
  nudges[`${id}|${sourceIso}`] = toIso;

  saveNudges();
  renderProjectionTable();
});
  projectionTbody.addEventListener("click", e => {
  const row = e.target.closest("tr");
  if (!row) return;

  // Clear previous selection
  projectionTbody
    .querySelectorAll(".projection-selected")
    .forEach(r => r.classList.remove("projection-selected"));

  // Highlight clicked row
  row.classList.add("projection-selected");
});
window.addEventListener("storage", e => {
  if (e.key === "diaryUpdated") {
    renderProjectionTable();
  }
});


/* ========== DIARY PREVIEW (FIXED & SAFE) ========== */

const diaryPreview = document.getElementById("diary-preview");
let previewOpenForIso = null;

document.addEventListener("click", e => {
  // 🚫 Ignore Refresh button clicks completely
  if (e.target.closest("[data-ignore-global-click]")) return;
  // Ignore while ANY modal is open
  if (document.body.classList.contains("modal-open")) return;
  if (!diaryPreview) return;

  const icon = e.target.closest(".diary-icon");

  // Click outside → close preview
  if (!icon) {
    diaryPreview.classList.add("hidden");
    previewOpenForIso = null;
    return;
  }

  const iso = icon.dataset.iso;
  const notes = JSON.parse(localStorage.getItem("diaryNotes") || {});
  if (!notes[iso]) return;

  // Second tap → open diary
  if (previewOpenForIso === iso) {
    window.location.href = `notes.html?from=projection&date=${iso}`;
    return;
  }

  // First tap → show preview
  e.preventDefault();
  e.stopPropagation();

  diaryPreview.textContent =
    notes[iso].split("\n")[0].slice(0, 140);

  const rect = icon.getBoundingClientRect();
  diaryPreview.style.left = rect.left + "px";
  diaryPreview.style.top = rect.bottom + 6 + "px";

  diaryPreview.classList.remove("hidden");
  previewOpenForIso = iso;
});

document.addEventListener("mouseout", e => {
  if (e.target.closest(".diary-icon")) {
    diaryPreview.classList.add("hidden");
  }
});


/* =========== EXPORT TRANSACTIONS ============ */
document.getElementById("export-transactions").onclick = () => {

  const transactions =
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  const blob = new Blob(
    [JSON.stringify(transactions, null, 2)],
    { type: "application/json" }
  );

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "transactions-backup.json";

  a.click();

  // Safari/iOS safe delay
  setTimeout(() => {

    URL.revokeObjectURL(a.href);

    localStorage.setItem(
      "lastJsonBackup",
      new Date().toISOString()
    );

    updateBackupStatus();

  }, 500);

};
/* ============================================ */
/* ============================================ */

/* ============ IMPORT TRANSACTIONS =========== */

document
  .getElementById("import-transactions-btn")
  .addEventListener("click", () => {
    document.getElementById("import-transactions").click();
  });

document
  .getElementById("import-transactions")
  .addEventListener("change", e => {

    const file = e.target.files[0];
    // ✅ Filename guard
  if (!file.name.toLowerCase().startsWith("transaction")) {
    alert(
      `Wrong file selected.\n\nExpected a transaction backup file.\n\nYou selected:\n${file.name}`
    );
    e.target.value = "";
    return;
  }


    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);

        if (!Array.isArray(imported)) {
          alert("Invalid transactions file");
          return;
        }
// 🔥 CLEAN the data

transactions = imported.map(tx => ({

  description: tx.description || "",

  amount: parseFloat(tx.amount) || 0,

  type: tx.type === "income" ? "income" : "expense",

  frequency: (tx.frequency || "irregular").toLowerCase().trim(),

  date: tx.date || "",

  endDate: tx.endDate || null,

  category: tx.category || ""

}));
        // 🔑 CRITICAL FIX: update the live array
        /* next two lines commented out */
        /*followimg two lines added*/
       /* transactions.length = 0; */
       /* transactions.push(...imported); */
    
        // Save transactions
        transactions = imported;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

 

// Rebuild categories from transactions
categories = [
  ...new Set(
    transactions
      .map(tx => tx.category)
      .filter(Boolean)
  )
];

// Save categories
localStorage.setItem("categories", JSON.stringify(categories));

// Refresh UI
updateCategoryDropdown();
updateEditCategoryDropdown();
renderTransactionTable();
renderProjectionTable();

alert("Transactions imported successfully");
      } catch {
        alert("Invalid JSON file");
      }
    };

    reader.readAsText(file);
  });
/* ================================================*/
  document.getElementById("upcoming-diary-btn").addEventListener("click", () => {
  const diary = JSON.parse(localStorage.getItem("diaryNotes") || "{}");
  const list = document.getElementById("upcoming-diary-list");

  list.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(end.getDate() + 14);

  let found = false;

  Object.keys(diary)
    .sort()
    .forEach(iso => {
      const d = new Date(iso + "T12:00:00");
      if (d >= today && d <= end) {
        found = true;
        list.innerHTML += `
          <div class="upcoming-diary-item">
            <strong>${d.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short"
            })}</strong><br>
            ${diary[iso]}
          </div>
        `;
      }
    });

  if (!found) {
    list.innerHTML = `<em>No diary entries in the next 14 days.</em>`;
  }

  document.getElementById("upcoming-diary-popup").classList.remove("hidden");
  document.body.classList.add("modal-open");
});

document.getElementById("close-upcoming-diary").addEventListener("click", () => {
  document.getElementById("upcoming-diary-popup").classList.add("hidden");
  document.body.classList.remove("modal-open");
});
/* ================================================*/  
/* ======== OFFLINE INDICATOR ========= */
  function updateOnlineStatus() {
  const el = document.getElementById("offline-indicator");
  if (!el) return;

  if (navigator.onLine) {
    el.classList.add("hidden");
  } else {
    el.classList.remove("hidden");
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

  
/* ------- CLOSE HAMDLER FOR AGGREGATE REPORT --------- */
  document.addEventListener("DOMContentLoaded", () => {

  const popup = document.getElementById("summary-popup");
  const closeBtn = document.getElementById("summary-close");

  if (closeBtn) {
    closeBtn.onclick = () => {
      popup.classList.add("hidden");
      document.body.classList.remove("modal-open");
    };
  }

  // Click outside to close
  if (popup) {
    popup.addEventListener("click", e => {
      if (e.target.id === "summary-popup") {
        popup.classList.add("hidden");
        document.body.classList.remove("modal-open");
      }
    });
  }

});

/* ================= INIT ================= */
  const hash = window.location.hash;
if (hash.startsWith("#jump=")) {
  const iso = hash.replace("#jump=", "");
  setTimeout(() => jumpToProjectionDate(iso), 200);
}
updateCategoryDropdown();
updateEditCategoryDropdown();
renderTransactionTable();
renderProjectionTable();

checkDiaryAlerts();
setInterval(checkDiaryAlerts, 10 * 60 * 1000); // every 10 minutes
updateBackupStatus();
});

setTimeout(() => {
  const banner = document.getElementById("update-banner");
  console.log("BANNER STATE AFTER LOAD:", banner?.className);
}, 1000);
