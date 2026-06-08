// =============================================
// MOCK DATA - CRM Owner Dashboard
// =============================================

const MOCK_DATA = {
  // --- MEMBER DATA ---
  members: [
    { id: 1, name: "Ahmad Rizky", noWa: "6281234567890", level: "Gold", joinDate: "2025-11-15", totalSpend: 4500000, totalTransactions: 23 },
    { id: 2, name: "Siti Nurhaliza", noWa: "6282345678901", level: "Platinum", joinDate: "2025-08-20", totalSpend: 12000000, totalTransactions: 58 },
    { id: 3, name: "Budi Santoso", noWa: "6283456789012", level: "Silver", joinDate: "2026-01-10", totalSpend: 1500000, totalTransactions: 8 },
    { id: 4, name: "Dewi Lestari", noWa: "6284567890123", level: "Gold", joinDate: "2025-09-05", totalSpend: 6200000, totalTransactions: 31 },
    { id: 5, name: "Eko Prasetyo", noWa: "6285678901234", level: "Bronze", joinDate: "2026-03-22", totalSpend: 500000, totalTransactions: 3 },
    { id: 6, name: "Fitri Handayani", noWa: "6286789012345", level: "Gold", joinDate: "2025-10-18", totalSpend: 5800000, totalTransactions: 27 },
    { id: 7, name: "Gunawan Wibowo", noWa: "6287890123456", level: "Silver", joinDate: "2026-02-14", totalSpend: 2100000, totalTransactions: 12 },
    { id: 8, name: "Hana Pertiwi", noWa: "6288901234567", level: "Platinum", joinDate: "2025-07-01", totalSpend: 15000000, totalTransactions: 72 },
    { id: 9, name: "Irfan Hakim", noWa: "6289012345678", level: "Bronze", joinDate: "2026-04-11", totalSpend: 350000, totalTransactions: 2 },
    { id: 10, name: "Joko Widodo", noWa: "6280123456789", level: "Gold", joinDate: "2025-12-01", totalSpend: 7800000, totalTransactions: 38 },
    { id: 11, name: "Kartika Sari", noWa: "6281122334455", level: "Silver", joinDate: "2026-01-25", totalSpend: 1800000, totalTransactions: 10 },
    { id: 12, name: "Lukman Hakim", noWa: "6282233445566", level: "Platinum", joinDate: "2025-06-15", totalSpend: 18500000, totalTransactions: 85 },
    { id: 13, name: "Maya Angelina", noWa: "6283344556677", level: "Bronze", joinDate: "2026-05-01", totalSpend: 200000, totalTransactions: 1 },
    { id: 14, name: "Nanda Putra", noWa: "6284455667788", level: "Gold", joinDate: "2025-11-30", totalSpend: 5100000, totalTransactions: 25 },
    { id: 15, name: "Olivia Rahman", noWa: "6285566778899", level: "Silver", joinDate: "2026-02-28", totalSpend: 2500000, totalTransactions: 14 },
  ],

  // --- MEMBER LEVELS ---
  memberLevels: [
    { level: "Bronze", minSpend: 0, maxSpend: 1000000, discount: 5, color: "#CD7F32", count: 3 },
    { level: "Silver", minSpend: 1000001, maxSpend: 5000000, discount: 10, color: "#C0C0C0", count: 4 },
    { level: "Gold", minSpend: 5000001, maxSpend: 10000000, discount: 15, color: "#FFD700", count: 5 },
    { level: "Platinum", minSpend: 10000001, maxSpend: 999999999, discount: 25, color: "#E5E4E2", count: 3 },
  ],

  // --- CAMPAIGN CLAIMS PER MEMBER ---
  campaignClaims: {
    1: [
      { campaign: "Diskon Lebaran 2026", code: "LBR2026", claimedAt: "2026-04-10", discount: "20%", status: "Terpakai" },
      { campaign: "Flash Sale Jumat", code: "FLASH50", claimedAt: "2026-05-15", discount: "15%", status: "Expired" },
    ],
    2: [
      { campaign: "Loyalty Reward", code: "LOYAL10", claimedAt: "2026-03-01", discount: "10%", status: "Terpakai" },
      { campaign: "Birthday Special", code: "BDAY25", claimedAt: "2026-02-20", discount: "25%", status: "Terpakai" },
      { campaign: "Diskon Lebaran 2026", code: "LBR2026", claimedAt: "2026-04-10", discount: "20%", status: "Terpakai" },
    ],
    3: [
      { campaign: "Welcome Bonus", code: "WELCOME", claimedAt: "2026-01-10", discount: "10%", status: "Terpakai" },
    ],
    4: [
      { campaign: "Flash Sale Jumat", code: "FLASH50", claimedAt: "2026-05-15", discount: "15%", status: "Terpakai" },
      { campaign: "Loyalty Reward", code: "LOYAL10", claimedAt: "2026-03-01", discount: "10%", status: "Aktif" },
    ],
    5: [
      { campaign: "Welcome Bonus", code: "WELCOME", claimedAt: "2026-03-22", discount: "10%", status: "Terpakai" },
    ],
    8: [
      { campaign: "Loyalty Reward", code: "LOYAL10", claimedAt: "2026-03-01", discount: "10%", status: "Terpakai" },
      { campaign: "Birthday Special", code: "BDAY25", claimedAt: "2025-12-01", discount: "25%", status: "Terpakai" },
      { campaign: "Flash Sale Jumat", code: "FLASH50", claimedAt: "2026-05-15", discount: "15%", status: "Aktif" },
      { campaign: "Diskon Lebaran 2026", code: "LBR2026", claimedAt: "2026-04-10", discount: "20%", status: "Terpakai" },
    ],
    10: [
      { campaign: "Diskon Lebaran 2026", code: "LBR2026", claimedAt: "2026-04-10", discount: "20%", status: "Terpakai" },
      { campaign: "Flash Sale Jumat", code: "FLASH50", claimedAt: "2026-05-15", discount: "15%", status: "Terpakai" },
    ],
    12: [
      { campaign: "Birthday Special", code: "BDAY25", claimedAt: "2025-09-15", discount: "25%", status: "Terpakai" },
      { campaign: "Loyalty Reward", code: "LOYAL10", claimedAt: "2026-03-01", discount: "10%", status: "Terpakai" },
      { campaign: "Flash Sale Jumat", code: "FLASH50", claimedAt: "2026-05-15", discount: "15%", status: "Aktif" },
    ],
  },

  // --- TRANSACTION HISTORY PER MEMBER ---
  transactionHistory: {
    1: [
      { id: "TRX-001", date: "2026-06-01", items: "Paket A x2", amount: 350000, paymentMethod: "Transfer Bank" },
      { id: "TRX-012", date: "2026-05-20", items: "Paket C x1", amount: 200000, paymentMethod: "QRIS" },
      { id: "TRX-025", date: "2026-05-05", items: "Paket B x3", amount: 525000, paymentMethod: "Cash" },
    ],
    2: [
      { id: "TRX-002", date: "2026-06-05", items: "Paket Premium x1", amount: 1500000, paymentMethod: "Transfer Bank" },
      { id: "TRX-018", date: "2026-05-28", items: "Paket A x5", amount: 875000, paymentMethod: "QRIS" },
      { id: "TRX-033", date: "2026-05-10", items: "Paket B x2", amount: 350000, paymentMethod: "Transfer Bank" },
      { id: "TRX-041", date: "2026-04-20", items: "Paket C x3", amount: 600000, paymentMethod: "Cash" },
    ],
    3: [
      { id: "TRX-005", date: "2026-06-02", items: "Paket A x1", amount: 175000, paymentMethod: "QRIS" },
      { id: "TRX-020", date: "2026-05-15", items: "Paket B x1", amount: 175000, paymentMethod: "Cash" },
    ],
    4: [
      { id: "TRX-007", date: "2026-06-04", items: "Paket B x4", amount: 700000, paymentMethod: "Transfer Bank" },
      { id: "TRX-022", date: "2026-05-22", items: "Paket Premium x1", amount: 1500000, paymentMethod: "QRIS" },
      { id: "TRX-035", date: "2026-05-08", items: "Paket A x2", amount: 350000, paymentMethod: "Transfer Bank" },
    ],
    5: [
      { id: "TRX-009", date: "2026-05-30", items: "Paket A x1", amount: 175000, paymentMethod: "Cash" },
    ],
    8: [
      { id: "TRX-003", date: "2026-06-06", items: "Paket Premium x2", amount: 3000000, paymentMethod: "Transfer Bank" },
      { id: "TRX-015", date: "2026-05-25", items: "Paket A x3", amount: 525000, paymentMethod: "QRIS" },
      { id: "TRX-028", date: "2026-05-12", items: "Paket C x5", amount: 1000000, paymentMethod: "Transfer Bank" },
      { id: "TRX-038", date: "2026-04-28", items: "Paket B x2", amount: 350000, paymentMethod: "Cash" },
      { id: "TRX-045", date: "2026-04-15", items: "Paket Premium x1", amount: 1500000, paymentMethod: "QRIS" },
    ],
    10: [
      { id: "TRX-004", date: "2026-06-03", items: "Paket B x3", amount: 525000, paymentMethod: "Transfer Bank" },
      { id: "TRX-019", date: "2026-05-26", items: "Paket Premium x1", amount: 1500000, paymentMethod: "QRIS" },
      { id: "TRX-032", date: "2026-05-09", items: "Paket A x4", amount: 700000, paymentMethod: "Transfer Bank" },
    ],
    12: [
      { id: "TRX-006", date: "2026-06-07", items: "Paket Premium x3", amount: 4500000, paymentMethod: "Transfer Bank" },
      { id: "TRX-016", date: "2026-05-29", items: "Paket A x6", amount: 1050000, paymentMethod: "QRIS" },
      { id: "TRX-030", date: "2026-05-11", items: "Paket C x4", amount: 800000, paymentMethod: "Transfer Bank" },
      { id: "TRX-040", date: "2026-04-25", items: "Paket B x5", amount: 875000, paymentMethod: "Cash" },
      { id: "TRX-048", date: "2026-04-10", items: "Paket Premium x2", amount: 3000000, paymentMethod: "Transfer Bank" },
      { id: "TRX-055", date: "2026-03-20", items: "Paket A x3", amount: 525000, paymentMethod: "QRIS" },
    ],
  },

  // --- CAMPAIGNS ---
  campaigns: [
    { id: 1, code: "LBR2026", name: "Diskon Lebaran 2026", isiPesan: "Selamat Hari Raya! Dapatkan diskon 20% untuk semua produk. Gunakan kode LBR2026 🎉", discount: 20, status: "Expired", expDate: "2026-04-30", totalClaims: 45, totalUsed: 38 },
    { id: 2, code: "FLASH50", name: "Flash Sale Jumat", isiPesan: "Flash Sale setiap Jumat! Diskon 15% khusus member setia kami 🔥⚡", discount: 15, status: "Aktif", expDate: "2026-07-31", totalClaims: 62, totalUsed: 41 },
    { id: 3, code: "LOYAL10", name: "Loyalty Reward", isiPesan: "Terima kasih sudah menjadi pelanggan setia! Nikmati diskon 10% sebagai hadiah loyalitas Anda 💎", discount: 10, status: "Aktif", expDate: "2026-12-31", totalClaims: 89, totalUsed: 67 },
    { id: 4, code: "BDAY25", name: "Birthday Special", isiPesan: "Selamat ulang tahun! 🎂 Kami punya hadiah spesial: diskon 25% khusus di bulan kelahiran Anda!", discount: 25, status: "Aktif", expDate: "2026-12-31", totalClaims: 28, totalUsed: 25 },
    { id: 5, code: "WELCOME", name: "Welcome Bonus", isiPesan: "Selamat bergabung! 👋 Gunakan kode WELCOME untuk diskon 10% di pembelian pertama Anda!", discount: 10, status: "Aktif", expDate: "2026-12-31", totalClaims: 120, totalUsed: 98 },
    { id: 6, code: "NYR2026", name: "New Year Rush", isiPesan: "Happy New Year 2026! 🎆 Mulai tahun baru dengan diskon 30%!", discount: 30, status: "Expired", expDate: "2026-01-31", totalClaims: 75, totalUsed: 70 },
    { id: 7, code: "RAMADHAN", name: "Promo Ramadhan", isiPesan: "Ramadhan Mubarak! 🌙 Diskon spesial 20% selama bulan Ramadhan", discount: 20, status: "Expired", expDate: "2026-04-10", totalClaims: 55, totalUsed: 50 },
    { id: 8, code: "REFER15", name: "Referral Bonus", isiPesan: "Ajak temanmu dan dapatkan diskon 15% untuk kalian berdua! 🤝", discount: 15, status: "Aktif", expDate: "2026-09-30", totalClaims: 34, totalUsed: 22 },
  ],

  // --- CAMPAIGN HISTORY ---
  campaignHistory: {
    1: [
      { member: "Ahmad Rizky", claimedAt: "2026-04-10", usedAt: "2026-04-12", status: "Terpakai" },
      { member: "Siti Nurhaliza", claimedAt: "2026-04-10", usedAt: "2026-04-11", status: "Terpakai" },
      { member: "Hana Pertiwi", claimedAt: "2026-04-10", usedAt: "2026-04-15", status: "Terpakai" },
      { member: "Joko Widodo", claimedAt: "2026-04-10", usedAt: "2026-04-20", status: "Terpakai" },
    ],
    2: [
      { member: "Ahmad Rizky", claimedAt: "2026-05-15", usedAt: "-", status: "Expired" },
      { member: "Dewi Lestari", claimedAt: "2026-05-15", usedAt: "2026-05-16", status: "Terpakai" },
      { member: "Hana Pertiwi", claimedAt: "2026-05-15", usedAt: "-", status: "Aktif" },
      { member: "Joko Widodo", claimedAt: "2026-05-15", usedAt: "2026-05-18", status: "Terpakai" },
      { member: "Lukman Hakim", claimedAt: "2026-05-15", usedAt: "-", status: "Aktif" },
    ],
    3: [
      { member: "Siti Nurhaliza", claimedAt: "2026-03-01", usedAt: "2026-03-05", status: "Terpakai" },
      { member: "Dewi Lestari", claimedAt: "2026-03-01", usedAt: "-", status: "Aktif" },
      { member: "Hana Pertiwi", claimedAt: "2026-03-01", usedAt: "2026-03-10", status: "Terpakai" },
      { member: "Lukman Hakim", claimedAt: "2026-03-01", usedAt: "2026-03-02", status: "Terpakai" },
    ],
    5: [
      { member: "Budi Santoso", claimedAt: "2026-01-10", usedAt: "2026-01-15", status: "Terpakai" },
      { member: "Eko Prasetyo", claimedAt: "2026-03-22", usedAt: "2026-03-25", status: "Terpakai" },
      { member: "Maya Angelina", claimedAt: "2026-05-01", usedAt: "-", status: "Aktif" },
    ],
  },

  // --- CHAT FOLLOW UP ---
  chatFollowUp: [
    { id: 1, member: "Ahmad Rizky", lastChat: "2026-06-07 14:30", topic: "Tanya produk baru", status: "Replied", agent: "Bot AI" },
    { id: 2, member: "Budi Santoso", lastChat: "2026-06-07 10:15", topic: "Keluhan pengiriman", status: "Pending", agent: "-" },
    { id: 3, member: "Dewi Lestari", lastChat: "2026-06-06 18:45", topic: "Request invoice", status: "Replied", agent: "Admin" },
    { id: 4, member: "Eko Prasetyo", lastChat: "2026-06-06 09:20", topic: "Tanya diskon member", status: "Replied", agent: "Bot AI" },
    { id: 5, member: "Fitri Handayani", lastChat: "2026-06-05 16:00", topic: "Pemesanan bulk", status: "Follow Up", agent: "Admin" },
    { id: 6, member: "Irfan Hakim", lastChat: "2026-06-05 11:30", topic: "Registrasi member", status: "Replied", agent: "Bot AI" },
    { id: 7, member: "Kartika Sari", lastChat: "2026-06-04 20:10", topic: "Komplain kualitas", status: "Escalated", agent: "Admin" },
    { id: 8, member: "Nanda Putra", lastChat: "2026-06-04 13:45", topic: "Tanya stok", status: "Replied", agent: "Bot AI" },
    { id: 9, member: "Olivia Rahman", lastChat: "2026-06-03 08:55", topic: "Perpanjangan member", status: "Pending", agent: "-" },
    { id: 10, member: "Siti Nurhaliza", lastChat: "2026-06-08 09:00", topic: "Upgrade level", status: "Follow Up", agent: "Admin" },
  ],

  // --- STOCK DATA (Accurate Connection) ---
  stockItems: [
    { sku: "PRD-001", name: "Paket A - Basic", stock: 0, minStock: 10, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Habis" },
    { sku: "PRD-002", name: "Paket B - Standard", stock: 3, minStock: 15, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Hampir Habis" },
    { sku: "PRD-003", name: "Paket C - Value", stock: 45, minStock: 20, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Aman" },
    { sku: "PRD-004", name: "Paket Premium", stock: 2, minStock: 5, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Hampir Habis" },
    { sku: "PRD-005", name: "Add-on Extra", stock: 0, minStock: 25, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Habis" },
    { sku: "PRD-006", name: "Paket Family", stock: 18, minStock: 10, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Aman" },
    { sku: "PRD-007", name: "Gift Box Special", stock: 5, minStock: 8, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Hampir Habis" },
    { sku: "PRD-008", name: "Paket Corporate", stock: 30, minStock: 5, unit: "pcs", lastUpdate: "2026-06-08 08:00", status: "Aman" },
  ],

  // --- AI DAILY SUMMARY ---
  aiDailySummary: [
    {
      date: "2026-06-08",
      summary: "Hari ini terdapat 12 percakapan baru via WhatsApp. 8 ditangani oleh Bot AI, 3 dieskalasi ke Admin, dan 1 masih pending. Campaign Flash Sale Jumat mendapat 5 klaim baru. Ada 2 item stok yang habis dan perlu segera di-restock: Paket A - Basic dan Add-on Extra.",
      highlights: ["12 chat baru", "5 klaim campaign", "2 stok habis"],
      sentiment: "Positif - 85% pelanggan puas",
    },
    {
      date: "2026-06-07",
      summary: "Total 18 percakapan. 14 diselesaikan otomatis oleh AI. 2 komplain kualitas produk dari Kartika Sari memerlukan perhatian segera. Revenue hari ini Rp 4.200.000 dari 6 transaksi.",
      highlights: ["18 chat", "2 komplain", "Rp 4.2jt revenue"],
      sentiment: "Netral - ada komplain perlu ditindaklanjuti",
    },
    {
      date: "2026-06-06",
      summary: "Hari yang sibuk dengan 25 percakapan. Campaign Loyalty Reward sangat aktif dengan 8 klaim baru. 3 member baru bergabung. Stok Paket Premium tinggal 2 unit.",
      highlights: ["25 chat", "8 klaim loyalty", "3 member baru"],
      sentiment: "Positif - engagement tinggi",
    },
    {
      date: "2026-06-05",
      summary: "15 percakapan, mayoritas tanya stok dan promo. Fitri Handayani request pemesanan bulk 50 unit Paket Corporate. Follow up diperlukan.",
      highlights: ["15 chat", "1 order bulk", "Follow up Fitri"],
      sentiment: "Positif - ada peluang order besar",
    },
  ],

  // --- ACTIVITY LOG ---
  activityLog: [
    { id: 1, timestamp: "2026-06-08 12:45:00", user: "admin@crm.com", action: "Login", detail: "Login dari IP 192.168.1.100", category: "Auth" },
    { id: 2, timestamp: "2026-06-08 12:30:00", user: "system", action: "Campaign Claim", detail: "Member Siti Nurhaliza claim FLASH50", category: "Campaign" },
    { id: 3, timestamp: "2026-06-08 11:15:00", user: "bot_ai", action: "Chat Replied", detail: "Auto-reply ke Ahmad Rizky: info produk", category: "Chat" },
    { id: 4, timestamp: "2026-06-08 10:00:00", user: "admin@crm.com", action: "Stock Update", detail: "Update stok Paket C dari Accurate", category: "Stock" },
    { id: 5, timestamp: "2026-06-08 09:30:00", user: "system", action: "Member Upgrade", detail: "Dewi Lestari upgrade dari Silver ke Gold", category: "Member" },
    { id: 6, timestamp: "2026-06-08 09:00:00", user: "bot_ai", action: "Daily Summary", detail: "AI Daily Summary generated", category: "AI" },
    { id: 7, timestamp: "2026-06-07 22:00:00", user: "system", action: "Campaign Expired", detail: "Campaign LBR2026 telah expired", category: "Campaign" },
    { id: 8, timestamp: "2026-06-07 18:30:00", user: "admin@crm.com", action: "Member Added", detail: "Maya Angelina ditambahkan sebagai member baru", category: "Member" },
    { id: 9, timestamp: "2026-06-07 15:00:00", user: "bot_ai", action: "Chat Escalated", detail: "Chat Kartika Sari dieskalasi ke Admin", category: "Chat" },
    { id: 10, timestamp: "2026-06-07 14:00:00", user: "admin@crm.com", action: "Campaign Created", detail: "Campaign REFER15 dibuat", category: "Campaign" },
    { id: 11, timestamp: "2026-06-07 10:00:00", user: "system", action: "Stock Alert", detail: "Paket A - Basic stok habis", category: "Stock" },
    { id: 12, timestamp: "2026-06-06 20:00:00", user: "admin@crm.com", action: "Blast Sent", detail: "Blast WhatsApp FLASH50 ke 150 member", category: "Campaign" },
    { id: 13, timestamp: "2026-06-06 16:00:00", user: "bot_ai", action: "Chat Replied", detail: "Auto-reply ke 5 member: promo info", category: "Chat" },
    { id: 14, timestamp: "2026-06-06 12:00:00", user: "admin@crm.com", action: "Report Generated", detail: "Laporan mingguan campaign digenerate", category: "Report" },
    { id: 15, timestamp: "2026-06-06 09:00:00", user: "system", action: "Backup", detail: "Database backup otomatis berhasil", category: "System" },
  ],

  // --- SYSTEM USERS ---
  systemUsers: [
    { id: 1, name: "Owner Admin", email: "owner@crm.com", role: "Owner", status: "Aktif", lastLogin: "2026-06-08 12:45", createdAt: "2025-01-01" },
    { id: 2, name: "Staff Admin", email: "admin@crm.com", role: "Admin", status: "Aktif", lastLogin: "2026-06-08 10:30", createdAt: "2025-03-15" },
    { id: 3, name: "CS Agent 1", email: "cs1@crm.com", role: "Agent", status: "Aktif", lastLogin: "2026-06-07 17:00", createdAt: "2025-06-01" },
    { id: 4, name: "CS Agent 2", email: "cs2@crm.com", role: "Agent", status: "Nonaktif", lastLogin: "2026-05-20 09:00", createdAt: "2025-06-01" },
    { id: 5, name: "Bot AI System", email: "bot@crm.com", role: "Bot", status: "Aktif", lastLogin: "2026-06-08 12:55", createdAt: "2025-01-01" },
    { id: 6, name: "Marketing Staff", email: "marketing@crm.com", role: "Marketing", status: "Aktif", lastLogin: "2026-06-06 16:00", createdAt: "2025-09-01" },
  ],

  // --- CAMPAIGN CLAIM CHART DATA (monthly) ---
  campaignClaimMonthly: {
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
    datasets: {
      "Welcome Bonus": [15, 12, 18, 20, 22, 25],
      "Loyalty Reward": [8, 10, 15, 12, 18, 20],
      "Flash Sale Jumat": [0, 0, 0, 5, 20, 30],
      "Birthday Special": [3, 4, 2, 5, 3, 6],
      "Referral Bonus": [0, 0, 0, 0, 8, 15],
    },
  },

  // --- DASHBOARD STATS ---
  stats: {
    totalMembers: 15,
    newMembersThisMonth: 2,
    totalCampaignClaims: 508,
    claimsThisMonth: 35,
    totalTransactions: 408,
    transactionsThisMonth: 28,
    totalRevenue: 81850000,
    revenueThisMonth: 12500000,
    activeCampaigns: 5,
    expiredCampaigns: 3,
  },
};
