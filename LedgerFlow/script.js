
const LS_KEYS = {
  clients: "ledgerflow_clients_v1",
  draft: "ledgerflow_invoice_draft_v1",
};

const $ = (id) => document.getElementById(id);

function nowIsoDate() {
  const d = new Date();
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

function isoDatePlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadClients() {
  return safeParse(localStorage.getItem(LS_KEYS.clients) || "[]", []);
}

function saveClients(clients) {
  localStorage.setItem(LS_KEYS.clients, JSON.stringify(clients));
}

function loadDraft() {
  return safeParse(localStorage.getItem(LS_KEYS.draft) || "null", null);
}

function saveDraft(draft) {
  localStorage.setItem(LS_KEYS.draft, JSON.stringify(draft));
}

function setStatus(el, text, kind = "") {
  el.textContent = text || "";
  el.classList.remove("ok", "warn", "bad");
  if (kind) el.classList.add(kind);
}

function money(n) {
  const x = Number.isFinite(n) ? n : 0;
  return x.toFixed(2);
}

function getNumber(id) {
  const v = Number.parseFloat($(id).value);
  return Number.isFinite(v) ? v : 0;
}

function encodeState(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return b64;
}

function decodeState(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLen);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

function activePanelId() {
  if ($("panelInvoice") && !$("panelInvoice").hidden) return "panelInvoice";
  if ($("panelClients") && !$("panelClients").hidden) return "panelClients";
  return "panelExport";
}

function setTab(panelId) {
  const panels = ["panelInvoice", "panelClients", "panelExport"];
  const tabs = {
    panelInvoice: "tabInvoice",
    panelClients: "tabClients",
    panelExport: "tabExport",
  };

  for (const p of panels) $(p).hidden = p !== panelId;
  for (const [p, t] of Object.entries(tabs)) $(t).setAttribute("aria-selected", p === panelId ? "true" : "false");

  if (panelId === "panelExport") renderPreview();
}

function defaultInvoiceNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `INV-${y}${m}${day}-001`;
}

function getInvoiceState() {
  const clients = loadClients();
  const selectedClientId = $("clientSelect").value || "";
  const client = clients.find((c) => c.id === selectedClientId) || null;

  const items = [];
  for (const row of $("itemsBody").querySelectorAll("tr")) {
    const desc = row.querySelector("[data-field='desc']").value.trim();
    const qty = Number.parseFloat(row.querySelector("[data-field='qty']").value);
    const unit = Number.parseFloat(row.querySelector("[data-field='unit']").value);
    items.push({
      desc,
      qty: Number.isFinite(qty) ? qty : 0,
      unitPrice: Number.isFinite(unit) ? unit : 0,
    });
  }

  return {
    from: {
      name: $("fromName").value.trim(),
      email: $("fromEmail").value.trim(),
      address: $("fromAddress").value.trim(),
    },
    invoice: {
      number: $("invoiceNumber").value.trim(),
      issueDate: $("issueDate").value || "",
      dueDate: $("dueDate").value || "",
      currency: $("currency").value || "USD",
      taxRate: getNumber("taxRate"),
      discount: getNumber("discount"),
      notes: $("notes").value.trim(),
    },
    client,
    items,
  };
}

function setInvoiceState(state) {
  const from = state?.from || {};
  $("fromName").value = from.name || "";
  $("fromEmail").value = from.email || "";
  $("fromAddress").value = from.address || "";

  const inv = state?.invoice || {};
  $("invoiceNumber").value = inv.number || "";
  $("issueDate").value = inv.issueDate || "";
  $("dueDate").value = inv.dueDate || "";
  $("currency").value = inv.currency || "USD";
  $("taxRate").value = Number.isFinite(inv.taxRate) ? String(inv.taxRate) : "";
  $("discount").value = Number.isFinite(inv.discount) ? String(inv.discount) : "";
  $("notes").value = inv.notes || "";

  $("itemsBody").innerHTML = "";
  const items = Array.isArray(state?.items) ? state.items : [];
  for (const item of items) addItemRow(item);
  if (items.length === 0) addItemRow({ desc: "", qty: 1, unitPrice: 0 });

  renderClientsDropdown(state?.client?.id || "");
  recalcTotals();
}

function renderClientsDropdown(selectId = "") {
  const clients = loadClients();
  const select = $("clientSelect");
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = clients.length ? "Select a client…" : "No clients yet — add one";
  select.appendChild(placeholder);

  for (const c of clients) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name || "(Unnamed client)";
    select.appendChild(opt);
  }

  select.value = selectId && clients.some((c) => c.id === selectId) ? selectId : "";
}

function renderClientsTable() {
  const clients = loadClients();
  const body = $("clientsBody");
  body.innerHTML = "";

  if (clients.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" class="muted">No clients saved yet.</td>`;
    body.appendChild(tr);
    return;
  }

  for (const c of clients) {
    const tr = document.createElement("tr");
    const email = c.email ? `<div class="mini">${escapeHtml(c.email)}</div>` : `<div class="mini muted">—</div>`;
    tr.innerHTML = `
      <td>
        <div><strong>${escapeHtml(c.name || "(Unnamed)")}</strong></div>
        ${c.phone ? `<div class="mini">${escapeHtml(c.phone)}</div>` : `<div class="mini muted">—</div>`}
      </td>
      <td>${email}</td>
      <td class="right">
        <button class="btn" data-action="edit" data-id="${c.id}" type="button">Edit</button>
        <button class="btn danger" data-action="delete" data-id="${c.id}" type="button">Delete</button>
      </td>
    `;
    body.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearClientForm() {
  $("clientId").value = "";
  $("clientName").value = "";
  $("clientEmail").value = "";
  $("clientPhone").value = "";
  $("clientAddress").value = "";
}

function saveClientFromForm() {
  const name = $("clientName").value.trim();
  const email = $("clientEmail").value.trim();
  const phone = $("clientPhone").value.trim();
  const address = $("clientAddress").value.trim();
  const id = $("clientId").value || uid("client");

  if (!name) return { ok: false, message: "Client name is required." };

  const clients = loadClients();
  const existingIndex = clients.findIndex((c) => c.id === id);
  const client = { id, name, email, phone, address };

  if (existingIndex >= 0) clients[existingIndex] = client;
  else clients.unshift(client);

  saveClients(clients);
  return { ok: true, client };
}

function addItemRow(item = { desc: "", qty: 1, unitPrice: 0 }) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input data-field="desc" placeholder="e.g., Design work" value="${escapeHtml(item.desc || "")}" /></td>
    <td class="right"><input data-field="qty" type="number" min="0" step="0.01" value="${Number.isFinite(item.qty) ? item.qty : 0}" /></td>
    <td class="right"><input data-field="unit" type="number" min="0" step="0.01" value="${Number.isFinite(item.unitPrice) ? item.unitPrice : 0}" /></td>
    <td class="right mono" data-field="amount">0.00</td>
    <td class="right"><button class="btn danger" data-action="removeItem" type="button">✕</button></td>
  `;

  tr.addEventListener("input", () => {
    recalcTotals();
    if (activePanelId() === "panelExport") renderPreview();
  });

  tr.querySelector("[data-action='removeItem']").addEventListener("click", () => {
    tr.remove();
    if ($("itemsBody").querySelectorAll("tr").length === 0) addItemRow({ desc: "", qty: 1, unitPrice: 0 });
    recalcTotals();
    if (activePanelId() === "panelExport") renderPreview();
  });

  $("itemsBody").appendChild(tr);
  recalcTotals();
}

function recalcTotals() {
  let subtotal = 0;
  for (const row of $("itemsBody").querySelectorAll("tr")) {
    const qty = Number.parseFloat(row.querySelector("[data-field='qty']").value);
    const unit = Number.parseFloat(row.querySelector("[data-field='unit']").value);
    const amount = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(unit) ? unit : 0);
    subtotal += amount;
    row.querySelector("[data-field='amount']").textContent = money(amount);
  }

  const taxRate = getNumber("taxRate");
  const discount = getNumber("discount");
  const tax = subtotal * (taxRate / 100);
  const total = Math.max(0, subtotal + tax - discount);

  $("subtotalText").textContent = money(subtotal);
  $("taxText").textContent = money(tax);
  $("discountText").textContent = money(discount);
  $("totalText").textContent = money(total);
  $("itemsCount").textContent = String($("itemsBody").querySelectorAll("tr").length);
}

function renderPreview() {
  const state = getInvoiceState();
  const currency = state.invoice.currency || "USD";

  let subtotal = 0;
  const itemsRows = state.items
    .map((it) => {
      const qty = Number.isFinite(it.qty) ? it.qty : 0;
      const unit = Number.isFinite(it.unitPrice) ? it.unitPrice : 0;
      const amt = qty * unit;
      subtotal += amt;
      return `
        <tr>
          <td>${escapeHtml(it.desc || "")}</td>
          <td class="t-right">${escapeHtml(qty)}</td>
          <td class="t-right">${escapeHtml(currency)} ${money(unit)}</td>
          <td class="t-right">${escapeHtml(currency)} ${money(amt)}</td>
        </tr>
      `;
    })
    .join("");

  const tax = subtotal * ((Number.isFinite(state.invoice.taxRate) ? state.invoice.taxRate : 0) / 100);
  const discount = Number.isFinite(state.invoice.discount) ? state.invoice.discount : 0;
  const total = Math.max(0, subtotal + tax - discount);

  const fromBlock = [
    state.from.name,
    state.from.email,
    state.from.address,
  ]
    .filter(Boolean)
    .map((s) => `<div>${escapeHtml(s).replaceAll("\n", "<br/>")}</div>`)
    .join("");

  const clientBlock = state.client
    ? [state.client.name, state.client.email, state.client.phone, state.client.address]
        .filter(Boolean)
        .map((s) => `<div>${escapeHtml(s).replaceAll("\n", "<br/>")}</div>`)
        .join("")
    : `<div class="muted2">No client selected</div>`;

  const notes = state.invoice.notes ? `<div class="hr"></div><div class="muted2">Notes</div><div>${escapeHtml(state.invoice.notes).replaceAll("\n", "<br/>")}</div>` : "";

  const html = `
    <article class="invoice" id="invoicePreviewRoot" aria-label="Invoice preview">
      <div class="pad">
        <div class="meta">
          <div>
            <div class="muted2">From</div>
            ${fromBlock || `<div class="muted2">—</div>`}
          </div>
          <div>
            <div class="big">Invoice</div>
            <div class="muted2">Invoice #</div>
            <div class="mono">${escapeHtml(state.invoice.number || "—")}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
              <div>
                <div class="muted2">Issue date</div>
                <div class="mono">${escapeHtml(state.invoice.issueDate || "—")}</div>
              </div>
              <div>
                <div class="muted2">Due date</div>
                <div class="mono">${escapeHtml(state.invoice.dueDate || "—")}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="hr"></div>
        <div class="muted2">Bill to</div>
        ${clientBlock}

        <div class="hr"></div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="t-right">Qty</th>
              <th class="t-right">Unit</th>
              <th class="t-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || `<tr><td colspan="4" class="muted2">No items</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="sum">
        <div class="line"><span>Subtotal</span><span class="mono">${escapeHtml(currency)} ${money(subtotal)}</span></div>
        <div class="line"><span>Tax</span><span class="mono">${escapeHtml(currency)} ${money(tax)}</span></div>
        <div class="line"><span>Discount</span><span class="mono">${escapeHtml(currency)} ${money(discount)}</span></div>
        <div class="line total"><span>Total</span><span class="mono">${escapeHtml(currency)} ${money(total)}</span></div>
      </div>
      <div class="foot">
        ${notes}
      </div>
    </article>
  `;

  $("previewMount").innerHTML = html;
}

function buildSharePayload() {
  const state = getInvoiceState();
  const payload = {
    v: 1,
    generatedAt: new Date().toISOString(),
    state,
  };
  return payload;
}

async function copyShareLink() {
  const payload = buildSharePayload();
  const encoded = encodeState(payload);
  const base = location.href.split("#")[0];
  const url = `${base}#data=${encoded}`;

  try {
    await navigator.clipboard.writeText(url);
    setStatus($("exportStatus"), "Link copied to clipboard.", "ok");
  } catch {
    window.prompt("Copy this link:", url);
    setStatus($("exportStatus"), "Copy the link from the prompt.", "warn");
  }
}

function loadFromHash() {
  const hash = location.hash || "";
  const m = hash.match(/data=([^&]+)/);
  if (!m) return { ok: false, message: "No invoice data found in this link." };

  try {
    const payload = decodeState(m[1]);
    if (!payload || payload.v !== 1 || !payload.state) return { ok: false, message: "Invalid invoice link." };
    return { ok: true, payload };
  } catch {
    return { ok: false, message: "Could not decode invoice link." };
  }
}

function applyPayloadToUI(payload) {
  const state = payload?.state;
  if (!state) return;

  const clients = loadClients();
  const linkClient = state.client;

  if (linkClient && linkClient.id) {
    const exists = clients.some((c) => c.id === linkClient.id);
    if (!exists) {
      clients.unshift(linkClient);
      saveClients(clients);
    }
  }

  setInvoiceState(state);
  setStatus($("exportStatus"), "Loaded invoice from link.", "ok");
}

function printInvoice() {
  renderPreview();
  const preview = $("invoicePreviewRoot");
  if (!preview) {
    setStatus($("exportStatus"), "Nothing to print yet.", "warn");
    return;
  }

  const state = getInvoiceState();
  const title = `Invoice ${state.invoice.number || ""}`.trim() || "Invoice";

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    setStatus($("exportStatus"), "Popup blocked. Allow popups to print.", "bad");
    return;
  }

  const doc = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          body{margin:0;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff}
          .invoice{max-width:900px;margin:0 auto}
          .invoice{background:#fff;color:#111;border-radius:14px;overflow:hidden}
          .invoice .pad{padding:22px 22px 10px}
          .invoice h3{margin:0;font-size:16px}
          .invoice .meta{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}
          @media (min-width:720px){.invoice .meta{grid-template-columns:1fr 1fr}}
          .invoice .muted2{color:#666;font-size:12px}
          .invoice .big{font-size:28px;font-weight:800;letter-spacing:.2px}
          .invoice .hr{height:1px;background:#eee;margin:18px 0}
          .invoice table{width:100%;border-collapse:collapse}
          .invoice th,.invoice td{padding:10px;border-bottom:1px solid #eee;text-align:left}
          .invoice th{font-size:12px;color:#555;background:#fafafa}
          .invoice .t-right{text-align:right}
          .invoice .sum{display:grid;grid-template-columns:1fr;gap:10px;justify-items:end;padding:0 22px 22px}
          .invoice .sum .line{width:min(420px,100%);display:flex;justify-content:space-between;gap:14px;font-size:13px;color:#333}
          .invoice .sum .line.total{font-weight:800;font-size:15px;color:#111}
          .invoice .foot{padding:0 22px 22px;color:#444;font-size:12px}
          @media print{body{padding:0}}
        </style>
      </head>
      <body>
        ${preview.outerHTML}
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => window.print(), 50);
          });
        </script>
      </body>
    </html>
  `;

  w.document.open();
  w.document.write(doc);
  w.document.close();
  setStatus($("exportStatus"), "Print dialog opened (choose “Save as PDF”).", "ok");
}

function wireUI() {
  $("tabInvoice").addEventListener("click", () => setTab("panelInvoice"));
  $("tabClients").addEventListener("click", () => setTab("panelClients"));
  $("tabExport").addEventListener("click", () => setTab("panelExport"));

  $("goClientsBtn").addEventListener("click", () => setTab("panelClients"));
  $("backToInvoiceBtn").addEventListener("click", () => setTab("panelInvoice"));
  $("backToInvoiceBtn2").addEventListener("click", () => setTab("panelInvoice"));
  $("goExportBtn").addEventListener("click", () => setTab("panelExport"));

  $("addItemBtn").addEventListener("click", () => addItemRow({ desc: "", qty: 1, unitPrice: 0 }));

  $("currency").addEventListener("change", () => {
    recalcTotals();
    if (activePanelId() === "panelExport") renderPreview();
  });
  $("taxRate").addEventListener("input", () => {
    recalcTotals();
    if (activePanelId() === "panelExport") renderPreview();
  });
  $("discount").addEventListener("input", () => {
    recalcTotals();
    if (activePanelId() === "panelExport") renderPreview();
  });

  for (const id of ["fromName", "fromEmail", "fromAddress", "invoiceNumber", "issueDate", "dueDate", "notes", "clientSelect"]) {
    $(id).addEventListener("input", () => {
      if (activePanelId() === "panelExport") renderPreview();
    });
    $(id).addEventListener("change", () => {
      if (activePanelId() === "panelExport") renderPreview();
    });
  }

  $("saveDraftBtn").addEventListener("click", () => {
    saveDraft(getInvoiceState());
    setStatus($("draftStatus"), `Draft saved ${new Date().toLocaleString()}.`, "ok");
  });

  $("saveClientBtn").addEventListener("click", () => {
    const res = saveClientFromForm();
    if (!res.ok) {
      setStatus($("clientStatus"), res.message, "bad");
      return;
    }
    setStatus($("clientStatus"), "Client saved.", "ok");
    clearClientForm();
    renderClientsTable();
    renderClientsDropdown($("clientSelect").value);
  });

  $("clearClientBtn").addEventListener("click", () => {
    clearClientForm();
    setStatus($("clientStatus"), "", "");
  });

  $("clientsBody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    const clients = loadClients();
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    if (action === "edit") {
      $("clientId").value = client.id;
      $("clientName").value = client.name || "";
      $("clientEmail").value = client.email || "";
      $("clientPhone").value = client.phone || "";
      $("clientAddress").value = client.address || "";
      setStatus($("clientStatus"), "Editing client…", "warn");
      return;
    }

    if (action === "delete") {
      if (!window.confirm(`Delete client "${client.name}"?`)) return;
      const next = clients.filter((c) => c.id !== id);
      saveClients(next);
      renderClientsTable();
      renderClientsDropdown($("clientSelect").value);
      setStatus($("clientStatus"), "Client deleted.", "ok");
    }
  });

  $("copyLinkBtn").addEventListener("click", copyShareLink);
  $("loadLinkBtn").addEventListener("click", () => {
    const res = loadFromHash();
    if (!res.ok) {
      setStatus($("exportStatus"), res.message, "warn");
      return;
    }
    applyPayloadToUI(res.payload);
    renderClientsTable();
    renderClientsDropdown(res.payload.state?.client?.id || "");
    setTab("panelExport");
  });
  $("printPdfBtn").addEventListener("click", printInvoice);

  window.addEventListener("hashchange", () => {
    const res = loadFromHash();
    if (!res.ok) return;
    applyPayloadToUI(res.payload);
    renderClientsTable();
    renderClientsDropdown(res.payload.state?.client?.id || "");
    if (activePanelId() === "panelExport") renderPreview();
  });
}

function init() {
  renderClientsDropdown("");
  renderClientsTable();

  // Defaults
  $("issueDate").value = nowIsoDate();
  $("dueDate").value = isoDatePlusDays(7);
  $("invoiceNumber").value = defaultInvoiceNumber();
  $("taxRate").value = "0";
  $("discount").value = "0";

  // Items
  addItemRow({ desc: "Service", qty: 1, unitPrice: 0 });

  // Draft from localStorage (if any)
  const draft = loadDraft();
  if (draft) {
    setInvoiceState(draft);
    setStatus($("draftStatus"), "Draft loaded from this browser.", "ok");
  }

  // Draft from link (hash) takes precedence
  const fromLink = loadFromHash();
  if (fromLink.ok) {
    applyPayloadToUI(fromLink.payload);
    setStatus($("draftStatus"), "Loaded from share link.", "ok");
  }

  wireUI();
  recalcTotals();
  renderPreview();
}

document.addEventListener("DOMContentLoaded", init);