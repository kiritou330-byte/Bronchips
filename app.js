// =============================================
// CRM Owner Dashboard - Application Logic
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initDate();
  initMemberDashboard();
  initPromoDashboard();
  initLaporanDashboard();
  initAkunDashboard();
  initMobileMenu();
  initRefreshBtn();
});

// =========================================
// NAVIGATION
// =========================================
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-page]");
  const sections = document.querySelectorAll(".dashboard-section");

  const pageTitles = {
    member: { title: "Dasbor Member", subtitle: "Kelola semua data member Anda" },
    promo: { title: "Dasbor Promo", subtitle: "Kelola campaign dan promosi" },
    laporan: { title: "Dasbor Laporan", subtitle: "Laporan lengkap bisnis Anda" },
    akun: { title: "Manajemen Akun", subtitle: "Kelola user dan akses sistem" },
  };

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;

      // Update nav active
      navItems.forEach((n) => n.classList.remove("active"));
      item.classList.add("active");

      // Update sections
      sections.forEach((s) => s.classList.remove("active"));
      document.getElementById(`section-${page}`).classList.add("active");

      // Update header
      document.getElementById("pageTitle").textContent = pageTitles[page].title;
      document.getElementById("pageSubtitle").textContent = pageTitles[page].subtitle;

      // Close mobile menu
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("sidebarOverlay").classList.remove("show");

      // Reinit charts if laporan
      if (page === "laporan") {
        setTimeout(() => initCampaignChart(), 100);
      }
    });
  });
}

// =========================================
// DATE DISPLAY
// =========================================
function initDate() {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("dateDisplay").textContent = now.toLocaleDateString("id-ID", options);
}

// =========================================
// MOBILE MENU
// =========================================
function initMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });
}

// =========================================
// REFRESH BUTTON
// =========================================
function initRefreshBtn() {
  document.getElementById("refreshBtn").addEventListener("click", () => {
    showToast("Data berhasil di-refresh!", "success");
  });
}

// =========================================
// GLOBAL STATE
// =========================================
const currentUserRole = "Owner"; // Change to "Admin" to see role-based UI
window.editingRow = null;
window.editingType = null;

// =========================================
// CRUD HELPERS
// =========================================
function getActionButtonsHTML(type) {
  return `
    <td>
      <button class="btn btn-icon btn-secondary" onclick="editRow(this, '${type}')" title="Edit">✏️</button>
      <button class="btn btn-icon btn-danger" onclick="deleteRow(this)" title="Hapus">🗑️</button>
    </td>
  `;
}

function deleteRow(btn) {
  if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
    btn.closest("tr").remove();
    showToast("Data berhasil dihapus", "success");
  }
}

function getModalConfig(type) {
  const map = {
    'member': { modalId: 'modalAddMember', titleId: 'modalMemberTitle', formId: 'formAddMember', tableName: 'member' },
    'claim': { modalId: 'modalAddCampaignClaim', titleId: 'modalClaimTitle', formId: 'formAddCampaignClaim', tableName: 'member_campaign_claim' },
    'tx': { modalId: 'modalAddTransaction', titleId: 'modalTxTitle', formId: 'formAddTransaction', tableName: 'member_transaction_history' },
    'level': { modalId: 'modalAddLevel', titleId: 'modalLevelTitle', formId: 'formAddLevel', tableName: 'member_level' }
  };
  return map[type];
}

function openAddModal(type) {
  window.editingRow = null;
  window.editingType = type;
  const config = getModalConfig(type);
  document.getElementById(config.titleId).textContent = `Tambah ${config.tableName}`;
  document.getElementById(config.formId).reset();
  openModal(config.modalId);
}

function editRow(btn, type) {
  const tr = btn.closest("tr");
  window.editingRow = tr;
  window.editingType = type;
  const config = getModalConfig(type);
  
  document.getElementById(config.titleId).textContent = `Edit ${config.tableName}`;
  const tds = tr.querySelectorAll("td");
  
  if (type === 'member') {
    document.getElementById("fmName").value = tds[1].textContent;
    document.getElementById("fmWa").value = tds[2].textContent.replace('+', '');
    const levelSelect = document.getElementById("fmLevel");
    const option = Array.from(levelSelect.options).find(o => o.text.includes(tds[3].textContent));
    levelSelect.value = option ? option.value : "";
  } else if (type === 'claim') {
    document.getElementById("fccMemberId").value = tds[1].textContent;
    document.getElementById("fccCampCode").value = tds[2].textContent;
  } else if (type === 'tx') {
    document.getElementById("ftMemberId").value = tds[1].textContent;
    document.getElementById("ftCode").value = tds[2].textContent;
    document.getElementById("ftAmount").value = tds[3].textContent.replace(/[^0-9]/g, '');
  } else if (type === 'level') {
    document.getElementById("flName").value = tds[1].textContent;
    document.getElementById("flMinTx").value = tds[2].textContent.replace(/[^0-9]/g, '');
    document.getElementById("flDesc").value = tds[3].textContent;
  }
  
  openModal(config.modalId);
}

// =========================================
// 1. MEMBER DASHBOARD
// =========================================
function initMemberDashboard() {
  // Hide member level widget if not Owner
  if (currentUserRole !== "Owner") {
    document.getElementById("widget-level").style.display = "none";
  }

  // Animate widget values
  animateCounter("w-total-members", MOCK_DATA.stats.totalMembers, 800);
  animateCounter("w-campaign-claims", MOCK_DATA.stats.totalCampaignClaims, 1000);
  animateCounter("w-transactions", MOCK_DATA.stats.totalTransactions, 1200);

  // Render main member table
  renderMemberTable(MOCK_DATA.members);

  // Search
  document.getElementById("memberSearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = MOCK_DATA.members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.noWa.includes(q) || m.level.toLowerCase().includes(q)
    );
    renderMemberTable(filtered);
  });

  // Widget Clicks
  const masterView = document.getElementById("memberMasterView");
  const detailViews = document.getElementById("memberDetailViews");
  const tableViews = document.querySelectorAll(".detail-view-table");

  const showDetailView = (viewId) => {
    masterView.style.display = "none";
    detailViews.style.display = "block";
    tableViews.forEach(t => t.style.display = "none");
    document.getElementById(viewId).style.display = "block";
  };

  document.getElementById("widget-member").addEventListener("click", () => {
    renderFullMemberTable(MOCK_DATA.members);
    showDetailView("view-table-member");
  });

  document.getElementById("widget-campaign-claim").addEventListener("click", () => {
    renderFullCampaignClaimTable();
    showDetailView("view-table-campaign-claim");
  });

  document.getElementById("widget-transaction").addEventListener("click", () => {
    renderFullTransactionTable();
    showDetailView("view-table-transaction");
  });

  document.getElementById("widget-level").addEventListener("click", () => {
    renderFullLevelTable();
    showDetailView("view-table-level");
  });

  // Back button
  document.getElementById("btnBackToMemberMaster").addEventListener("click", () => {
    detailViews.style.display = "none";
    masterView.style.display = "block";
  });

  initMemberForms();
}

function initMemberForms() {
  updateLevelDropdown();

  // Form Add Member
  document.getElementById("formAddMember").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("fmName").value;
    const wa = document.getElementById("fmWa").value;
    const levelSelect = document.getElementById("fmLevel");
    const levelText = levelSelect.options[levelSelect.selectedIndex].text.split(' - ')[1] || levelSelect.value;
    const now = new Date().toISOString();

    const trHtml = `
      <td>${window.editingRow ? window.editingRow.cells[0].textContent : Math.floor(Math.random() * 1000) + 100}</td>
      <td style="color:var(--text-primary);font-weight:600;">${name}</td>
      <td style="font-family:monospace;font-size:0.8rem;">+${wa}</td>
      <td>${levelText}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${window.editingRow ? window.editingRow.cells[4].textContent : now}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${now}</td>
      ${getActionButtonsHTML('member')}
    `;

    if (window.editingRow) {
      window.editingRow.innerHTML = trHtml;
      showToast(`Member ${name} berhasil diubah!`, "success");
    } else {
      const tbody = document.getElementById("fullMemberTableBody");
      const tr = document.createElement("tr");
      tr.innerHTML = trHtml;
      tbody.appendChild(tr);
      showToast(`Member ${name} berhasil ditambahkan!`, "success");
    }

    closeModal("modalAddMember");
  });

  // Form Add Campaign Claim
  document.getElementById("formAddCampaignClaim").addEventListener("submit", (e) => {
    e.preventDefault();
    const memberId = document.getElementById("fccMemberId").value;
    const code = document.getElementById("fccCampCode").value;
    const now = new Date().toISOString();

    const trHtml = `
      <td>${window.editingRow ? window.editingRow.cells[0].textContent : Math.floor(Math.random() * 1000) + 100}</td>
      <td>${memberId}</td>
      <td><span class="badge badge-blue">${code}</span></td>
      <td>${window.editingRow ? window.editingRow.cells[3].textContent : now}</td>
      ${getActionButtonsHTML('claim')}
    `;

    if (window.editingRow) {
      window.editingRow.innerHTML = trHtml;
      showToast(`Klaim campaign ${code} berhasil diubah!`, "success");
    } else {
      const tbody = document.getElementById("fullCampaignClaimTableBody");
      const tr = document.createElement("tr");
      tr.innerHTML = trHtml;
      tbody.appendChild(tr);
      showToast(`Klaim campaign ${code} ditambahkan!`, "success");
    }

    closeModal("modalAddCampaignClaim");
  });

  // Form Add Transaction
  document.getElementById("formAddTransaction").addEventListener("submit", (e) => {
    e.preventDefault();
    const memberId = document.getElementById("ftMemberId").value;
    const code = document.getElementById("ftCode").value;
    const amount = document.getElementById("ftAmount").value;
    const now = new Date().toISOString();

    const trHtml = `
      <td>${window.editingRow ? window.editingRow.cells[0].textContent : Math.floor(Math.random() * 1000) + 100}</td>
      <td>${memberId}</td>
      <td><span class="badge badge-purple">${code}</span></td>
      <td style="color:var(--accent-green);font-weight:600;">Rp ${formatNumber(amount)}</td>
      <td>${window.editingRow ? window.editingRow.cells[4].textContent : now}</td>
      ${getActionButtonsHTML('tx')}
    `;

    if (window.editingRow) {
      window.editingRow.innerHTML = trHtml;
      showToast(`Transaksi ${code} berhasil diubah!`, "success");
    } else {
      const tbody = document.getElementById("fullTransactionTableBody");
      const tr = document.createElement("tr");
      tr.innerHTML = trHtml;
      tbody.appendChild(tr);
      showToast(`Transaksi ${code} berhasil disimpan!`, "success");
    }

    closeModal("modalAddTransaction");
  });

  // Form Add Level
  document.getElementById("formAddLevel").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("flName").value;
    const minTx = document.getElementById("flMinTx").value;
    const desc = document.getElementById("flDesc").value;

    const trHtml = `
      <td>${window.editingRow ? window.editingRow.cells[0].textContent : Math.floor(Math.random() * 1000) + 100}</td>
      <td style="color:var(--text-primary);font-weight:600;text-transform:lowercase;">${name}</td>
      <td>${formatNumber(minTx)}</td>
      <td>${desc}</td>
      ${getActionButtonsHTML('level')}
    `;

    if (window.editingRow) {
      window.editingRow.innerHTML = trHtml;
      showToast(`Level ${name} berhasil diubah!`, "success");
      // Update mock data for dropdown if it's an edit
      const mockLevel = MOCK_DATA.memberLevels.find(l => l.level.toLowerCase() === window.editingRow.cells[1].textContent.toLowerCase());
      if (mockLevel) {
        mockLevel.level = name;
        mockLevel.minSpend = parseInt(minTx);
      }
    } else {
      const tbody = document.getElementById("fullLevelTableBody");
      const tr = document.createElement("tr");
      tr.innerHTML = trHtml;
      tbody.appendChild(tr);
      MOCK_DATA.memberLevels.push({
        level: name,
        minSpend: parseInt(minTx),
        maxSpend: 999999999,
        discount: 0,
        color: "#ffffff",
        count: 0
      });
      showToast(`Level ${name} berhasil ditambahkan!`, "success");
    }

    updateLevelDropdown();
    closeModal("modalAddLevel");
  });
}

function renderFullMemberTable(members) {
  const tbody = document.getElementById("fullMemberTableBody");
  tbody.innerHTML = members.map(m => `
    <tr>
      <td>${m.id}</td>
      <td style="color:var(--text-primary);font-weight:600;">${m.name}</td>
      <td style="font-family:monospace;font-size:0.8rem;">+${m.noWa.slice(2)}</td>
      <td>${m.level}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${m.joinDate}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${m.joinDate}</td>
      ${getActionButtonsHTML('member')}
    </tr>
  `).join("");
}

function updateLevelDropdown() {
  const select = document.getElementById("fmLevel");
  if (!select) return;
  select.innerHTML = '<option value="">Pilih Level...</option>' + 
    MOCK_DATA.memberLevels.map((lvl, idx) => 
      `<option value="${idx + 1}">${idx + 1} - ${lvl.level}</option>`
    ).join("");
}

function renderFullCampaignClaimTable() {
  const tbody = document.getElementById("fullCampaignClaimTableBody");
  let html = "";
  let idCounter = 1;
  Object.keys(MOCK_DATA.campaignClaims).forEach(memberId => {
    MOCK_DATA.campaignClaims[memberId].forEach(claim => {
      html += `
        <tr>
          <td>${idCounter++}</td>
          <td>${memberId}</td>
          <td><span class="badge badge-blue">${claim.code}</span></td>
          <td>${claim.claimedAt}</td>
          ${getActionButtonsHTML('claim')}
        </tr>
      `;
    });
  });
  tbody.innerHTML = html;
}

function renderFullTransactionTable() {
  const tbody = document.getElementById("fullTransactionTableBody");
  let html = "";
  let idCounter = 1;
  Object.keys(MOCK_DATA.transactionHistory).forEach(memberId => {
    MOCK_DATA.transactionHistory[memberId].forEach(tx => {
      html += `
        <tr>
          <td>${idCounter++}</td>
          <td>${memberId}</td>
          <td><span class="badge badge-purple">${tx.id}</span></td>
          <td style="color:var(--accent-green);font-weight:600;">Rp ${formatNumber(tx.amount)}</td>
          <td>${tx.date}</td>
          ${getActionButtonsHTML('tx')}
        </tr>
      `;
    });
  });
  tbody.innerHTML = html;
}

function renderFullLevelTable() {
  const tbody = document.getElementById("fullLevelTableBody");
  tbody.innerHTML = MOCK_DATA.memberLevels.map((lvl, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="color:var(--text-primary);font-weight:600;text-transform:lowercase;">${lvl.level.toLowerCase()}</td>
      <td>${formatNumber(lvl.minSpend)}</td>
      <td>Diskon ${lvl.discount}%</td>
      ${getActionButtonsHTML('level')}
    </tr>
  `).join("");
}

function renderMemberTable(members) {
  const tbody = document.getElementById("memberTableBody");
  const levelBadgeClass = { Bronze: "badge-bronze", Silver: "badge-silver", Gold: "badge-gold", Platinum: "badge-platinum" };

  tbody.innerHTML = members
    .map(
      (m, i) => `
    <tr>
      <td style="color:var(--text-primary);font-weight:600;">${m.name}</td>
      <td><span style="font-family:monospace;font-size:0.8rem;">+${m.noWa.slice(2)}</span></td>
      <td><span class="badge ${levelBadgeClass[m.level]}">${m.level}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="showMemberDetail(${m.id})">
          📋 Detail
        </button>
      </td>
    </tr>
  `
    )
    .join("");

  document.getElementById("memberCount").textContent = `${members.length} member`;
}

function showMemberDetail(memberId) {
  const member = MOCK_DATA.members.find((m) => m.id === memberId);
  if (!member) return;

  document.getElementById("memberDetailTitle").textContent = `Detail: ${member.name}`;

  // Claims
  const claims = MOCK_DATA.campaignClaims[memberId] || [];
  const claimsBody = document.getElementById("memberClaimsBody");
  if (claims.length === 0) {
    claimsBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">🎫</div><p>Belum ada campaign claim</p></div></td></tr>`;
  } else {
    let idCounter = 1;
    claimsBody.innerHTML = claims
      .map(
        (c) => `
      <tr>
        <td>${idCounter++}</td>
        <td>${memberId}</td>
        <td><span class="badge badge-blue">${c.code}</span></td>
        <td>${c.claimedAt}</td>
      </tr>
    `
      )
      .join("");
  }

  // Transactions
  const transactions = MOCK_DATA.transactionHistory[memberId] || [];
  const txBody = document.getElementById("memberTransactionsBody");
  if (transactions.length === 0) {
    txBody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💰</div><p>Belum ada transaksi</p></div></td></tr>`;
  } else {
    let idCounter = 1;
    txBody.innerHTML = transactions
      .map(
        (t) => `
      <tr>
        <td>${idCounter++}</td>
        <td>${memberId}</td>
        <td><span class="badge badge-purple">${t.id}</span></td>
        <td style="color:var(--accent-green);font-weight:600;">Rp ${formatNumber(t.amount)}</td>
        <td>${t.date}</td>
      </tr>
    `
      )
      .join("");
  }

  // Reset tabs
  document.querySelectorAll("#memberDetailTabs .tab").forEach((t) => t.classList.remove("active"));
  document.querySelector('#memberDetailTabs .tab[data-member-tab="member-claims"]').classList.add("active");
  document.getElementById("member-claims").classList.add("active");
  document.getElementById("member-transactions").classList.remove("active");

  // Tab switching for modal
  document.querySelectorAll("#memberDetailTabs .tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll("#memberDetailTabs .tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("member-claims").classList.toggle("active", tab.dataset.memberTab === "member-claims");
      document.getElementById("member-transactions").classList.toggle("active", tab.dataset.memberTab === "member-transactions");
    };
  });

  openModal("memberDetailModal");
}

// =========================================
// 2. PROMO DASHBOARD
// =========================================
function initPromoDashboard() {
  renderCampaignTable(MOCK_DATA.campaigns);

  // Campaign form
  document.getElementById("campaignForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const newCampaign = {
      id: MOCK_DATA.campaigns.length + 1,
      code: document.getElementById("campCode").value.toUpperCase(),
      name: document.getElementById("campName").value,
      isiPesan: document.getElementById("campMessage").value,
      discount: parseInt(document.getElementById("campDiscount").value),
      status: "Aktif",
      expDate: document.getElementById("campExpDate").value,
      totalClaims: 0,
      totalUsed: 0,
    };
    MOCK_DATA.campaigns.push(newCampaign);
    renderCampaignTable(MOCK_DATA.campaigns);
    e.target.reset();
    showToast(`Campaign "${newCampaign.name}" berhasil dibuat!`, "success");
  });

  // Filter chips
  document.querySelectorAll("[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      const filtered = filter === "all" ? MOCK_DATA.campaigns : MOCK_DATA.campaigns.filter((c) => c.status === filter);
      renderCampaignTable(filtered);
    });
  });
}

function renderCampaignTable(campaigns) {
  const tbody = document.getElementById("campaignTableBody");
  tbody.innerHTML = campaigns
    .map(
      (c) => `
    <tr>
      <td><span class="badge badge-blue">${c.code}</span></td>
      <td style="color:var(--text-primary);font-weight:600;">${c.name}</td>
      <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${c.isiPesan}">${c.isiPesan}</td>
      <td><span class="badge badge-purple">${c.discount}%</span></td>
      <td><span class="badge ${c.status === "Aktif" ? "badge-success" : "badge-danger"}">${c.status}</span></td>
      <td>${c.expDate}</td>
      <td>${c.totalClaims} / ${c.totalUsed}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="showCampaignDetail(${c.id})">
          📋 Detail
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

function showCampaignDetail(campaignId) {
  const campaign = MOCK_DATA.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return;

  document.getElementById("campaignDetailTitle").textContent = `Campaign: ${campaign.name} (${campaign.code})`;

  const history = MOCK_DATA.campaignHistory[campaignId] || [];
  const tbody = document.getElementById("campaignHistoryBody");

  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada riwayat klaim</p></div></td></tr>`;
  } else {
    const statusBadge = (s) => {
      if (s === "Terpakai") return "badge-success";
      if (s === "Aktif") return "badge-info";
      return "badge-danger";
    };
    tbody.innerHTML = history
      .map(
        (h) => `
      <tr>
        <td style="color:var(--text-primary);font-weight:500;">${h.member}</td>
        <td>${h.claimedAt}</td>
        <td>${h.usedAt}</td>
        <td><span class="badge ${statusBadge(h.status)}">${h.status}</span></td>
      </tr>
    `
      )
      .join("");
  }

  openModal("campaignDetailModal");
}

// =========================================
// 3. LAPORAN DASHBOARD
// =========================================
function initLaporanDashboard() {
  initLaporanTabs();
  initFollowUpTable();
  initStockTable();
  initAISummary();
  initActivityLog();

  // Delay chart init slightly for proper sizing
  setTimeout(() => initCampaignChart(), 300);
}

function initLaporanTabs() {
  const tabs = document.querySelectorAll("#laporanTabs .tab");
  const contents = document.querySelectorAll("#section-laporan .tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");

      if (tab.dataset.tab === "tab-campaign") {
        setTimeout(() => initCampaignChart(), 100);
      }
    });
  });
}

let campaignChart = null;
function initCampaignChart() {
  const ctx = document.getElementById("campaignClaimChart");
  if (!ctx) return;

  if (campaignChart) {
    campaignChart.destroy();
  }

  const data = MOCK_DATA.campaignClaimMonthly;
  const colors = ["#6385ff", "#a855f7", "#00d4ff", "#f59e0b", "#ec4899"];
  const datasets = Object.entries(data.datasets).map(([name, values], i) => ({
    label: name,
    data: values,
    backgroundColor: colors[i] + "20",
    borderColor: colors[i],
    borderWidth: 2,
    fill: true,
    tension: 0.4,
    pointBackgroundColor: colors[i],
    pointBorderColor: "#0d1127",
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
  }));

  campaignChart = new Chart(ctx, {
    type: "line",
    data: { labels: data.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#8b92b3",
            font: { family: "Inter", size: 11 },
            padding: 16,
            usePointStyle: true,
            pointStyle: "rectRounded",
          },
        },
        tooltip: {
          backgroundColor: "#1a1f3a",
          titleColor: "#f0f2ff",
          bodyColor: "#8b92b3",
          borderColor: "rgba(99, 133, 255, 0.2)",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: "Inter", weight: "600" },
          bodyFont: { family: "Inter" },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
          ticks: { color: "#5a6080", font: { family: "Inter", size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
          ticks: { color: "#5a6080", font: { family: "Inter", size: 11 } },
          beginAtZero: true,
        },
      },
      interaction: { intersect: false, mode: "index" },
    },
  });

  // Render leaderboard
  renderCampaignLeaderboard();
}

function renderCampaignLeaderboard() {
  const container = document.getElementById("campaignLeaderboard");
  const sorted = [...MOCK_DATA.campaigns].sort((a, b) => b.totalClaims - a.totalClaims);
  const maxClaims = sorted[0]?.totalClaims || 1;

  container.innerHTML = sorted
    .map((c, i) => {
      const rankClass = i < 3 ? `rank-${i + 1}` : "rank-other";
      const barWidth = (c.totalClaims / maxClaims) * 100;
      return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">${i + 1}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${c.name}</div>
          <div class="leaderboard-code">${c.code}</div>
        </div>
        <div class="leaderboard-bar">
          <div class="leaderboard-bar-fill" style="width:${barWidth}%"></div>
        </div>
        <div class="leaderboard-value">${c.totalClaims}</div>
      </div>
    `;
    })
    .join("");
}

function initFollowUpTable() {
  renderFollowUpTable(MOCK_DATA.chatFollowUp);

  document.querySelectorAll("[data-followup-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-followup-filter]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.followupFilter;
      const filtered = filter === "all" ? MOCK_DATA.chatFollowUp : MOCK_DATA.chatFollowUp.filter((c) => c.status === filter);
      renderFollowUpTable(filtered);
    });
  });
}

function renderFollowUpTable(data) {
  const tbody = document.getElementById("followUpTableBody");
  const statusBadge = (s) => {
    const map = {
      Replied: "badge-success",
      Pending: "badge-warning",
      "Follow Up": "badge-info",
      Escalated: "badge-danger",
    };
    return map[s] || "badge-info";
  };

  tbody.innerHTML = data
    .map(
      (c) => `
    <tr>
      <td style="color:var(--text-primary);font-weight:500;">${c.member}</td>
      <td>${c.lastChat}</td>
      <td>${c.topic}</td>
      <td><span class="badge ${statusBadge(c.status)}">${c.status}</span></td>
      <td>${c.agent === "-" ? '<span style="color:var(--text-muted)">—</span>' : `<span class="badge badge-purple">${c.agent}</span>`}</td>
    </tr>
  `
    )
    .join("");
}

function initStockTable() {
  renderStockTable(MOCK_DATA.stockItems);

  document.querySelectorAll("[data-stock-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-stock-filter]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.stockFilter;
      const filtered = filter === "all" ? MOCK_DATA.stockItems : MOCK_DATA.stockItems.filter((s) => s.status === filter);
      renderStockTable(filtered);
    });
  });
}

function renderStockTable(data) {
  const tbody = document.getElementById("stockTableBody");
  const statusBadge = (s) => {
    if (s === "Habis") return "badge-danger";
    if (s === "Hampir Habis") return "badge-warning";
    return "badge-success";
  };

  tbody.innerHTML = data
    .map(
      (s) => `
    <tr>
      <td><span class="badge badge-blue">${s.sku}</span></td>
      <td style="color:var(--text-primary);font-weight:500;">${s.name}</td>
      <td style="font-weight:700;color:${s.stock === 0 ? "var(--accent-red)" : s.stock < s.minStock ? "var(--accent-orange)" : "var(--accent-green)"}">${s.stock}</td>
      <td>${s.minStock}</td>
      <td>${s.unit}</td>
      <td><span class="badge ${statusBadge(s.status)}">${s.status}</span></td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${s.lastUpdate}</td>
    </tr>
  `
    )
    .join("");
}

function initAISummary() {
  const container = document.getElementById("aiSummaryContainer");
  container.innerHTML = MOCK_DATA.aiDailySummary
    .map(
      (s) => `
    <div class="summary-card">
      <div class="summary-date">📅 ${formatDate(s.date)}</div>
      <div class="summary-text">${s.summary}</div>
      <div class="summary-highlights">
        ${s.highlights.map((h) => `<span class="highlight-tag">${h}</span>`).join("")}
      </div>
      <div class="summary-sentiment">🎭 Sentimen: ${s.sentiment}</div>
    </div>
  `
    )
    .join("");
}

function initActivityLog() {
  renderActivityLog(MOCK_DATA.activityLog);

  document.querySelectorAll("[data-log-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-log-filter]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.logFilter;
      const filtered = filter === "all" ? MOCK_DATA.activityLog : MOCK_DATA.activityLog.filter((l) => l.category === filter);
      renderActivityLog(filtered);
    });
  });
}

function renderActivityLog(data) {
  const tbody = document.getElementById("activityLogBody");
  const catBadge = (c) => {
    const map = {
      Auth: "badge-blue",
      Campaign: "badge-purple",
      Chat: "badge-info",
      Member: "badge-success",
      Stock: "badge-warning",
      AI: "badge-pink",
      Report: "badge-blue",
      System: "badge-info",
    };
    return map[c] || "badge-info";
  };

  tbody.innerHTML = data
    .map(
      (l) => `
    <tr>
      <td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;">${l.timestamp}</td>
      <td style="color:var(--text-primary);font-weight:500;">${l.user}</td>
      <td>${l.action}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;" title="${l.detail}">${l.detail}</td>
      <td><span class="badge ${catBadge(l.category)}">${l.category}</span></td>
    </tr>
  `
    )
    .join("");
}

// =========================================
// 4. AKUN DASHBOARD
// =========================================
function initAkunDashboard() {
  renderUsersTable();

  document.getElementById("addUserBtn").addEventListener("click", () => {
    openModal("addUserModal");
  });

  document.getElementById("saveUserBtn").addEventListener("click", () => {
    const name = document.getElementById("newUserName").value;
    const email = document.getElementById("newUserEmail").value;
    const role = document.getElementById("newUserRole").value;

    if (!name || !email || !role) {
      showToast("Mohon lengkapi semua field!", "error");
      return;
    }

    const newUser = {
      id: MOCK_DATA.systemUsers.length + 1,
      name,
      email,
      role,
      status: "Aktif",
      lastLogin: "-",
      createdAt: new Date().toISOString().split("T")[0],
    };

    MOCK_DATA.systemUsers.push(newUser);
    renderUsersTable();
    closeModal("addUserModal");
    document.getElementById("addUserForm").reset();
    showToast(`User "${name}" berhasil ditambahkan!`, "success");
  });
}

function renderUsersTable() {
  const tbody = document.getElementById("usersTableBody");
  const roleBadge = (r) => {
    const map = {
      Owner: "badge-gold",
      Admin: "badge-blue",
      Agent: "badge-info",
      Bot: "badge-purple",
      Marketing: "badge-pink",
    };
    return map[r] || "badge-info";
  };

  tbody.innerHTML = MOCK_DATA.systemUsers
    .map(
      (u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="color:var(--text-primary);font-weight:600;">${u.name}</td>
      <td style="font-family:monospace;font-size:0.8rem;">${u.email}</td>
      <td><span class="badge ${roleBadge(u.role)}">${u.role}</span></td>
      <td>
        <span class="status-dot ${u.status === "Aktif" ? "online" : "offline"}"></span>
        ${u.status}
      </td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${u.lastLogin}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${u.createdAt}</td>
      <td>
        ${
          u.role !== "Owner"
            ? `<button class="btn btn-sm ${u.status === "Aktif" ? "btn-danger" : "btn-success"}" onclick="toggleUserStatus(${u.id})">
            ${u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
          </button>`
            : '<span style="color:var(--text-muted);font-size:0.75rem;">—</span>'
        }
      </td>
    </tr>
  `
    )
    .join("");
}

function toggleUserStatus(userId) {
  const user = MOCK_DATA.systemUsers.find((u) => u.id === userId);
  if (!user) return;
  user.status = user.status === "Aktif" ? "Nonaktif" : "Aktif";
  renderUsersTable();
  showToast(`Status ${user.name} diubah menjadi ${user.status}`, "info");
}

// =========================================
// MODAL HELPERS
// =========================================
function openModal(id) {
  document.getElementById(id).classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
  document.body.style.overflow = "";
}

// Close modal on overlay click
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("show");
      document.body.style.overflow = "";
    }
  });
});

// =========================================
// UTILITY FUNCTIONS
// =========================================
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function animateCounter(elementId, target, duration) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);

    el.textContent = formatNumber(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
