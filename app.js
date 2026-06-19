/* XMA Client System — single-file vanilla JS app, localStorage-backed.
   State: { clients: [...], faults: [...] }
   Each client: { id, name, salesRep, createdAt, intake, scopeLock, discovery, delivery, satisfaction }
*/

// ---------- STATE ----------
const STORAGE_KEY = "xma_client_system_v1";

const state = {
  clients: [],
  faults: [],
  activeClientId: null,
  activeTab: "clients",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.clients = data.clients || [];
    state.faults = data.faults || [];
    state.activeClientId = data.activeClientId || null;
  } catch (e) {
    console.error("Failed to load state:", e);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    clients: state.clients,
    faults: state.faults,
    activeClientId: state.activeClientId,
  }));
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function activeClient() {
  return state.clients.find(c => c.id === state.activeClientId);
}

// ---------- DEEP GET/SET (for dotted data-field paths) ----------
function dget(obj, path) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}
function dset(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ---------- TAB NAVIGATION ----------
const tabs = document.querySelectorAll(".tab");
tabs.forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));

function switchTab(tabId) {
  state.activeTab = tabId;
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
  document.querySelectorAll(".view").forEach(v => {
    v.hidden = v.id !== "view-" + tabId;
  });
  // Re-render whichever view we entered
  if (tabId === "clients") renderClients();
  else if (tabId === "intake") renderIntake();
  else if (tabId === "scope-lock") renderScopeLock();
  else if (tabId === "discovery") renderClientForm("discovery");
  else if (tabId === "delivery") renderDelivery();
  else if (tabId === "satisfaction") renderClientForm("satisfaction");
  else if (tabId === "faults") renderFaults();
}

// ---------- TOP-BAR ACTIONS ----------
document.getElementById("exportAllBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ clients: state.clients, faults: state.faults }, null, 2)],
                       { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `xma-client-system-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});

document.getElementById("importBtn").addEventListener("click", () =>
  document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data.clients) state.clients = data.clients;
    if (data.faults) state.faults = data.faults;
    save(); switchTab(state.activeTab);
    alert("Imported.");
  } catch { alert("Could not parse that file."); }
});

document.getElementById("printBtn").addEventListener("click", () => window.print());

// ---------- CLIENTS DASHBOARD ----------
function stageProgress(c) {
  return {
    intake: !!(c.intake && c.intake.clientName),
    scope:  !!(c.scopeLock && c.scopeLock.signOps && c.scopeLock.signSales),
    discovery: !!(c.discovery && c.discovery.businessDesc),
    delivery: !!(c.delivery && c.delivery.items && c.delivery.items.some(i => i.status && i.status !== "Not started")),
    satisfaction: !!(c.satisfaction && c.satisfaction.s3Date),
  };
}

function renderClients() {
  const list = document.getElementById("clientList");
  const empty = document.getElementById("clientEmpty");
  list.innerHTML = "";
  if (state.clients.length === 0) { empty.style.display = ""; return; }
  empty.style.display = "none";
  state.clients.forEach(c => {
    const p = stageProgress(c);
    const stages = [
      ["1", "intake", p.intake],
      ["2", "scope", p.scope],
      ["3", "discovery", p.discovery],
      ["4", "delivery", p.delivery],
      ["5", "satisfaction", p.satisfaction],
    ];
    const card = document.createElement("div");
    card.className = "client-card";
    card.innerHTML = `
      <h3>${escapeHtml(c.name)}</h3>
      <div class="meta">Rep: ${escapeHtml(c.salesRep || "—")} · Created ${new Date(c.createdAt).toLocaleDateString()}</div>
      <div class="stages">
        ${stages.map(([n, key, done]) => `<span class="stage-dot ${done ? "done" : ""}" title="${key}">${n}</span>`).join("")}
      </div>
    `;
    card.addEventListener("click", () => {
      state.activeClientId = c.id; save();
      switchTab("intake");
    });
    list.appendChild(card);
  });
}

// ---------- NEW CLIENT MODAL ----------
const newClientModal = document.getElementById("newClientModal");
document.getElementById("newClientBtn").addEventListener("click", () => {
  document.getElementById("newClientName").value = "";
  document.getElementById("newClientRep").value = "";
  newClientModal.hidden = false;
  setTimeout(() => document.getElementById("newClientName").focus(), 50);
});
document.getElementById("cancelClientBtn").addEventListener("click", () => newClientModal.hidden = true);
document.getElementById("createClientBtn").addEventListener("click", () => {
  const name = document.getElementById("newClientName").value.trim();
  if (!name) return alert("Client name is required.");
  const c = {
    id: uid(),
    name,
    salesRep: document.getElementById("newClientRep").value.trim(),
    createdAt: new Date().toISOString(),
    intake: { clientName: name, services: {} },
    scopeLock: { items: {} },
    discovery: {},
    delivery: { items: [] },
    satisfaction: {},
  };
  state.clients.push(c);
  state.activeClientId = c.id;
  save();
  newClientModal.hidden = true;
  switchTab("intake");
});

// ---------- SALES INTAKE ----------
function renderIntake() {
  const c = activeClient();
  const label = document.getElementById("intakeClientLabel");
  if (!c) {
    label.textContent = "Pick a client on the Clients tab first →";
    document.getElementById("serviceSelectors").innerHTML = "";
    document.getElementById("serviceForms").innerHTML = "";
    return;
  }
  label.textContent = `Client: ${c.name}`;
  // populate generic intake fields
  bindFields(document.getElementById("view-intake"), c);

  // service selector grid
  const grid = document.getElementById("serviceSelectors");
  grid.innerHTML = "";
  const selected = c.intake.services || (c.intake.services = {});
  Object.entries(XMA_SERVICES).forEach(([key, svc]) => {
    const wrap = document.createElement("label");
    wrap.className = "service-toggle" + (selected[key] ? " checked" : "");
    wrap.innerHTML = `<input type="checkbox" ${selected[key] ? "checked" : ""}/> <span>${svc.label} <small style="color:#9ca3af">· ${svc.category}</small></span>`;
    wrap.querySelector("input").addEventListener("change", e => {
      if (e.target.checked) selected[key] = selected[key] || {};
      else delete selected[key];
      wrap.classList.toggle("checked", e.target.checked);
      save();
      renderServiceForms();
    });
    grid.appendChild(wrap);
  });

  renderServiceForms();
}

function renderServiceForms() {
  const c = activeClient(); if (!c) return;
  const root = document.getElementById("serviceForms");
  root.innerHTML = "";
  const selected = c.intake.services || {};
  Object.keys(selected).forEach(key => {
    const svc = XMA_SERVICES[key]; if (!svc) return;
    const card = document.createElement("div");
    card.className = "service-card";
    card.innerHTML = `<h3>${svc.label} <span class="pill pill-info">${svc.category}</span></h3>`;
    const wrap = document.createElement("div");
    svc.fields.forEach(f => {
      const row = document.createElement("div"); row.className = "row";
      const lab = document.createElement("label");
      const valRef = selected[key]; // object
      lab.appendChild(document.createTextNode(f.label));
      let input;
      if (f.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 2;
      } else if (f.type === "select") {
        input = document.createElement("select");
        input.innerHTML = `<option value="">—</option>` + f.options.map(o => `<option>${o}</option>`).join("");
      } else {
        input = document.createElement("input");
        input.type = f.type === "number" ? "number" : "text";
        if (f.placeholder) input.placeholder = f.placeholder;
      }
      input.value = valRef[f.key] ?? "";
      input.addEventListener("input", () => { valRef[f.key] = input.value; save(); });
      lab.appendChild(input);
      row.appendChild(lab);
      wrap.appendChild(row);
    });
    // promised delivery date for the whole service
    const dRow = document.createElement("div"); dRow.className = "row";
    const dLab = document.createElement("label");
    dLab.appendChild(document.createTextNode("Promised delivery / start date"));
    const dInp = document.createElement("input"); dInp.type = "date";
    dInp.value = selected[key]._promisedDate || "";
    dInp.addEventListener("input", () => { selected[key]._promisedDate = dInp.value; save(); });
    dLab.appendChild(dInp); dRow.appendChild(dLab); wrap.appendChild(dRow);

    card.appendChild(wrap);
    root.appendChild(card);
  });
}

document.getElementById("saveIntakeBtn").addEventListener("click", () => {
  const c = activeClient();
  if (!c) return alert("No client selected.");
  save();
  alert("Intake saved. Now go to Ops Sign-Off →");
  switchTab("scope-lock");
});

// ---------- OPS SCOPE LOCK ----------
function renderScopeLock() {
  const c = activeClient();
  const label = document.getElementById("scopeClientLabel");
  if (!c) { label.textContent = "Pick a client →"; document.getElementById("scopeReviewList").innerHTML = ""; return; }
  label.textContent = `Client: ${c.name}`;
  bindFields(document.getElementById("view-scope-lock"), c);

  const root = document.getElementById("scopeReviewList");
  root.innerHTML = "";

  const services = c.intake.services || {};
  if (Object.keys(services).length === 0) {
    root.innerHTML = `<div class="empty">No services found in intake. Complete <b>Sales Intake</b> first.</div>`;
    return;
  }

  c.scopeLock.items = c.scopeLock.items || {};

  Object.keys(services).forEach(key => {
    const svc = XMA_SERVICES[key]; if (!svc) return;
    const itemState = (c.scopeLock.items[key] = c.scopeLock.items[key] || { feasibility: "", opsTimeline: "", concerns: "", adjustments: "" });
    const card = document.createElement("div");
    card.className = "scope-item";
    const promised = svc.fields.map(f => {
      const v = services[key][f.key];
      if (!v) return null;
      return `<div><b>${f.label}:</b> ${escapeHtml(String(v))}</div>`;
    }).filter(Boolean).join("");
    const promisedDate = services[key]._promisedDate ? `<div><b>Promised delivery:</b> ${services[key]._promisedDate}</div>` : "";

    card.innerHTML = `
      <div class="si-head">
        <div><b>${svc.label}</b> <span class="pill pill-info">${svc.category}</span></div>
      </div>
      <div class="si-promised">${promised || "(no detail provided)"}${promisedDate}</div>
      <div class="feasibility-options">
        <label class="f-ok ${itemState.feasibility === "ok" ? "checked" : ""}">
          <input type="radio" name="f-${key}" value="ok" ${itemState.feasibility === "ok" ? "checked" : ""}/> Feasible as sold
        </label>
        <label class="f-warn ${itemState.feasibility === "warn" ? "checked" : ""}">
          <input type="radio" name="f-${key}" value="warn" ${itemState.feasibility === "warn" ? "checked" : ""}/> Risky — needs adjustment
        </label>
        <label class="f-bad ${itemState.feasibility === "bad" ? "checked" : ""}">
          <input type="radio" name="f-${key}" value="bad" ${itemState.feasibility === "bad" ? "checked" : ""}/> Not as sold — renegotiate
        </label>
      </div>
      <div class="row">
        <label>Ops realistic timeline <input class="ops-tl" value="${escapeAttr(itemState.opsTimeline)}" placeholder="e.g. 4 weeks not 2" /></label>
        <label>Resource / capacity concerns <input class="ops-cn" value="${escapeAttr(itemState.concerns)}" /></label>
      </div>
      <label>Required scope adjustments before client signs
        <textarea class="ops-adj" rows="2">${escapeHtml(itemState.adjustments)}</textarea>
      </label>
    `;
    // wire inputs
    card.querySelectorAll(`input[name="f-${key}"]`).forEach(r => {
      r.addEventListener("change", () => {
        itemState.feasibility = r.value;
        save();
        renderScopeLock();
      });
    });
    card.querySelector(".ops-tl").addEventListener("input", e => { itemState.opsTimeline = e.target.value; save(); });
    card.querySelector(".ops-cn").addEventListener("input", e => { itemState.concerns = e.target.value; save(); });
    card.querySelector(".ops-adj").addEventListener("input", e => { itemState.adjustments = e.target.value; save(); });

    root.appendChild(card);
  });

  // Show whether scope can lock
  const items = Object.values(c.scopeLock.items);
  const hasBad = items.some(i => i.feasibility === "bad");
  const hasIncomplete = items.some(i => !i.feasibility);
  const banner = document.createElement("div");
  banner.className = "callout " + (hasBad ? "callout-warn" : "");
  banner.innerHTML = hasBad
    ? `🚫 <b>Scope BLOCKED.</b> One or more items are marked "Not as sold". Renegotiate with the client and update the intake before locking.`
    : hasIncomplete
      ? `⏳ Mark every service above as Feasible / Risky / Not as sold to proceed.`
      : `✅ <b>All items reviewed.</b> Sign off below to lock scope.`;
  root.appendChild(banner);
}

document.getElementById("saveScopeBtn").addEventListener("click", () => {
  const c = activeClient(); if (!c) return;
  save();
  alert("Scope lock saved.");
});

// ---------- DISCOVERY & SATISFACTION (generic bind) ----------
function renderClientForm(section) {
  const c = activeClient();
  const labelEl = document.getElementById(section + "ClientLabel");
  if (!c) { if (labelEl) labelEl.textContent = "Pick a client →"; return; }
  if (labelEl) labelEl.textContent = `Client: ${c.name}`;
  bindFields(document.getElementById("view-" + section), c);
}

document.getElementById("saveDiscoveryBtn").addEventListener("click", () => { save(); alert("Discovery saved."); });
document.getElementById("saveSatisfactionBtn").addEventListener("click", () => { save(); alert("Satisfaction saved."); });

// ---------- DELIVERY TRACKER ----------
function renderDelivery() {
  const c = activeClient();
  const label = document.getElementById("deliveryClientLabel");
  if (!c) { label.textContent = "Pick a client →"; document.getElementById("deliveryItems").innerHTML = ""; return; }
  label.textContent = `Client: ${c.name}`;
  bindFields(document.getElementById("view-delivery"), c);

  // Build delivery items list from intake services if not yet built
  const services = c.intake.services || {};
  c.delivery.items = c.delivery.items || [];
  // make sure every selected service has at least one delivery item
  Object.keys(services).forEach(key => {
    const exists = c.delivery.items.find(it => it.serviceKey === key);
    if (!exists) {
      const svc = XMA_SERVICES[key];
      c.delivery.items.push({
        id: uid(),
        serviceKey: key,
        title: svc.label,
        promised: summarizePromise(services[key], svc),
        promisedDate: services[key]._promisedDate || "",
        status: "Not started",
        deviation: "",
        fix: "",
      });
    }
  });

  const root = document.getElementById("deliveryItems");
  root.innerHTML = "";
  c.delivery.items.forEach(item => {
    const card = document.createElement("div");
    card.className = "delivery-item";
    card.innerHTML = `
      <div class="di-head">
        <div>
          <div class="di-title">${escapeHtml(item.title)}</div>
          <div class="di-promised"><b>Promised:</b> ${escapeHtml(item.promised || "—")} ${item.promisedDate ? "· by " + item.promisedDate : ""}</div>
        </div>
        <div>
          <select class="di-status">
            ${["Not started","On track","At risk","Delayed","Delivered","Over-delivered","Cut from scope"].map(s =>
              `<option ${item.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="row">
        <label>If deviating from promise, why?
          <textarea class="di-dev" rows="2">${escapeHtml(item.deviation || "")}</textarea>
        </label>
        <label>What we're doing about it
          <textarea class="di-fix" rows="2">${escapeHtml(item.fix || "")}</textarea>
        </label>
      </div>
    `;
    card.querySelector(".di-status").addEventListener("change", e => { item.status = e.target.value; save(); });
    card.querySelector(".di-dev").addEventListener("input", e => { item.deviation = e.target.value; save(); });
    card.querySelector(".di-fix").addEventListener("input", e => { item.fix = e.target.value; save(); });
    root.appendChild(card);
  });
}

document.getElementById("saveDeliveryBtn").addEventListener("click", () => { save(); alert("Delivery state saved."); });

function summarizePromise(svcData, svc) {
  // Quick 1-line summary from the most important fields
  const parts = [];
  if (svcData.qty) parts.push(`${svcData.qty} units`);
  if (svcData.length) parts.push(svcData.length);
  if (svcData.platform) parts.push(svcData.platform);
  if (svcData.pages) parts.push(`${svcData.pages} pages`);
  if (svcData.monthlySpend) parts.push(`$${svcData.monthlySpend}/mo ad spend`);
  if (svcData.revisions) parts.push(`${svcData.revisions} revisions`);
  if (svcData.timeline) parts.push(`${svcData.timeline} weeks`);
  return parts.join(" · ") || "(see intake for detail)";
}

// ---------- TEAM FAULTS ----------
const faultModal = document.getElementById("newFaultModal");
document.getElementById("newFaultBtn").addEventListener("click", () => openFaultModal());
document.getElementById("cancelFaultBtn").addEventListener("click", () => faultModal.hidden = true);
document.getElementById("deleteFaultBtn").addEventListener("click", () => {
  const id = document.getElementById("faultEditId").value;
  if (!id) return;
  if (!confirm("Delete this fault entry?")) return;
  state.faults = state.faults.filter(f => f.id !== id);
  save(); faultModal.hidden = true; renderFaults();
});
document.getElementById("saveFaultBtn").addEventListener("click", () => {
  const id = document.getElementById("faultEditId").value;
  const f = {
    id: id || uid(),
    title:    document.getElementById("faultTitle").value.trim(),
    date:     document.getElementById("faultDate").value,
    category: document.getElementById("faultCategory").value,
    severity: document.getElementById("faultSeverity").value,
    status:   document.getElementById("faultStatus").value,
    owner:    document.getElementById("faultOwner").value.trim(),
    clientId: document.getElementById("faultClientLink").value || null,
    what:     document.getElementById("faultWhat").value,
    root:     document.getElementById("faultRoot").value,
    fix:      document.getElementById("faultFix").value,
    lesson:   document.getElementById("faultLesson").value,
  };
  if (!f.title) return alert("Title is required.");
  if (id) state.faults = state.faults.map(x => x.id === id ? f : x);
  else state.faults.push(f);
  save(); faultModal.hidden = true; renderFaults();
});

function openFaultModal(fault) {
  document.getElementById("faultModalTitle").textContent = fault ? "Edit fault" : "Log a fault";
  document.getElementById("faultEditId").value = fault?.id || "";
  document.getElementById("faultTitle").value = fault?.title || "";
  document.getElementById("faultDate").value = fault?.date || new Date().toISOString().slice(0,10);
  document.getElementById("faultCategory").value = fault?.category || "Sales over-promise";
  document.getElementById("faultSeverity").value = fault?.severity || "Medium (client noticed)";
  document.getElementById("faultStatus").value = fault?.status || "Open";
  document.getElementById("faultOwner").value = fault?.owner || "";
  document.getElementById("faultWhat").value = fault?.what || "";
  document.getElementById("faultRoot").value = fault?.root || "";
  document.getElementById("faultFix").value = fault?.fix || "";
  document.getElementById("faultLesson").value = fault?.lesson || "";
  // client link
  const sel = document.getElementById("faultClientLink");
  sel.innerHTML = `<option value="">—</option>` +
    state.clients.map(c => `<option value="${c.id}" ${fault?.clientId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("");
  document.getElementById("deleteFaultBtn").hidden = !fault;
  faultModal.hidden = false;
}

document.getElementById("faultFilterCat").addEventListener("change", renderFaults);
document.getElementById("faultFilterStatus").addEventListener("change", renderFaults);

function renderFaults() {
  const list = document.getElementById("faultList");
  const empty = document.getElementById("faultEmpty");
  const cat = document.getElementById("faultFilterCat").value;
  const status = document.getElementById("faultFilterStatus").value;
  let items = [...state.faults].sort((a,b) => (b.date || "").localeCompare(a.date || ""));
  if (cat) items = items.filter(f => f.category === cat);
  if (status) items = items.filter(f => f.status === status);
  list.innerHTML = "";
  if (items.length === 0) { empty.style.display = ""; return; }
  empty.style.display = "none";

  items.forEach(f => {
    const sevClass = f.severity?.startsWith("Critical") || f.severity?.startsWith("High") ? "pill-bad"
                    : f.severity?.startsWith("Medium") ? "pill-warn" : "pill-muted";
    const statClass = f.status === "Resolved" ? "pill-ok" : f.status === "In progress" ? "pill-info" : "pill-warn";
    const client = state.clients.find(c => c.id === f.clientId);
    const card = document.createElement("div");
    card.className = "fault-card";
    card.innerHTML = `
      <div class="ftitle">${escapeHtml(f.title)}</div>
      <div class="fmeta">
        <span class="pill pill-info">${escapeHtml(f.category)}</span>
        <span class="pill ${sevClass}">${escapeHtml(f.severity || "")}</span>
        <span class="pill ${statClass}">${escapeHtml(f.status || "")}</span>
        ${client ? `<span class="pill pill-muted">${escapeHtml(client.name)}</span>` : ""}
      </div>
      <div class="fbody">${escapeHtml((f.root || f.what || "").slice(0, 140))}</div>
    `;
    card.addEventListener("click", () => openFaultModal(f));
    list.appendChild(card);
  });
}

// ---------- GENERIC FIELD BINDING (data-field attr) ----------
function bindFields(root, obj) {
  root.querySelectorAll("[data-field]").forEach(el => {
    const path = el.dataset.field;
    const val = dget(obj, path);
    if (el.type === "checkbox") {
      el.checked = !!val;
    } else {
      el.value = val ?? "";
    }
    if (!el._bound) {
      el._bound = true;
      el.addEventListener("input", () => {
        const v = el.type === "checkbox" ? el.checked
                  : el.type === "number" ? (el.value === "" ? "" : Number(el.value))
                  : el.value;
        dset(obj, path, v);
        save();
      });
      el.addEventListener("change", () => {
        const v = el.type === "checkbox" ? el.checked : el.value;
        dset(obj, path, v);
        save();
      });
    }
  });
}

// ---------- ESCAPING ----------
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }

// ---------- INIT ----------
load();
switchTab(state.activeTab || "clients");
