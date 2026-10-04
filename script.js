/* =====================================================
   ANGKRINGAN POS — Local Storage App (v7)
   + Hari bisnis (lewat tengah malam tetap 1 hari)
   + Bayar kasbon dengan kembalian
   + Filter kategori di Kelola Menu
   + Export CSV di Rekap
   + Pendapatan Lainnya via modal → masuk keranjang
   + Tombol hapus per item & hapus semua di tab Rekap
   ===================================================== */

const LS = {
  menu:  'angkringan.menu.v1',
  trx:   'angkringan.trx.v1',
  exp:   'angkringan.exp.v1',
  range: 'angkringan.range.v1',
  period:'angkringan.period.v1',
  close: 'angkringan.closeHour.v1'
};

const CATS = ['Makanan', 'Minuman', 'Rokok Bungkus', 'Rokok Ecer'];

const DEFAULT_MENU = [
  { id: 1,  name: 'Nasi Kucing',        cat: 'Makanan', price: 3000 },
  { id: 2,  name: 'Sate Usus',          cat: 'Makanan', price: 2000 },
  { id: 3,  name: 'Sate Telur Puyuh',   cat: 'Makanan', price: 2000 },
  { id: 4,  name: 'Tempe Bacem',        cat: 'Makanan', price: 1500 },
  { id: 5,  name: 'Tahu Bacem',         cat: 'Makanan', price: 1500 },
  { id: 6,  name: 'Ceker',              cat: 'Makanan', price: 2000 },
  { id: 7,  name: 'Bakwan',             cat: 'Makanan', price: 1000 },
  { id: 8,  name: 'Gorengan',           cat: 'Makanan', price: 1000 },
  { id: 9,  name: 'Sate Ayam',          cat: 'Makanan', price: 3000 },
  { id: 10, name: 'Indomie Goreng',     cat: 'Makanan', price: 5000 },
  { id: 11, name: 'Teh Panas',          cat: 'Minuman', price: 2000 },
  { id: 12, name: 'Es Teh',             cat: 'Minuman', price: 3000 },
  { id: 13, name: 'Kopi Hitam',         cat: 'Minuman', price: 3000 },
  { id: 14, name: 'Jeruk Panas',        cat: 'Minuman', price: 3000 },
  { id: 15, name: 'Es Jeruk',           cat: 'Minuman', price: 4000 },
  { id: 16, name: 'Air Mineral',        cat: 'Minuman', price: 3000 },
  { id: 17, name: 'Wedang Jahe',        cat: 'Minuman', price: 4000 },
  { id: 18, name: 'Susu Jahe',          cat: 'Minuman', price: 5000 },
  { id: 19, name: 'Gudang Garam Surya 12', cat: 'Rokok Bungkus', price: 28000 },
  { id: 20, name: 'Sampoerna Mild 16',     cat: 'Rokok Bungkus', price: 32000 },
  { id: 21, name: 'Djarum Super 12',       cat: 'Rokok Bungkus', price: 27000 },
  { id: 22, name: 'Marlboro Merah 20',     cat: 'Rokok Bungkus', price: 40000 },
  { id: 23, name: 'Surya 12 (ecer)',       cat: 'Rokok Ecer', price: 2000 },
  { id: 24, name: 'Sampoerna Mild (ecer)', cat: 'Rokok Ecer', price: 2500 },
  { id: 25, name: 'Djarum Super (ecer)',   cat: 'Rokok Ecer', price: 2000 },
  { id: 26, name: 'Marlboro (ecer)',       cat: 'Rokok Ecer', price: 2500 }
];

/* =============== STATE =============== */
let state = {
  menu: [],
  trx: [],
  exp: [],
  cart: [],
  activeCat: 'Makanan',
  menuFilter: 'all',
  period: 'today',
  payMethod: 'tunai',
  editingKasbonId: null,
  customStart: '',
  customEnd: ''
};

/* =============== HARI BISNIS =============== */
let CLOSE_HOUR = 4;
const pad2 = n => String(n).padStart(2, '0');

function businessDateOf(input) {
  const d = new Date(input);
  if (d.getHours() < CLOSE_HOUR) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function bdStart(dateStr) { return new Date(`${dateStr}T${pad2(CLOSE_HOUR)}:00:00`); }
function bdEnd(dateStr) {
  const d = bdStart(dateStr);
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - 1);
}
function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* =============== UTILS =============== */
const fmt = n => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
);
const roundUp = (n, step) => Math.ceil(Number(n) / step) * step;

function isRokokCat(cat) { return cat === 'Rokok Bungkus' || cat === 'Rokok Ecer'; }
function getItemCat(item) {
  if (item.cat) return item.cat;
  const m = state.menu.find(x => x.id === item.id);
  return m ? m.cat : null;
}

function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type === 'info' ? '' : type);
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 2400);
}

function todayStr() { return businessDateOf(new Date()); }

function formatDateTime(iso) {
  const d = new Date(iso);
  const z = n => String(n).padStart(2, '0');
  return `${z(d.getDate())}/${z(d.getMonth()+1)}/${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}`;
}
function formatDateLong(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}
function lateNightTag(iso) {
  if (new Date(iso).getHours() >= CLOSE_HOUR) return '';
  const bd = businessDateOf(iso);
  return ` · 🌙 hari bisnis ${formatDateLong(bd)}`;
}

/* =============== STORAGE =============== */
function loadAll() {
  try { state.menu = JSON.parse(localStorage.getItem(LS.menu)) || DEFAULT_MENU.slice(); }
  catch { state.menu = DEFAULT_MENU.slice(); }
  try { state.trx = JSON.parse(localStorage.getItem(LS.trx)) || []; }
  catch { state.trx = []; }
  try { state.exp = JSON.parse(localStorage.getItem(LS.exp)) || []; }
  catch { state.exp = []; }
}
const saveMenu = () => localStorage.setItem(LS.menu, JSON.stringify(state.menu));
const saveTrx  = () => localStorage.setItem(LS.trx,  JSON.stringify(state.trx));
const saveExp  = () => localStorage.setItem(LS.exp,  JSON.stringify(state.exp));

function saveRange() {
  localStorage.setItem(LS.range, JSON.stringify({ start: state.customStart, end: state.customEnd }));
}
function loadRange() {
  try {
    const r = JSON.parse(localStorage.getItem(LS.range));
    if (r) { state.customStart = r.start || ''; state.customEnd = r.end || ''; }
  } catch {}
}
const savePeriod = () => localStorage.setItem(LS.period, state.period);
function loadPeriod() { const p = localStorage.getItem(LS.period); if (p) state.period = p; }
const saveCloseHour = () => localStorage.setItem(LS.close, String(CLOSE_HOUR));
function loadCloseHour() {
  const v = Number(localStorage.getItem(LS.close));
  if (!Number.isNaN(v) && v >= 0 && v <= 12) CLOSE_HOUR = v;
}

/* =====================================================
   NAVIGASI TAB
   ===================================================== */
document.getElementById('nav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  const tab = btn.dataset.tab;

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + tab)
  );

  if (tab === 'kasir')       renderKasir();
  if (tab === 'kasbon')      renderKasbon();
  if (tab === 'rekap')       renderRekap();
  if (tab === 'pengeluaran') renderPengeluaran();
  if (tab === 'menu')        renderMenuManage();
});

/* =====================================================
   KASIR
   ===================================================== */
function renderCatTabs() {
  const el = document.getElementById('catTabs');
  el.innerHTML = CATS.map(c =>
    `<button class="cat-tab ${c === state.activeCat ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`
  ).join('');
}

function renderItemGrid() {
  const grid = document.getElementById('itemGrid');
  const items = state.menu.filter(m => m.cat === state.activeCat);
  if (!items.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">Belum ada item di kategori ini</div>`;
    return;
  }
  grid.innerHTML = items.map(m => `
    <button class="item-card" data-id="${m.id}">
      <div class="item-name">${esc(m.name)}</div>
      <div class="item-price">${fmt(m.price)}</div>
    </button>
  `).join('');
}

function totalCart() { return state.cart.reduce((s, c) => s + c.price * c.qty, 0); }

function renderCart() {
  const el = document.getElementById('cartItems');
  if (!state.cart.length) {
    el.innerHTML = `<div class="empty">Keranjang kosong</div>`;
  } else {
    el.innerHTML = state.cart.map((c, i) => {
      const badge = c.cat === 'Lainnya'
        ? '<span class="cat-badge-other">LAINNYA</span>' : '';
      return `
      <div class="cart-item">
        <div class="cart-info">
          <div class="cart-name">${esc(c.name)}${badge}</div>
          <div class="cart-price">${fmt(c.price)} × ${c.qty}</div>
        </div>
        <div class="cart-controls">
          <button class="qty-btn" data-act="dec" data-i="${i}">−</button>
          <span class="qty">${c.qty}</span>
          <button class="qty-btn" data-act="inc" data-i="${i}">+</button>
        </div>
        <div class="cart-sub">${fmt(c.price * c.qty)}</div>
        <button class="del-btn" data-act="del" data-i="${i}">✕</button>
      </div>`;
    }).join('');
  }
  document.getElementById('cartTotal').textContent = fmt(totalCart());
  updateChange();
}

function renderKasir() {
  renderCatTabs();
  renderItemGrid();
  renderCart();

  if (state.editingKasbonId) {
    const trx = state.trx.find(t => t.id === state.editingKasbonId);
    if (trx) {
      document.getElementById('kasbonEditBanner').style.display = 'flex';
      document.getElementById('kasbonEditText').textContent = `📝 Menambah item untuk kasbon: ${trx.customer}`;
      document.getElementById('btnKasbon').textContent = '💾 Simpan Perubahan';
    } else {
      cancelKasbonEdit();
    }
  } else {
    document.getElementById('kasbonEditBanner').style.display = 'none';
    document.getElementById('btnKasbon').textContent = '📝 Kasbon';
  }
}

document.getElementById('catTabs').addEventListener('click', e => {
  const btn = e.target.closest('.cat-tab');
  if (!btn) return;
  state.activeCat = btn.dataset.cat;
  renderCatTabs(); renderItemGrid();
});

document.getElementById('itemGrid').addEventListener('click', e => {
  const btn = e.target.closest('.item-card');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const item = state.menu.find(m => m.id === id);
  if (!item) return;

  const exist = state.cart.find(c => c.id === id);
  if (exist) exist.qty += 1;
  else state.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1, cat: item.cat });

  renderCart();
});

document.getElementById('cartItems').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const act = btn.dataset.act;

  if (act === 'inc') state.cart[i].qty += 1;
  if (act === 'dec') {
    state.cart[i].qty -= 1;
    if (state.cart[i].qty <= 0) state.cart.splice(i, 1);
  }
  if (act === 'del') state.cart.splice(i, 1);
  renderCart();
});

document.querySelectorAll('input[name="payMethod"]').forEach(r => {
  r.addEventListener('change', e => {
    state.payMethod = e.target.value;
    document.getElementById('cashBlock').style.display = state.payMethod === 'tunai' ? 'flex' : 'none';
    updateChange();
  });
});

document.getElementById('cashInput').addEventListener('input', updateChange);

function updateChange() {
  const total = totalCart();
  const cash = Number(document.getElementById('cashInput').value) || 0;
  const change = cash - total;
  const el = document.getElementById('changeDisplay');
  const row = document.getElementById('changeRow');

  if (cash === 0 || total === 0) {
    el.textContent = fmt(0);
    row.classList.remove('negative');
    return;
  }
  if (change < 0) {
    el.textContent = '-' + fmt(Math.abs(change));
    row.classList.add('negative');
  } else {
    el.textContent = fmt(change);
    row.classList.remove('negative');
  }
}

/* --- Bayar Lunas --- */
document.getElementById('btnBayar').addEventListener('click', () => {
  if (!state.cart.length) return toast('Keranjang masih kosong', 'error');

  const total = totalCart();
  const cust = document.getElementById('customerName').value.trim();
  const method = state.payMethod;

  let cash = total, change = 0;
  if (method === 'tunai') {
    cash = Number(document.getElementById('cashInput').value) || 0;
    if (cash < total) return toast('Uang tidak cukup!', 'error');
    change = cash - total;
  }

  if (state.editingKasbonId) {
    const trx = state.trx.find(t => t.id === state.editingKasbonId);
    if (trx) {
      trx.items = state.cart.map(c => ({ ...c }));
      trx.total = total;
      trx.status = 'paid';
      trx.paidAt = new Date().toISOString();
      trx.method = method;
      trx.cash = cash;
      trx.change = change;
    }
    state.editingKasbonId = null;
    document.getElementById('kasbonEditBanner').style.display = 'none';
    document.getElementById('btnKasbon').textContent = '📝 Kasbon';
    toast(`Kasbon lunas! Kembalian ${fmt(change)}`, 'success');
  } else {
    state.trx.unshift({
      id: uid(),
      date: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      status: 'paid',
      customer: cust || 'Pelanggan',
      items: state.cart.map(c => ({ ...c })),
      total, method, cash, change
    });
    toast(`Lunas! Kembalian ${fmt(change)}`, 'success');
  }

  saveTrx();
  state.cart = [];
  document.getElementById('customerName').value = '';
  document.getElementById('cashInput').value = '';
  renderCart();
  updateBadge();
});

/* --- Kasbon --- */
document.getElementById('btnKasbon').addEventListener('click', () => {
  if (!state.cart.length) return toast('Keranjang masih kosong', 'error');

  if (state.editingKasbonId) {
    const trx = state.trx.find(t => t.id === state.editingKasbonId);
    if (trx) {
      trx.items = state.cart.map(c => ({ ...c }));
      trx.total = totalCart();
      const newName = document.getElementById('customerName').value.trim();
      if (newName) trx.customer = newName;
    }
    saveTrx();
    state.editingKasbonId = null;
    document.getElementById('kasbonEditBanner').style.display = 'none';
    document.getElementById('btnKasbon').textContent = '📝 Kasbon';
    state.cart = [];
    document.getElementById('customerName').value = '';
    renderCart();
    updateBadge();
    toast('Kasbon berhasil diperbarui', 'success');
    return;
  }

  const cust = document.getElementById('customerName').value.trim();
  if (!cust) return toast('Isi nama pelanggan untuk kasbon', 'error');

  state.trx.unshift({
    id: uid(),
    date: new Date().toISOString(),
    paidAt: null,
    status: 'unpaid',
    customer: cust,
    items: state.cart.map(c => ({ ...c })),
    total: totalCart(),
    method: null, cash: 0, change: 0
  });
  saveTrx();

  state.cart = [];
  document.getElementById('customerName').value = '';
  renderCart();
  updateBadge();
  toast(`Kasbon ${cust}: ${fmt(state.trx[0].total)}`, 'success');
});

document.getElementById('btnClearCart').addEventListener('click', () => {
  if (!state.cart.length) return;
  if (!confirm('Kosongkan keranjang?')) return;
  state.cart = [];
  if (state.editingKasbonId) cancelKasbonEdit();
  else renderCart();
});

document.getElementById('btnCancelKasbonEdit').addEventListener('click', cancelKasbonEdit);

function cancelKasbonEdit() {
  state.editingKasbonId = null;
  state.cart = [];
  document.getElementById('customerName').value = '';
  document.getElementById('kasbonEditBanner').style.display = 'none';
  document.getElementById('btnKasbon').textContent = '📝 Kasbon';
  renderCart();
}

/* =====================================================
   PENDAPATAN LAINNYA (modal → masuk keranjang)
   ===================================================== */
function openOtherIncomeModal() {
  document.getElementById('otherName').value = '';
  document.getElementById('otherPrice').value = '';
  document.getElementById('otherQty').value = 1;
  updateOtherSubtotal();
  document.getElementById('otherIncomeModal').style.display = 'flex';
  setTimeout(() => document.getElementById('otherName').focus(), 100);
}

function closeOtherIncomeModal() {
  document.getElementById('otherIncomeModal').style.display = 'none';
}

function updateOtherSubtotal() {
  const price = Number(document.getElementById('otherPrice').value) || 0;
  const qty = Number(document.getElementById('otherQty').value) || 0;
  const el = document.getElementById('otherSubtotal');
  if (el) el.textContent = 'Subtotal: ' + fmt(price * qty);
}

function addOtherIncome() {
  const name = document.getElementById('otherName').value.trim();
  const price = Number(document.getElementById('otherPrice').value) || 0;
  const qty = Number(document.getElementById('otherQty').value) || 1;

  if (!name) return toast('Isi nama item terlebih dahulu', 'error');
  if (price <= 0) return toast('Harga harus lebih dari 0', 'error');
  if (qty <= 0) return toast('Jumlah harus lebih dari 0', 'error');

  // Gabung kalau ada item "Lainnya" dengan nama sama
  const existing = state.cart.find(c =>
    c.cat === 'Lainnya' && c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({
      id: 'other-' + uid(),
      name: name,
      price: price,
      qty: qty,
      cat: 'Lainnya'
    });
  }

  closeOtherIncomeModal();
  renderCart();
  toast(`Ditambahkan: ${name} × ${qty}`, 'success');
}

document.getElementById('btnOpenOtherIncome').addEventListener('click', openOtherIncomeModal);

/* =====================================================
   KASBON
   ===================================================== */
function renderKasbon() {
  const el = document.getElementById('kasbonList');
  const unpaid = state.trx.filter(t => t.status === 'unpaid');

  if (!unpaid.length) {
    el.innerHTML = `<div class="empty">Tidak ada kasbon. Semua lunas 👍</div>`;
    return;
  }

  el.innerHTML = unpaid.map(t => {
    const itemLines = t.items.map(it => `
      <div class="kasbon-item-line">
        <span class="name">${esc(it.name)}</span>
        <span class="qty">×${it.qty}</span>
        <span class="price">${fmt(it.price * it.qty)}</span>
      </div>
    `).join('');

    const quickVals = [...new Set([t.total, roundUp(t.total, 5000), roundUp(t.total, 10000)])]
      .filter(v => v > 0);
    const quickBtns = quickVals.map((v, idx) => `
      <button type="button" class="btn btn-sm btn-ghost"
              data-quick="${t.id}" data-val="${v}">
        ${idx === 0 ? '💯 Uang Pas' : fmt(v)}
      </button>
    `).join('');

    return `
      <div class="kasbon-card">
        <div class="kasbon-head">
          <div>
            <div class="list-title">${esc(t.customer)} <span class="tag unpaid">KASBON</span></div>
            <div class="list-sub">${formatDateTime(t.date)}${lateNightTag(t.date)}</div>
          </div>
          <div class="kasbon-total">${fmt(t.total)}</div>
        </div>
        <div class="kasbon-items">${itemLines}</div>
        <div class="kasbon-actions">
          <button class="btn btn-sm btn-primary" data-add="${t.id}">➕ Tambah Item</button>
          <button class="btn btn-sm btn-success" data-pay="${t.id}">✔ Bayar Lunas</button>
          <button class="btn btn-sm btn-danger" data-del="${t.id}">🗑 Hapus</button>
        </div>

        <div class="kasbon-pay-panel" data-panel="${t.id}" style="display:none">
          <div class="pay-label">Metode Pembayaran</div>
          <div class="pay-methods">
            <label class="pay-opt">
              <input type="radio" name="kasbonPay-${t.id}" value="tunai" checked>
              <span>💵 Tunai</span>
            </label>
            <label class="pay-opt">
              <input type="radio" name="kasbonPay-${t.id}" value="dana">
              <span>📱 Dana</span>
            </label>
          </div>

          <div class="kasbon-cash-block">
            <div class="pay-label">Uang Diterima</div>
            <input type="number" class="input kasbon-cash"
                   placeholder="0" min="0" step="500" value="${t.total}">
            <div class="quick-cash">${quickBtns}</div>
            <div class="change-row">
              <span>Kembalian</span>
              <strong class="kasbon-change">${fmt(0)}</strong>
            </div>
          </div>

          <div class="kasbon-actions">
            <button class="btn btn-sm btn-success" data-confirm-pay="${t.id}">✔ Konfirmasi Lunas</button>
            <button class="btn btn-sm btn-ghost" data-cancel-pay="${t.id}">Batal</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  unpaid.forEach(t => updateKasbonChange(t.id));
}

function getKasbonPanel(id) {
  return document.querySelector(`.kasbon-pay-panel[data-panel="${id}"]`);
}

function openKasbonPay(id) {
  const trx = state.trx.find(t => t.id === id);
  if (!trx) return;

  document.querySelectorAll('.kasbon-pay-panel').forEach(p => {
    p.style.display = p.dataset.panel === String(id) ? 'flex' : 'none';
  });

  const panel = getKasbonPanel(id);
  if (!panel) return;

  const tunaiRadio = panel.querySelector(`input[name="kasbonPay-${id}"][value="tunai"]`);
  if (tunaiRadio) tunaiRadio.checked = true;

  const cashInput = panel.querySelector('.kasbon-cash');
  if (!cashInput.value) cashInput.value = trx.total;

  updateKasbonChange(id);
  cashInput.focus();
}

function closeKasbonPay(id) {
  const panel = getKasbonPanel(id);
  if (panel) panel.style.display = 'none';
}

function updateKasbonChange(id) {
  const trx = state.trx.find(t => t.id === id);
  const panel = getKasbonPanel(id);
  if (!trx || !panel) return;

  const methodEl = panel.querySelector(`input[name="kasbonPay-${id}"]:checked`);
  const method = methodEl ? methodEl.value : 'tunai';

  const cashBlock = panel.querySelector('.kasbon-cash-block');
  cashBlock.style.display = method === 'tunai' ? 'flex' : 'none';

  const cash = Number(panel.querySelector('.kasbon-cash').value) || 0;
  const change = cash - trx.total;
  const el = panel.querySelector('.kasbon-change');
  const row = panel.querySelector('.change-row');

  if (cash === 0) {
    el.textContent = fmt(0);
    row.classList.remove('negative');
    return;
  }
  if (change < 0) {
    el.textContent = '-' + fmt(Math.abs(change));
    row.classList.add('negative');
  } else {
    el.textContent = fmt(change);
    row.classList.remove('negative');
  }
}

function confirmKasbonPay(id) {
  const trx = state.trx.find(t => t.id === id);
  const panel = getKasbonPanel(id);
  if (!trx || !panel) return;

  const methodEl = panel.querySelector(`input[name="kasbonPay-${id}"]:checked`);
  const method = methodEl ? methodEl.value : 'tunai';

  let cash = trx.total, change = 0;
  if (method === 'tunai') {
    cash = Number(panel.querySelector('.kasbon-cash').value) || 0;
    if (cash < trx.total) return toast('Uang yang diterima kurang!', 'error');
    change = cash - trx.total;
  }

  trx.status = 'paid';
  trx.paidAt = new Date().toISOString();
  trx.method = method;
  trx.cash = cash;
  trx.change = change;

  saveTrx();
  renderKasbon();
  updateBadge();
  toast(`Lunas! Kembalian ${fmt(change)}`, 'success');
}

document.getElementById('kasbonList').addEventListener('click', e => {
  const addBtn     = e.target.closest('[data-add]');
  const payBtn     = e.target.closest('[data-pay]');
  const delBtn     = e.target.closest('[data-del]');
  const confirmBtn = e.target.closest('[data-confirm-pay]');
  const cancelBtn  = e.target.closest('[data-cancel-pay]');
  const quickBtn   = e.target.closest('[data-quick]');

  if (addBtn) editKasbon(Number(addBtn.dataset.add));
  if (payBtn) openKasbonPay(Number(payBtn.dataset.pay));
  if (confirmBtn) confirmKasbonPay(Number(confirmBtn.dataset.confirmPay));
  if (cancelBtn) closeKasbonPay(Number(cancelBtn.dataset.cancelPay));

  if (quickBtn) {
    const id = Number(quickBtn.dataset.quick);
    const panel = getKasbonPanel(id);
    if (panel) {
      panel.querySelector('.kasbon-cash').value = quickBtn.dataset.val;
      updateKasbonChange(id);
    }
  }

  if (delBtn) {
    if (!confirm('Hapus catatan kasbon ini?')) return;
    state.trx = state.trx.filter(x => x.id !== Number(delBtn.dataset.del));
    saveTrx(); renderKasbon(); updateBadge();
    toast('Kasbon dihapus', 'success');
  }
});

document.getElementById('kasbonList').addEventListener('input', e => {
  const inp = e.target.closest('.kasbon-cash');
  if (!inp) return;
  const panel = inp.closest('.kasbon-pay-panel');
  if (!panel) return;
  updateKasbonChange(Number(panel.dataset.panel));
});

document.getElementById('kasbonList').addEventListener('change', e => {
  if (!e.target.matches('input[name^="kasbonPay-"]')) return;
  const panel = e.target.closest('.kasbon-pay-panel');
  if (!panel) return;
  updateKasbonChange(Number(panel.dataset.panel));
});

function editKasbon(id) {
  const trx = state.trx.find(t => t.id === id);
  if (!trx) return;
  if (state.cart.length && !confirm('Keranjang saat ini akan digantikan. Lanjutkan?')) return;

  state.editingKasbonId = id;
  state.cart = trx.items.map(i => ({ ...i }));
  document.getElementById('customerName').value = trx.customer;
  document.getElementById('cashInput').value = '';
  document.getElementById('kasbonEditBanner').style.display = 'flex';
  document.getElementById('kasbonEditText').textContent = `📝 Menambah item untuk kasbon: ${trx.customer}`;
  document.getElementById('btnKasbon').textContent = '💾 Simpan Perubahan';

  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === 'kasir')
  );
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-kasir')
  );
  renderKasir();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBadge() {
  const n = state.trx.filter(t => t.status === 'unpaid').length;
  const badge = document.getElementById('badgeKasbon');
  badge.textContent = n;
  badge.style.display = n ? 'inline-block' : 'none';
}

/* =====================================================
   REKAP
   ===================================================== */
function getRange(period) {
  const todayBd = todayStr();
  let start, end;

  if (period === 'today') {
    start = bdStart(todayBd); end = bdEnd(todayBd);
  } else if (period === 'week') {
    start = bdStart(addDaysStr(todayBd, -6)); end = bdEnd(todayBd);
  } else if (period === 'month') {
    start = bdStart(todayBd.slice(0, 8) + '01'); end = bdEnd(todayBd);
  } else if (period === 'custom') {
    const s = state.customStart || todayBd;
    const e = state.customEnd || todayBd;
    start = bdStart(s); end = bdEnd(e);
  } else {
    start = new Date(0); end = bdEnd(todayBd);
  }
  return { start, end };
}

function inRange(dateIso, start, end) {
  const d = new Date(dateIso);
  return d >= start && d <= end;
}

document.getElementById('periodTabs').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  state.period = btn.dataset.period;
  savePeriod();

  document.querySelectorAll('#periodTabs button').forEach(b =>
    b.classList.toggle('active', b === btn)
  );

  const dateRange = document.getElementById('dateRange');
  if (state.period === 'custom') {
    dateRange.style.display = 'flex';
    const startInput = document.getElementById('rekapStart');
    const endInput   = document.getElementById('rekapEnd');
    if (!startInput.value) startInput.value = state.customStart || todayStr();
    if (!endInput.value)   endInput.value   = state.customEnd   || todayStr();
    if (!state.customStart || !state.customEnd) {
      state.customStart = startInput.value;
      state.customEnd   = endInput.value;
      saveRange();
    }
  } else {
    dateRange.style.display = 'none';
  }
  renderRekap();
});

document.getElementById('btnApplyRange').addEventListener('click', () => {
  const start = document.getElementById('rekapStart').value;
  const end   = document.getElementById('rekapEnd').value;
  if (!start || !end) return toast('Isi kedua tanggal terlebih dahulu', 'error');
  if (start > end)    return toast('Tanggal awal harus sebelum tanggal akhir', 'error');

  state.customStart = start; state.customEnd = end;
  saveRange(); renderRekap();
  toast('Rentang tanggal diterapkan', 'success');
});

document.getElementById('btnResetRange').addEventListener('click', () => {
  state.customStart = todayStr();
  state.customEnd   = todayStr();
  document.getElementById('rekapStart').value = state.customStart;
  document.getElementById('rekapEnd').value   = state.customEnd;
  saveRange(); renderRekap();
  toast('Tanggal direset ke hari ini', 'success');
});

document.getElementById('closeHourInput').addEventListener('change', e => {
  let v = Number(e.target.value);
  if (Number.isNaN(v) || v < 0) v = 0;
  if (v > 12) v = 12;
  CLOSE_HOUR = v;
  e.target.value = v;
  saveCloseHour(); renderRekap();
  toast(`Jam tutup diset ${pad2(v)}:00`, 'success');
});

/* ============ HITUNG REKAP ============ */
function computeRekap() {
  const { start, end } = getRange(state.period);

  const trxPaid = state.trx.filter(t =>
    t.status === 'paid' && t.paidAt && inRange(t.paidAt, start, end)
  );
  const trxAll = state.trx.filter(t => {
    const ref = (t.status === 'paid' && t.paidAt) ? t.paidAt : t.date;
    return inRange(ref, start, end);
  });
  const expIn = state.exp.filter(e => {
    const dayStart = bdStart(e.date);
    return dayStart >= start && dayStart <= end;
  });

  let incomeWarungTunai = 0, incomeWarungDana = 0;
  let incomeRokokTunai  = 0, incomeRokokDana  = 0;

  trxPaid.forEach(t => {
    const method = t.method || 'tunai';
    t.items.forEach(it => {
      const cat = getItemCat(it);
      const sub = it.price * it.qty;
      // 'Lainnya' tidak dianggap rokok → masuk Warung
      if (isRokokCat(cat)) {
        if (method === 'dana') incomeRokokDana += sub;
        else                   incomeRokokTunai += sub;
      } else {
        if (method === 'dana') incomeWarungDana += sub;
        else                   incomeWarungTunai += sub;
      }
    });
  });

  const incomeWarung = incomeWarungTunai + incomeWarungDana;
  const incomeRokok  = incomeRokokTunai  + incomeRokokDana;
  const incomeTotal  = incomeWarung + incomeRokok;

  let expWarung = 0, expRokok = 0;
  expIn.forEach(e => {
    const c = e.category || 'warung';
    if (c === 'rokok') expRokok  += Number(e.amount);
    else               expWarung += Number(e.amount);
  });

  const netWarung = incomeWarung - expWarung;
  const netRokok  = incomeRokok  - expRokok;
  const netTotal  = netWarung + netRokok;

  return {
    start, end, trxPaid, trxAll, expIn,
    incomeWarungTunai, incomeWarungDana, incomeRokokTunai, incomeRokokDana,
    incomeWarung, incomeRokok, incomeTotal,
    expWarung, expRokok, netWarung, netRokok, netTotal
  };
}

/* ============ RENDER REKAP ============ */
function renderRekap() {
  const r = computeRekap();

  const rangeInfo = document.getElementById('rangeInfo');
  if (state.period === 'custom' && state.customStart && state.customEnd) {
    rangeInfo.style.display = 'block';
    rangeInfo.textContent = `📅 Menampilkan data dari ${formatDateLong(state.customStart)} sampai ${formatDateLong(state.customEnd)} (hari bisnis)`;
  } else {
    rangeInfo.style.display = 'none';
  }

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card green">
      <div class="label">Pemasukan Warung</div>
      <div class="value">${fmt(r.incomeWarung)}</div>
      <div class="sub">💵 ${fmt(r.incomeWarungTunai)} · 📱 ${fmt(r.incomeWarungDana)}</div>
    </div>
    <div class="stat-card purple">
      <div class="label">Pemasukan Rokok</div>
      <div class="value">${fmt(r.incomeRokok)}</div>
      <div class="sub">💵 ${fmt(r.incomeRokokTunai)} · 📱 ${fmt(r.incomeRokokDana)}</div>
    </div>
    <div class="stat-card blue">
      <div class="label">Total Pemasukan</div>
      <div class="value">${fmt(r.incomeTotal)}</div>
      <div class="sub">${r.trxPaid.length} transaksi lunas</div>
    </div>
  `;

  document.getElementById('statGrid2').innerHTML = `
    <div class="stat-card red">
      <div class="label">Pengeluaran Warung</div>
      <div class="value">${fmt(r.expWarung)}</div>
    </div>
    <div class="stat-card red">
      <div class="label">Pengeluaran Rokok</div>
      <div class="value">${fmt(r.expRokok)}</div>
    </div>
    <div class="stat-card ${r.netWarung >= 0 ? 'green' : 'red'}">
      <div class="label">Laba Warung</div>
      <div class="value">${fmt(r.netWarung)}</div>
    </div>
    <div class="stat-card ${r.netRokok >= 0 ? 'purple' : 'red'}">
      <div class="label">Laba Rokok</div>
      <div class="value">${fmt(r.netRokok)}</div>
    </div>
    <div class="stat-card ${r.netTotal >= 0 ? 'blue' : 'red'}">
      <div class="label">Laba Bersih Total</div>
      <div class="value">${fmt(r.netTotal)}</div>
    </div>
  `;

  /* ===== Transaksi ===== */
  const trxEl = document.getElementById('rekapTrx');
  if (!r.trxAll.length) {
    trxEl.innerHTML = `<div class="empty">Belum ada transaksi di periode ini</div>`;
  } else {
    trxEl.innerHTML = r.trxAll.map(t => {
      const isPaid = t.status === 'paid';
      const method = t.method || 'tunai';
      const methodBadge = isPaid
        ? `<span class="pay-badge ${method}">${method === 'dana' ? '📱 Dana' : '💵 Tunai'}</span>` : '';
      const statusTag = isPaid
        ? `<span class="tag paid">LUNAS</span>`
        : `<span class="tag unpaid">KASBON</span>`;
      const refIso = (isPaid && t.paidAt) ? t.paidAt : t.date;
      const tanggal = formatDateTime(refIso) + lateNightTag(refIso);

      const itemLines = t.items.map(it => {
        const otherBadge = it.cat === 'Lainnya'
          ? ' <span class="cat-badge-other">LAINNYA</span>' : '';
        return `
        <div class="trx-item-line">
          <span>${esc(it.name)}${otherBadge}</span>
          <span class="qty">×${it.qty}</span>
          <span class="price">${fmt(it.price * it.qty)}</span>
        </div>`;
      }).join('');

      let extra = '';
      if (isPaid && method === 'tunai' && t.cash) {
        extra = `<div class="trx-meta">Bayar: <strong>${fmt(t.cash)}</strong> · Kembalian: <strong>${fmt(t.change || 0)}</strong></div>`;
      }

      return `
        <div class="trx-card ${isPaid ? 'paid' : 'unpaid'}">
          <div class="trx-head">
            <div>
              <div class="list-title">${esc(t.customer || 'Pelanggan')} ${statusTag}${methodBadge}</div>
              <div class="list-sub">${tanggal}</div>
            </div>
            <div class="trx-head-right">
              <div class="trx-total">${fmt(t.total)}</div>
              <button class="btn btn-sm btn-danger" data-del-trx="${t.id}">🗑 Hapus</button>
            </div>
          </div>
          <div class="trx-items">${itemLines}</div>
          ${extra}
        </div>
      `;
    }).join('');
  }

  /* ===== Pengeluaran ===== */
  const expEl = document.getElementById('rekapExp');
  if (!r.expIn.length) {
    expEl.innerHTML = `<div class="empty">Belum ada pengeluaran di periode ini</div>`;
  } else {
    expEl.innerHTML = r.expIn.map(e => {
      const cat = e.category || 'warung';
      const catLabel = cat === 'rokok' ? '🚬 Rokok' : '🍢 Warung';
      return `
        <div class="list-row">
          <div class="list-main">
            <div class="list-title">${esc(e.desc)} <span class="exp-cat-tag ${cat}">${catLabel}</span></div>
            <div class="list-sub">${formatDateLong(e.date)}</div>
          </div>
          <div class="rekap-exp-actions">
            <div class="rekap-exp-amount">− ${fmt(e.amount)}</div>
            <button class="btn btn-sm btn-danger" data-del-exp-rekap="${e.id}">🗑 Hapus</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

/* =====================================================
   HAPUS TRANSAKSI & PENGELUARAN DARI TAB REKAP
   ===================================================== */
document.getElementById('rekapTrx').addEventListener('click', e => {
  const btn = e.target.closest('[data-del-trx]');
  if (!btn) return;
  if (!confirm('Hapus transaksi ini? Tindakan ini tidak bisa dibatalkan.')) return;

  const id = Number(btn.dataset.delTrx);
  const before = state.trx.length;
  state.trx = state.trx.filter(x => x.id !== id);
  if (state.trx.length === before) return;

  // Kalau yang dihapus adalah kasbon yang sedang diedit, batalkan edit
  if (state.editingKasbonId === id) cancelKasbonEdit();

  saveTrx();
  updateBadge();
  renderRekap();
  toast('Transaksi dihapus', 'success');
});

document.getElementById('rekapExp').addEventListener('click', e => {
  const btn = e.target.closest('[data-del-exp-rekap]');
  if (!btn) return;
  if (!confirm('Hapus pengeluaran ini?')) return;

  const id = Number(btn.dataset.delExpRekap);
  const before = state.exp.length;
  state.exp = state.exp.filter(x => x.id !== id);
  if (state.exp.length === before) return;

  saveExp();
  renderRekap();
  toast('Pengeluaran dihapus', 'success');
});

/* =====================================================
   HAPUS SEMUA (SESUAI PERIODE YANG TAMPIL)
   ===================================================== */
document.getElementById('btnDeleteAllTrx').addEventListener('click', () => {
  const r = computeRekap();
  const n = r.trxAll.length;
  if (!n) return toast('Tidak ada transaksi di periode ini', 'error');

  if (!confirm(`Hapus ${n} transaksi yang tampil di periode ini?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
  if (!confirm('⚠️ Konfirmasi terakhir: yakin hapus SEMUA transaksi yang ditampilkan?')) return;

  const idsToDelete = new Set(r.trxAll.map(t => t.id));
  state.trx = state.trx.filter(t => !idsToDelete.has(t.id));

  // Kalau kasbon yang sedang diedit ikut terhapus, batalkan mode edit
  if (state.editingKasbonId && idsToDelete.has(state.editingKasbonId)) {
    cancelKasbonEdit();
  }

  saveTrx();
  updateBadge();
  renderRekap();
  toast(`${n} transaksi dihapus`, 'success');
});

document.getElementById('btnDeleteAllExp').addEventListener('click', () => {
  const r = computeRekap();
  const n = r.expIn.length;
  if (!n) return toast('Tidak ada pengeluaran di periode ini', 'error');

  if (!confirm(`Hapus ${n} pengeluaran yang tampil di periode ini?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
  if (!confirm('⚠️ Konfirmasi terakhir: yakin hapus SEMUA pengeluaran yang ditampilkan?')) return;

  const idsToDelete = new Set(r.expIn.map(e => e.id));
  state.exp = state.exp.filter(e => !idsToDelete.has(e.id));

  saveExp();
  renderRekap();
  toast(`${n} pengeluaran dihapus`, 'success');
});

/* =====================================================
   EXPORT CSV
   ===================================================== */
const csvEsc = v => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

function downloadCSV() {
  const r = computeRekap();

  let periodLabel;
  if (state.period === 'today') periodLabel = 'Hari Ini';
  else if (state.period === 'week') periodLabel = 'Minggu Ini';
  else if (state.period === 'month') periodLabel = 'Bulan Ini';
  else if (state.period === 'all') periodLabel = 'Semua';
  else periodLabel = `${formatDateLong(state.customStart || todayStr())} s/d ${formatDateLong(state.customEnd || todayStr())}`;

  const lines = [];
  const push = arr => lines.push(arr.map(csvEsc).join(','));

  push(['REKAP ANGKRINGAN POS']);
  push([`Periode: ${periodLabel}`]);
  push([`Jam tutup harian: ${pad2(CLOSE_HOUR)}:00`]);
  push([`Dibuat: ${formatDateTime(new Date().toISOString())}`]);
  push([]);

  push(['RINGKASAN']);
  push(['Kategori', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Laba (Rp)']);
  push(['Warung', r.incomeWarung, r.expWarung, r.netWarung]);
  push(['Rokok',  r.incomeRokok,  r.expRokok,  r.netRokok]);
  push(['TOTAL',  r.incomeTotal,  r.expWarung + r.expRokok, r.netTotal]);
  push([]);

  push(['DETAIL PEMASUKAN']);
  push(['Kategori', 'Tunai (Rp)', 'Dana (Rp)', 'Total (Rp)']);
  push(['Warung', r.incomeWarungTunai, r.incomeWarungDana, r.incomeWarung]);
  push(['Rokok',  r.incomeRokokTunai,  r.incomeRokokDana,  r.incomeRokok]);
  push(['TOTAL',  r.incomeWarungTunai + r.incomeRokokTunai,
                  r.incomeWarungDana + r.incomeRokokDana,
                  r.incomeTotal]);
  push([]);

  push(['TRANSAKSI']);
  push(['Waktu', 'Pelanggan', 'Status', 'Metode', 'Item', 'Kategori', 'Qty', 'Subtotal (Rp)', 'Total Trx (Rp)', 'Bayar (Rp)', 'Kembalian (Rp)']);
  r.trxAll.forEach(t => {
    const isPaid = t.status === 'paid';
    const refIso = (isPaid && t.paidAt) ? t.paidAt : t.date;
    const waktu = formatDateTime(refIso);
    const status = isPaid ? 'LUNAS' : 'KASBON';
    const method = isPaid ? (t.method === 'dana' ? 'Dana' : 'Tunai') : '-';

    t.items.forEach((it, idx) => {
      const cat = it.cat || getItemCat(it) || 'Lainnya';
      push([
        waktu,
        t.customer || 'Pelanggan',
        status,
        method,
        it.name,
        cat,
        it.qty,
        it.price * it.qty,
        idx === 0 ? t.total : '',
        idx === 0 ? (isPaid ? (t.cash || '') : '') : '',
        idx === 0 ? (isPaid ? (t.change || 0) : '') : ''
      ]);
    });
  });
  push([]);

  push(['PENGELUARAN']);
  push(['Tanggal', 'Keterangan', 'Kategori', 'Jumlah (Rp)']);
  r.expIn.forEach(e => {
    push([
      formatDateLong(e.date),
      e.desc,
      e.category === 'rokok' ? 'Rokok' : 'Warung',
      e.amount
    ]);
  });

  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

  const startStr = state.period === 'custom'
    ? (state.customStart || todayStr())
    : todayStr();
  const endStr = state.period === 'custom'
    ? (state.customEnd || todayStr())
    : todayStr();
  const filename = `rekap-angkringan-${startStr}_${endStr}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast('CSV berhasil diunduh', 'success');
}

document.getElementById('btnDownloadCSV').addEventListener('click', downloadCSV);

/* =====================================================
   PENGELUARAN
   ===================================================== */
function renderPengeluaran() {
  document.getElementById('expDate').value = todayStr();

  const el = document.getElementById('expList');
  if (!state.exp.length) {
    el.innerHTML = `<div class="empty">Belum ada pengeluaran tercatat</div>`;
    return;
  }

  const sorted = [...state.exp].sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = sorted.map(e => {
    const cat = e.category || 'warung';
    const catLabel = cat === 'rokok' ? '🚬 Rokok' : '🍢 Warung';
    return `
      <div class="list-row">
        <div class="list-main">
          <div class="list-title">${esc(e.desc)} <span class="exp-cat-tag ${cat}">${catLabel}</span></div>
          <div class="list-sub">${formatDateLong(e.date)}</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <strong style="color:var(--danger);font-size:1.05rem">${fmt(e.amount)}</strong>
          <button class="btn btn-sm btn-danger" data-del-exp="${e.id}">Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('formExp').addEventListener('submit', e => {
  e.preventDefault();
  const date = document.getElementById('expDate').value;
  const category = document.getElementById('expCat').value;
  const desc = document.getElementById('expDesc').value.trim();
  const amount = Number(document.getElementById('expAmount').value);

  if (!date || !desc || amount <= 0) return toast('Lengkapi data dengan benar', 'error');

  state.exp.push({ id: uid(), date, category, desc, amount });
  saveExp();
  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
  renderPengeluaran();
  toast('Pengeluaran ditambahkan', 'success');
});

document.getElementById('expList').addEventListener('click', e => {
  const btn = e.target.closest('[data-del-exp]');
  if (!btn) return;
  if (!confirm('Hapus pengeluaran ini?')) return;
  state.exp = state.exp.filter(x => x.id !== Number(btn.dataset.delExp));
  saveExp(); renderPengeluaran();
  toast('Pengeluaran dihapus', 'success');
});

/* =====================================================
   KELOLA MENU
   ===================================================== */
function renderMenuFilterTabs() {
  const el = document.getElementById('menuFilterTabs');
  if (!el) return;
  el.querySelectorAll('.cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === state.menuFilter);
  });
}

function renderMenuManage() {
  const sel = document.getElementById('menuCat');
  sel.innerHTML = CATS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  renderMenuFilterTabs();

  const el = document.getElementById('menuList');
  if (!state.menu.length) {
    el.innerHTML = `<div class="empty">Belum ada menu</div>`;
    return;
  }

  const catsToShow = state.menuFilter === 'all' ? CATS : [state.menuFilter];
  let html = '';
  let totalShown = 0;

  catsToShow.forEach(cat => {
    const items = state.menu.filter(m => m.cat === cat);
    if (!items.length) return;
    totalShown += items.length;
    html += `<div class="menu-group"><h4>${esc(cat)} (${items.length})</h4>`;
    items.forEach(m => {
      html += `
        <div class="list-row" style="margin-bottom:6px">
          <div class="list-main">
            <div class="list-title">${esc(m.name)}</div>
            <div class="list-sub">${fmt(m.price)}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-primary" data-edit="${m.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-del-menu="${m.id}">Hapus</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  if (!totalShown) {
    el.innerHTML = `<div class="empty">Belum ada item di kategori ini</div>`;
    return;
  }
  el.innerHTML = html;
}

document.getElementById('menuFilterTabs').addEventListener('click', e => {
  const btn = e.target.closest('.cat-tab');
  if (!btn) return;
  state.menuFilter = btn.dataset.filter;
  renderMenuManage();
});

document.getElementById('formMenu').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('menuId').value;
  const name = document.getElementById('menuName').value.trim();
  const cat = document.getElementById('menuCat').value;
  const price = Number(document.getElementById('menuPrice').value);

  if (!name || !cat || price < 0) return toast('Lengkapi data menu', 'error');

  if (id) {
    const item = state.menu.find(m => m.id === Number(id));
    if (item) { item.name = name; item.cat = cat; item.price = price; }
    toast('Menu diperbarui', 'success');
  } else {
    const newId = state.menu.length ? Math.max(...state.menu.map(m => m.id)) + 1 : 1;
    state.menu.push({ id: newId, name, cat, price });
    toast('Menu ditambahkan', 'success');
  }

  saveMenu();
  resetFormMenu();
  renderMenuManage();
  renderItemGrid();
});

function resetFormMenu() {
  document.getElementById('menuId').value = '';
  document.getElementById('menuName').value = '';
  document.getElementById('menuPrice').value = '';
  document.getElementById('menuSubmitBtn').textContent = 'Tambah';
  document.getElementById('menuCancelBtn').style.display = 'none';
}

document.getElementById('menuCancelBtn').addEventListener('click', resetFormMenu);

document.getElementById('menuList').addEventListener('click', e => {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-del-menu]');

  if (editBtn) {
    const id = Number(editBtn.dataset.edit);
    const item = state.menu.find(m => m.id === id);
    if (!item) return;
    document.getElementById('menuId').value = item.id;
    document.getElementById('menuName').value = item.name;
    document.getElementById('menuCat').value = item.cat;
    document.getElementById('menuPrice').value = item.price;
    document.getElementById('menuSubmitBtn').textContent = 'Simpan Perubahan';
    document.getElementById('menuCancelBtn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (delBtn) {
    if (!confirm('Hapus item ini dari menu?')) return;
    state.menu = state.menu.filter(m => m.id !== Number(delBtn.dataset.delMenu));
    saveMenu();
    renderMenuManage();
    renderItemGrid();
    toast('Item dihapus', 'success');
  }
});

/* =====================================================
   INIT
   ===================================================== */
(function init() {
  loadAll();
  loadCloseHour();
  loadRange();
  loadPeriod();

  document.getElementById('closeHourInput').value = CLOSE_HOUR;

  updateBadge();
  renderKasir();
  renderPengeluaran();

  document.querySelectorAll('#periodTabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.period === state.period);
  });

  if (state.period === 'custom') {
    document.getElementById('dateRange').style.display = 'flex';
    document.getElementById('rekapStart').value = state.customStart || todayStr();
    document.getElementById('rekapEnd').value   = state.customEnd   || todayStr();
    if (!state.customStart) state.customStart = todayStr();
    if (!state.customEnd)   state.customEnd   = todayStr();
  }

  // Tutup modal Pendapatan Lainnya dengan tombol ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('otherIncomeModal');
      if (modal && modal.style.display === 'flex') closeOtherIncomeModal();
    }
  });
})();

/* =============== PWA: SERVICE WORKER =============== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(error => console.error('PWA: service worker gagal didaftarkan:', error));
  });
}