(() => {
"use strict";

const STORAGE_KEY = "baito_manager_v1";
const DEFAULTS = {
  settings: {jobName:"", wage:1000, hours:3, transport:0, ot:0, startMoney:0},
  shifts: {},
  expenses: []
};

let data = loadData();
let viewDate = new Date();
viewDate.setDate(1);
let editingDate = null;

const $ = (id) => document.getElementById(id);
const yen = (n) => "¥" + Math.round(Number(n) || 0).toLocaleString("ja-JP");
const pad = (n) => String(n).padStart(2, "0");

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const x = JSON.parse(raw);
    return {
      settings: {...DEFAULTS.settings, ...(x.settings || {})},
      shifts: x.shifts || {},
      expenses: Array.isArray(x.expenses) ? x.expenses : []
    };
  } catch (e) {
    console.error("データ読み込みエラー", e);
    return structuredClone(DEFAULTS);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function fromKey(k) {
  const [y,m,d] = k.split("-").map(Number);
  return new Date(y, m-1, d);
}

function shiftPay(s) {
  return (Number(s.hours)||0) * (Number(s.wage)||0)
       + (Number(s.transport)||0)
       + (Number(s.overtime)||0) * (Number(s.otPerMin)||0);
}

function shiftEntries() {
  return Object.entries(data.shifts)
    .map(([date, shift]) => ({date, ...shift}))
    .sort((a,b) => a.date.localeCompare(b.date));
}

function totalIncome() {
  return shiftEntries().reduce((sum, s) => sum + shiftPay(s), 0);
}

function totalExpenses() {
  return data.expenses.reduce((sum, e) => sum + (Number(e.amount)||0), 0);
}

function currentBalance() {
  return (Number(data.settings.startMoney)||0) + totalIncome() - totalExpenses();
}

function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
  const target = $(screenId);
  if (target) target.classList.add("active");

  document.querySelectorAll("nav button[data-screen]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === screenId);
  });

  renderAll();
  window.scrollTo({top:0, behavior:"smooth"});
}

function renderHome() {
  const now = new Date();
  const monthShifts = shiftEntries().filter(s => {
    const d = fromKey(s.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  $("balance").textContent = yen(currentBalance());
  $("balanceInfo").textContent = `登録シフト ${shiftEntries().length}回・支出 ${data.expenses.length}件`;
  $("monthIncome").textContent = yen(monthShifts.reduce((sum,s)=>sum+shiftPay(s),0));
  $("monthShifts").textContent = monthShifts.length + "回";
  $("totalIncome").textContent = yen(totalIncome());
  $("allShifts").textContent = shiftEntries().length + "回";

  const today = dateKey(now);
  const upcoming = monthShifts.filter(s => s.date >= today).slice(0,6);
  $("upcoming").innerHTML = upcoming.length
    ? upcoming.map(s => `
      <div class="listrow">
        <div><b>${s.date.replaceAll("-","/")}</b><div class="muted">${s.status==="done"?"勤務済み":"勤務予定"}・${s.hours}時間</div></div>
        <b>${yen(shiftPay(s))}</b>
      </div>`).join("")
    : '<div class="empty">今月のシフトはありません</div>';
}

function renderCalendar() {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const first = new Date(y,m,1);
  const start = new Date(y,m,1-first.getDay());
  const grid = $("calgrid");
  $("monthTitle").textContent = `${y}年${m+1}月`;
  grid.innerHTML = "";
  const today = dateKey(new Date());

  for (let i=0; i<42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const k = dateKey(d);
    const shift = data.shifts[k];

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day" + (d.getMonth()!==m ? " other":"") + (k===today ? " today":"");
    cell.innerHTML = `<div class="daynum">${d.getDate()}</div>`;

    if (shift) {
      const badge = document.createElement("div");
      badge.className = "shift " + (shift.status==="done" ? "done":"planned");
      badge.textContent = yen(shiftPay(shift));
      cell.appendChild(badge);
    }

    cell.addEventListener("click", () => openShiftModal(k));
    grid.appendChild(cell);
  }
}

function openShiftModal(k) {
  editingDate = k;
  const existing = data.shifts[k];
  const s = data.settings;

  $("shiftDate").textContent = k.replaceAll("-","/");
  $("status").value = existing?.status || "planned";
  $("sHours").value = existing?.hours ?? s.hours;
  $("sWage").value = existing?.wage ?? s.wage;
  $("sTransport").value = existing?.transport ?? s.transport;
  $("sOt").value = existing?.overtime ?? 0;
  $("deleteShift").style.display = existing ? "block" : "none";
  updatePreview();
  $("shiftModal").classList.remove("hidden");
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function updatePreview() {
  const temp = {
    hours: $("sHours").value,
    wage: $("sWage").value,
    transport: $("sTransport").value,
    overtime: $("sOt").value,
    otPerMin: data.settings.ot
  };
  $("preview").textContent = yen(shiftPay(temp));
}

function renderMoney() {
  $("moneyBalance").textContent = yen(currentBalance());
  $("moneyIncome").textContent = yen(totalIncome());
  $("moneyExpense").textContent = yen(totalExpenses());

  const arr = data.expenses
    .map((e,i)=>({...e, originalIndex:i}))
    .sort((a,b)=>b.date.localeCompare(a.date));

  $("expenses").innerHTML = arr.length
    ? arr.map(e => `
      <div class="listrow">
        <div><b>${escapeHtml(e.name || "支出")}</b><div class="muted">${e.date}</div></div>
        <div><b>-${yen(e.amount)}</b> <button class="link delete-expense" data-index="${e.originalIndex}" type="button">削除</button></div>
      </div>`).join("")
    : '<div class="empty">支出はありません</div>';

  document.querySelectorAll(".delete-expense").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      if (confirm("この支出を削除しますか？")) {
        data.expenses.splice(index,1);
        saveData();
        renderAll();
      }
    });
  });
}

function renderSettings() {
  const s = data.settings;
  $("jobName").value = s.jobName;
  $("wage").value = s.wage;
  $("hours").value = s.hours;
  $("transport").value = s.transport;
  $("ot").value = s.ot;
  $("startMoney").value = s.startMoney;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function renderAll() {
  renderHome();
  renderCalendar();
  renderMoney();
  renderSettings();
}

function bindEvents() {
  document.querySelectorAll("nav button[data-screen]").forEach(btn => {
    btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
  });

  $("settingsBtn").addEventListener("click", () => switchScreen("settings"));
  $("calendarLink").addEventListener("click", () => switchScreen("calendar"));

  $("prev").addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth()-1);
    renderCalendar();
  });

  $("next").addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth()+1);
    renderCalendar();
  });

  ["sHours","sWage","sTransport","sOt"].forEach(id => {
    $(id).addEventListener("input", updatePreview);
  });

  document.querySelectorAll("[data-close]").forEach(el => {
    el.addEventListener("click", () => closeModal(el.dataset.close));
  });

  $("saveShift").addEventListener("click", () => {
    if (!editingDate) return;
    data.shifts[editingDate] = {
      status: $("status").value,
      hours: Number($("sHours").value)||0,
      wage: Number($("sWage").value)||0,
      transport: Number($("sTransport").value)||0,
      overtime: Number($("sOt").value)||0,
      otPerMin: Number(data.settings.ot)||0
    };
    saveData();
    closeModal("shiftModal");
    renderAll();
  });

  $("deleteShift").addEventListener("click", () => {
    if (!editingDate || !data.shifts[editingDate]) return;
    if (confirm("このシフトを削除しますか？")) {
      delete data.shifts[editingDate];
      saveData();
      closeModal("shiftModal");
      renderAll();
    }
  });

  $("saveSettings").addEventListener("click", () => {
    data.settings = {
      jobName: $("jobName").value.trim(),
      wage: Number($("wage").value)||0,
      hours: Number($("hours").value)||0,
      transport: Number($("transport").value)||0,
      ot: Number($("ot").value)||0,
      startMoney: Number($("startMoney").value)||0
    };
    saveData();
    renderAll();
    alert("設定を保存しました。");
  });

  $("addExpense").addEventListener("click", () => {
    $("eDate").value = dateKey(new Date());
    $("eAmount").value = "";
    $("eName").value = "";
    $("expenseModal").classList.remove("hidden");
  });

  $("saveExpense").addEventListener("click", () => {
    const amount = Number($("eAmount").value)||0;
    if (!$("eDate").value || amount <= 0) {
      alert("日付と金額を入力してください。");
      return;
    }
    data.expenses.push({
      date: $("eDate").value,
      amount,
      name: $("eName").value.trim()
    });
    saveData();
    closeModal("expenseModal");
    renderAll();
  });

  $("clear").addEventListener("click", () => {
    if (confirm("すべてのデータを削除しますか？")) {
      data = structuredClone(DEFAULTS);
      saveData();
      renderAll();
    }
  });
}

function removeOldServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations()
    .then(regs => Promise.all(regs.map(reg => reg.unregister())))
    .catch(err => console.warn("Service Worker解除失敗", err));
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  renderAll();
  removeOldServiceWorkers();
});
})();
