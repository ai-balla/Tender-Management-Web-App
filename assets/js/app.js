/* ================================================================
   APP.JS v2 — Tender Management (Phase 2)
   Features: User Mgmt, Settings, BOQ auto-calc, CSV Import
   ================================================================ */

/* ── State ──────────────────────────────────────────────────── */
let state = {
    currentPage: 'dashboard',
    tenders: [],
    users: [],
    settings: { name: 'مجموعة عرب MD الطبية', vat_rate: 15 },
    logs: [],
    search: '', filterStatus: '', filterCategory: '',
    chartsVisible: true, charts: {},
    editTenderId: null, boqTenderId: null, filesViewTenderId: null,
    sortCol: 'id', sortDir: 'desc',
    currentPg: 1, perPage: 8,
};

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    setupSidebar();
    setupNavigation();

    // Check session
    try {
        const res = await fetch('api/auth.php?action=check');
        const json = await res.json();
        if (json.success) {
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('app-shell').style.display = 'block';
            startClock();
            await fetchAppState();
        } else {
            doLogout();
        }
    } catch (e) {
        doLogout();
    }
});

async function fetchAppState() {
    try {
        const res = await fetch('api/init.php');
        const json = await res.json();
        if (json.success) {
            state.users = json.data.users || [];
            state.settings = json.data.settings || state.settings;
            state.tenders = json.data.tenders || [];
            state.logs = json.data.logs || [];

            applySettings();
            if (state.currentPage === 'dashboard') renderDashboard();
            if (state.currentPage === 'tenders') renderTendersTable();
            if (state.currentPage === 'reports') renderReportsTable();
            if (state.currentPage === 'users') renderUsersTable();
            if (state.currentPage === 'logs') renderLogs();
        } else {
            doLogout();
        }
    } catch (e) {
        console.error('Data pull error:', e);
        showToast('فشل في تحميل البيانات من الخادم', 'error');
    }
}

/* ── Apply Company Settings ──────────────────────────────────── */
function applySettings() {
    const logo = state.settings.logo_custom || state.settings.logo_url;
    document.querySelectorAll('.company-logo').forEach(el => el.src = logo);
    document.querySelectorAll('.company-name').forEach(el => el.textContent = state.settings.name);
    document.getElementById('nav-tender-count').textContent = state.tenders.length;
}

/* ── Sidebar ─────────────────────────────────────────────────── */
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleBtn = document.getElementById('toggleSidebar');
    if (!toggleBtn) return;
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    });
}

/* ── Navigation ──────────────────────────────────────────────── */
function setupNavigation() {
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', () => {
            navigateTo(link.dataset.page);
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function navigateTo(page) {
    state.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    const titles = {
        dashboard: { h: 'لوحة التحكم', sub: 'نظرة عامة على المناقصات والإحصائيات' },
        tenders: { h: 'إدارة المناقصات', sub: 'عرض وإدارة جميع المناقصات' },
        new: { h: 'مناقصة جديدة', sub: 'إدخال بيانات مناقصة جديدة' },
        import: { h: 'استيراد المناقصات', sub: 'رفع ملف CSV لاستيراد بيانات المناقصات' },
        users: { h: 'إدارة المستخدمين', sub: 'إضافة وتعديل وحذف المستخدمين' },
        settings: { h: 'إعدادات النظام', sub: 'تخصيص اسم الشركة والشعار' },
        logs: { h: 'سجل الأحداث', sub: 'تتبع جميع العمليات والتغييرات' },
    };
    const t = titles[page] || { h: page, sub: '' };
    document.getElementById('pageTitle').textContent = t.h;
    document.getElementById('pageSubtitle').textContent = t.sub;

    if (page === 'dashboard') renderDashboard();
    if (page === 'tenders') renderTendersTable();
    if (page === 'new') setupNewForm();
    if (page === 'users') renderUsersTable();
    if (page === 'settings') setupSettingsForm();
    if (page === 'import') setupImportPage();
    if (page === 'logs') renderLogs();
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD
   ───────────────────────────────────────────────────────────── */
function renderDashboard() {
    const s = computeStats();
    const updates = {
        'stat-total': s.total, 'stat-submitted': s.submitted, 'stat-won': s.won,
        'stat-lost': s.lost, 'stat-ongoing': s.ongoing, 'stat-draft': s.draft,
        'stat-value': formatSAR(s.total_value), 'stat-cost': formatSAR(s.total_cost),
        'stat-profit': formatSAR(s.total_profit), 'stat-vat': formatSAR(s.total_vat),
    };
    Object.entries(updates).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.textContent = v; });
    const wr = s.total > 0 ? Math.round((s.won / Math.max(s.submitted + s.won + s.lost, 1)) * 100) : 0;
    const wrel = document.getElementById('stat-winrate'); if (wrel) wrel.textContent = wr + '%';
    renderProgressBars(s);
    renderCharts(s);
    renderDeadlineAlerts();
    renderRecentTenders();
}

function computeStats() {
    const t = state.tenders;
    return {
        total: t.length,
        submitted: t.filter(x => x.status === 'submitted').length,
        won: t.filter(x => x.status === 'won').length,
        lost: t.filter(x => x.status === 'lost').length,
        ongoing: t.filter(x => x.status === 'ongoing').length,
        draft: t.filter(x => x.status === 'draft').length,
        under_review: t.filter(x => x.status === 'under_review').length,
        not_submitted: t.filter(x => x.status === 'not_submitted').length,
        total_value: t.filter(x => x.submitted_price).reduce((s, x) => s + x.submitted_price, 0),
        total_cost: t.filter(x => x.cost).reduce((s, x) => s + x.cost, 0),
        total_profit: t.filter(x => x.profit).reduce((s, x) => s + x.profit, 0),
        total_vat: t.filter(x => x.vat).reduce((s, x) => s + x.vat, 0),
    };
}

function renderProgressBars(s) {
    [
        ['pb-submitted', s.submitted, '#4759A2'], ['pb-won', s.won, '#20c997'],
        ['pb-ongoing', s.ongoing, '#d4af37'], ['pb-lost', s.lost, '#dc3545'],
    ].forEach(([id, val, col]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.width = (s.total > 0 ? (val / s.total * 100).toFixed(0) : 0) + '%';
        el.style.background = col;
    });
}

function renderCharts(s) {
    if (!state.chartsVisible) return;
    const donutCtx = document.getElementById('chartStatus');
    if (donutCtx) {
        if (state.charts.donut) state.charts.donut.destroy();
        state.charts.donut = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['مقدمة', 'فاز', 'خسر', 'تحت المراجعة', 'جارٍ', 'مسودة', 'لم يقدّم'],
                datasets: [{
                    data: [s.submitted, s.won, s.lost, s.under_review, s.ongoing, s.draft, s.not_submitted],
                    backgroundColor: ['#4759A2', '#20c997', '#dc3545', '#ffc107', '#d4af37', '#adb5bd', '#8E0C31'],
                    borderWidth: 3, borderColor: '#fff', hoverOffset: 10
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal', size: 12 }, padding: 14 } } }
            }
        });
    }
    const barCtx = document.getElementById('chartMonthly');
    if (barCtx) {
        if (state.charts.bar) state.charts.bar.destroy();
        state.charts.bar = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير'],
                datasets: [
                    { label: 'مناقصات مقدمة', data: [1, 2, 1, 3, 2, 3, 2, 2], backgroundColor: 'rgba(71,89,162,0.85)', borderRadius: 6 },
                    { label: 'مناقصات فائزة', data: [0, 1, 0, 1, 1, 1, 0, 1], backgroundColor: 'rgba(32,201,151,0.85)', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { family: 'Tajawal', size: 12 } } } },
                scales: { x: { grid: { display: false }, ticks: { font: { family: 'Tajawal' } } }, y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Tajawal' } } } }
            }
        });
    }
    const lineCtx = document.getElementById('chartRevenue');
    if (lineCtx) {
        if (state.charts.line) state.charts.line.destroy();
        state.charts.line = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'],
                datasets: [
                    { label: 'قيمة العروض (مليون ﷼)', data: [1.8, 3.2, 4.5, 6.1, 8.5], borderColor: '#4759A2', backgroundColor: 'rgba(71,89,162,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#4759A2' },
                    { label: 'التكلفة الفعلية (مليون ﷼)', data: [1.4, 2.6, 3.5, 4.8, 6.6], borderColor: '#d4af37', backgroundColor: 'rgba(212,175,55,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#d4af37' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { family: 'Tajawal', size: 12 } } } },
                scales: { x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Tajawal' } } }, y: { beginAtZero: true, ticks: { font: { family: 'Tajawal' } } } }
            }
        });
    }
}

function renderDeadlineAlerts() {
    const cont = document.getElementById('deadline-alerts'); if (!cont) return;
    const now = new Date();
    const upcoming = state.tenders
        .filter(t => t.bcd && (t.status === 'draft' || t.status === 'submitted'))
        .map(t => ({ ...t, daysLeft: Math.ceil((new Date(t.bcd) - now) / 86400000) }))
        .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
    cont.innerHTML = !upcoming.length
        ? '<p style="color:var(--text-muted);font-size:0.85rem">لا توجد مناقصات قادمة</p>'
        : upcoming.map(t => {
            const cls = t.daysLeft <= 5 ? 'alert-urgent' : t.daysLeft <= 14 ? 'alert-soon' : 'alert-ok';
            const ic = t.daysLeft <= 5 ? '🔴' : t.daysLeft <= 14 ? '🟡' : '🟢';
            const col = t.daysLeft <= 5 ? 'var(--danger)' : t.daysLeft <= 14 ? 'var(--gold-dark)' : 'var(--success)';
            return `<div class="alert-card ${cls}">
        <div style="font-size:1.4rem">${ic}</div>
        <div style="flex:1"><div style="font-size:0.82rem;font-weight:700">${t.title.substring(0, 55)}…</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px">${formatDatetime(t.bcd)}</div></div>
        <div style="text-align:center;min-width:60px"><div style="font-size:1.3rem;font-weight:900;color:${col}">${t.daysLeft}</div><div style="font-size:0.66rem;color:var(--text-muted)">يوم</div></div>
      </div>`;
        }).join('');
}

function renderRecentTenders() {
    const tbody = document.getElementById('recent-tenders-body'); if (!tbody) return;
    const recent = [...state.tenders].sort((a, b) => b.id - a.id).slice(0, 5);
    tbody.innerHTML = recent.map(t => {
        const st = STATUS_LABELS[t.status] || { label: t.status, badge: 'badge-draft' };
        return `<tr><td class="td-truncate" title="${t.title}">${t.title}</td><td style="font-size:0.78rem;color:var(--text-muted)">${t.reference}</td><td><span class="badge ${st.badge}">${st.label}</span></td><td>${formatDate(t.bcd)}</td><td style="font-weight:600">${formatSAR(t.submitted_price)}</td></tr>`;
    }).join('');
}

/* ─────────────────────────────────────────────────────────────
   TENDERS TABLE
   ───────────────────────────────────────────────────────────── */
function renderTendersTable() {
    let data = [...state.tenders];
    if (state.search) {
        const q = state.search.toLowerCase();
        data = data.filter(t => t.title.includes(q) || t.reference.toLowerCase().includes(q) || t.tender_number.includes(q));
    }
    if (state.filterStatus) data = data.filter(t => t.status === state.filterStatus);
    if (state.filterCategory) data = data.filter(t => t.category === state.filterCategory);
    data.sort((a, b) => {
        let va = a[state.sortCol] ?? '', vb = b[state.sortCol] ?? '';
        if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        const r = va < vb ? -1 : va > vb ? 1 : 0; return state.sortDir === 'asc' ? r : -r;
    });
    const total = data.length, pages = Math.ceil(total / state.perPage);
    state.currentPg = Math.min(state.currentPg, pages || 1);
    const slice = data.slice((state.currentPg - 1) * state.perPage, state.currentPg * state.perPage);
    const tbody = document.getElementById('tenders-tbody'); if (!tbody) return;
    tbody.innerHTML = !slice.length
        ? `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:2.5rem">📋</div><div>لا توجد مناقصات</div></td></tr>`
        : slice.map(t => {
            const st = STATUS_LABELS[t.status] || { label: t.status, badge: 'badge-draft' };
            const vatTotal = (t.submitted_price || 0) + (t.vat || 0);
            return `<tr>
        <td style="font-weight:600;color:var(--primary)">#${t.id}</td>
        <td class="td-truncate" title="${t.title}">${t.title}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);direction:ltr">${t.reference}</td>
        <td style="font-size:0.8rem">${formatDate(t.bcd)}</td>
        <td><span style="background:var(--bg2);padding:3px 8px;border-radius:6px;font-size:0.78rem">${CATEGORY_LABELS[t.category] || t.category}</span></td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>
        <td><button class="btn btn-sm" style="background:var(--primary-ultra);color:var(--primary);border:1.5px solid var(--border)" onclick="openBOQ(${t.id})">➕ BOQ ${t.costs.length ? `<span style="background:var(--primary);color:#fff;border-radius:20px;padding:1px 6px;font-size:0.7rem">${t.costs.length}</span>` : ''}</button></td>
        <td style="font-weight:700;color:var(--primary-dark)">${formatSAR(t.submitted_price)}</td>
        <td style="color:var(--text-muted)">${formatSAR(t.cost)}</td>
        <td style="color:var(--success);font-weight:600">${formatSAR(t.profit)}</td>
        <td style="color:var(--crimson)">${vatTotal ? formatSAR(vatTotal) : '—'}</td>
        <td><div style="display:flex;gap:4px">
          <button class="btn btn-sm" style="background:var(--primary-ultra);color:var(--primary)" onclick="editTender(${t.id})" title="تعديل">✏️</button>
          <button class="btn btn-sm" style="background:rgba(32,201,151,0.1);color:var(--success)" onclick="changeStatus(${t.id})" title="تغيير الحالة">🔄</button>
          <button class="btn btn-sm" style="background:rgba(23,162,184,0.1);color:#0dcaf0" onclick="viewFiles(${t.id})" title="الملفات">📎${t.files.length}</button>
          <button class="btn btn-sm" style="background:rgba(220,53,69,0.1);color:var(--danger)" onclick="deleteTender(${t.id})" title="حذف">🗑️</button>
        </div></td>
      </tr>`;
        }).join('');
    renderPagination(total, pages);
    document.getElementById('nav-tender-count').textContent = state.tenders.length;
}

function renderPagination(total, pages) {
    const el = document.getElementById('pag-info'), el2 = document.getElementById('pag-btns');
    if (!el || !el2) return;
    const s = (state.currentPg - 1) * state.perPage + 1, e = Math.min(state.currentPg * state.perPage, total);
    el.textContent = total > 0 ? `عرض ${s}–${e} من ${total} مناقصة` : 'لا توجد نتائج';
    let btns = `<button class="pag-btn" onclick="goPage(${state.currentPg - 1})" ${state.currentPg === 1 ? 'disabled' : ''}>›</button>`;
    for (let i = 1; i <= pages; i++) btns += `<button class="pag-btn ${i === state.currentPg ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    btns += `<button class="pag-btn" onclick="goPage(${state.currentPg + 1})" ${state.currentPg === pages || pages === 0 ? 'disabled' : ''}>‹</button>`;
    el2.innerHTML = btns;
}
function goPage(n) { const p = Math.ceil(state.tenders.length / state.perPage); if (n < 1 || n > p) return; state.currentPg = n; renderTendersTable(); }
function onSearch(v) { state.search = v; state.currentPg = 1; renderTendersTable(); }
function onFilterStatus(v) { state.filterStatus = v; state.currentPg = 1; renderTendersTable(); }
function onFilterCategory(v) { state.filterCategory = v; state.currentPg = 1; renderTendersTable(); }
function sortTable(col) { if (state.sortCol === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; else { state.sortCol = col; state.sortDir = 'asc'; } renderTendersTable(); }

/* ─────────────────────────────────────────────────────────────
   NEW / EDIT TENDER
   ───────────────────────────────────────────────────────────── */
function setupNewForm() {
    document.getElementById('new-tender-form')?.reset();
    state.editTenderId = null;
    document.getElementById('form-page-title').textContent = 'مناقصة جديدة';
    document.getElementById('form-submit-btn').textContent = '💾 حفظ المناقصة';
}

async function submitTenderForm() {
    const form = document.getElementById('new-tender-form');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    if (!data.title || !data.reference) { showToast('يرجى ملء الحقول الإلزامية', 'error'); return; }

    data.id = state.editTenderId;

    try {
        const res = await fetch('api/tenders.php?action=save', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json.success) {
            showToast('تم حفظ المناقصة ✅', 'success');
            await fetchAppState();
            document.querySelectorAll('.nav-link[data-page="tenders"]')[0]?.click();
        } else {
            showToast('حدث خطأ في الحفظ', 'error');
        }
    } catch (e) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    }
}

function editTender(id) {
    const t = state.tenders.find(x => x.id === id); if (!t) return;
    state.editTenderId = id;
    navigateTo('new');
    document.querySelectorAll('.nav-link[data-page]').forEach(l => l.classList.remove('active'));
    document.getElementById('form-page-title').textContent = 'تعديل المناقصة';
    document.getElementById('form-submit-btn').textContent = '💾 حفظ التعديلات';
    setTimeout(() => {
        const F = (i, v) => { const el = document.getElementById(i); if (el && v !== undefined && v !== null) el.value = v; };
        F('f-title', t.title); F('f-reference', t.reference); F('f-tender-number', t.tender_number);
        F('f-bcd', t.bcd ? t.bcd.substring(0, 16) : ''); F('f-duration', t.duration);
        F('f-procedure', t.procedure); F('f-category', t.category); F('f-remarks', t.remarks);
        F('f-submitted-price', t.submitted_price); F('f-cost', t.cost); F('f-eitmad', t.eitmad);
    }, 120);
}

/* ─────────────────────────────────────────────────────────────
   BOQ MODAL (with qty + unit_price + auto-calc)
   ───────────────────────────────────────────────────────────── */
function openBOQ(id) {
    state.boqTenderId = id;
    const t = state.tenders.find(x => x.id === id); if (!t) return;
    openModal('boq-modal');
    document.getElementById('boq-tender-title').textContent = t.title.substring(0, 60) + '…';
    renderBOQTable(t);
}

function renderBOQTable(t) {
    const tbody = document.getElementById('boq-tbody'); if (!tbody) return;
    const rows = t.costs.map((c, i) => {
        const lineTotal = boqLineTotal(c);
        return `<tr id="boq-row-${c.id}">
      <td style="font-weight:600;color:var(--primary);text-align:center">${i + 1}</td>
      <td><input class="boq-input" value="${c.item}" style="min-width:170px"
          oninput="updateBOQField(${t.id},${c.id},'item',this.value)"></td>
      <td><input class="boq-input" type="number" value="${c.qty}" style="width:70px;text-align:center"
          oninput="updateBOQField(${t.id},${c.id},'qty',+this.value);recalcBOQRow(${t.id},${c.id},this)"></td>
      <td><input class="boq-input" type="number" value="${c.unit_price}" style="width:110px"
          oninput="updateBOQField(${t.id},${c.id},'unit_price',+this.value);recalcBOQRow(${t.id},${c.id},this)"></td>
      <td id="boq-line-${c.id}" style="font-weight:700;color:var(--primary);text-align:center;font-size:0.82rem">${formatSAR(lineTotal)}</td>
      <td><input class="boq-input" value="${c.notes}"
          oninput="updateBOQField(${t.id},${c.id},'notes',this.value)"></td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteBOQRow(${t.id},${c.id})">🗑️</button></td>
    </tr>`;
    }).join('');

    const grand = boqGrandTotal(t.costs);
    tbody.innerHTML = rows + `
    <tr style="background:linear-gradient(135deg,var(--primary-dark),var(--primary));color:#fff">
      <td colspan="4" style="font-weight:700;padding:10px 12px">الإجمالي الكلي</td>
      <td id="boq-grand-total" style="font-weight:900;font-size:1rem">${formatSAR(grand)}</td>
      <td colspan="2"></td>
    </tr>`;
}

function updateBOQField(tenderId, costId, field, value) {
    const t = state.tenders.find(x => x.id === tenderId); if (!t) return;
    const c = t.costs.find(x => x.id === costId); if (!c) return;
    c[field] = value;
}

function recalcBOQRow(tenderId, costId) {
    const t = state.tenders.find(x => x.id === tenderId); if (!t) return;
    const c = t.costs.find(x => x.id === costId); if (!c) return;
    const lineEl = document.getElementById(`boq-line-${costId}`);
    if (lineEl) lineEl.textContent = formatSAR(boqLineTotal(c));
    const grandEl = document.getElementById('boq-grand-total');
    if (grandEl) grandEl.textContent = formatSAR(boqGrandTotal(t.costs));
}

function addBOQRow() {
    const t = state.tenders.find(x => x.id === state.boqTenderId); if (!t) return;
    const newId = t.costs.length ? Math.max(...t.costs.map(c => c.id)) + 1 : 1;
    t.costs.push({ id: newId, item: '', qty: 1, unit_price: 0, notes: '' });
    renderBOQTable(t);
    // Focus the last item name input
    setTimeout(() => {
        const rows = document.querySelectorAll('#boq-tbody tr');
        const lastInput = rows[rows.length - 2]?.querySelector('.boq-input');
        if (lastInput) lastInput.focus();
    }, 50);
}

function deleteBOQRow(tenderId, costId) {
    const t = state.tenders.find(x => x.id === tenderId); if (!t) return;
    t.costs = t.costs.filter(c => c.id !== costId);
    renderBOQTable(t);
}

async function saveBOQ() {
    const t = state.tenders.find(x => x.id === state.boqTenderId); if (!t) return;
    t.cost = boqGrandTotal(t.costs);

    // Save to backend
    try {
        await fetch('api/boq.php?action=bulk_save', {
            method: 'POST', body: JSON.stringify({ tender_id: t.id, costs: t.costs })
        });
        await fetch('api/boq.php?action=save_grand', {
            method: 'POST', body: JSON.stringify({ tender_id: t.id, cost: t.cost })
        });
        showToast('تم حفظ BOQ ✅', 'success');
        closeModal('boq-modal');
        await fetchAppState();
    } catch (e) {
        showToast('حدث خطأ أثناء الحفظ', 'error');
    }
}

/* ─────────────────────────────────────────────────────────────
   STATUS / DELETE / FILES
   ───────────────────────────────────────────────────────────── */
function changeStatus(id) {
    const t = state.tenders.find(x => x.id === id); if (!t) return;
    const statuses = ['draft', 'submitted', 'not_submitted', 'under_review', 'won', 'lost', 'ongoing'];
    const labels = ['مسودة', 'مقدمة', 'لم يقدّم', 'تحت المراجعة', 'فاز', 'خسر', 'جارٍ'];
    openModal('change-status-modal');
    document.getElementById('status-select').innerHTML = statuses.map((s, i) => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${labels[i]}</option>`).join('');
    document.getElementById('status-tender-name').textContent = t.title.substring(0, 50) + '…';
    document.getElementById('status-confirm-btn').onclick = async () => {
        const ns = document.getElementById('status-select').value;
        const res = await fetch('api/tenders.php?action=change_status', {
            method: 'POST', body: JSON.stringify({ id: id, status: ns }), headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json.success) {
            showToast('تم تغيير الحالة ✅', 'success');
            closeModal('change-status-modal');
            await fetchAppState();
        }
    };
}

function deleteTender(id) {
    const t = state.tenders.find(x => x.id === id); if (!t) return;
    openModal('confirm-delete-modal');
    document.getElementById('delete-tender-name').textContent = t.title.substring(0, 60) + '…';
    document.getElementById('delete-confirm-btn').onclick = async () => {
        if (!confirm(`هل أنت متأكد من حذف ${t.title} نهائياً؟`)) return;
        const res = await fetch('api/tenders.php?action=delete', {
            method: 'POST', body: JSON.stringify({ id: id }), headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json.success) {
            showToast('تم الحذف بنجاح', 'warning');
            closeModal('confirm-delete-modal');
            await fetchAppState();
        }
    };
}

function viewFiles(id) {
    state.filesViewTenderId = id;
    const t = state.tenders.find(x => x.id === id); if (!t) return;
    openModal('files-modal');
    document.getElementById('files-tender-title').textContent = t.title.substring(0, 60) + '…';
    const list = document.getElementById('files-list');
    list.innerHTML = !t.files.length
        ? '<p style="color:var(--text-muted);text-align:center;padding:20px">لا توجد ملفات مرفقة</p>'
        : t.files.map(f => {
            const ext = f.split('.').pop().toLowerCase();
            const icon = ext === 'pdf' ? '📄' : ['doc', 'docx'].includes(ext) ? '📝' : ['xls', 'xlsx'].includes(ext) ? '📊' : ext === 'zip' ? '🗜️' : '📎';
            return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1.5px solid var(--border);border-radius:10px;margin-bottom:8px">
        <span style="font-size:1.8rem">${icon}</span>
        <div style="flex:1"><div style="font-size:0.85rem;font-weight:600">${f}</div><div style="font-size:0.72rem;color:var(--text-muted)">${ext.toUpperCase()} — تم الرفع مع المناقصة</div></div>
        <button class="btn btn-sm btn-outline" style="font-size:0.75rem">⬇️ تحميل</button>
      </div>`;
        }).join('');
    document.getElementById('file-upload-input').value = '';
}

async function attachFiles() {
    const input = document.getElementById('file-upload-input');
    const tId = state.filesViewTenderId;
    if (!input.files.length) { showToast('اختر ملفات', 'warning'); return; }

    const fd = new FormData();
    fd.append('tender_id', tId);
    for (let i = 0; i < input.files.length; i++) {
        fd.append('files[]', input.files[i]);
    }

    try {
        const res = await fetch('api/files.php?action=upload', {
            method: 'POST',
            body: fd
        });
        const json = await res.json();
        if (json.success) {
            showToast(`تم رفع ${json.count} ملف ✅`, 'success');
            await fetchAppState();
            viewFiles(tId);
        } else {
            showToast(json.message || 'خطأ في الرفع', 'error');
        }
    } catch (e) {
        showToast('خطأ في الاتصال', 'error');
    }
}

/* ─────────────────────────────────────────────────────────────
   USER MANAGEMENT
   ───────────────────────────────────────────────────────────── */
function renderUsersTable() {
    const tbody = document.getElementById('users-tbody'); if (!tbody) return;
    tbody.innerHTML = state.users.map((u, i) => {
        const rl = ROLE_LABELS[u.role] || { label: u.role, color: '#666', bg: '#eee' };
        const statusHtml = u.status === 'active'
            ? '<span style="color:var(--success);font-weight:600">🟢 نشط</span>'
            : '<span style="color:var(--text-muted)">🔴 معطّل</span>';
        return `<tr>
      <td style="font-weight:700;text-align:center">${i + 1}</td>
      <td><div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:10px;background:${rl.bg};color:${rl.color};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1rem">${u.full_name[0]}</div>
        <div><div style="font-weight:600;font-size:0.88rem">${u.full_name}</div><div style="font-size:0.72rem;color:var(--text-muted)">@${u.username}</div></div>
      </div></td>
      <td style="font-size:0.83rem;color:var(--text-muted)">${u.email}</td>
      <td><span style="background:${rl.bg};color:${rl.color};padding:4px 12px;border-radius:20px;font-size:0.78rem;font-weight:700">${rl.label}</span></td>
      <td>${statusHtml}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${u.last_login}</td>
      <td><div style="display:flex;gap:5px">
        <button class="btn btn-sm" style="background:var(--primary-ultra);color:var(--primary)" onclick="openEditUser(${u.id})">✏️</button>
        <button class="btn btn-sm" style="background:rgba(212,175,55,0.1);color:var(--gold-dark)" onclick="toggleUserStatus(${u.id})" title="${u.status === 'active' ? 'تعطيل' : 'تفعيل'}">${u.status === 'active' ? '🔒' : '🔓'}</button>
        ${u.role !== 'admin' ? `<button class="btn btn-sm" style="background:rgba(220,53,69,0.1);color:var(--danger)" onclick="deleteUser(${u.id})">🗑️</button>` : ''}
      </div></td>
    </tr>`;
    }).join('');
}

function openAddUser() {
    openModal('user-modal');
    document.getElementById('user-modal-title').textContent = 'إضافة مستخدم جديد';
    document.getElementById('user-form').reset();
    document.getElementById('user-form-id').value = '';
}

function openEditUser(id) {
    const u = state.users.find(x => x.id === id); if (!u) return;
    openModal('user-modal');
    document.getElementById('user-modal-title').textContent = 'تعديل المستخدم';
    document.getElementById('user-form-id').value = id;
    document.getElementById('uf-name').value = u.full_name;
    document.getElementById('uf-username').value = u.username;
    document.getElementById('uf-email').value = u.email;
    document.getElementById('uf-role').value = u.role;
    document.getElementById('uf-status').value = u.status;
    document.getElementById('uf-password').value = '';
}

async function saveUserForm() {
    const id = document.getElementById('user-form-id').value;
    const name = document.getElementById('uf-name').value.trim();
    const username = document.getElementById('uf-username').value.trim();
    const email = document.getElementById('uf-email').value.trim();
    const role = document.getElementById('uf-role').value;
    const status = document.getElementById('uf-status').value;
    const password = document.getElementById('uf-password').value; // Optional on edit
    if (!name || !username || !email) { showToast('يرجى ملء الحقول الإلزامية', 'error'); return; }

    try {
        const res = await fetch('api/users.php?action=save', {
            method: 'POST', body: JSON.stringify({ id, username, full_name: name, email, role, status, password }),
            headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json.success) {
            showToast('تم حفظ المستخدم ✅', 'success');
            closeModal('user-modal');
            await fetchAppState();
        } else {
            showToast(json.message || 'حدث خطأ أثناء الحفظ', 'error');
        }
    } catch (e) { showToast('خطأ في الاتصال', 'error'); }
}

async function toggleUserStatus(id) {
    if (id == 1) { showToast('لا يمكن تعديل حالة المدير الرئيسي', 'error'); return; }
    try {
        const res = await fetch('api/users.php?action=toggle_status', {
            method: 'POST', body: JSON.stringify({ id })
        });
        if ((await res.json()).success) {
            showToast('تم تغيير حالة المستخدم', 'info');
            await fetchAppState();
        }
    } catch (e) { }
}

async function deleteUser(id) {
    if (id == 1) { showToast('لا يمكن حذف المسؤول الرئيسي', 'error'); return; }
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    try {
        const res = await fetch('api/users.php?action=delete', {
            method: 'POST', body: JSON.stringify({ id })
        });
        const json = await res.json();
        if (json.success) {
            showToast('تم حذف المستخدم', 'warning');
            await fetchAppState();
        } else {
            showToast(json.message || 'فشل الحذف', 'error');
        }
    } catch (e) { }
}

/* ─────────────────────────────────────────────────────────────
   SETTINGS PAGE
   ───────────────────────────────────────────────────────────── */
function setupSettingsForm() {
    document.getElementById('s-name').value = state.settings.name;
    document.getElementById('s-name-en').value = state.settings.name_en;
    document.getElementById('s-vat').value = state.settings.vat_rate;
    const prev = document.getElementById('logo-preview');
    if (prev) prev.src = state.settings.logo_custom || state.settings.logo_url;
}

function previewLogo(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
        state.settings.logo_custom = e.target.result;
        document.getElementById('logo-preview').src = e.target.result;
        showToast('تم تحديث معاينة الشعار', 'info');
    };
    reader.readAsDataURL(input.files[0]);
}

async function saveSettings() {
    const name = document.getElementById('s-name').value.trim() || state.settings.name;
    const name_en = document.getElementById('s-name-en').value.trim();
    const vat = +document.getElementById('s-vat').value || 15;
    const logo = state.settings.logo_custom || state.settings.logo_url;

    try {
        const res = await fetch('api/settings.php?action=save', {
            method: 'POST', body: JSON.stringify({
                company_name: name, company_name_en: name_en,
                vat_rate: vat, logo_custom: logo
            })
        });
        if ((await res.json()).success) {
            showToast('تم حفظ الإعدادات ✅', 'success');
            await fetchAppState();
        }
    } catch (e) { }
}

function resetLogo() {
    state.settings.logo_custom = null;
    const prev = document.getElementById('logo-preview');
    if (prev) prev.src = state.settings.logo_url;
    document.getElementById('logo-file-input').value = '';
    applySettings();
    showToast('تم إعادة الشعار الأصلي', 'info');
}

/* ─────────────────────────────────────────────────────────────
   IMPORT PAGE + CSV TEMPLATE
   ───────────────────────────────────────────────────────────── */
function setupImportPage() {
    document.getElementById('import-preview-table')?.classList.add('hide');
    document.getElementById('import-result').innerHTML = '';
}

function downloadTemplate() {
    const headers = [
        'عنوان_المناقصة', 'الرقم_المرجعي', 'رقم_المنافسة',
        'تاريخ_الاغلاق_BCD', 'المدة', 'الاجراء',
        'الفئة_Supply_Contracting_Marine_Other', 'الحالة_draft_submitted_won_lost_ongoing_not_submitted_under_review',
        'تاريخ_التقديم', 'السعر_المقدم_SAR', 'التكلفة_SAR', 'الربح_SAR', 'ملاحظات', 'رابط_اعتماد'
    ].join(',');

    const examples = [
        ['توريد أجهزة طبية لمستشفى الملك خالد', 'KKH-2026-001', '202600001', '2026-07-15T10:00', '120 يوم', 'منافسة مفتوحة', 'Supply', 'draft', '', '1500000', '1100000', '400000', '', 'https://eitmad.sa/tender/202600001'],
        ['خدمات رعاية صحية منزلية — الرياض', 'MOH-2026-HHC-002', '202600022', '2026-08-20T12:00', '365 يوم', 'منافسة محدودة', 'Contracting', 'submitted', '2026-05-10', '3000000', '2400000', '600000', 'مشروع سنوي قابل للتمديد', ''],
    ].map(r => r.map(csvEscape).join(','));

    const csv = '\uFEFF' + headers + '\n' + examples.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tender_import_template.csv';
    a.click(); URL.revokeObjectURL(url);
    showToast('تم تحميل قالب الاستيراد ✅', 'success');
}

function exportExcel() {
    const headers = ['#', 'عنوان المناقصة', 'الرقم المرجعي', 'BCD', 'الفئة', 'الحالة', 'السعر المقدم', 'التكلفة', 'الربح', 'ضريبة 15%', 'الإجمالي'];
    const rows = state.tenders.map(t => [
        t.id, t.title, t.reference, t.bcd || '',
        CATEGORY_LABELS[t.category] || t.category,
        STATUS_LABELS[t.status]?.label || t.status,
        t.submitted_price || '', t.cost || '', t.profit || '', t.vat || '',
        t.submitted_price && t.vat ? t.submitted_price + t.vat : ''
    ].map(csvEscape).join(','));
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tenders_export.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات ✅', 'success');
}

function handleImportFile(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result.replace(/^\uFEFF/, '');
        parseImportCSV(text);
    };
    reader.readAsText(input.files[0], 'UTF-8');
}

function parseImportCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { showToast('الملف فارغ أو تنسيق غير صحيح', 'error'); return; }
    const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const result = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        if (!vals[0] || !vals[1]) { errors.push(`سطر ${i + 1}: عنوان أو رقم مرجعي مفقود`); continue; }
        result.push({
            id: Math.max(0, ...state.tenders.map(t => t.id), ...result.map(r => r.id || 0)) + result.length + 1,
            title: vals[0] || '', reference: vals[1] || '', tender_number: vals[2] || '',
            bcd: vals[3] || null, duration: vals[4] || '', procedure: vals[5] || '',
            category: vals[6] || 'Other', status: vals[7] || 'draft',
            submission_date: vals[8] || null,
            submitted_price: vals[9] ? +vals[9].replace(/,/g, '') : null,
            cost: vals[10] ? +vals[10].replace(/,/g, '') : null,
            profit: vals[11] ? +vals[11].replace(/,/g, '') : null,
            vat: null, remarks: vals[12] || '', eitmad: vals[13] || '',
            costs: [], files: []
        });
    }
    renderImportPreview(result, errors);
}

function parseCSVLine(line) {
    const result = [], re = /("(?:[^"]|"")*"|[^,]*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        if (m.index === re.lastIndex) re.lastIndex++;
        let v = m[1];
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
        result.push(v.trim());
    }
    return result;
}

function renderImportPreview(data, errors) {
    const el = document.getElementById('import-result'); if (!el) return;
    if (errors.length) {
        el.innerHTML = `<div style="background:rgba(220,53,69,0.07);border-right:4px solid var(--danger);padding:14px;border-radius:10px;margin-bottom:12px">
      <div style="font-weight:700;color:var(--danger);margin-bottom:6px">⚠️ تحذيرات (${errors.length})</div>
      ${errors.map(e => `<div style="font-size:0.82rem;color:var(--danger)">• ${e}</div>`).join('')}
    </div>`;
    } else { el.innerHTML = ''; }

    if (!data.length) { el.innerHTML += '<p style="color:var(--text-muted)">لا توجد بيانات صالحة للاستيراد</p>'; return; }

    el.innerHTML += `<div style="background:rgba(32,201,151,0.07);border-right:4px solid var(--success);padding:14px;border-radius:10px;margin-bottom:16px">
    ✅ تم قراءة <strong>${data.length}</strong> مناقصة بنجاح. راجع البيانات أدناه ثم اضغط "استيراد".
  </div>
  <div class="table-wrapper" style="margin-bottom:14px">
    <table><thead><tr><th>العنوان</th><th>الرقم المرجعي</th><th>الفئة</th><th>الحالة</th><th>السعر</th></tr></thead>
    <tbody>${data.map(t => `<tr>
      <td class="td-truncate" title="${t.title}" style="max-width:200px">${t.title}</td>
      <td style="font-size:0.78rem">${t.reference}</td>
      <td>${CATEGORY_LABELS[t.category] || t.category}</td>
      <td><span class="badge ${STATUS_LABELS[t.status]?.badge || 'badge-draft'}">${STATUS_LABELS[t.status]?.label || t.status}</span></td>
      <td>${formatSAR(t.submitted_price)}</td>
    </tr>`).join('')}</tbody></table>
  </div>
  <button class="btn btn-primary" onclick="confirmImport(${encodeURIComponent(JSON.stringify(data))})">📥 تأكيد الاستيراد (${data.length} مناقصة)</button>`;
}

async function confirmImport(encoded) {
    let data;
    try { data = JSON.parse(decodeURIComponent(encoded)); } catch (e) { showToast('خطأ في البيانات', 'error'); return; }

    try {
        const res = await fetch('api/tenders.php?action=import', {
            method: 'POST', body: JSON.stringify({ tenders: data }), headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json.success) {
            showToast(`تم استيراد ${json.count} مناقصة بنجاح ✅`, 'success');
            document.getElementById('import-result').innerHTML = '';
            document.getElementById('csv-import-input').value = '';
            await fetchAppState();
            document.querySelectorAll('.nav-link[data-page="tenders"]')[0]?.click();
        } else {
            showToast('حدث خطأ أثناء الاستيراد', 'error');
        }
    } catch (e) { showToast('خطأ في الاتصال', 'error'); }
}

/* ─────────────────────────────────────────────────────────────
   REPORTS PAGE
   ───────────────────────────────────────────────────────────── */
function renderReportsTable() {
    const statValEl = document.getElementById('rep-stat-value');
    if (!statValEl) return; // not on page yet

    const statusFilter = document.getElementById('rep-filter-status').value;
    const categoryFilter = document.getElementById('rep-filter-category').value;

    let data = [...state.tenders];
    if (statusFilter) data = data.filter(t => t.status === statusFilter);
    if (categoryFilter) data = data.filter(t => t.category === categoryFilter);

    // Stats
    const repValue = data.reduce((s, t) => s + (t.submitted_price || 0), 0);
    const repCost = data.reduce((s, t) => s + (t.cost || 0), 0);
    const repProfit = data.reduce((s, t) => s + (t.profit || 0), 0);

    statValEl.textContent = formatSAR(repValue);
    document.getElementById('rep-stat-cost').textContent = formatSAR(repCost);
    document.getElementById('rep-stat-profit').textContent = formatSAR(repProfit);

    const tbody = document.getElementById('reports-tbody');
    tbody.innerHTML = !data.length
        ? `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد نتائج تطابق التصفية</td></tr>`
        : data.map((t, i) => {
            const st = STATUS_LABELS[t.status] || { label: t.status, badge: 'badge-draft' };
            return `<tr>
          <td style="font-weight:600;color:var(--primary)">${i + 1}</td>
          <td class="td-truncate" title="${t.title}">${t.title}</td>
          <td style="font-size:0.78rem;color:var(--text-muted);direction:ltr">${t.reference}</td>
          <td><span style="background:var(--bg2);padding:3px 8px;border-radius:6px;font-size:0.78rem">${CATEGORY_LABELS[t.category] || t.category}</span></td>
          <td><span class="badge ${st.badge}">${st.label}</span></td>
          <td style="font-weight:600">${formatSAR(t.submitted_price)}</td>
          <td style="color:${t.profit > 0 ? 'var(--success)' : 'var(--text-muted)'};font-weight:600">${formatSAR(t.profit)}</td>
        </tr>`;
        }).join('');
}

function exportReportExcel() {
    const statusFilter = document.getElementById('rep-filter-status').value;
    const categoryFilter = document.getElementById('rep-filter-category').value;

    let data = [...state.tenders];
    if (statusFilter) data = data.filter(t => t.status === statusFilter);
    if (categoryFilter) data = data.filter(t => t.category === categoryFilter);

    if (!data.length) { showToast('لا توجد بيانات للتصدير', 'warning'); return; }

    const headers = ['#', 'عنوان المناقصة', 'الرقم المرجعي', 'الفئة', 'الحالة', 'التكلفة (﷼)', 'السعر المقدم (﷼)', 'الربح (﷼)'];
    const rows = data.map((t, i) => [
        i + 1, t.title, t.reference, CATEGORY_LABELS[t.category] || t.category,
        STATUS_LABELS[t.status]?.label || t.status,
        t.cost || 0, t.submitted_price || 0, t.profit || 0
    ].map(csvEscape).join(','));

    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tender_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير التقرير ✅', 'success');
    addLog('تصدير تقرير', `تم تصدير تقرير بعدد ${data.length} سجل`);
}

/* ─────────────────────────────────────────────────────────────
   LOGS
   ───────────────────────────────────────────────────────────── */
let activityLog = [
    { time: new Date(Date.now() - 86400000 * 2), action: 'تسجيل دخول', desc: 'من IP: 192.168.1.5' },
    { time: new Date(Date.now() - 86400000), action: 'إضافة مناقصة', desc: 'خدمات الرعاية الصحية المنزلية...' },
    { time: new Date(Date.now() - 7200000), action: 'تحديث BOQ', desc: 'توريد أجهزة طبية — 5 بنود' },
    { time: new Date(Date.now() - 3600000), action: 'تغيير الحالة', desc: 'المناقصة #3 → فاز' },
    { time: new Date(Date.now() - 1800000), action: 'رفع ملف', desc: 'technical_specs.pdf' },
];

function addLog(action, desc) { activityLog.unshift({ time: new Date(), action, desc }); }

function renderLogs() {
    const tbody = document.getElementById('logs-tbody'); if (!tbody) return;
    tbody.innerHTML = activityLog.map((l, i) => `<tr>
    <td>${i + 1}</td>
    <td style="font-size:0.78rem;color:var(--text-muted)">${l.time.toLocaleString('ar-SA')}</td>
    <td><span style="background:var(--primary-ultra);color:var(--primary);padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600">${l.action}</span></td>
    <td style="font-size:0.85rem">${l.desc}</td>
    <td style="font-size:0.78rem;color:var(--text-muted)">مسؤول النظام</td>
  </tr>`).join('');
}

/* ─────────────────────────────────────────────────────────────
   CHARTS TOGGLE
   ───────────────────────────────────────────────────────────── */
function toggleCharts() {
    state.chartsVisible = !state.chartsVisible;
    const section = document.getElementById('charts-section');
    const btn = document.getElementById('toggle-charts-btn');
    if (section) section.style.display = state.chartsVisible ? 'block' : 'none';
    if (btn) btn.textContent = state.chartsVisible ? '📊 إخفاء الرسوم البيانية' : '📊 إظهار الرسوم البيانية';
    if (state.chartsVisible) setTimeout(() => renderCharts(computeStats()), 50);
}

/* ─────────────────────────────────────────────────────────────
   MODAL HELPERS
   ───────────────────────────────────────────────────────────── */
function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); });

/* ─────────────────────────────────────────────────────────────
   TOAST
   ───────────────────────────────────────────────────────────── */
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span style="font-size:1.2rem">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
