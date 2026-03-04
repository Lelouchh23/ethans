// QR Code Generation for Quick Login
function generateUserQR(userId, username) {
    // Show modal
    const modalElem = document.getElementById('qrCodeModal');
    if (!modalElem) return;
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrUserInfo = document.getElementById('qrUserInfo');
    if (!qrContainer || !qrUserInfo) return;


    // Clear previous QR
    qrContainer.innerHTML = '';
    qrUserInfo.textContent = '';
    const downloadBtn = document.getElementById('downloadQRBtn');
    if (downloadBtn) downloadBtn.style.display = 'none';

    // Data to encode (customize as needed, e.g., include a token or just username)
    const qrData = JSON.stringify({ quick_login: true, userId, username });


    // Helper to enable download button after QR is rendered
    function enableDownloadQR() {
        const qrImg = qrContainer.querySelector('img') || qrContainer.querySelector('canvas');
        if (!qrImg) return;
        if (!downloadBtn) return;
        downloadBtn.style.display = '';
        downloadBtn.onclick = function() {
            let dataUrl = '';
            let filename = `user-qr-${username}.png`;
            if (qrImg.tagName === 'IMG') {
                dataUrl = qrImg.src;
            } else if (qrImg.tagName === 'CANVAS') {
                dataUrl = qrImg.toDataURL('image/png');
            }
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    }

    // Generate QR code (requires QRCode.js)
    function renderQR() {
        new QRCode(qrContainer, {
            text: qrData,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        // Wait a moment for QR to render, then enable download
        setTimeout(enableDownloadQR, 300);
    }

    if (typeof QRCode === 'undefined') {
        // Dynamically load QRCode.js from CDN if not present
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = renderQR;
        document.body.appendChild(script);
    } else {
        renderQR();
    }

    qrUserInfo.textContent = `Username: ${username}`;

    // Show modal using Bootstrap
    const modal = new bootstrap.Modal(modalElem);
    modal.show();
}
// Admin Dashboard JavaScript - Updated with User Management and Multi-page fixes
const API_URL = "php/app.php";

// Helper function to fix image paths (remove leading slash for relative paths)
function fixImagePath(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return path.startsWith('/') ? path.substring(1) : path;
}

function createDB(table) {
    return {
        add: async (data) => {
            console.log(`[usersDB.add] Sending:`, { ...data, table });
            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify({ ...data, table })
                });
                console.log(`[usersDB.add] Response status:`, res.status);
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    console.log(`[usersDB.add] Response JSON:`, json);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return json;
                } catch (parseErr) {
                    console.error(`[usersDB.add] Response not JSON:`, text);
                    throw parseErr;
                }
            } catch (err) {
                console.error(`Add failed [${table}]:`, err);
                return { error: err.message };
            }
        },
        show: async (filters = {}) => {
            console.log(`[${table}DB.show] Filters:`, filters);
            try {
                const params = new URLSearchParams({ ...filters, table }).toString();
                const res = await fetch(`${API_URL}?${params}`, {
                    headers: {
                        "Accept": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    }
                });
                console.log(`[${table}DB.show] Response status:`, res.status);
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    console.log(`[${table}DB.show] Response JSON:`, json);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return json;
                } catch (parseErr) {
                    console.error(`[${table}DB.show] Response not JSON:`, text);
                    throw parseErr;
                }
            } catch (err) {
                console.error(`Show failed [${table}]:`, err);
                return [];
            }
        },
        edit: async (data) => {
            console.log(`[${table}DB.edit] Data:`, data);
            try {
                if (!data.id && !data.key) throw new Error("Missing id/key for update");
                const res = await fetch(API_URL, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify({ ...data, table })
                });
                console.log(`[${table}DB.edit] Response status:`, res.status);
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    console.log(`[${table}DB.edit] Response JSON:`, json);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return json;
                } catch (parseErr) {
                    console.error(`[${table}DB.edit] Response not JSON:`, text);
                    throw parseErr;
                }
            } catch (err) {
                console.error(`Edit failed [${table}]:`, err);
                return { error: err.message };
            }
        },
        delete: async (idOrKey) => {
            console.log(`[${table}DB.delete] Key:`, idOrKey);
            try {
                const keyName = typeof idOrKey === 'object' ? Object.keys(idOrKey)[0] : (table === 'system_settings' ? 'key' : 'id');
                const keyValue = typeof idOrKey === 'object' ? Object.values(idOrKey)[0] : idOrKey;
                const res = await fetch(API_URL, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify({ [keyName]: keyValue, table })
                });
                console.log(`[${table}DB.delete] Response status:`, res.status);
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    console.log(`[${table}DB.delete] Response JSON:`, json);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return json;
                } catch (parseErr) {
                    console.error(`[${table}DB.delete] Response not JSON:`, text);
                    throw parseErr;
                }
            } catch (err) {
                console.error(`Delete failed [${table}]:`, err);
                return { error: err.message };
            }
        }
    };
}

// Ready-to-use DB objects for each table
const rolesDB = createDB('roles');
const usersDB = createDB('users');
const accountRequestsDB = createDB('account_requests');
const menuCategoriesDB = createDB('menu_categories');
const menuItemsDB = createDB('menu_items');
const ingredientCategoriesDB = createDB('ingredient_categories');
const unitsDB = createDB('units');
const ingredientsDB = createDB('ingredients');
const recipesDB = createDB('recipes');
const salesDB = createDB('sales');
const saleItemsDB = createDB('sale_items');
const inventoryTransactionsDB = createDB('inventory_transactions');
const activityLogsDB = createDB('activity_logs');
const requestsTblDB = createDB('requests_tbl');
const backupsDB = createDB('backups');
const systemSettingsDB = createDB('system_settings');
const notificationsDB = createDB('notifications');

// Notifications API URL
const NOTIFICATIONS_API = 'php/notifications.php';

// Global variables
let currentRequestType = null;
let currentRequestId = null;


function loadDashboardStats() {
    // Ingredients to Restock + Low Stock Table
    Promise.all([
        ingredientsDB.show(),
        ingredientCategoriesDB.show()
    ]).then(function (results) {
        const ingredients = results[0];
        const categories = results[1];

        const categoryMap = {};
        categories.forEach(function (cat) {
            categoryMap[cat.id] = cat.name;
        });

        // Count restock
        const lowItems = ingredients.filter(function (ing) {
            return parseFloat(ing.current_quantity) <= parseFloat(ing.low_stock_threshold);
        });

        const restockEl = document.getElementById('ingredientsRestock');
        if (restockEl) restockEl.textContent = lowItems.length;

        // Fill low stock table
        const lowStockTable = document.getElementById('lowStockTable');
        if (!lowStockTable) return;

        const tbody = lowStockTable.getElementsByTagName('tbody')[0];
        if (!tbody) return;

        tbody.innerHTML = '';

        if (lowItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No low stock items.</td></tr>';
            return;
        }

        lowItems.forEach(function (ing) {
            const isOut = parseFloat(ing.current_quantity) === 0;
            const row = tbody.insertRow();
            row.innerHTML = `
                <td><strong>${ing.name}</strong></td>
                <td><span class="badge bg-secondary">${categoryMap[ing.category_id] || '—'}</span></td>
                <td class="text-danger fw-bold">${ing.current_quantity}</td>
                <td>${ing.low_stock_threshold}</td>
                <td><span class="badge ${isOut ? 'bg-danger' : 'bg-warning'}">${isOut ? 'Out of Stock' : 'Low Stock'}</span></td>
            `;
        });

    }).catch(function (err) {
        console.error('Failed to load ingredient stats:', err);
    });

    // Active Staff Accounts
    usersDB.show().then(function (users) {
        const staffCount = users.filter(function (u) {
            return parseInt(u.role_id) === 2 &&
                (u.status || '').trim().toLowerCase() === 'active' &&
                (u.deleted_at === null || u.deleted_at === undefined || u.deleted_at === '');
        }).length;

        const staffEl = document.getElementById('totalStaffAccounts');
        if (staffEl) staffEl.textContent = staffCount;

    }).catch(function (err) {
        console.error('Failed to load staff accounts:', err);
    });
}

// Call on page load
loadDashboardStats();

// Revenue & Sales Statistics
let revenuePeriodIndex = 0;
let salesPeriodIndex = 0;
const periods = ['Today', 'This Week', 'This Month', 'This Year'];

// Store calculated values for toggle
let revenueData = { today: 0, week: 0, month: 0, year: 0 };
let salesData = { today: 0, week: 0, month: 0, year: 0 };

function normalizeOrderType(value) {
    const orderType = String(value || 'walk-in').trim().toLowerCase().replace(/[_\s]+/g, '-');
    if (orderType === 'dine-in' || orderType === 'dinein') return 'dine-in';
    return 'dine-out';
}

function updateDashboardSalesInsights(completedSales) {
    const sales = Array.isArray(completedSales) ? completedSales : [];

    const dailySalesList = document.getElementById('dailySales7List');
    const dineInCountEl = document.getElementById('dineInCount');
    const dineOutCountEl = document.getElementById('dineOutCount');
    const totalOrderTypeCountEl = document.getElementById('totalOrderTypeCount');
    const dineInPercentEl = document.getElementById('dineInPercent');
    const dineOutPercentEl = document.getElementById('dineOutPercent');
    const orderTypeDonut = document.getElementById('orderTypeDonut');
    const orderTypeDonutCenter = document.getElementById('orderTypeDonutCenter');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayBuckets = [];
    const dayRevenueMap = {};

    for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() - i);
        const dayKey = dayDate.toISOString().slice(0, 10);
        const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        dayBuckets.push({ key: dayKey, label: dayLabel });
        dayRevenueMap[dayKey] = 0;
    }

    let dineInCount = 0;
    let dineOutCount = 0;

    sales.forEach(function (sale) {
        const saleDate = new Date(sale.sale_datetime);
        const saleAmount = parseFloat(sale.total_amount) || 0;
        if (!isNaN(saleDate.getTime())) {
            const saleDay = new Date(saleDate);
            saleDay.setHours(0, 0, 0, 0);
            const dayKey = saleDay.toISOString().slice(0, 10);
            if (Object.prototype.hasOwnProperty.call(dayRevenueMap, dayKey)) {
                dayRevenueMap[dayKey] += saleAmount;
            }
        }

        if (normalizeOrderType(sale.order_type) === 'dine-in') {
            dineInCount += 1;
        } else {
            dineOutCount += 1;
        }
    });

    if (dailySalesList) {
        const revenues = dayBuckets.map(day => dayRevenueMap[day.key]);
        const maxRevenue = Math.max(1, ...revenues);

        dailySalesList.innerHTML = dayBuckets.map(function (day) {
            const amount = dayRevenueMap[day.key];
            const widthPercent = Math.max(4, Math.round((amount / maxRevenue) * 100));
            return `
                <div class="daily-sales-row">
                    <div class="daily-sales-day">${day.label}</div>
                    <div class="daily-sales-track"><div class="daily-sales-fill" style="width: ${amount === 0 ? 0 : widthPercent}%"></div></div>
                    <div class="daily-sales-count">${formatPeso(amount)}</div>
                </div>
            `;
        }).join('');
    }

    const totalCount = dineInCount + dineOutCount;
    const dineInPercent = totalCount > 0 ? Math.round((dineInCount / totalCount) * 100) : 0;
    const dineOutPercent = totalCount > 0 ? 100 - dineInPercent : 0;

    if (dineInCountEl) dineInCountEl.textContent = dineInCount;
    if (dineOutCountEl) dineOutCountEl.textContent = dineOutCount;
    if (totalOrderTypeCountEl) totalOrderTypeCountEl.textContent = totalCount;
    if (dineInPercentEl) dineInPercentEl.textContent = `${dineInPercent}%`;
    if (dineOutPercentEl) dineOutPercentEl.textContent = `${dineOutPercent}%`;
    if (orderTypeDonutCenter) orderTypeDonutCenter.textContent = totalCount;

    if (orderTypeDonut) {
        const dineInDeg = Math.round((dineInPercent / 100) * 360);
        orderTypeDonut.style.background = `conic-gradient(#198754 0deg ${dineInDeg}deg, #dc3545 ${dineInDeg}deg 360deg)`;
    }
}

function loadRevenueStats() {
    salesDB.show().then(function (sales) {
        if (!sales || !Array.isArray(sales)) {
            updateDashboardSalesInsights([]);
            return;
        }

        // Filter completed sales only
        const completedSales = sales.filter(function (sale) {
            return (sale.status || '').toLowerCase() === 'completed';
        });

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Get start of week (Sunday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        // Get start of month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get start of year
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        revenueData = { today: 0, week: 0, month: 0, year: 0 };
        salesData = { today: 0, week: 0, month: 0, year: 0 };

        completedSales.forEach(function (sale) {
            const saleDate = new Date(sale.sale_datetime);
            const amount = parseFloat(sale.total_amount) || 0;

            // Today
            if (saleDate >= today) {
                revenueData.today += amount;
                salesData.today++;
            }

            // This Week
            if (saleDate >= startOfWeek) {
                revenueData.week += amount;
                salesData.week++;
            }

            // This Month
            if (saleDate >= startOfMonth) {
                revenueData.month += amount;
                salesData.month++;
            }

            // This Year
            if (saleDate >= startOfYear) {
                revenueData.year += amount;
                salesData.year++;
            }
        });

        // Update both cards
        updateRevenueCard();
        updateSalesCard();
        updateDashboardSalesInsights(completedSales);

    }).catch(function (err) {
        console.error('Failed to load revenue stats:', err);
        updateDashboardSalesInsights([]);
    });
}

function formatPeso(amount) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateRevenueCard() {
    const revenueEl = document.getElementById('totalRevenue');
    const periodLabelEl = document.getElementById('revenuePeriodLabel');

    if (!revenueEl) return;

    const values = [revenueData.today, revenueData.week, revenueData.month, revenueData.year];
    revenueEl.textContent = formatPeso(values[revenuePeriodIndex]);
    if (periodLabelEl) periodLabelEl.textContent = periods[revenuePeriodIndex];
}

function updateSalesCard() {
    const salesCountEl = document.getElementById('totalSalesRecords');
    const periodLabelEl = document.getElementById('salesPeriodLabel');

    if (!salesCountEl) return;

    const counts = [salesData.today, salesData.week, salesData.month, salesData.year];
    salesCountEl.textContent = counts[salesPeriodIndex];
    if (periodLabelEl) periodLabelEl.textContent = periods[salesPeriodIndex];
}

function initPeriodToggles() {
    // Revenue toggle
    const revPrevBtn = document.getElementById('revenuePrevBtn');
    const revNextBtn = document.getElementById('revenueNextBtn');

    if (revPrevBtn) {
        revPrevBtn.addEventListener('click', function () {
            revenuePeriodIndex = (revenuePeriodIndex - 1 + periods.length) % periods.length;
            updateRevenueCard();
        });
    }

    if (revNextBtn) {
        revNextBtn.addEventListener('click', function () {
            revenuePeriodIndex = (revenuePeriodIndex + 1) % periods.length;
            updateRevenueCard();
        });
    }

    // Sales toggle
    const salesPrevBtn = document.getElementById('salesPrevBtn');
    const salesNextBtn = document.getElementById('salesNextBtn');

    if (salesPrevBtn) {
        salesPrevBtn.addEventListener('click', function () {
            salesPeriodIndex = (salesPeriodIndex - 1 + periods.length) % periods.length;
            updateSalesCard();
        });
    }

    if (salesNextBtn) {
        salesNextBtn.addEventListener('click', function () {
            salesPeriodIndex = (salesPeriodIndex + 1) % periods.length;
            updateSalesCard();
        });
    }
}

// Initialize on page load
loadRevenueStats();
initPeriodToggles();


async function loadUnits() {
    console.log("🔄 loadUnits() called");

    const unitSelect = document.getElementById("ingredientUnit");

    if (!unitSelect) {
        console.error("❌ ingredientUnit element NOT FOUND");
        return;
    }

    console.log("✔ ingredientUnit element FOUND");

    unitSelect.innerHTML = `<option value="">Select Unit</option>`;

    try {
        console.log("📡 Fetching units from unitsDB.show()...");
        const units = await unitsDB.show();
        console.log("📥 Units received:", units);

        if (!units || units.length === 0) {
            console.warn("⚠ No units found");
            unitSelect.innerHTML = `<option value="">No units found</option>`;
            return;
        }

        console.log(`✔ ${units.length} units found. Rendering...`);

        units.forEach(unit => {
            const opt = document.createElement("option");
            opt.value = unit.id;
            opt.textContent = unit.short_name || unit.name;
            unitSelect.appendChild(opt);
        });

        console.log("🎉 Units successfully loaded!");

    } catch (error) {
        console.error("🔥 ERROR loading units:", error);
    }
}

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
    console.log("🌐 DOMContentLoaded fired");
    loadUnits();
});


// Load ingredient categories into the select element
async function loadIngredientCategories() {
    const categorySelect = document.getElementById("ingredientCategory");

    if (!categorySelect) {
        console.error("❌ ingredientCategory element not found");
        return;
    }

    // Reset select
    categorySelect.innerHTML = `<option value="">Select Category</option>`;

    try {
        console.log("📡 Fetching categories from ingredientCategoriesDB...");
        const categories = await ingredientCategoriesDB.show();
        console.log("📥 Categories received:", categories);

        if (!Array.isArray(categories) || categories.length === 0) {
            categorySelect.innerHTML = `<option value="">No categories found</option>`;
            return;
        }

        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;       // Save ID to ingredients table
            opt.textContent = cat.name; // Display name
            categorySelect.appendChild(opt);
        });

        console.log("🎉 Ingredient categories loaded successfully!");
    } catch (error) {
        console.error("🔥 ERROR loading ingredient categories:", error);
        categorySelect.innerHTML = `<option value="">Error loading categories</option>`;
    }
}

// Ensure DOM is ready before loading
document.addEventListener('DOMContentLoaded', () => {
    if (typeof ingredientCategoriesDB === 'undefined') {
        console.error("❌ ingredientCategoriesDB is not defined!");
        return;
    }
    loadIngredientCategories();
});


// DOM Ready
document.addEventListener('DOMContentLoaded', function () {
    const safeInit = (label, fn) => {
        try {
            fn();
        } catch (error) {
            console.error(`[Admin Init] ${label} failed:`, error);
        }
    };

    // Initialize tooltips - only if bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Initialize only the sections present on the current page
    safeInit('common features', initializeCommonAdminFeatures);

    // Auto-initialize based on elements present
    if (document.getElementById('lowStockTable')) safeInit('dashboard', initializeAdminDashboard);
    if (document.getElementById('menuControlTable')) safeInit('menu control', initializeMenuControl);
    if (document.getElementById('recipeMappingTable')) safeInit('recipe control', initializeRecipeControl);
    if (document.getElementById('ingredientsMasterTable')) safeInit('ingredients masterlist', initializeIngredientsMasterlist);
    if (document.getElementById('activeUsersTable')) safeInit('user management', initializeUserManagement);
    if (document.getElementById('reports-content')) safeInit('reports', initializeReports);
    if (document.getElementById('backupsTable')) safeInit('backup', initializeBackup);
    if (document.getElementById('requestsTable')) safeInit('requests', initializeRequests);
    if (document.getElementById('systemSettingsForm')) safeInit('system settings', initializeSystemSettings);
    safeInit('request sidebar badge', updateRequestSidebarBadge);
    safeInit('request badge polling', startRequestBadgePolling);
    if (document.getElementById('activityLogTable')) safeInit('activity log', initializeActivityLog);
    if (document.getElementById('fullActivityLogTable')) safeInit('full activity log', initializeFullActivityLog);

    // Load recent activities on the dashboard
    if (document.getElementById('recentActivities')) safeInit('recent activities', loadRecentActivities);
});

// Common features for all admin pages
function initializeCommonAdminFeatures() {
    // Logout button (global)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔄 Admin logout initiated - showing confirmation dialog');

            showConfirm('Are you sure you want to logout?', async function () {
                console.log('✅ Admin logout confirmed by user');

                try {
                    // Call server-side logout to destroy session
                    const response = await fetch('php/logout.php', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    const result = await response.json();
                    console.log('🔐 Server logout result:', result);
                } catch (err) {
                    console.error('❌ Server logout failed, proceeding with local cleanup:', err);
                }

                // Clear local storage
                localStorage.removeItem('loggedInRole');
                localStorage.removeItem('loggedInUser');
                localStorage.removeItem('loggedInUserId');
                console.log('🔐 Session cleared, redirecting to login...');
                window.location.href = 'index.html';
            });
        });
    }

    // Mark all notifications as read
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            markAllNotificationsRead();
        });
    }

    // Load notifications on page load
    if (document.getElementById('notificationBell')) {
        loadNotifications();
    }

    // Load sidebar badges
    updateRequestSidebarBadge();
}

// Admin Dashboard Functions
function initializeAdminDashboard() {
    // Export dashboard data button
    const exportDashboardBtn = document.getElementById('exportDashboardData');
    if (exportDashboardBtn) {
        exportDashboardBtn.addEventListener('click', function () {
            showConfirm('Are you sure you want to Export Dashboard Data?', function () {
                exportDashboardData();
            });
        });
    }

    const dashboardGenerateReportBtn = document.getElementById('generateReportBtn');
    if (dashboardGenerateReportBtn) {
        dashboardGenerateReportBtn.addEventListener('click', function () {
            window._reportGeneratedByUser = true;
            generateReport();
        });
    }

    // Load initial data
    loadAdminDashboardData();
}

function exportDashboardData() {
    // Simulate data export
    // Modal notification removed

    setTimeout(() => {
        // Create a blob of the data
        const data = {
            timestamp: new Date().toISOString(),
            salesRecords: document.getElementById('totalSalesRecords')?.textContent || '0',
            staffAccounts: document.getElementById('totalStaffAccounts')?.textContent || '0',
            lowStockItems: document.getElementById('ingredientsRestock')?.textContent || '0',
            systemAlerts: document.getElementById('systemAlerts')?.textContent || '0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Modal notification removed
    }, 1000);
}

async function loadLowStockData() {
    const tableElement = document.getElementById('lowStockTable');
    if (!tableElement) return;

    const lowStockTable = tableElement.getElementsByTagName('tbody')[0];
    if (!lowStockTable) return;

    try {
        const allIngredients = await ingredientsDB.show();
        if (!allIngredients || !Array.isArray(allIngredients)) {
            lowStockTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Unable to load ingredient data.</td></tr>';
            return;
        }
        const lowStockData = allIngredients.filter(ing => ing.current_quantity <= ing.low_stock_threshold);

        lowStockTable.innerHTML = '';

        if (lowStockData.length === 0) {
            lowStockTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">All ingredients are well-stocked.</td></tr>';
            return;
        }

        lowStockData.forEach(item => {
            const row = lowStockTable.insertRow();
            row.innerHTML = `
                <td><strong>${item.name}</strong></td>
                <td><span class="badge bg-secondary">${item.category_id || 'N/A'}</span></td>
                <td>${item.current_quantity} ${item.unit_id || 'unit'}</td>
                <td>${item.low_stock_threshold} ${item.unit_id || 'unit'}</td>
                <td><span class="badge bg-warning">Low</span></td>
            `;
        });
    } catch (error) {
        console.error('Error loading low stock data:', error);
        lowStockTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">Error loading data.</td></tr>';
    }
}

// Global variable for dashboard interval
let dashboardRefreshInterval;

function loadAdminDashboardData() {
    loadLowStockData().catch(err => console.error('Error loading low stock data:', err));

    // Load notifications
    loadNotifications();

    // Load expiring/expired ingredients counts
    loadExpiryStats();

    // Load active users count
    loadActiveUsersCount();

    ingredientsDB.show().then(allIngredients => {
        if (allIngredients && Array.isArray(allIngredients)) {
            const restockItems = allIngredients.filter(ing => ing.current_quantity <= ing.low_stock_threshold);
            const restockCount = document.getElementById('ingredientsRestock');
            if (restockCount) restockCount.textContent = restockItems.length;

            const alertsCount = document.getElementById('systemAlerts');
            if (alertsCount) alertsCount.textContent = restockItems.length > 0 ? '1' : '0';
        }
    }).catch(err => console.error('Error loading ingredients:', err));

    getUsers().then(users => {
        if (users && Array.isArray(users)) {
            const activeUsers = users.filter(u => !u.isDeleted);
            const staffCount = document.getElementById('totalStaffAccounts');
            if (staffCount) staffCount.textContent = activeUsers.length;
        }
    }).catch(err => console.error('Error loading users:', err));

    // Load revenue statistics (includes sales records)
    loadRevenueStats();

    // Set up auto-refresh if not already set (every 30 seconds)
    if (!dashboardRefreshInterval) {
        dashboardRefreshInterval = setInterval(() => {
            loadAdminDashboardData();
        }, 30000);
    }
}

// ===== Notification Functions =====

async function loadNotifications() {
    try {
        const response = await fetch(`${NOTIFICATIONS_API}?unread=true&limit=20`);
        const data = await response.json();

        if (!data.success) return;

        const notifications = data.notifications || [];
        const unreadCount = notifications.length;

        // Update badge
        const countBadge = document.getElementById('notificationCount');
        if (countBadge) {
            countBadge.textContent = unreadCount;
            countBadge.classList.toggle('d-none', unreadCount === 0);
        }

        // Update dashboard card
        const dashboardCount = document.getElementById('unreadNotificationsCount');
        if (dashboardCount) {
            dashboardCount.textContent = unreadCount;
        }

        // Update notification list
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            if (notifications.length === 0) {
                notificationList.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-bell-slash me-2"></i>No new notifications</div>';
            } else {
                notificationList.innerHTML = notifications.map(n => {
                    const timeAgo = getTimeAgo(new Date(n.created_at));
                    const iconClass = getNotificationIcon(n.action_type);
                    return `
                        <div class="dropdown-item notification-item py-2 border-bottom" data-id="${n.id}" style="cursor: pointer;">
                            <div class="d-flex align-items-start">
                                <div class="notification-icon ${iconClass.bg} text-white rounded-circle p-2 me-2">
                                    <i class="fas ${iconClass.icon}" style="font-size: 12px;"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="small fw-bold">${n.user_name || 'System'}</div>
                                    <div class="small text-truncate" style="max-width: 250px;">${n.description}</div>
                                    <div class="small text-muted">${timeAgo}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                // Add click handlers to mark as read
                notificationList.querySelectorAll('.notification-item').forEach(item => {
                    item.addEventListener('click', () => markNotificationRead(item.dataset.id));
                });
            }
        }

    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

function getNotificationIcon(actionType) {
    const icons = {
        'add': { icon: 'fa-plus', bg: 'bg-success' },
        'edit': { icon: 'fa-edit', bg: 'bg-primary' },
        'delete': { icon: 'fa-trash', bg: 'bg-danger' },
        'restock': { icon: 'fa-boxes', bg: 'bg-info' },
        'adjust': { icon: 'fa-sliders-h', bg: 'bg-warning' },
        'refund': { icon: 'fa-undo', bg: 'bg-secondary' },
        'void': { icon: 'fa-ban', bg: 'bg-dark' }
    };
    return icons[actionType] || { icon: 'fa-bell', bg: 'bg-secondary' };
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

async function markNotificationRead(id) {
    try {
        await fetch(NOTIFICATIONS_API, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadNotifications();
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        await fetch(NOTIFICATIONS_API, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mark_all: true })
        });
        loadNotifications();
        // Modal notification removed
    } catch (error) {
        console.error('Failed to mark all as read:', error);
    }
}

async function createNotification(userId, actionType, targetTable, targetId, description, reason = null) {
    try {
        await fetch(NOTIFICATIONS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                action_type: actionType,
                target_table: targetTable,
                target_id: targetId,
                description: description,
                reason: reason
            })
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
}

// ===== Expiry Stats Functions =====

async function loadExpiryStats() {
    try {
        const ingredients = await ingredientsDB.show();
        if (!ingredients || !Array.isArray(ingredients)) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        let expiredCount = 0;
        let expiringSoonCount = 0;

        ingredients.forEach(ing => {
            if (ing.expiry_date) {
                const expiryDate = new Date(ing.expiry_date);
                expiryDate.setHours(0, 0, 0, 0);

                if (expiryDate < today) {
                    expiredCount++;
                } else if (expiryDate <= sevenDaysFromNow) {
                    expiringSoonCount++;
                }
            }
        });

        // Update dashboard cards
        const expiredEl = document.getElementById('ingredientsExpired');
        if (expiredEl) expiredEl.textContent = expiredCount;

        const expiringSoonEl = document.getElementById('ingredientsExpiringSoon');
        if (expiringSoonEl) expiringSoonEl.textContent = expiringSoonCount;

    } catch (error) {
        console.error('Failed to load expiry stats:', error);
    }
}

// ===== Active Users Functions =====

async function loadActiveUsersCount() {
    try {
        const response = await fetch(`${NOTIFICATIONS_API}?action=active_users`);
        const data = await response.json();

        if (data.success && data.users) {
            const activeCount = document.getElementById('activeUsersCount');
            if (activeCount) activeCount.textContent = data.users.length;
        }
    } catch (error) {
        console.error('Failed to load active users count:', error);
    }
}

// Menu Control Functions

// Get menu items from localStorage or seed with defaults
function getMenuItems() {
    let items = [];
    try {
        const stored = localStorage.getItem('adminMenuItems');
        if (stored) items = JSON.parse(stored);
    } catch (e) { items = []; }

    if (!items || items.length === 0) {
        items = [
            { id: 1, name: 'Beef Steak', category: 'Main Course', price: 24.99, status: 'Active', recipes: 4 },
            { id: 2, name: 'Chicken Curry', category: 'Main Course', price: 18.99, status: 'Active', recipes: 3 },
            { id: 3, name: 'Vegetable Salad', category: 'Appetizer', price: 9.99, status: 'Active', recipes: 3 },
            { id: 4, name: 'Garlic Bread', category: 'Appetizer', price: 7.99, status: 'Active', recipes: 3 },
            { id: 5, name: 'French Fries', category: 'Side Dish', price: 5.99, status: 'Active', recipes: 1 },
            { id: 6, name: 'Grilled Salmon', category: 'Main Course', price: 22.99, status: 'Inactive', recipes: 2 },
            { id: 7, name: 'Pasta Carbonara', category: 'Main Course', price: 16.99, status: 'Active', recipes: 3 },
            { id: 8, name: 'Chocolate Cake', category: 'Dessert', price: 8.99, status: 'Active', recipes: 3 }
        ];
        localStorage.setItem('adminMenuItems', JSON.stringify(items));
    }
    return items;
}

function saveMenuItemsToStorage(items) {
    localStorage.setItem('adminMenuItems', JSON.stringify(items));
}

// Variable to track if we are editing
let editingMenuItemId = null;
const DEFAULT_MENU_CATEGORIES = ['Main Course', 'Appetizer', 'Side Dish', 'Dessert', 'Beverage'];

async function ensureMenuCategories() {
    let categories = await menuCategoriesDB.show();
    if (!Array.isArray(categories)) categories = [];

    if (categories.length === 0) {
        for (const categoryName of DEFAULT_MENU_CATEGORIES) {
            try {
                await menuCategoriesDB.add({ name: categoryName, description: '' });
            } catch (error) {
                console.error(`Failed to seed category "${categoryName}":`, error);
            }
        }
        categories = await menuCategoriesDB.show();
        if (!Array.isArray(categories)) categories = [];
    }

    return categories;
}

function initializeMenuControl() {
    // Add menu item button
    const addMenuItemBtn = document.getElementById('addMenuItemBtn');
    if (addMenuItemBtn) {
        addMenuItemBtn.addEventListener('click', function () {
            editingMenuItemId = null;
            showAddMenuItemModal();
        });
    }

    // Show inactive items toggle
    const showInactiveItems = document.getElementById('showInactiveItems');
    if (showInactiveItems) {
        showInactiveItems.addEventListener('change', function () {
            loadMenuControl();
        });
    }

    // Search filter
    const searchInput = document.getElementById('menuControlSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            loadMenuControl();
        });
    }

    // Category filter
    const categoryFilter = document.getElementById('menuControlCategory');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function () {
            loadMenuControl();
        });
    }

    // Initial Load
    loadMenuControl();
}

function loadMenuControl() {
    const tableElement = document.getElementById('menuControlTable');
    if (!tableElement) return;

    const menuControlTable = tableElement.getElementsByTagName('tbody')[0];
    if (!menuControlTable) return;

    const showInactive = document.getElementById('showInactiveItems') ? document.getElementById('showInactiveItems').checked : false;
    const searchQuery = (document.getElementById('menuControlSearch')?.value || '').toLowerCase().trim();
    const categoryFilter = document.getElementById('menuControlCategory')?.value || '';

    menuControlTable.innerHTML = '<tr><td colspan="7" class="text-center py-3"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';

    Promise.all([
        menuItemsDB.show(),
        menuCategoriesDB.show()
    ]).then(function (results) {
        const allItems = results[0];
        const categories = results[1];

        const categoryMap = {};
        categories.forEach(function (cat) {
            categoryMap[String(cat.id)] = cat.name;
        });

        let menuItems = allItems;

        if (!showInactive) {
            menuItems = menuItems.filter(function (item) {
                return (item.status || '').trim().toLowerCase() === 'active';
            });
        }

        if (searchQuery) {
            menuItems = menuItems.filter(function (item) {
                const catName = (categoryMap[String(item.category_id)] || '').toLowerCase();
                return item.name.toLowerCase().includes(searchQuery) ||
                    catName.includes(searchQuery);
            });
        }

        if (categoryFilter) {
            menuItems = menuItems.filter(function (item) {
                return item.category_id == categoryFilter;
            });
        }

        menuControlTable.innerHTML = '';

        if (menuItems.length === 0) {
            menuControlTable.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="fas fa-utensils fa-2x mb-2 d-block"></i>No menu items found.</td></tr>';
        } else {
            menuItems.forEach(function (item) {
                const catName = categoryMap[String(item.category_id)] || '—';
                const itemStatus = (item.status || '').trim();
                const isActive = itemStatus.toLowerCase() === 'active';
                const imgSrc = fixImagePath(item.image_path);
                const imageHtml = imgSrc
                    ? `<img src="${imgSrc}" alt="${item.name}" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">`
                    : '<span class="text-muted"><i class="fas fa-image fa-2x"></i></span>';
                const row = menuControlTable.insertRow();
                row.classList.add('animate__animated', 'animate__fadeIn');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td class="text-center">${imageHtml}</td>
                    <td><strong>${item.name}</strong></td>
                    <td><span class="badge bg-secondary">${catName}</span></td>
                    <td>₱${parseFloat(item.price_reference || 0).toFixed(2)}</td>
                    <td><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${itemStatus}</span></td>
                    <td><span class="badge bg-info">${item.recipe || 0} ingredients</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="editMenuItem(${item.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-${isActive ? 'warning' : 'success'}" onclick="toggleMenuItemStatus(${item.id})" title="${isActive ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-power-off"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteMenuItem(${item.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
            });
        }

        const totalElems = document.getElementById('totalMenuItems');
        if (totalElems) totalElems.textContent = `${allItems.length} Items`;

    }).catch(function (err) {
        console.error('Failed to load menu control:', err);
        menuControlTable.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Failed to load menu items.</td></tr>';
    });
}
function showAddMenuItemModal() {
    // Clear form
    const form = document.getElementById('addMenuItemForm');
    if (form) form.reset();

    // Reset recipe ingredients container
    const recipeContainer = document.getElementById('recipeIngredientsContainer');
    if (recipeContainer) {
        recipeContainer.innerHTML = '<p class="text-muted text-center py-2">No ingredients assigned yet</p>';
    }

    // Update modal title
    const modalTitle = document.querySelector('#addMenuItemModal .modal-title');
    if (modalTitle) {
        if (editingMenuItemId) {
            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Menu Item';
        } else {
            modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Add Menu Item';
        }
    }

    // Load categories into dropdown (auto-seed defaults if empty)
    ensureMenuCategories().then(function (categories) {
        const select = document.getElementById('menuItemCategory');
        if (!select) return;
        select.innerHTML = '<option value="">Select Category</option>';

        if (!categories.length) {
            Swal.fire('Missing Categories', 'No menu categories found. Please add categories first.', 'warning');
            return;
        }

        categories.forEach(function (cat) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });

        // If editing, fetch item from DB and pre-fill after categories are loaded
        if (editingMenuItemId) {
            menuItemsDB.show({ id: editingMenuItemId }).then(function (items) {
                const item = Array.isArray(items) ? items[0] : items;
                if (!item) return;

                const nameEl = document.getElementById('menuItemName');
                const catEl = document.getElementById('menuItemCategory');
                const priceEl = document.getElementById('menuItemPrice');
                const statusEl = document.getElementById('menuItemStatus');
                const imagePathEl = document.getElementById('menuItemImagePath');
                const previewContainer = document.getElementById('imagePreviewContainer');
                const previewImg = document.getElementById('menuItemImagePreview');

                if (nameEl) nameEl.value = item.name || '';
                if (catEl) catEl.value = item.category_id || '';
                if (priceEl) priceEl.value = item.price_reference || '';
                if (statusEl) statusEl.value = item.status || 'Active';

                // Load existing image preview if available
                if (item.image_path) {
                    const fixedPath = fixImagePath(item.image_path);
                    if (imagePathEl) imagePathEl.value = fixedPath;
                    if (previewImg) previewImg.src = fixedPath;
                    if (previewContainer) previewContainer.style.display = 'block';
                } else {
                    resetImagePreview();
                }

            }).catch(function (err) {
                console.error('Failed to load menu item for editing:', err);
            });
        }

    }).catch(function (err) {
        console.error('Failed to load categories:', err);
    });

    // Show modal
    const modalElem = document.getElementById('addMenuItemModal');
    if (!modalElem) return;

    const modal = new bootstrap.Modal(modalElem);
    modal.show();

    // Add ingredient button — clone to remove old listeners
    const addIngBtn = document.getElementById('addIngredientToRecipe');
    if (addIngBtn) {
        const newBtn = addIngBtn.cloneNode(true);
        addIngBtn.parentNode.replaceChild(newBtn, addIngBtn);
        newBtn.addEventListener('click', function () {
            addIngredientToRecipeForm();
        });
    }

    // Save button — clone to remove old listeners
    const saveBtn = document.getElementById('saveMenuItemBtn');
    if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', function () {
            saveMenuItem();
        });
    }

    // Image preview functionality
    initializeImageUpload();

    // Reset image preview on new item
    if (!editingMenuItemId) {
        resetImagePreview();
    }
}

/**
 * Initialize image upload preview and handlers
 */
function initializeImageUpload() {
    const imageInput = document.getElementById('menuItemImage');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('menuItemImagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const hiddenPath = document.getElementById('menuItemImagePath');

    if (!imageInput) return;

    // Clone to remove old listeners
    const newImageInput = imageInput.cloneNode(true);
    imageInput.parentNode.replaceChild(newImageInput, imageInput);

    // File selection preview
    newImageInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                // Modal notification removed
                e.target.value = '';
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                // Modal notification removed
                e.target.value = '';
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onload = function (event) {
                if (previewImg) previewImg.src = event.target.result;
                if (previewContainer) previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Remove image button
    if (removeBtn) {
        const newRemoveBtn = removeBtn.cloneNode(true);
        removeBtn.parentNode.replaceChild(newRemoveBtn, removeBtn);
        newRemoveBtn.addEventListener('click', function () {
            resetImagePreview();
        });
    }
}

/**
 * Reset image preview to default state
 */
function resetImagePreview() {
    const imageInput = document.getElementById('menuItemImage');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('menuItemImagePreview');
    const hiddenPath = document.getElementById('menuItemImagePath');

    if (imageInput) imageInput.value = '';
    if (previewImg) previewImg.src = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (hiddenPath) hiddenPath.value = '';
}

/**
 * Upload image file to server
 * @returns {Promise<string|null>} - Returns uploaded image URL or null
 */
async function uploadMenuItemImage() {
    const imageInput = document.getElementById('menuItemImage');
    if (!imageInput || !imageInput.files || !imageInput.files[0]) {
        return null; // No image selected
    }

    const file = imageInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('php/upload_file.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            console.log('Image uploaded:', result.url);
            return result.url;
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Image upload error:', error);
        // Modal notification removed
        return null;
    }
}

function addIngredientToRecipeForm() {
    const container = document.getElementById('recipeIngredientsContainer');
    if (!container) return;

    // Clear "no ingredients" text if present
    if (container.querySelector('p.text-muted')) {
        container.innerHTML = '';
    }

    // Get available ingredients from localStorage or default list
    let ingredients = [];
    try {
        const stored = localStorage.getItem('ingredients');
        if (stored) {
            ingredients = JSON.parse(stored).map(i => ({ id: i.id, name: i.name }));
        }
    } catch (e) { }
    if (ingredients.length === 0) {
        ingredients = [
            { id: 1, name: 'Beef' }, { id: 2, name: 'Chicken' }, { id: 3, name: 'Rice' },
            { id: 4, name: 'Tomatoes' }, { id: 5, name: 'Onions' }, { id: 6, name: 'Garlic' },
            { id: 7, name: 'Salt' }, { id: 8, name: 'Flour' }, { id: 9, name: 'Cheese' },
            { id: 10, name: 'Butter' }, { id: 11, name: 'Potatoes' }, { id: 12, name: 'Lettuce' }
        ];
    }

    // Create ingredient row
    const row = document.createElement('div');
    row.className = 'row g-3 mb-3 align-items-center';
    row.innerHTML = `
        <div class="col-md-6">
            <select class="form-select ingredient-select">
                <option value="">Select Ingredient</option>
                ${ingredients.map(ing => `<option value="${ing.id}">${ing.name}</option>`).join('')}
            </select>
        </div>
        <div class="col-md-4">
            <div class="input-group">
                <input type="number" class="form-control ingredient-quantity" placeholder="Quantity" min="0.01" step="0.01">
                <span class="input-group-text">kg</span>
            </div>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-sm btn-outline-danger w-100 remove-ingredient">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    container.appendChild(row);

    // Add remove event listener
    row.querySelector('.remove-ingredient').addEventListener('click', function () {
        row.remove();
        if (container.querySelectorAll('.row').length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-2">No ingredients assigned yet</p>';
        }
    });
}

async function saveMenuItem() {
    const nameElem = document.getElementById('menuItemName');
    const categoryElem = document.getElementById('menuItemCategory');
    const priceElem = document.getElementById('menuItemPrice');
    const statusElem = document.getElementById('menuItemStatus');
    if (!nameElem || !categoryElem) return;

    const name = nameElem.value.trim();
    const categoryId = categoryElem.value;
    const price = parseFloat(priceElem?.value) || 0;
    const status = statusElem?.value || 'Active';

    // Validation
    if (!name || !categoryId) {
        Swal.fire('Missing Fields', 'Please enter menu item name and category.', 'warning');
        return;
    }

    if (Number.isNaN(parseInt(categoryId))) {
        Swal.fire('Invalid Category', 'Please select a valid category.', 'warning');
        return;
    }

    // Count recipe ingredients assigned
    const ingredientRows = document.querySelectorAll('#recipeIngredientsContainer .ingredient-select');
    let recipesCount = 0;
    ingredientRows.forEach(sel => { if (sel.value) recipesCount++; });

    // Show loading state
    const saveBtn = document.getElementById('saveMenuItemBtn');
    const originalText = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
    }

    try {
        // Upload image if selected
        let imagePath = document.getElementById('menuItemImagePath')?.value || null;
        const imageInput = document.getElementById('menuItemImage');
        if (imageInput && imageInput.files && imageInput.files[0]) {
            const uploadedUrl = await uploadMenuItemImage();
            if (uploadedUrl) {
                imagePath = uploadedUrl;
            }
        }

        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (editingMenuItemId) {
            // --- EDIT existing item in DB ---
            const updateData = {
                id: editingMenuItemId,
                name: name,
                category_id: parseInt(categoryId),
                price_reference: price,
                status: status,
                recipe: recipesCount,
                updated_at: now
            };

            // Only update image if a new one was uploaded
            if (imagePath) {
                updateData.image_path = imagePath;
            }

            await menuItemsDB.edit(updateData);

            // Close modal
            const modalElem = document.getElementById('addMenuItemModal');
            const modal = bootstrap.Modal.getInstance(modalElem);
            if (modal) modal.hide();

            // Modal notification removed
            logAdminActivity('Updated menu item', name, 'Success');
            editingMenuItemId = null;
        } else {
            // --- ADD new item to DB ---
            const newItem = {
                name: name,
                category_id: parseInt(categoryId),
                price_reference: price,
                status: status,
                recipe: recipesCount,
                image_path: imagePath,
                created_at: now,
                updated_at: now
            };

            await menuItemsDB.add(newItem);

            // Close modal
            const modalElem = document.getElementById('addMenuItemModal');
            const modal = bootstrap.Modal.getInstance(modalElem);
            if (modal) modal.hide();

            // Modal notification removed
            logAdminActivity('Added menu item', name, 'Success');
        }

        // Refresh menu control immediately
        loadMenuControl();

    } catch (error) {
        console.error('Error saving menu item:', error);
        Swal.fire('Save Failed', error?.message || 'Unable to save menu item.', 'error');
    } finally {
        // Restore button state
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText || 'Save Item';
        }
    }
}

function editMenuItem(id) {
    editingMenuItemId = id;
    showAddMenuItemModal();
}

function toggleMenuItemStatus(id) {
    menuItemsDB.show({ id: id }).then(function (items) {
        const item = Array.isArray(items) ? items[0] : items;
        if (!item) return;

        const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
        const actionWord = newStatus === 'Inactive' ? 'deactivate' : 'activate';

        showConfirm(`Are you sure you want to ${actionWord} "${item.name}"?`, function () {
            menuItemsDB.edit({ id: id, status: newStatus }).then(function (result) {
                if (result.error) {
                    Swal.fire('Error', result.error, 'error');
                    return;
                }

                // Modal notification removed
                logAdminActivity(`${newStatus === 'Inactive' ? 'Deactivated' : 'Activated'} menu item`, item.name, 'Success');
                loadMenuControl();

            }).catch(function (err) {
                console.error('Failed to update menu item status:', err);
                Swal.fire('Error', 'Failed to update status.', 'error');
            });
        });

    }).catch(function (err) {
        console.error('Failed to fetch menu item:', err);
    });
}
function deleteMenuItem(id) {
    menuItemsDB.show({ id: id }).then(function (items) {
        const item = Array.isArray(items) ? items[0] : items;
        if (!item) return;

        showConfirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`, function () {
            menuItemsDB.delete(id).then(function (result) {
                if (result.error) {
                    Swal.fire('Error', result.error, 'error');
                    return;
                }

                // Modal notification removed
                logAdminActivity('Deleted menu item', item.name, 'Success');
                loadMenuControl();

            }).catch(function (err) {
                console.error('Delete menu item failed:', err);
                Swal.fire('Error', 'Failed to delete menu item.', 'error');
            });
        });

    }).catch(function (err) {
        console.error('Failed to fetch menu item:', err);
    });
}

// ===== Recipe Control Functions =====

// Available ingredients master list (shared with the rest of the system)
function getAvailableIngredients(callback) {
    ingredientsDB.show().then(function (ingredients) {
        if (typeof callback === 'function') {
            callback(ingredients);
        }
    }).catch(function (err) {
        console.error('Failed to load ingredients:', err);
        if (typeof callback === 'function') {
            callback([]);
        }
    });
}

function saveIngredientsToStorage(ingredients) {
    localStorage.setItem('ingredients', JSON.stringify(ingredients));
}

// Get recipes from localStorage or seed with defaults
function getRecipes() {
    let recipes = [];
    try {
        const stored = localStorage.getItem('adminRecipes');
        if (stored) recipes = JSON.parse(stored);
    } catch (e) { recipes = []; }

    if (!recipes || recipes.length === 0) {
        recipes = [
            {
                id: 1, menuItem: 'Beef Steak',
                ingredients: [
                    { name: 'Beef', qty: 0.30, unit: 'kg', cost: 3.60 },
                    { name: 'Potatoes', qty: 0.15, unit: 'kg', cost: 0.38 },
                    { name: 'Tomatoes', qty: 0.10, unit: 'kg', cost: 0.30 },
                    { name: 'Onions', qty: 0.10, unit: 'kg', cost: 0.20 }
                ]
            },
            {
                id: 2, menuItem: 'Chicken Curry',
                ingredients: [
                    { name: 'Chicken', qty: 0.25, unit: 'kg', cost: 2.00 },
                    { name: 'Rice', qty: 0.15, unit: 'kg', cost: 0.38 },
                    { name: 'Garlic', qty: 0.02, unit: 'kg', cost: 0.10 },
                    { name: 'Onions', qty: 0.10, unit: 'kg', cost: 0.20 }
                ]
            },
            {
                id: 3, menuItem: 'Vegetable Salad',
                ingredients: [
                    { name: 'Tomatoes', qty: 0.10, unit: 'kg', cost: 0.30 },
                    { name: 'Lettuce', qty: 0.13, unit: 'kg', cost: 0.46 },
                    { name: 'Cucumber', qty: 0.10, unit: 'kg', cost: 0.28 }
                ]
            },
            {
                id: 4, menuItem: 'Garlic Bread',
                ingredients: [
                    { name: 'Flour', qty: 0.08, unit: 'kg', cost: 0.12 },
                    { name: 'Butter', qty: 0.05, unit: 'kg', cost: 0.35 },
                    { name: 'Garlic', qty: 0.03, unit: 'kg', cost: 0.15 }
                ]
            },
            {
                id: 5, menuItem: 'Pasta Carbonara',
                ingredients: [
                    { name: 'Pasta', qty: 0.15, unit: 'kg', cost: 0.45 },
                    { name: 'Cheese', qty: 0.08, unit: 'kg', cost: 0.80 },
                    { name: 'Bacon', qty: 0.10, unit: 'kg', cost: 1.10 }
                ]
            }
        ];
        localStorage.setItem('adminRecipes', JSON.stringify(recipes));
    }
    return recipes;
}

function saveRecipesToStorage(recipes) {
    localStorage.setItem('adminRecipes', JSON.stringify(recipes));
}

let editingRecipeId = null;

function initializeRecipeControl() {
    // Assign recipe button
    const assignRecipeBtn = document.getElementById('assignRecipeBtn');
    if (assignRecipeBtn) {
        assignRecipeBtn.addEventListener('click', function () {
            editingRecipeId = null;
            showAssignRecipeModal();
        });
    }

    // Search filter
    const searchInput = document.getElementById('recipeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            loadRecipeControl();
        });
    }

    // Load recipe control list
    loadRecipeControl();
}

function loadRecipeControl() {
    const tableElement = document.getElementById('recipeMappingTable');
    if (!tableElement) return;

    const recipeMappingTable = tableElement.getElementsByTagName('tbody')[0];
    if (!recipeMappingTable) return;

    const searchQuery = (document.getElementById('recipeSearch')?.value || '').toLowerCase().trim();

    recipeMappingTable.innerHTML = '<tr><td colspan="5" class="text-center py-3"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';

    Promise.all([
        recipesDB.show(),
        menuItemsDB.show(),
        ingredientsDB.show()
    ]).then(function (results) {
        const recipes = results[0];
        const menuItems = results[1];
        const ingredients = results[2];

        // Build lookup maps
        const menuItemMap = {};
        menuItems.forEach(function (item) {
            menuItemMap[item.id] = item.name;
        });

        const ingredientMap = {};
        ingredients.forEach(function (ing) {
            ingredientMap[ing.id] = ing;
        });

        // Group recipe rows by menu_item_id
        const grouped = {};
        recipes.forEach(function (recipe) {
            const mid = recipe.menu_item_id;
            if (!grouped[mid]) {
                grouped[mid] = {
                    menu_item_id: mid,
                    menu_item_name: menuItemMap[mid] || '—',
                    ingredients: []
                };
            }
            const ing = ingredientMap[recipe.ingredient_id];
            grouped[mid].ingredients.push({
                name: ing ? ing.name : '—',
                qty: parseFloat(recipe.qty_per_sale) || 0,
                unit: ing ? (ing.unit || 'kg') : 'kg'
            });
        });

        let groupedList = Object.values(grouped);

        // Filter by search
        if (searchQuery) {
            groupedList = groupedList.filter(function (r) {
                return r.menu_item_name.toLowerCase().includes(searchQuery) ||
                    r.ingredients.some(function (i) {
                        return i.name.toLowerCase().includes(searchQuery);
                    });
            });
        }

        recipeMappingTable.innerHTML = '';

        if (groupedList.length === 0) {
            recipeMappingTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fas fa-clipboard-list fa-2x mb-2 d-block"></i>No recipe mappings found.</td></tr>';
            return;
        }

        groupedList.forEach(function (recipe) {
            const totalQty = recipe.ingredients.reduce(function (sum, i) {
                return sum + (i.qty || 0);
            }, 0);

            const ingredientBadges = recipe.ingredients.map(function (i) {
                return `<span class="badge bg-light text-dark border me-1 mb-1" style="font-size: 0.78em;">
                    <i class="fas fa-leaf text-success me-1"></i>${i.name} <small class="text-muted">(${i.qty} ${i.unit})</small>
                </span>`;
            }).join('');

            const row = recipeMappingTable.insertRow();
            row.classList.add('animate__animated', 'animate__fadeIn');
            row.innerHTML = `
                <td><strong>${recipe.menu_item_name}</strong></td>
                <td style="max-width: 300px;">${ingredientBadges}</td>
                <td><span class="badge bg-secondary">${totalQty.toFixed(2)} kg</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="editRecipe(${recipe.menu_item_id})" title="Edit Recipe">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRecipe(${recipe.menu_item_id})" title="Delete Recipe">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
        });

    }).catch(function (err) {
        console.error('Failed to load recipes:', err);
        recipeMappingTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Failed to load recipes.</td></tr>';
    });
}
function showAssignRecipeModal() {
    const form = document.getElementById('assignRecipeForm');
    if (form) form.reset();

    const title = document.getElementById('recipeModalTitle');
    if (title) {
        title.innerHTML = editingRecipeId
            ? '<i class="fas fa-edit me-2"></i>Edit Recipe'
            : '<i class="fas fa-book me-2"></i>Assign New Recipe';
    }

    // Clear ingredients area
    const ingredientsArea = document.getElementById('recipeIngredientsArea');
    if (ingredientsArea) {
        ingredientsArea.innerHTML = '<p class="text-muted text-center py-3" id="noIngredientsMsg"><i class="fas fa-info-circle me-1"></i>Click "Add Ingredient" to start building the recipe.</p>';
    }

    // Reset summary
    updateRecipeSummary();

    // Load menu items and ingredients from DB together
    Promise.all([
        menuItemsDB.show(),
        ingredientsDB.show(),
        unitsDB.show()
    ]).then(function (results) {
        const menuItems = results[0];
        const ingredients = results[1];
        const units = results[2];

        // Populate menu item dropdown
        const menuSelect = document.getElementById('recipeMenuItem');
        if (menuSelect) {
            menuSelect.innerHTML = '<option value="">Select a menu item...</option>';
            menuItems.forEach(function (item) {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name;
                menuSelect.appendChild(opt);
            });
        }

        // Build unit map
        const unitMap = {};
        units.forEach(function (u) {
            unitMap[u.id] = u.short_name || u.name;
        });

        // Attach unit name to each ingredient
        ingredients.forEach(function (ing) {
            ing.unit_name = unitMap[ing.unit_id] || '';
        });


        // Wire up Add Ingredient button — always, not just in else
        const addIngBtn = document.getElementById('addRecipeIngredientBtn');
        if (addIngBtn) {
            const newBtn = addIngBtn.cloneNode(true);
            addIngBtn.parentNode.replaceChild(newBtn, addIngBtn);
            newBtn.addEventListener('click', function () {
                addRecipeIngredientRow(ingredients);
            });
        }

        // If editing, pre-fill from DB
        if (editingRecipeId) {
            recipesDB.show().then(function (allRecipes) {
                const recipes = allRecipes.filter(function (r) {
                    return r.menu_item_id == editingRecipeId;
                });

                if (!recipes || recipes.length === 0) return;

                if (menuSelect) menuSelect.value = recipes[0].menu_item_id;

                const ingredientsArea = document.getElementById('recipeIngredientsArea');
                if (ingredientsArea) ingredientsArea.innerHTML = '';

                recipes.forEach(function (recipe) {
                    addRecipeIngredientRow(ingredients, recipe.ingredient_id, recipe.qty_per_sale);
                });

                updateRecipeSummary();

            }).catch(function (err) {
                console.error('Failed to load recipe for editing:', err);
            });
        }

    }).catch(function (err) {
        console.error('Failed to load modal data:', err);
    });
    // Show modal
    const modalElem = document.getElementById('assignRecipeModal');
    if (!modalElem) return;
    const modal = new bootstrap.Modal(modalElem);
    modal.show();

    // Wire up Save button
    const saveBtn = document.getElementById('saveRecipeBtn');
    if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener('click', function () {
            saveRecipe();
        });
    }
}

function addRecipeIngredientRow(ingredients, selectedIngredientId, qty) {
    const ingredientsArea = document.getElementById('recipeIngredientsArea');
    if (!ingredientsArea) return;

    const noMsg = document.getElementById('noIngredientsMsg');
    if (noMsg) noMsg.remove();

    const row = document.createElement('div');
    row.className = 'row align-items-center mb-2 recipe-ingredient-row';

    // Ingredient dropdown
    const ingSelect = document.createElement('select');
    ingSelect.className = 'form-select ingredient-select col';
    ingSelect.innerHTML = '<option value="">Select Ingredient</option>';
    ingredients.forEach(function (ing) {
        const opt = document.createElement('option');
        opt.value = ing.id;
        opt.textContent = ing.name;
        opt.dataset.unit = ing.unit_name || ing.unit || '';
        if (ing.id == selectedIngredientId) opt.selected = true;
        ingSelect.appendChild(opt);
    });

    // Quantity input
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'form-control ingredient-qty';
    qtyInput.min = '0';
    qtyInput.step = '0.01';
    qtyInput.value = qty || '';

    // Set initial placeholder based on pre-selected ingredient
    if (selectedIngredientId) {
        const preSelected = ingredients.find(function (i) { return i.id == selectedIngredientId; });
        if (preSelected) qtyInput.placeholder = 'Qty (' + (preSelected.unit_name || preSelected.unit || 'unit') + ')';
    } else {
        qtyInput.placeholder = 'Qty';
    }

    // Update placeholder when ingredient changes
    ingSelect.addEventListener('change', function () {
        const selected = ingSelect.options[ingSelect.selectedIndex];
        const unit = selected.dataset.unit || '';
        qtyInput.placeholder = unit ? 'Qty (' + unit + ')' : 'Qty';
        updateRecipeSummary();
    });

    qtyInput.addEventListener('input', updateRecipeSummary);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm btn-outline-danger';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.addEventListener('click', function () {
        row.remove();
        updateRecipeSummary();
    });

    const col1 = document.createElement('div');
    col1.className = 'col-md-6';
    col1.appendChild(ingSelect);

    const col2 = document.createElement('div');
    col2.className = 'col-md-4';
    col2.appendChild(qtyInput);

    const col3 = document.createElement('div');
    col3.className = 'col-md-2 text-end';
    col3.appendChild(removeBtn);

    row.appendChild(col1);
    row.appendChild(col2);
    row.appendChild(col3);

    ingredientsArea.appendChild(row);
    updateRecipeSummary();
}
function updateRecipeSummary() {
    const rows = document.querySelectorAll('.recipe-ingredient-row');
    const countEl = document.getElementById('recipeIngredientCount');
    const totalQtyEl = document.getElementById('recipeTotalQty');

    let totalQty = 0;
    rows.forEach(function (row) {
        const qty = parseFloat(row.querySelector('.ingredient-qty')?.value) || 0;
        totalQty += qty;
    });

    if (countEl) countEl.textContent = rows.length;
    if (totalQtyEl) totalQtyEl.textContent = totalQty.toFixed(2);
}

function saveRecipe() {
    const menuItemId = document.getElementById('recipeMenuItem')?.value;
    if (!menuItemId) {
        // Modal notification removed
        return;
    }

    const rows = document.querySelectorAll('#recipeIngredientsArea .recipe-ingredient-row');
    const ingredientsList = [];
    let valid = true;

    rows.forEach(function (row) {
        const ingredientId = row.querySelector('.ingredient-select')?.value;
        const qty = parseFloat(row.querySelector('.ingredient-qty')?.value) || 0;

        if (!ingredientId || qty <= 0) {
            valid = false;
            return;
        }

        ingredientsList.push({
            ingredient_id: ingredientId,
            qty_per_sale: qty
        });
    });

    if (ingredientsList.length === 0 || !valid) {
        // Modal notification removed
        return;
    }

    const ids = ingredientsList.map(function (i) { return i.ingredient_id; });
    if (new Set(ids).size !== ids.length) {
        // Modal notification removed
        return;
    }

    const saveBtn = document.getElementById('saveRecipeBtn');
    if (saveBtn) saveBtn.disabled = true;

    function doInsert() {
        return Promise.all(ingredientsList.map(function (ing) {
            return recipesDB.add({
                menu_item_id: menuItemId,
                ingredient_id: ing.ingredient_id,
                qty_per_sale: ing.qty_per_sale
            });
        }));
    }

    function afterSave() {
        const modalElem = document.getElementById('assignRecipeModal');
        const modal = bootstrap.Modal.getInstance(modalElem);
        if (modal) modal.hide();
        editingRecipeId = null;
        if (saveBtn) saveBtn.disabled = false;
        loadRecipeControl();
    }

    if (editingRecipeId) {
        // Fetch ALL recipes then filter client-side by menu_item_id
        recipesDB.show().then(function (allRecipes) {
            const existingRows = allRecipes.filter(function (r) {
                return r.menu_item_id == editingRecipeId;
            });

            // Delete each row by its own id
            return Promise.all(existingRows.map(function (r) {
                return recipesDB.delete(r.id);
            }));

        }).then(function () {
            return doInsert();

        }).then(function () {
            // Modal notification removed
            logAdminActivity('Updated recipe', menuItemId, 'Success');
            afterSave();

        }).catch(function (err) {
            console.error('Failed to update recipe:', err);
            Swal.fire('Error', 'Failed to update recipe.', 'error');
            if (saveBtn) saveBtn.disabled = false;
        });

    } else {
        // Fetch ALL recipes then filter client-side to check duplicate
        recipesDB.show().then(function (allRecipes) {
            const existing = allRecipes.filter(function (r) {
                return r.menu_item_id == menuItemId;
            });

            if (existing.length > 0) {
                // Modal notification removed
                if (saveBtn) saveBtn.disabled = false;
                return;
            }

            return doInsert().then(function () {
                // Modal notification removed
                logAdminActivity('Assigned new recipe', menuItemId, 'Success');
                afterSave();
            });

        }).catch(function (err) {
            console.error('Failed to save recipe:', err);
            Swal.fire('Error', 'Failed to save recipe.', 'error');
            if (saveBtn) saveBtn.disabled = false;
        });
    }
}
function editRecipe(id) {
    editingRecipeId = id;
    showAssignRecipeModal();
}

function deleteRecipe(menuItemId) {
    recipesDB.show().then(function (allRecipes) {
        const rows = allRecipes.filter(function (r) {
            return r.menu_item_id == menuItemId;
        });

        if (!rows || rows.length === 0) {
            // Modal notification removed
            return;
        }

        menuItemsDB.show({ id: menuItemId }).then(function (items) {
            const item = Array.isArray(items) ? items[0] : items;
            const menuItemName = item ? item.name : 'Unknown';

            showConfirm(`Are you sure you want to delete the recipe for "${menuItemName}"? This action cannot be undone.`, function () {
                Promise.all(rows.map(function (r) {
                    return recipesDB.delete(r.id);
                })).then(function () {
                    // Modal notification removed
                    logAdminActivity('Deleted recipe', menuItemName, 'Success');
                    loadRecipeControl();
                }).catch(function (err) {
                    console.error('Failed to delete recipe:', err);
                    Swal.fire('Error', 'Failed to delete recipe.', 'error');
                });
            });
        });

    }).catch(function (err) {
        console.error('Failed to fetch recipes:', err);
    });
}

// Ingredients Masterlist Functions
let editingIngredientId = null;

// Ingredients Masterlist Functions
function initializeIngredientsMasterlist() {
    // Add ingredient button
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', function () {
            editingIngredientId = null;
            showAddIngredientModal();
        });
    }

    // Set thresholds button
    const setThresholdsBtn = document.getElementById('setThresholdsBtn');
    if (setThresholdsBtn) {
        setThresholdsBtn.addEventListener('click', function () {
            showSetThresholdsModal();
        });
    }

    // Search and Filter Listeners
    const searchInput = document.getElementById('masterIngredientSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            loadIngredientsMasterlist();
        });
    }

    const categoryFilter = document.getElementById('masterCategoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function () {
            loadIngredientsMasterlist();
        });
    }

    // Load ingredients masterlist
    loadIngredientsMasterlist();
}

async function loadIngredientsMasterlist() {
    const tableElement = document.getElementById('ingredientsMasterTable');
    if (!tableElement) return;

    const ingredientsMasterTable = tableElement.getElementsByTagName('tbody')[0];
    const masterLowStockCount = document.getElementById('masterLowStockCount');
    const masterTotalIngredients = document.getElementById('masterTotalIngredients');

    const searchQuery = (document.getElementById('masterIngredientSearch')?.value || '').toLowerCase().trim();
    const categoryFilter = document.getElementById('masterCategoryFilter')?.value || '';

    ingredientsMasterTable.innerHTML = '<tr><td colspan="9" class="text-center py-3"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';

    const results = await Promise.all([
        ingredientsDB.show(),
        ingredientCategoriesDB.show(),
        unitsDB.show(),
        recipesDB.show()
    ]);

    let ingredients = results[0];
    const categories = results[1];
    const units = results[2];
    const recipes = results[3];

    const getCategoryName = function (id) {
        const cat = categories.find(function (c) { return c.id == id; });
        return cat ? cat.name : 'Unknown';
    };

    const getUnitName = function (id) {
        const unit = units.find(function (u) { return u.id == id; });
        return unit ? (unit.short_name || unit.name) : 'Unknown';
    };

    const getUsedInCount = function (ingredientId) {
        return recipes.filter(function (r) {
            return r.ingredient_id == ingredientId;
        }).length;
    };

    if (categoryFilter) {
        ingredients = ingredients.filter(function (ing) {
            return ing.category_id == categoryFilter;
        });
    }

    if (searchQuery) {
        ingredients = ingredients.filter(function (ing) {
            return ing.name.toLowerCase().includes(searchQuery) ||
                ing.id.toString().includes(searchQuery);
        });
    }

    let lowStockCount = 0;
    ingredients.forEach(function (ing) {
        if (ing.current_quantity <= ing.low_stock_threshold) lowStockCount++;
    });

    if (masterLowStockCount) masterLowStockCount.textContent = lowStockCount;
    if (masterTotalIngredients) masterTotalIngredients.textContent = ingredients.length;

    ingredientsMasterTable.innerHTML = '';

    if (ingredients.length === 0) {
        ingredientsMasterTable.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No ingredients found.</td></tr>';
        return;
    }

    ingredients.forEach(function (ingredient) {
        const currentQty = parseFloat(ingredient.current_quantity) || 0;
        const threshold = parseFloat(ingredient.low_stock_threshold) || 0;
        const isLow = currentQty <= threshold;
        const unitName = getUnitName(ingredient.unit_id);
        const usedIn = getUsedInCount(ingredient.id);
        const row = ingredientsMasterTable.insertRow();
        row.classList.add('animate__animated', 'animate__fadeIn');
        row.innerHTML = `
        <td>${ingredient.id}</td>
        <td><strong>${ingredient.name}</strong></td>
        <td><span class="badge bg-secondary">${getCategoryName(ingredient.category_id)}</span></td>
        <td>${unitName}</td>
        <td class="${isLow ? 'text-danger fw-bold' : ''}">${currentQty} ${unitName}</td>
        <td>${threshold} ${unitName}</td>
        <td><span class="badge ${!isLow ? 'bg-success' : 'bg-warning'}">${!isLow ? 'Normal' : 'Low Stock'}</span></td>
        <td><span class="badge bg-info">${usedIn} menu item${usedIn !== 1 ? 's' : ''}</span></td>
        <td>
            <div class="table-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="editIngredient(${ingredient.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteIngredient(${ingredient.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    });

    // Load expired and expiring soon tables
    loadExpiryTables(results[0], categories, units);
}

// Load expired and expiring soon ingredients tables
function loadExpiryTables(allIngredients, categories, units) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const getCategoryName = function (id) {
        const cat = categories.find(function (c) { return c.id == id; });
        return cat ? cat.name : 'Unknown';
    };

    const getUnitName = function (id) {
        const unit = units.find(function (u) { return u.id == id; });
        return unit ? (unit.short_name || unit.name) : 'Unknown';
    };

    const expiredIngredients = [];
    const expiringSoonIngredients = [];

    allIngredients.forEach(ing => {
        if (ing.expiry_date) {
            const expiryDate = new Date(ing.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);

            if (expiryDate < today) {
                const daysOverdue = Math.floor((today - expiryDate) / (1000 * 60 * 60 * 24));
                expiredIngredients.push({ ...ing, daysOverdue, expiryDate });
            } else if (expiryDate <= sevenDaysFromNow) {
                const daysLeft = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
                expiringSoonIngredients.push({ ...ing, daysLeft, expiryDate });
            }
        }
    });

    // Update counters
    const expiredCount = document.getElementById('masterExpiredCount');
    if (expiredCount) expiredCount.textContent = expiredIngredients.length;

    const expiringSoonCount = document.getElementById('masterExpiringSoonCount');
    if (expiringSoonCount) expiringSoonCount.textContent = expiringSoonIngredients.length;

    const expiredBadge = document.getElementById('expiredBadge');
    if (expiredBadge) expiredBadge.textContent = expiredIngredients.length;

    const expiringSoonBadge = document.getElementById('expiringSoonBadge');
    if (expiringSoonBadge) expiringSoonBadge.textContent = expiringSoonIngredients.length;

    // Populate Expiring Soon Table
    const expiringSoonTable = document.getElementById('expiringSoonTable');
    if (expiringSoonTable) {
        const tbody = expiringSoonTable.querySelector('tbody');
        if (tbody) {
            if (expiringSoonIngredients.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3"><i class="fas fa-check-circle text-success me-2"></i>No ingredients expiring soon</td></tr>';
            } else {
                tbody.innerHTML = expiringSoonIngredients.map(ing => {
                    const unitName = getUnitName(ing.unit_id);
                    const expiryStr = ing.expiryDate.toLocaleDateString();
                    const urgency = ing.daysLeft <= 2 ? 'table-danger' : 'table-warning';
                    return `
                        <tr class="${urgency} animate__animated animate__fadeIn">
                            <td>${ing.id}</td>
                            <td><strong>${ing.name}</strong></td>
                            <td><span class="badge bg-secondary">${getCategoryName(ing.category_id)}</span></td>
                            <td>${ing.current_quantity} ${unitName}</td>
                            <td>${expiryStr}</td>
                            <td><span class="badge ${ing.daysLeft <= 2 ? 'bg-danger' : 'bg-warning'}">${ing.daysLeft} day${ing.daysLeft !== 1 ? 's' : ''}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteIngredient(${ing.id})" title="Remove">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    // Populate Expired Table
    const expiredTable = document.getElementById('expiredIngredientsTable');
    if (expiredTable) {
        const tbody = expiredTable.querySelector('tbody');
        if (tbody) {
            if (expiredIngredients.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3"><i class="fas fa-check-circle text-success me-2"></i>No expired ingredients</td></tr>';
            } else {
                tbody.innerHTML = expiredIngredients.map(ing => {
                    const unitName = getUnitName(ing.unit_id);
                    const expiryStr = ing.expiryDate.toLocaleDateString();
                    return `
                        <tr class="table-danger animate__animated animate__fadeIn">
                            <td>${ing.id}</td>
                            <td><strong>${ing.name}</strong></td>
                            <td><span class="badge bg-secondary">${getCategoryName(ing.category_id)}</span></td>
                            <td>${ing.current_quantity} ${unitName}</td>
                            <td>${expiryStr}</td>
                            <td><span class="badge bg-danger">${ing.daysOverdue} day${ing.daysOverdue !== 1 ? 's' : ''} overdue</span></td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteIngredient(${ing.id})" title="Remove Expired">
                                    <i class="fas fa-trash me-1"></i>Remove
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }
}


async function showAddIngredientModal() {
    const modalElem = document.getElementById('addIngredientModal');
    if (!modalElem) return;

    const unitSelect = document.getElementById('ingredientUnit');
    const categorySelect = document.getElementById('ingredientCategory');
    const thresholdUnit = document.getElementById('thresholdUnit');
    const modalTitle = modalElem.querySelector('.modal-title');
    const form = document.getElementById('addIngredientForm');

    if (form) form.reset();
    if (thresholdUnit) thresholdUnit.textContent = '';

    if (modalTitle) {
        modalTitle.innerHTML = editingIngredientId
            ? '<i class="fas fa-edit me-2"></i>Edit Ingredient'
            : '<i class="fas fa-plus-circle me-2"></i>Add Ingredient';
    }

    try {
        const results = await Promise.all([
            ingredientCategoriesDB.show(),
            unitsDB.show()
        ]);

        const categories = results[0];
        const units = results[1];

        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(function (cat) {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                categorySelect.appendChild(opt);
            });
        }

        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">Select Unit</option>';
            units.forEach(function (u) {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.short_name || u.name;
                opt.dataset.short = u.short_name || u.name;
                unitSelect.appendChild(opt);
            });
        }

        if (editingIngredientId) {
            const ingredients = await ingredientsDB.show({ id: editingIngredientId });
            const ing = Array.isArray(ingredients) ? ingredients[0] : ingredients;
            if (ing) {
                document.getElementById('ingredientName').value = ing.name;
                if (categorySelect) categorySelect.value = ing.category_id;
                if (unitSelect) {
                    unitSelect.value = ing.unit_id;
                    if (thresholdUnit) thresholdUnit.textContent = unitSelect.selectedOptions[0]?.dataset.short || '';
                }
                document.getElementById('lowStockThreshold').value = ing.low_stock_threshold;

                // Set expiry date if exists
                const expiryInput = document.getElementById('ingredientExpiryDate');
                if (expiryInput && ing.expiry_date) {
                    expiryInput.value = ing.expiry_date.split('T')[0]; // Format as YYYY-MM-DD
                }
            }
        }

    } catch (err) {
        console.error('Failed to load modal data:', err);
    }

    if (unitSelect && thresholdUnit) {
        const newUnitSelect = unitSelect.cloneNode(true);
        unitSelect.parentNode.replaceChild(newUnitSelect, unitSelect);
        newUnitSelect.addEventListener('change', function () {
            thresholdUnit.textContent = this.selectedOptions[0]?.dataset.short || '';
        });
        // Re-set value after clone
        if (editingIngredientId) newUnitSelect.value = newUnitSelect.value;
    }

    const modal = new bootstrap.Modal(modalElem);
    modal.show();

    // Reset editingIngredientId when modal is closed
    modalElem.addEventListener('hidden.bs.modal', function () {
        editingIngredientId = null;
    }, { once: true });

    const saveBtn = document.getElementById('saveIngredientBtn');
    if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', saveIngredient);
    }
}



async function saveIngredient() {
    const name = document.getElementById('ingredientName')?.value.trim();
    const category_id = parseInt(document.getElementById('ingredientCategory')?.value);
    const unit_id = parseInt(document.getElementById('ingredientUnit')?.value);
    const threshold = parseFloat(document.getElementById('lowStockThreshold')?.value) || 0;
    const quantity = parseFloat(document.getElementById('ingredientQuantity')?.value) || 0;
    const expiry_date = document.getElementById('ingredientExpiryDate')?.value || null;

    if (!name || !category_id || !unit_id) {
        // Modal notification removed
        return;
    }

    try {
        // Check for duplicate
        const allIngredients = await ingredientsDB.show();
        const duplicate = allIngredients.find(function (ing) {
            const sameName = ing.name.trim().toLowerCase() === name.toLowerCase();
            // If editing, exclude itself from duplicate check
            if (editingIngredientId) {
                return sameName && ing.id != editingIngredientId;
            }
            return sameName;
        });

        if (duplicate) {
            showModalNotification(`Ingredient "${name}" already exists.`, 'warning', 'Duplicate Ingredient');
            return;
        }

        const ingredientData = {
            name,
            category_id,
            unit_id,
            current_quantity: quantity,
            low_stock_threshold: threshold,
            expiry_date: expiry_date,
            status: 'active',
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        const userId = localStorage.getItem('loggedInUserId') || 1;
        const userName = localStorage.getItem('loggedInUser') || 'Admin';

        if (editingIngredientId) {
            ingredientData.id = editingIngredientId;
            await ingredientsDB.edit(ingredientData);

            // Create notification for edit
            await createNotification(
                userId,
                'edit',
                'ingredients',
                editingIngredientId,
                `${userName} updated ingredient: ${name}`
            );

            editingIngredientId = null;
        } else {
            const result = await ingredientsDB.add(ingredientData);

            // Create notification for add
            await createNotification(
                userId,
                'add',
                'ingredients',
                result?.data?.[0]?.id || null,
                `${userName} added new ingredient: ${name} (${quantity} units)`
            );
        }

        const modalElem = document.getElementById('addIngredientModal');
        const modal = bootstrap.Modal.getInstance(modalElem);
        if (modal) modal.hide();

        loadIngredientsMasterlist();
        showModalNotification(`Ingredient "${name}" saved successfully`, 'success', 'Ingredient Saved');

    } catch (err) {
        console.error('Failed to save ingredient:', err);
        showModalNotification('Failed to save ingredient', 'danger', 'Error');
    }
}

function showSetThresholdsModal() {
    // Fetch both categories and ingredients to get current thresholds
    Promise.all([
        ingredientCategoriesDB.show(),
        ingredientsDB.show()
    ]).then(function ([categories, ingredients]) {
        // Calculate average threshold per category from existing ingredients
        const categoryThresholds = {};
        categories.forEach(cat => {
            const catIngredients = ingredients.filter(ing => ing.category_id === cat.id);
            if (catIngredients.length > 0) {
                const avgThreshold = catIngredients.reduce((sum, ing) => sum + (parseFloat(ing.low_stock_threshold) || 0), 0) / catIngredients.length;
                categoryThresholds[cat.id] = Math.round(avgThreshold * 100) / 100;
            }
        });

        const inputs = categories.map(function (cat) {
            const currentVal = categoryThresholds[cat.id] || '';
            const ingredientCount = ingredients.filter(ing => ing.category_id === cat.id).length;
            return `
                <div class="mb-3">
                    <label class="form-label d-flex justify-content-between">
                        <span>${cat.name}</span>
                        <small class="text-muted">${ingredientCount} items</small>
                    </label>
                    <input type="number" id="swal-cat-${cat.id}" class="swal2-input mt-0" 
                           placeholder="Enter threshold" min="0" step="0.01" value="${currentVal}">
                </div>
            `;
        }).join('');

        Swal.fire({
            title: '<i class="fas fa-sliders-h me-2"></i>Global Stock Thresholds',
            html: `
                <div class="text-start">
                    <p class="small text-muted mb-3">Set low stock warning thresholds for each category. Leave blank to skip.</p>
                    ${inputs}
                    <div class="alert alert-warning small mt-3 mb-0">
                        <i class="fas fa-exclamation-triangle me-1"></i>
                        This will update thresholds for all ingredients in the selected categories.
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-save me-1"></i>Update Thresholds',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#800000',
            width: '500px',
            preConfirm: function () {
                const values = {};
                let hasValues = false;
                categories.forEach(function (cat) {
                    const inputEl = document.getElementById('swal-cat-' + cat.id);
                    const val = parseFloat(inputEl?.value);
                    if (!isNaN(val) && val >= 0) {
                        values[cat.id] = val;
                        hasValues = true;
                    }
                });

                if (!hasValues) {
                    Swal.showValidationMessage('Please enter at least one threshold value');
                    return false;
                }
                return values;
            }
        }).then(function (result) {
            if (!result.isConfirmed || !result.value) return;

            // Show loading
            Swal.fire({
                title: 'Updating...',
                html: 'Applying thresholds to ingredients...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const updates = ingredients
                .filter(function (ing) {
                    return result.value[ing.category_id] !== undefined;
                })
                .map(function (ing) {
                    return ingredientsDB.edit({
                        id: ing.id,
                        low_stock_threshold: result.value[ing.category_id]
                    });
                });

            Promise.all(updates).then(function () {
                Swal.close();
                showModalNotification(`Updated thresholds for ${updates.length} ingredients`, 'success', 'Bulk Update');
                loadIngredientsMasterlist();
            }).catch(function (err) {
                Swal.close();
                console.error('Failed to update thresholds:', err);
                showModalNotification('Failed to update thresholds', 'danger', 'Error');
            });
        });
    }).catch(function (err) {
        console.error('Failed to load data:', err);
        showModalNotification('Failed to load categories', 'danger', 'Error');
    });
}

async function editIngredient(id) {
    editingIngredientId = id;
    showAddIngredientModal();
}

async function deleteIngredient(id) {
    try {
        const ingredients = await ingredientsDB.show({ id });
        if (!ingredients || ingredients.length === 0) return;
        const ing = Array.isArray(ingredients) ? ingredients[0] : ingredients;

        // Show delete confirmation with reason input
        const { value: formValues } = await Swal.fire({
            title: `Delete "${ing.name}"?`,
            html: `
                <p class="text-muted">This will also remove it from any assigned recipes.</p>
                <div class="mb-3 text-start">
                    <label class="form-label fw-bold">Reason for deletion <span class="text-danger">*</span></label>
                    <select class="form-select" id="deleteReasonSelect">
                        <option value="">Select a reason...</option>
                        <option value="Expired">Expired</option>
                        <option value="Spoiled">Spoiled / Contaminated</option>
                        <option value="No longer needed">No longer needed</option>
                        <option value="Duplicate entry">Duplicate entry</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="mb-3 text-start" id="otherReasonDiv" style="display: none;">
                    <label class="form-label">Specify reason</label>
                    <input type="text" class="form-control" id="otherReasonInput" placeholder="Enter reason...">
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            didOpen: () => {
                const select = Swal.getPopup().querySelector('#deleteReasonSelect');
                const otherDiv = Swal.getPopup().querySelector('#otherReasonDiv');
                select.addEventListener('change', () => {
                    otherDiv.style.display = select.value === 'Other' ? 'block' : 'none';
                });
            },
            preConfirm: () => {
                const select = Swal.getPopup().querySelector('#deleteReasonSelect');
                const otherInput = Swal.getPopup().querySelector('#otherReasonInput');
                let reason = select.value;

                if (!reason) {
                    Swal.showValidationMessage('Please select a reason for deletion');
                    return false;
                }

                if (reason === 'Other') {
                    reason = otherInput.value.trim();
                    if (!reason) {
                        Swal.showValidationMessage('Please specify the reason');
                        return false;
                    }
                }

                return { reason };
            }
        });

        if (!formValues) return; // User cancelled

        try {
            // Delete related recipe rows first
            const recipeRows = await recipesDB.show({ ingredient_id: id });
            if (recipeRows && recipeRows.length > 0) {
                await Promise.all(recipeRows.map(function (r) {
                    return recipesDB.delete(r.id);
                }));
            }

            // Then delete the ingredient
            await ingredientsDB.delete(id);

            // Create notification
            const userId = localStorage.getItem('loggedInUserId') || 1;
            const userName = localStorage.getItem('loggedInUser') || 'Admin';
            await createNotification(
                userId,
                'delete',
                'ingredients',
                id,
                `${userName} deleted ingredient: ${ing.name}`,
                formValues.reason
            );

            showModalNotification(`"${ing.name}" has been deleted`, 'success', 'Ingredient Deleted');
            logAdminActivity('Deleted ingredient', `${ing.name} - Reason: ${formValues.reason}`, 'Success');
            loadIngredientsMasterlist();

        } catch (err) {
            console.error('Failed to delete ingredient:', err);
            showModalNotification('Failed to delete ingredient', 'danger', 'Error');
        }

    } catch (err) {
        console.error('Failed to fetch ingredient:', err);
    }
}
// ===== User Management Functions =====

async function getUsers() {
    try {
        const dbUsers = await usersDB.show();
        if (!dbUsers || dbUsers.length === 0) return [];

        const users = dbUsers.map(u => ({
            id: u.id,
            name: u.full_name,
            username: u.username,
            role: u.role_id,              // map role_id to string later if needed
            status: u.status || 'Active',
            lastLogin: u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
            isDeleted: !!u.deleted_at,
            deletedDate: u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : null,
            deletedBy: u.deleted_by || null
        }));

        return users;
    } catch (e) {
        console.error('Failed to fetch users:', e);
        return [];
    }
}

function initializeUserManagement() {
    // Add User Button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function () {
            showAddUserModal();
        });
    }

    // Save New User Button
    const saveNewUserBtn = document.getElementById('saveNewUserBtn');
    if (saveNewUserBtn) {
        saveNewUserBtn.addEventListener('click', function () {
            saveNewUser();
        });
    }

    // Save Edit User Button
    const saveUserChangesBtn = document.getElementById('saveUserChangesBtn');
    if (saveUserChangesBtn) {
        saveUserChangesBtn.addEventListener('click', function () {
            saveUserChanges();
        });
    }

    // Load initial data
    loadUserManagement();
}

async function loadUserManagement() {
    await loadActiveUsers();
    await loadDeletedUsers();
}

async function loadActiveUsers() {
    const tableElem = document.getElementById('activeUsersTable');
    if (!tableElem) return;

    const tbody = tableElem.querySelector('tbody');
    if (!tbody) return;

    // 1️⃣ Get all users
    const users = (await getUsers()).filter(u => !u.isDeleted);

    // 2️⃣ Get all roles from roleDB
    let roles = [];
    try {
        roles = await rolesDB.show(); // [{id:1, name:'Staff'}, ...]
    } catch (err) {
        console.error('Failed to fetch roles:', err);
    }

    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No active users found.</td></tr>';
        return;
    }

    users.forEach(user => {
        // Map role_id to role name
        const roleName = roles.find(r => r.id === user.role)?.name || 'Unknown';

        const row = tbody.insertRow();
        row.classList.add('animate__animated', 'animate__fadeIn');
        row.innerHTML = `
            <td><strong>${user.name}</strong></td>
            <td><span class="badge ${roleName === 'Staff' ? 'bg-success' : roleName === 'Cashier' ? 'bg-info' : 'bg-warning'}">${roleName}</span></td>
            <td>${user.username}</td>
            <td><span class="badge ${user.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${user.status}</span></td>
            <td>${user.lastLogin || 'Never'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="editUser(${user.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="generateUserQR(${user.id}, '${user.username}')" title="Generate QR for Quick Login">
                        <i class="fas fa-qrcode"></i>
                    </button>
                </div>
            </td>
        `;
    });
}

// Populate ingredient select with unit_id as attribute
function populateIngredientSelect(selectId) {
    const selectElem = document.getElementById(selectId);
    if (!selectElem) return;

    selectElem.innerHTML = '<option value="">Select Ingredient</option>'; // placeholder

    ingredientsDB.show().then(ingredients => {
        unitsDB.show().then(units => {
            ingredients.forEach(ing => {
                const option = document.createElement('option');
                option.value = ing.id; // store ingredient id as value
                option.textContent = ing.name; // display ingredient name

                // Add unit_id as custom attribute
                option.setAttribute('data-unit-id', ing.unit_id);

                // Optionally display unit name next to ingredient
                const unitName = units.find(u => u.id === ing.unit_id)?.name || '';
                option.textContent = `${ing.name} (${unitName})`;

                selectElem.appendChild(option);
            });
        }).catch(err => console.error('Failed to load units:', err));
    }).catch(err => console.error('Failed to load ingredients:', err));
}

populateIngredientSelect()
// Usage
populateIngredientSelect('ingredientsSelect');

async function filterRole(selectId) {
    const selectElem = document.getElementById(selectId);
    if (!selectElem) return;

    selectElem.innerHTML = '<option value="">Select</option>'; // placeholder

    try {
        const roles = await rolesDB.show(); // fetch all roles from rolesDB
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.name;
            option.textContent = role.name; // display the role name
            selectElem.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load roles for select:', err);
    }
}

filterRole("editUserRole")
filterRole("newUserRole")


async function loadDeletedUsers() {
    const tableElem = document.getElementById('deletedUsersTable');
    if (!tableElem) return;

    const tbody = tableElem.querySelector('tbody');
    const badge = document.getElementById('deletedUsersCount');
    if (!tbody) return;

    const users = (await getUsers()).filter(u => u.isDeleted);

    if (badge) badge.textContent = users.length;

    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No deleted accounts.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = tbody.insertRow();
        row.classList.add('animate__animated', 'animate__fadeIn');
        row.innerHTML = `
            <td><strong>${user.name}</strong></td>
            <td><span class="badge bg-secondary">${user.role}</span></td>
            <td>${user.username}</td>
            <td>${user.deletedDate || 'Unknown'}</td>
            <td>${user.deletedBy || 'System'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline-success" onclick="restoreUser(${user.id})" title="Restore">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="permanentlyDeleteUser(${user.id})" title="Permanent Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
    });
}
function showAddUserModal() {
    const form = document.getElementById('addUserForm');
    if (form) form.reset();

    const modalElem = document.getElementById('addUserModal');
    if (!modalElem) return;
    const modal = new bootstrap.Modal(modalElem);
    modal.show();
}

// Helper: get role ID by role name from DB
async function getRoleIdByName(roleName) {
    const roles = await rolesDB.show(); // fetch all roles
    const role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    return role ? role.id : null;
}

async function getRoleNameById(roleId) {
    const roles = await rolesDB.show();
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : '';
}

async function saveNewUser() {
    const name = document.getElementById('newFullName')?.value.trim();
    const email = document.getElementById('newUserEmail')?.value.trim();
    const username = document.getElementById('newUsername')?.value.trim();
    const pass = document.getElementById('newUserPassword')?.value;
    const confirmPass = document.getElementById('confirmUserPassword')?.value;
    const roleName = document.getElementById('newUserRole')?.value;

    if (!name || !email || !username || !pass || !confirmPass || !roleName) {
        showModalNotification('Please fill in all fields', 'warning', 'Validation Error');
        return;
    }
    // Basic email format validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        showModalNotification('Invalid email format', 'warning', 'Validation Error');
        return;
    }

    if (pass !== confirmPass) {
        showModalNotification('Passwords do not match', 'warning', 'Validation Error');
        return;
    }

    try {
        // 1️⃣ Get role_id from DB
        const role_id = await getRoleIdByName(roleName);
        if (!role_id) {
            showModalNotification('Invalid role selected', 'warning', 'Validation Error');
            return;
        }

        // 2️⃣ Check if username already exists in DB
        const existingUsers = await usersDB.show({ username });
        if (existingUsers.length > 0) {
            showModalNotification('Username already exists', 'warning', 'Duplicate Entry');
            return;
        }

        // 3️⃣ Create user object
        const newUser = {
            full_name: name,
            email: email,
            username: username,
            password_hash: pass, // store hash if needed
            role_id: role_id,
            status: 'Active',
            last_login: null,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        // 4️⃣ Insert into users DB
        await usersDB.add(newUser);

        // 5️⃣ Close modal
        const modalElem = document.getElementById('addUserModal');
        const modal = bootstrap.Modal.getInstance(modalElem);
        if (modal) modal.hide();

        showModalNotification(`User "${name}" created successfully`, 'success', 'User Added');

        // 6️⃣ Log activity and refresh table
        logAdminActivity('Created new user account', username, 'Success');
        loadUserManagement();

    } catch (err) {
        console.error('Failed to add new user:', err);
        showModalNotification('Failed to create user', 'danger', 'Error');
    }
}

// Attach click listener
document.getElementById('saveNewUserBtn')?.addEventListener('click', saveNewUser);

// Edit user: fetch from DB and prefill modal
async function editUser(id) {
    try {
        const users = await usersDB.show({ id });
        if (!users || users.length === 0) return;
        const user = users[0];

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFullName').value = user.full_name;
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editUserStatus').value = user.status;

        // Fetch role name from role_id
        const roleName = await getRoleNameById(user.role_id);
        document.getElementById('editUserRole').value = roleName;

        document.getElementById('editUserPassword').value = ''; // clear password

        const modalElem = document.getElementById('editUserModal');
        if (!modalElem) return;
        const modal = new bootstrap.Modal(modalElem);
        modal.show();

    } catch (err) {
        console.error('Failed to load user for editing:', err);
        showModalNotification('Failed to load user', 'danger', 'Error');
    }
}

// Save edited user to DB
async function saveUserChanges() {
    const id = parseInt(document.getElementById('editUserId').value);
    const name = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const username = document.getElementById('editUsername').value.trim();
    const roleName = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;
    const newPass = document.getElementById('editUserPassword').value;

    if (!name || !email || !username || !roleName) {
        showModalNotification('Full name, email, username, and role are required', 'warning', 'Validation Error');
        return;
    }
    // Basic email format validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        showModalNotification('Invalid email format', 'warning', 'Validation Error');
        return;
    }

    try {
        const role_id = await getRoleIdByName(roleName);
        if (!role_id) {
            showModalNotification('Invalid role selected', 'warning', 'Validation Error');
            return;
        }

        // Fetch user
        const users = await usersDB.show({ id });
        if (!users || users.length === 0) return;
        const user = users[0];

        // Update fields
        const updatedUser = {
            ...user,
            full_name: name,
            email: email,
            username: username,
            role_id: role_id,
            status: status,
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        // Update password if provided
        if (newPass) updatedUser.password_hash = newPass;

        // Save to DB
        await usersDB.edit(updatedUser);

        const modalElem = document.getElementById('editUserModal');
        const modal = bootstrap.Modal.getInstance(modalElem);
        if (modal) modal.hide();

        showModalNotification(`Account for "${name}" updated`, 'success', 'User Updated');
        logAdminActivity('Updated user account', username, 'Success');
        loadUserManagement();

    } catch (err) {
        console.error('Failed to save user changes:', err);
        showModalNotification('Failed to update user', 'danger', 'Error');
    }
}

// Delete user: mark as deleted in DB
async function deleteUser(id) {
    try {
        const users = await usersDB.show({ id });
        if (!users || users.length === 0) return;
        const user = users[0];

        showConfirm(`Are you sure you want to delete "${user.full_name}"? This account will be moved to Deleted Accounts.`, async function () {
            const updatedUser = {
                ...user,
                status: 'Deleted',
                deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                deleted_by: 'Administrator'
            };

            await usersDB.edit(updatedUser);

            showModalNotification(`Account "${user.username}" deleted`, 'success', 'User Removed');
            logAdminActivity('Deleted user account', user.username, 'Success');
            loadUserManagement();
        });
    } catch (err) {
        console.error('Failed to delete user:', err);
        showModalNotification('Failed to delete user', 'danger', 'Error');
    }
}
async function restoreUser(id) {
    try {
        const users = await usersDB.show({ id });
        if (!users || users.length === 0) return;
        const user = users[0];

        showConfirm(`Restore account for "${user.full_name}"?`, async function () {
            await usersDB.edit({ id: user.id, deleted_at: null });
            showModalNotification(`Account "${user.username}" restored`, 'success', 'User Restored');
            logAdminActivity('Restored user account', user.username, 'Success');
            loadUserManagement();
        });
    } catch (err) {
        console.error('Failed to restore user:', err);
        showModalNotification('Failed to restore user', 'danger', 'Error');
    }
}

async function permanentlyDeleteUser(id) {
    try {
        const users = await usersDB.show({ id });
        if (!users || users.length === 0) return;
        const user = users[0];

        showConfirm(`PERMANENTLY DELETE "${user.full_name}"? This action cannot be reversed.`, async function () {
            await usersDB.delete({ id: user.id });
            showModalNotification(`Account "${user.username}" permanently removed`, 'success', 'User Purged');
            logAdminActivity('Permanently deleted user account', user.username, 'Success');
            loadUserManagement();
        });
    } catch (err) {
        console.error('Failed to permanently delete user:', err);
        showModalNotification('Failed to delete user', 'danger', 'Error');
    }
}

// Reports Functions
let reportsChart = null;
let allReportSales = [];
let allReportSaleItems = [];
let staffMap = {};

function initializeReports() {

    // Tab panel event listeners for search/sort
    // Detailed Transaction Log
    const searchDetailed = document.getElementById('searchDetailed');
    const sortDetailed = document.getElementById('sortDetailed');
    if (searchDetailed) {
        searchDetailed.addEventListener('input', function () {
            filterAndSortDetailedTable();
        });
    }
    if (sortDetailed) {
        sortDetailed.addEventListener('change', function () {
            filterAndSortDetailedTable();
        });
    }

    // Staff Revenue
    const searchStaff = document.getElementById('searchStaff');
    const sortStaff = document.getElementById('sortStaff');
    if (searchStaff) {
        searchStaff.addEventListener('input', function () {
            filterAndSortStaffTable();
        });
    }
    if (sortStaff) {
        sortStaff.addEventListener('change', function () {
            filterAndSortStaffTable();
        });
    }

    // Food Sales
    const searchFood = document.getElementById('searchFood');
    const sortFood = document.getElementById('sortFood');
    if (searchFood) {
        searchFood.addEventListener('input', function () {
            filterAndSortFoodTable();
        });
    }
    if (sortFood) {
        sortFood.addEventListener('change', function () {
            filterAndSortFoodTable();
        });
    }

    // Initial population of tables (after report generation)
    // These will be called after generateReport() in the future
    // For now, call with empty data
    populateStaffRevenueTable([]);
    populateFoodSalesTable([]);
}
// --- Tab Panel Table Logic ---

// Placeholder: will be called with real data after report generation
function populateStaffRevenueTable(staffData) {
    const tbody = document.querySelector('#staffRevenueTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!staffData || staffData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No data</td></tr>';
        return;
    }
    staffData.forEach(row => {
        tbody.innerHTML += `<tr><td>${row.staff}</td><td>₱${row.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td><td>${row.salesCount}</td></tr>`;
    });
}

function populateFoodSalesTable(foodData) {
    const tbody = document.querySelector('#foodSalesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!foodData || foodData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No data</td></tr>';
        return;
    }
    foodData.forEach(row => {
        tbody.innerHTML += `<tr><td>${row.food}</td><td>₱${row.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td><td>${row.orderCount}</td></tr>`;
    });
}

// Filtering and sorting logic for each tab (to be implemented with real data)
function filterAndSortDetailedTable() {
    // TODO: Implement search and sort for detailed transaction log
    // Use searchDetailed.value and sortDetailed.value
    // Call updateReportsDetailTable() with filtered/sorted data
}

function filterAndSortStaffTable() {
    // TODO: Implement search and sort for staff revenue
    // Use searchStaff.value and sortStaff.value
    // Call populateStaffRevenueTable() with filtered/sorted data
}

function filterAndSortFoodTable() {
    // TODO: Implement search and sort for food sales
    // Use searchFood.value and sortFood.value
    // Call populateFoodSalesTable() with filtered/sorted data
}
// Generate button
const generateReportBtn = document.getElementById('generateReportBtn');
if (generateReportBtn) {
    generateReportBtn.addEventListener('click', function () {
        generateReport();
    });
}

// Print button
const printReportBtn = document.getElementById('printReportBtn');
if (printReportBtn) {
    printReportBtn.addEventListener('click', function () {
        printReport();
    });
}

// Excel button
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
if (downloadExcelBtn) {
    downloadExcelBtn.addEventListener('click', function () {
        exportToExcel();
    });
}

// Initialize transaction edit modal
initializeTransactionEditModal();

// Set default dates (today)
const dateFrom = document.getElementById('reportDateFrom');
const dateTo = document.getElementById('reportDateTo');
if (dateFrom && dateTo) {
    const today = new Date().toISOString().split('T')[0];
    // Set dateFrom to 30 days ago by default
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    dateFrom.value = lastMonth.toISOString().split('T')[0];
    dateTo.value = today;
}

// Initial load
generateReport();

// Real-time update every 30 seconds
setInterval(() => {
    if (document.getElementById('reports-content')) {
        generateReport(true); // silent update
    }
}, 30000);


async function generateReport(silent = false) {
    // if (!silent) {
    //     showModalNotification('Generating report data...', 'info', 'Loading');
    // }

    try {
        const reportType = document.getElementById('reportType')?.value || 'Daily';
        const dateFrom = document.getElementById('reportDateFrom')?.value;
        const dateTo = document.getElementById('reportDateTo')?.value;

        const [sales, saleItems, users, menuItems] = await Promise.all([
            salesDB.show(),
            saleItemsDB.show(),
            usersDB.show(),
            menuItemsDB.show()
        ]);

        staffMap = {};
        users.forEach(u => {
            staffMap[u.id] = u.full_name || u.username || 'Unknown';
        });

        const menuItemMap = {};
        (menuItems || []).forEach(m => {
            menuItemMap[m.id] = m.name || 'Item';
        });

        allReportSaleItems = saleItems || [];

        let processedSales = (sales || []).map(sale => {
            const saleDate = new Date(sale.sale_datetime || sale.created_at);
            const dateStr = saleDate.toISOString().split('T')[0];
            const timeStr = saleDate.toTimeString().split(' ')[0];
            const saleId = parseInt(sale.id);
            const matchedItems = allReportSaleItems.filter(item => parseInt(item.sale_id) === saleId);
            const items = matchedItems.map(item => {
                const itemName = item.item_name || menuItemMap[item.menu_item_id] || 'Unknown Item';
                return {
                    name: itemName,
                    quantity: parseInt(item.quantity) || 1,
                    price: parseFloat(item.unit_price) || 0,
                    subtotal: (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1)
                };
            });

            return {
                id: sale.id,
                receipt_no: sale.receipt_no || `SALE-${sale.id}`,
                date: dateStr,
                time: timeStr,
                timestamp: saleDate.getTime(),
                items: items,
                total: parseFloat(sale.total_amount) || 0,
                adjusted_total: sale.adjusted_total !== null ? parseFloat(sale.adjusted_total) : null,
                status: sale.status || 'completed',
                staff: staffMap[sale.staff_id] || 'Staff',
                staff_id: sale.staff_id,
                customer: sale.customer_name || 'Walk-in',
                order_type: sale.order_type || 'walk-in',
                adjustment_reason: sale.adjustment_reason || '',
                adjusted_at: sale.adjusted_at
            };
        });

        if (dateFrom && dateTo) {
            processedSales = processedSales.filter(sale => {
                return sale.date >= dateFrom && sale.date <= dateTo;
            });
        }

        allReportSales = processedSales;
        updateSummaryMetrics(processedSales, reportType);
        updateReportsChart(processedSales, reportType);
        updateReportsDetailTable(processedSales);

        const staffRevenueMap = {};
        processedSales.forEach(sale => {
            if (!sale.staff_id) return;
            if (!staffRevenueMap[sale.staff_id]) {
                staffRevenueMap[sale.staff_id] = { staff: sale.staff, revenue: 0, salesCount: 0 };
            }
            if (sale.status === 'completed' || sale.status === 'partial_refund') {
                staffRevenueMap[sale.staff_id].revenue += sale.adjusted_total !== null ? sale.adjusted_total : sale.total;
                staffRevenueMap[sale.staff_id].salesCount++;
            }
        });
        populateStaffRevenueTable(Object.values(staffRevenueMap));

        const foodSalesMap = {};
        processedSales.forEach(sale => {
            if (sale.status !== 'completed' && sale.status !== 'partial_refund') return;
            sale.items.forEach(item => {
                if (!foodSalesMap[item.name]) {
                    foodSalesMap[item.name] = { food: item.name, revenue: 0, orderCount: 0 };
                }
                foodSalesMap[item.name].revenue += item.subtotal;
                foodSalesMap[item.name].orderCount += item.quantity;
            });
        });
        populateFoodSalesTable(Object.values(foodSalesMap));

        // ✅ Only show modal if not silent AND user manually clicked the button
        if (!silent && window._reportGeneratedByUser === true) {
            window._reportGeneratedByUser = false;
            Swal.fire({
                icon: 'success',
                title: 'Report Generated',
                text: `Found ${processedSales.length} transactions`,
                timer: 1500,
                showConfirmButton: false
            });
        }

        if (!silent) {
            logAdminActivity('Generated report', `${reportType} (${dateFrom} to ${dateTo}) - ${processedSales.length} transactions`, 'Success');
        }

    } catch (err) {
        console.error('Failed to generate report:', err);
        if (!silent) {
            Swal.fire('Error', 'Failed to generate report: ' + err.message, 'error');
        }
    }
}

function updateSummaryMetrics(sales, reportType) {
    const totalNetSalesElem = document.getElementById('totalNetSales');
    const totalTransactionsElem = document.getElementById('totalReportTransactions');
    const topSellingItemElem = document.getElementById('topSellingItem');
    const avgOrderValueElem = document.getElementById('avgOrderValue');

    if (!totalNetSalesElem) return;

    // Only count completed sales for revenue
    const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'partial_refund');

    let totalSales = 0;
    let itemCounts = {};

    completedSales.forEach(sale => {
        // Use adjusted_total if available (for partial refunds), else use total
        const saleAmount = sale.adjusted_total !== null ? sale.adjusted_total : sale.total;
        totalSales += saleAmount;

        sale.items.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
    });

    // Find top selling item
    let topItem = '-';
    let maxCount = 0;
    for (let item in itemCounts) {
        if (itemCounts[item] > maxCount) {
            maxCount = itemCounts[item];
            topItem = item;
        }
    }

    // Format as peso
    const formatPeso = (amount) => '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    totalNetSalesElem.textContent = formatPeso(totalSales);
    totalTransactionsElem.textContent = sales.length;
    topSellingItemElem.textContent = topItem === '-' ? '-' : `${topItem} (${maxCount} sold)`;
    avgOrderValueElem.textContent = completedSales.length > 0 ? formatPeso(totalSales / completedSales.length) : formatPeso(0);
}

function updateReportsChart(sales, reportType) {
    const ctx = document.getElementById('reportsChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (reportsChart) {
        reportsChart.destroy();
    }

    // Only count completed sales for chart
    const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'partial_refund');

    let chartLabels = [];
    let chartData = [];
    let label = 'Sales Amount (₱)';
    let chartType = 'line';

    if (reportType === 'Daily' || reportType === 'Monthly') {
        // Group sales by date
        const salesByDate = {};
        completedSales.forEach(sale => {
            const date = reportType === 'Monthly' ? sale.date.substring(0, 7) : sale.date; // YYYY-MM for monthly
            const amount = sale.adjusted_total !== null ? sale.adjusted_total : sale.total;
            salesByDate[date] = (salesByDate[date] || 0) + amount;
        });

        // Sort dates
        const sortedDates = Object.keys(salesByDate).sort();
        chartLabels = sortedDates.map(d => {
            if (reportType === 'Monthly') {
                const [year, month] = d.split('-');
                return new Date(year, month - 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
            }
            return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        });
        chartData = sortedDates.map(date => salesByDate[date]);
        label = reportType === 'Monthly' ? 'Monthly Revenue (₱)' : 'Daily Revenue (₱)';

    } else if (reportType === 'Staff') {
        // Group by staff
        const salesByStaff = {};
        completedSales.forEach(sale => {
            const staff = sale.staff || 'Unknown';
            const amount = sale.adjusted_total !== null ? sale.adjusted_total : sale.total;
            salesByStaff[staff] = (salesByStaff[staff] || 0) + amount;
        });

        chartLabels = Object.keys(salesByStaff);
        chartData = Object.values(salesByStaff);
        label = 'Sales by Staff (₱)';
        chartType = 'bar';

    } else if (reportType === 'Inventory') {
        // Group by item
        const itemSales = {};
        completedSales.forEach(sale => {
            sale.items.forEach(item => {
                itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
            });
        });

        // Get top 10 items
        const sorted = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 10);
        chartLabels = sorted.map(s => s[0]);
        chartData = sorted.map(s => s[1]);
        label = 'Items Sold (Qty)';
        chartType = 'bar';
    }

    // Show message if no data
    if (chartLabels.length === 0) {
        chartLabels = ['No Data'];
        chartData = [0];
    }

    reportsChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartLabels,
            datasets: [{
                label: label,
                data: chartData,
                backgroundColor: chartType === 'bar' ? 'rgba(128, 0, 0, 0.7)' : 'rgba(128, 0, 0, 0.1)',
                borderColor: 'rgba(128, 0, 0, 1)',
                borderWidth: chartType === 'bar' ? 1 : 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgba(128, 0, 0, 1)',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '₱' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ₱' + context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateReportsDetailTable(sales) {
    const tableBody = document.querySelector('#reportsDetailTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (sales.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No transactions found for the selected period</td></tr>';
        return;
    }

    // Sort sales by date decending (newest first)
    const sortedSales = [...sales].sort((a, b) => b.timestamp - a.timestamp);

    // Format peso helper
    const formatPeso = (amount) => '₱' + (amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    sortedSales.forEach(sale => {
        const row = tableBody.insertRow();
        const itemsList = sale.items.length > 0 ? sale.items.map(i => `${i.name} x${i.quantity}`).join(', ') : '<em class="text-muted">No items</em>';

        // Determine status badge
        let statusBadge = '';
        if (sale.status === 'voided') {
            statusBadge = '<span class="badge bg-dark ms-2">VOIDED</span>';
        } else if (sale.status === 'refunded') {
            statusBadge = '<span class="badge bg-warning text-dark ms-2">REFUNDED</span>';
        } else if (sale.status === 'partial_refund') {
            statusBadge = '<span class="badge bg-info ms-2">PARTIAL</span>';
        } else {
            statusBadge = '<span class="badge bg-success ms-2">COMPLETED</span>';
        }

        // Display amount
        const displayAmount = sale.adjusted_total !== null ? sale.adjusted_total : sale.total;

        row.innerHTML = `
            <td>${sale.date} ${sale.time}</td>
            <td><code>${sale.receipt_no || sale.id}</code>${statusBadge}</td>
            <td>${sale.staff}</td>
            <td><small>${itemsList}</small></td>
            <td class="fw-bold ${sale.status === 'voided' || sale.status === 'refunded' ? 'text-decoration-line-through text-muted' : ''}">${formatPeso(displayAmount)}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger me-1" onclick="viewSaleDetails(${sale.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="openTransactionEditModal(${sale.id})" title="Edit/Refund/Void" ${sale.status === 'voided' || sale.status === 'refunded' ? 'disabled' : ''}>
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
    });
}

function viewSaleDetails(saleId) {
    const sale = allReportSales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale) {
        Swal.fire('Error', 'Transaction not found', 'error');
        return;
    }

    const formatPeso = (amount) => '₱' + (amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let itemsHtml = sale.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-end">${formatPeso(item.price)}</td>
            <td class="text-end">${formatPeso(item.subtotal)}</td>
        </tr>
    `).join('');

    if (sale.items.length === 0) {
        itemsHtml = '<tr><td colspan="4" class="text-center text-muted">No item details available</td></tr>';
    }

    // Status info
    let statusInfo = '';
    if (sale.status === 'voided') {
        statusInfo = `<div class="alert alert-dark mb-3"><i class="fas fa-ban me-2"></i>VOIDED${sale.adjustment_reason ? ': ' + sale.adjustment_reason : ''}</div>`;
    } else if (sale.status === 'refunded') {
        statusInfo = `<div class="alert alert-warning mb-3"><i class="fas fa-undo me-2"></i>REFUNDED${sale.adjustment_reason ? ': ' + sale.adjustment_reason : ''}</div>`;
    } else if (sale.status === 'partial_refund') {
        statusInfo = `<div class="alert alert-info mb-3"><i class="fas fa-minus-circle me-2"></i>PARTIAL REFUND - Adjusted: ${formatPeso(sale.adjusted_total)}${sale.adjustment_reason ? '<br>' + sale.adjustment_reason : ''}</div>`;
    }

    Swal.fire({
        title: `Transaction: ${sale.receipt_no || sale.id}`,
        html: `
            <div class="text-start">
                ${statusInfo}
                <p><strong>Date:</strong> ${sale.date} ${sale.time}</p>
                <p><strong>Staff:</strong> ${sale.staff}</p>
                <p><strong>Customer:</strong> ${sale.customer}</p>
                <p><strong>Order Type:</strong> ${sale.order_type === 'dine-in' ? 'Dine-in' : 'Walk-in'}</p>
                <table class="table table-sm table-bordered mt-3">
                    <thead class="table-light">
                        <tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Subtotal</th></tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot class="table-light">
                        <tr><th colspan="3" class="text-end">Total:</th><th class="text-end">${formatPeso(sale.total)}</th></tr>
                        ${sale.adjusted_total !== null && sale.adjusted_total !== sale.total ? `<tr class="table-warning"><th colspan="3" class="text-end">Adjusted Total:</th><th class="text-end">${formatPeso(sale.adjusted_total)}</th></tr>` : ''}
                    </tfoot>
                </table>
            </div>
        `,
        width: 600,
        confirmButtonColor: '#800000'
    });
}

/**
 * Open transaction edit modal for refund/void operations
 */
function openTransactionEditModal(saleId) {
    const sale = allReportSales.find(s => s.id === saleId || s.id === parseInt(saleId));
    if (!sale) {
        Swal.fire('Error', 'Transaction not found', 'error');
        return;
    }

    const formatPeso = (amount) => '₱' + (amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Populate modal fields
    document.getElementById('editTransactionId').value = sale.id;
    document.getElementById('txnReference').value = sale.receipt_no || sale.id;
    document.getElementById('txnOriginalTotal').value = formatPeso(sale.total);
    document.getElementById('txnDateTime').value = `${sale.date} ${sale.time}`;
    document.getElementById('txnStaff').value = sale.staff;

    // Populate items list
    const itemsBody = document.getElementById('txnItemsList');
    if (sale.items.length > 0) {
        itemsBody.innerHTML = sale.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${formatPeso(item.price)}</td>
                <td class="text-end">${formatPeso(item.subtotal)}</td>
            </tr>
        `).join('');
    } else {
        itemsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No item details available</td></tr>';
    }

    // Reset form fields
    document.getElementById('txnActionType').value = '';
    document.getElementById('txnAdjustedTotal').value = '';
    document.getElementById('txnAdjustmentReason').value = '';
    document.getElementById('adjustedTotalContainer').style.display = 'none';

    // Show current status if exists
    const statusAlert = document.getElementById('txnCurrentStatusAlert');
    const statusText = document.getElementById('txnCurrentStatusText');
    if (sale.status && sale.status !== 'completed') {
        statusAlert.classList.remove('d-none');
        let statusMsg = '';
        if (sale.status === 'voided') {
            statusMsg = `This transaction was VOIDED on ${sale.adjusted_at || 'N/A'} by ${sale.adjusted_by || 'Unknown'}. Reason: ${sale.adjustment_reason || 'N/A'}`;
        } else if (sale.status === 'refunded') {
            statusMsg = `This transaction was REFUNDED on ${sale.adjusted_at || 'N/A'}. Reason: ${sale.adjustment_reason || 'N/A'}`;
        } else if (sale.status === 'partial_refund') {
            statusMsg = `Partial refund applied. Adjusted total: ${formatPeso(sale.adjusted_total)}. Reason: ${sale.adjustment_reason || 'N/A'}`;
        }
        statusText.textContent = statusMsg;
    } else {
        statusAlert.classList.add('d-none');
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('transactionEditModal'));
    modal.show();
}

/**
 * Initialize transaction edit modal events
 */
function initializeTransactionEditModal() {
    // Action type change handler
    const actionType = document.getElementById('txnActionType');
    if (actionType) {
        actionType.addEventListener('change', function () {
            const adjustedContainer = document.getElementById('adjustedTotalContainer');
            if (this.value === 'partial_refund') {
                adjustedContainer.style.display = 'block';
            } else {
                adjustedContainer.style.display = 'none';
            }
        });
    }

    // Save adjustment button
    const saveBtn = document.getElementById('saveTransactionAdjustment');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTransactionAdjustment);
    }
}

/**
 * Save transaction adjustment (refund/void)
 */
async function saveTransactionAdjustment() {
    const saleId = document.getElementById('editTransactionId').value;
    const actionType = document.getElementById('txnActionType').value;
    const reason = document.getElementById('txnAdjustmentReason').value.trim();
    const adjustedTotal = parseFloat(document.getElementById('txnAdjustedTotal').value) || 0;

    const formatPeso = (amount) => '₱' + (amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Validation
    if (!actionType) {
        Swal.fire('Error', 'Please select an action type', 'warning');
        return;
    }
    if (!reason) {
        Swal.fire('Error', 'Please provide a reason for this adjustment', 'warning');
        return;
    }
    if (actionType === 'partial_refund' && adjustedTotal <= 0) {
        Swal.fire('Error', 'Please enter a valid adjusted total for partial refund', 'warning');
        return;
    }

    // Confirm action
    const actionText = actionType === 'void' ? 'VOID this transaction' :
        actionType === 'refund' ? 'issue a FULL REFUND' :
            'issue a PARTIAL REFUND';

    const result = await Swal.fire({
        title: 'Confirm Action',
        text: `Are you sure you want to ${actionText}? This action will be logged.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#800000',
        confirmButtonText: 'Yes, proceed'
    });

    if (!result.isConfirmed) return;

    try {
        const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');

        // Find sale from cached report data
        const sale = allReportSales.find(s => s.id === parseInt(saleId) || s.id === saleId);

        if (!sale) {
            Swal.fire('Error', 'Transaction not found', 'error');
            return;
        }

        const originalTotal = sale.total;
        const statusValue = actionType === 'partial_refund' ? 'partial_refund' :
            actionType === 'void' ? 'voided' : 'refunded';
        const adjustedValue = actionType === 'void' ? 0 :
            actionType === 'partial_refund' ? adjustedTotal : 0;
        const adjustedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Update in database
        await salesDB.edit({
            id: parseInt(saleId) || saleId,
            status: statusValue,
            adjusted_total: adjustedValue,
            adjusted_by: user.id,
            adjusted_at: adjustedAt,
            adjustment_reason: reason
        });

        // Update cached data
        sale.status = statusValue;
        sale.adjusted_total = adjustedValue;
        sale.adjusted_by = user.full_name || user.username || 'Admin';
        sale.adjusted_at = adjustedAt;
        sale.adjustment_reason = reason;

        // Create notification
        const receiptNo = sale.receipt_no || saleId;
        const notifDesc = actionType === 'void' ?
            `Transaction #${receiptNo} VOIDED. Original: ${formatPeso(originalTotal)}` :
            actionType === 'refund' ?
                `Transaction #${receiptNo} REFUNDED. Amount: ${formatPeso(originalTotal)}` :
                `Transaction #${receiptNo} PARTIAL REFUND. ${formatPeso(originalTotal)} → ${formatPeso(adjustedTotal)}`;

        await createNotification(user.id, actionType, 'sales', saleId, notifDesc, reason);

        // Log activity
        logAdminActivity('sales', `${actionType.toUpperCase()}: Transaction #${receiptNo} - ${reason}`);

        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('transactionEditModal'));
        if (modal) modal.hide();

        // Refresh report
        generateReport(true);

        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: `Transaction ${actionType === 'void' ? 'voided' : 'adjusted'} successfully`,
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Failed to save adjustment:', error);
        Swal.fire('Error', 'Failed to save adjustment: ' + error.message, 'error');
    }
}

function printReport() {
    const reportContent = document.getElementById('reports-content');
    if (!reportContent) return;

    const originalContent = document.body.innerHTML;
    const printWindow = window.open('', '_blank');

    // Create print-friendly version
    const summary = {
        sales: document.getElementById('totalNetSales').textContent,
        transactions: document.getElementById('totalReportTransactions').textContent,
        topItem: document.getElementById('topSellingItem').textContent,
        avg: document.getElementById('avgOrderValue').textContent
    };

    const tableRows = document.querySelector('#reportsDetailTable tbody').innerHTML;

    printWindow.document.write(`
        <html>
            <head>
                <title>Owner Report - ${new Date().toLocaleDateString()}</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { padding: 30px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #800000; padding-bottom: 10px; }
                    .metrics { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .metric-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; margin: 0 10px; text-align: center; }
                    .metric-val { font-size: 1.2rem; font-weight: bold; color: #800000; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Ethan's Cafe - Owner Report</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                <div class="metrics">
                    <div class="metric-box"><div>Total Sales</div><div class="metric-val">${summary.sales}</div></div>
                    <div class="metric-box"><div>Transactions</div><div class="metric-val">${summary.transactions}</div></div>
                    <div class="metric-box"><div>Top Item</div><div class="metric-val">${summary.topItem}</div></div>
                    <div class="metric-box"><div>Avg Order</div><div class="metric-val">${summary.avg}</div></div>
                </div>
                <h4>Transaction Details</h4>
                <table class="table table-bordered table-striped">
                    <thead>
                        <tr><th>Date/Time</th><th>Reference</th><th>Staff</th><th>Items</th><th>Total</th></tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <div class="mt-5 text-center text-muted small">
                    End of Report
                </div>
            </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);

    logAdminActivity('Printed report', 'Print View Generated', 'Success');
}

function exportToExcel() {
    if (!allReportSales || allReportSales.length === 0) {
        showModalNotification('No data to export. Please generate a report first.', 'warning', 'Export Empty');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Receipt No,Staff,Items,Total,Status\n";

    allReportSales.forEach(sale => {
        const itemsList = sale.items.map(i => `${i.name} (${i.quantity})`).join('|');
        const displayTotal = sale.adjusted_total !== null ? sale.adjusted_total : sale.total;
        const row = [
            sale.date,
            sale.time,
            `"${sale.receipt_no || sale.id}"`,
            `"${sale.staff}"`,
            `"${itemsList}"`,
            displayTotal,
            sale.status || 'completed'
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reports_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showModalNotification('Excel/CSV export completed', 'success', 'Export Success');
    logAdminActivity('Exported reports', 'CSV Export', 'Success');
}

// Backup Functions - Connected to PHP Backend
const BACKUP_API = 'php/backup.php';

function initializeBackup() {
    // Create manual backup button
    const createManualBackup = document.getElementById('createManualBackup');
    if (createManualBackup) {
        createManualBackup.addEventListener('click', function () {
            showConfirm('Are you sure you want to create a full system backup?', function () {
                createFullBackup();
            });
        });
    }

    // Legacy button support
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', function () {
            showConfirm('Are you sure you want to create a full system backup?', function () {
                createFullBackup();
            });
        });
    }

    // Backup type buttons
    document.querySelectorAll('[data-backup-type]').forEach(btn => {
        btn.addEventListener('click', function () {
            const type = this.getAttribute('data-backup-type');
            createBackup(type);
        });
    });

    // Save backup settings button
    const saveBackupSettings = document.getElementById('saveBackupSettings');
    if (saveBackupSettings) {
        saveBackupSettings.addEventListener('click', function () {
            saveBackupConfigurations();
        });
    }

    // Prune old backups button
    const pruneBackupsBtn = document.getElementById('pruneBackupsBtn');
    if (pruneBackupsBtn) {
        pruneBackupsBtn.addEventListener('click', function () {
            showConfirm('Delete old backups based on retention policy?', function () {
                pruneOldBackups();
            });
        });
    }

    // Load backup settings and data
    loadBackupSettings();
    loadBackupData();
}

async function loadBackupData() {
    // Support both table IDs
    const tableElem = document.getElementById('backupHistoryTable') || document.getElementById('backupsTable');
    if (!tableElem) return;

    const backupsTable = tableElem.getElementsByTagName('tbody')[0];
    if (!backupsTable) return;

    backupsTable.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm text-danger" role="status"></div><span class="ms-2">Loading backup data...</span></td></tr>';

    try {
        const response = await fetch(`${BACKUP_API}?action=list`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load backups');
        }

        backupsTable.innerHTML = '';

        if (!data.backups || data.backups.length === 0) {
            backupsTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No backups found. Create your first backup!</td></tr>';
            return;
        }

        data.backups.forEach(backup => {
            const row = backupsTable.insertRow();
            const createdAt = new Date(backup.created_at).toLocaleString();
            const badgeClass = backup.backup_type === 'Manual' ? 'bg-primary' : 'bg-success';

            row.innerHTML = `
                <td>${createdAt}</td>
                <td>${backup.filename}</td>
                <td>${backup.file_size || 'N/A'}</td>
                <td><span class="badge ${badgeClass}">${backup.backup_type}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-success me-1" onclick="downloadBackup('${backup.filename}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBackup(${backup.id}, '${backup.filename}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading backups:', error);
        backupsTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load backup history</td></tr>';
    }
}

async function loadBackupSettings() {
    try {
        const response = await fetch(`${BACKUP_API}?action=get_settings`);
        const data = await response.json();

        if (data.success && data.settings) {
            const settings = data.settings;

            const scheduleSelect = document.getElementById('autoBackupSchedule');
            if (scheduleSelect) {
                scheduleSelect.value = settings.schedule || 'Weekly';
            }

            const retentionSelect = document.getElementById('backupRetention');
            if (retentionSelect) {
                retentionSelect.value = settings.retention_count || '10';
            }

            const mediaCheckbox = document.getElementById('backupMedia');
            if (mediaCheckbox) {
                mediaCheckbox.checked = settings.include_media !== false;
            }
        }
    } catch (error) {
        console.error('Error loading backup settings:', error);
    }
}

async function saveBackupConfigurations() {
    const schedule = document.getElementById('autoBackupSchedule')?.value || 'Weekly';
    const retention = document.getElementById('backupRetention')?.value || '10';
    const includeMedia = document.getElementById('backupMedia')?.checked ?? true;

    try {
        const response = await fetch(`${BACKUP_API}?action=save_settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schedule: schedule,
                retention_count: parseInt(retention),
                include_media: includeMedia
            })
        });

        const data = await response.json();

        if (data.success) {
            showModalNotification('Backup settings saved successfully', 'success', 'Settings Saved');
            logAdminActivity('Updated backup settings', 'Backup Config', 'Success');
        } else {
            throw new Error(data.error || 'Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving backup settings:', error);
        showModalNotification('Failed to save backup settings', 'error', 'Error');
    }
}

async function createFullBackup() {
    const backupFormat = document.getElementById('backupFormat')?.value || 'json';
    const includeMedia = document.getElementById('backupMedia')?.checked ?? false;
    const userId = localStorage.getItem('loggedInUserId');

    const formatLabels = { json: 'JSON', sql: 'SQL', zip: 'ZIP' };
    showModalNotification(`Creating ${formatLabels[backupFormat]} backup...`, 'info', 'Creating Backup');

    try {
        const response = await fetch(`${BACKUP_API}?action=create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                backup_type: 'Manual',
                format: backupFormat,
                include_media: backupFormat === 'zip' ? includeMedia : false,
                created_by: userId ? parseInt(userId) : null
            })
        });

        const data = await response.json();

        if (data.success) {
            showModalNotification(`Backup created: ${data.filename} (${data.file_size})`, 'success', 'Backup Complete');
            logAdminActivity(`Created ${formatLabels[backupFormat]} backup`, 'Full backup', 'Success');
            loadBackupData();
        } else {
            throw new Error(data.error || 'Failed to create backup');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        showModalNotification('Failed to create backup: ' + error.message, 'error', 'Backup Failed');
    }
}

async function createBackup(type) {
    const backupFormat = document.getElementById('backupFormat')?.value || 'json';
    const includeMedia = type === 'Full System' && backupFormat === 'zip';
    const userId = localStorage.getItem('loggedInUserId');

    showModalNotification(`Creating ${type} backup...`, 'info', 'Creating Backup');

    try {
        const response = await fetch(`${BACKUP_API}?action=create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                backup_type: type,
                format: backupFormat,
                include_media: includeMedia,
                created_by: userId ? parseInt(userId) : null
            })
        });

        const data = await response.json();

        if (data.success) {
            showModalNotification(`${type} backup created successfully`, 'success', 'Backup Complete');
            logAdminActivity(`Created ${type} backup`, type, 'Success');
            loadBackupData();
        } else {
            throw new Error(data.error || 'Failed to create backup');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        showModalNotification(`Failed to create ${type} backup`, 'error', 'Backup Failed');
    }
}

function downloadBackup(filename) {
    // Trigger file download
    window.location.href = `${BACKUP_API}?action=download&file=${encodeURIComponent(filename)}`;
    logAdminActivity(`Downloaded backup: ${filename}`, 'Backup Download', 'Success');
}

async function deleteBackup(id, filename) {
    showConfirm(`Are you sure you want to delete backup "${filename}"?`, async function () {
        try {
            const response = await fetch(`${BACKUP_API}?action=delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, filename: filename })
            });

            const data = await response.json();

            if (data.success) {
                showModalNotification('Backup deleted successfully', 'success', 'Deleted');
                logAdminActivity(`Deleted backup: ${filename}`, 'Backup Delete', 'Success');
                loadBackupData();
            } else {
                throw new Error(data.error || 'Failed to delete backup');
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            showModalNotification('Failed to delete backup', 'error', 'Error');
        }
    });
}

async function pruneOldBackups() {
    showModalNotification('Pruning old backups...', 'info', 'Pruning');

    try {
        const response = await fetch(`${BACKUP_API}?action=prune`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showModalNotification(data.message, 'success', 'Prune Complete');
            logAdminActivity('Pruned old backups', 'Backup Prune', 'Success');
            loadBackupData();
        } else {
            throw new Error(data.error || 'Failed to prune backups');
        }
    } catch (error) {
        console.error('Error pruning backups:', error);
        showModalNotification('Failed to prune backups', 'error', 'Error');
    }
}

async function restoreBackup() {
    const fileInput = document.getElementById('restoreFile');
    if (!fileInput || !fileInput.files.length) {
        showModalNotification('Please select a backup file first', 'warning', 'No File');
        return;
    }

    const file = fileInput.files[0];
    showModalNotification('Restoring from backup...', 'info', 'Restoring');

    try {
        const formData = new FormData();
        formData.append('backup_file', file);

        const response = await fetch(`${BACKUP_API}?action=restore`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showModalNotification(data.message || 'Data restored successfully', 'success', 'Restore Complete');
            logAdminActivity('Restored system from backup', 'System Restore', 'Success');

            // Reload page after restore
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            throw new Error(data.error || 'Failed to restore backup');
        }
    } catch (error) {
        console.error('Error restoring backup:', error);
        showModalNotification('Failed to restore: ' + error.message, 'error', 'Restore Failed');
    }
}

// Requests Functions
// ===== Request Management Functions =====

function getAccountRequests() {
    try {
        const stored = localStorage.getItem('accountRequests');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveAccountRequests(requests) {
    localStorage.setItem('accountRequests', JSON.stringify(requests));
}

function initializeRequests() {
    // Search listener
    const searchInput = document.getElementById('requestSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadRequests());
    }

    // Filter listener
    const statusFilter = document.getElementById('requestStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => loadRequests());
    }

    // Initial load
    loadRequests();
}

async function loadRequests() {
    const tableElem = document.getElementById('requestsTable');
    if (!tableElem) {
        updateRequestSidebarBadge();
        return;
    }

    const tbody = tableElem.querySelector('tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('requestSearch')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('requestStatusFilter')?.value || 'Pending';

    try {
        // Fetch from both tables
        const [regRequests, updateRequests, users, roles] = await Promise.all([
            accountRequestsDB.show(),
            requestsTblDB.show(),
            usersDB.show(),
            rolesDB.show()
        ]);

        const userMap = {};
        users.forEach(u => userMap[u.id] = u.full_name);

        const roleMap = {};
        roles.forEach(r => roleMap[r.id] = r.name);

        let allRequests = [];

        // Add Account Registration Requests
        regRequests.forEach(req => {
            allRequests.push({
                id: req.id,
                source: 'account_requests',
                date: req.requested_at,
                name: req.full_name,
                typeLabel: 'Account Request',
                itemAction: roleMap[req.requested_role_id] || 'Staff',
                note: `New user registration (${req.email || 'No email'})`,
                status: req.status,
                raw: req
            });
        });

        // Add Staff Update Requests
        updateRequests.forEach(req => {
            const payload = JSON.parse(req.payload || '{}');
            let actionText = req.type === 'account_update' ? 'Profile Update' : 'Password Change';
            let noteText = '';
            if (req.type === 'account_update') {
                noteText = `New Name: ${payload.full_name || '-'}`;
            } else {
                noteText = 'Security credential update';
            }

            allRequests.push({
                id: req.id,
                source: 'requests_tbl',
                date: req.created_at,
                name: userMap[req.requester_id] || 'Unknown Staff',
                typeLabel: 'Staff Request',
                itemAction: actionText,
                note: noteText,
                status: req.status || 'Pending',
                raw: req
            });
        });

        // Sort by date descending
        allRequests.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Apply filters
        if (statusFilter !== 'All') {
            allRequests = allRequests.filter(r => r.status === statusFilter);
        }
        if (searchTerm) {
            allRequests = allRequests.filter(r =>
                r.name.toLowerCase().includes(searchTerm) ||
                r.itemAction.toLowerCase().includes(searchTerm) ||
                r.note.toLowerCase().includes(searchTerm)
            );
        }

        tbody.innerHTML = '';

        if (allRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No matching requests found.</td></tr>';
        } else {
            allRequests.forEach(req => {
                const row = tbody.insertRow();
                row.classList.add('animate__animated', 'animate__fadeIn');

                const isPending = req.status === 'Pending';
                const statusBadge = req.status === 'Pending' ? 'bg-warning' : (req.status === 'Approved' ? 'bg-success' : 'bg-danger');

                row.innerHTML = `
                    <td>${new Date(req.date).toLocaleString()}</td>
                    <td><strong>${req.name}</strong></td>
                    <td><span class="badge bg-secondary">${req.typeLabel}</span></td>
                    <td>${req.itemAction}</td>
                    <td class="small">${req.note}</td>
                    <td><span class="badge ${statusBadge}">${req.status}</span></td>
                    <td>
                        ${isPending ? `
                            <div class="table-actions">
                                <button class="btn btn-sm btn-outline-success" onclick="approveRequest('${req.source}', ${req.id})" title="Approve">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="denyRequest('${req.source}', ${req.id})" title="Deny">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        ` : `
                            <button class="btn btn-sm btn-outline-secondary" onclick="deleteRequestRecord('${req.source}', ${req.id})" title="Delete Record">
                                <i class="fas fa-trash"></i>
                            </button>
                        `}
                    </td>
                `;
            });
        }

        const pageBadge = document.getElementById('pendingRequestsBadge');
        if (pageBadge) {
            const pendingCount = allRequests.filter(r => r.status === 'Pending').length;
            pageBadge.textContent = `${pendingCount} Pending Request${pendingCount !== 1 ? 's' : ''}`;
        }

        // Update tab badge count
        const requestsCountBadge = document.getElementById('requestsCountBadge');
        if (requestsCountBadge) {
            const pendingCount = allRequests.filter(r => r.status === 'Pending').length;
            requestsCountBadge.textContent = pendingCount;
        }

        updateRequestSidebarBadge();

    } catch (err) {
        console.error('Failed to load requests:', err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Error loading data.</td></tr>';
    }
}

async function updateRequestSidebarBadge() {
    try {
        const [regs, others] = await Promise.all([
            accountRequestsDB.show({ status: 'Pending' }),
            requestsTblDB.show({ status: 'Pending' })
        ]);

        const pendingCount = (Array.isArray(regs) ? regs.length : 0) + (Array.isArray(others) ? others.length : 0);

        // Find "Requests" sidebar link
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            if (link.textContent.includes('Requests')) {
                let badge = link.querySelector('.sidebar-badge');
                if (pendingCount > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'badge bg-danger rounded-pill ms-auto sidebar-badge animate__animated animate__bounceIn';
                        link.appendChild(badge);
                    }
                    badge.textContent = pendingCount;
                } else if (badge) {
                    badge.remove();
                }
            }
        });

        // Also update dashboard alert count if on dashboard
        const alertsCount = document.getElementById('systemAlerts');
        if (alertsCount) {
            const ingredients = await ingredientsDB.show();
            const lowStock = ingredients.filter(ing => parseFloat(ing.current_quantity) <= parseFloat(ing.low_stock_threshold)).length;
            alertsCount.textContent = (pendingCount > 0 || lowStock > 0) ? (pendingCount + (lowStock > 0 ? 1 : 0)) : '0';
        }
    } catch (e) {
        console.error('Badge update failed:', e);
    }
}

function startRequestBadgePolling() {
    updateRequestSidebarBadge();
    setInterval(updateRequestSidebarBadge, 10000); // 10 seconds
}

async function approveRequest(source, id) {
    showConfirm(`Are you sure you want to approve this request?`, async function () {
        try {
            if (source === 'account_requests') {
                const reqs = await accountRequestsDB.show({ id });
                const req = Array.isArray(reqs) ? reqs[0] : reqs;
                if (!req) return;

                // 1. Create User
                const newUser = {
                    full_name: req.full_name,
                    username: req.username,
                    email: req.email, // Include email from request
                    password_hash: req.password_hash, // Already hashed by backend on insertion
                    role_id: req.requested_role_id,
                    status: 'Active',
                    created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                };
                const addUserResult = await usersDB.add(newUser);
                if (addUserResult.error) {
                    showModalNotification(`Failed to create user: ${addUserResult.error}`, 'danger', 'Error');
                    return;
                }

                // 2. Update Request Status
                const editReqResult = await accountRequestsDB.edit({
                    id: req.id,
                    status: 'Approved',
                    reviewed_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                });

                if (editReqResult.error) {
                    showModalNotification(`Failed to update request status: ${editReqResult.error}`, 'danger', 'Error');
                    return;
                }

                showModalNotification(`Account for "${req.username}" approved and created successfully.`, 'success', 'Approved');
                logAdminActivity('Approved account registration', req.username, 'Success');

            } else {
                const reqs = await requestsTblDB.show({ id });
                const req = Array.isArray(reqs) ? reqs[0] : reqs;
                if (!req) return;

                const payload = JSON.parse(req.payload || '{}');

                if (req.type === 'account_update') {
                    // Update user record
                    await usersDB.edit({
                        id: req.requester_id,
                        full_name: payload.full_name,
                        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                    });
                } else if (req.type === 'password_change') {
                    // Update password
                    await usersDB.edit({
                        id: req.requester_id,
                        password_hash: payload.new_password, // Backend handled? Actually app.php hashes on PUT if table is users
                        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                    });
                }

                // Update Request Status
                await requestsTblDB.edit({
                    id: req.id,
                    status: 'Approved',
                    handled_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                });

                showModalNotification(`Staff update request approved.`, 'success', 'Approved');
                logAdminActivity('Approved staff account update', `Requester ID: ${req.requester_id}`, 'Success');
            }

            loadRequests();

        } catch (err) {
            console.error('Approval failed:', err);
            showModalNotification('Process failed.', 'danger', 'Error');
        }
    });
}

async function denyRequest(source, id) {
    showConfirm(`Deny this request?`, async function () {
        try {
            if (source === 'account_requests') {
                await accountRequestsDB.edit({
                    id: id,
                    status: 'Denied',
                    reviewed_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                });
            } else {
                await requestsTblDB.edit({
                    id: id,
                    status: 'Denied',
                    handled_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                });
            }

            showModalNotification('Request denied.', 'info', 'Denied');
            loadRequests();
        } catch (err) {
            console.error('Deny failed:', err);
            showModalNotification('Process failed.', 'danger', 'Error');
        }
    });
}

async function deleteRequestRecord(source, id) {
    showConfirm(`Delete this request record permanently?`, async function () {
        try {
            if (source === 'account_requests') {
                await accountRequestsDB.delete(id);
            } else {
                await requestsTblDB.delete(id);
            }
            showModalNotification('Record deleted.', 'success', 'Deleted');
            loadRequests();
        } catch (err) {
            console.error('Delete failed:', err);
            showModalNotification('Process failed.', 'danger', 'Error');
        }
    });
}


// System Settings Functions
function initializeSystemSettings() {
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function () {
            showConfirm('Are you sure you want to save settings?', function () {
                saveSystemSettings();
            });
        });
    }
}

function saveSystemSettings() {
    showModalNotification('Saving system settings...', 'info', 'Saving');
    setTimeout(() => {
        showModalNotification('Settings saved successfully', 'success', 'Saved');
    }, 1000);
}

// ===== Activity Log Functions =====

// Determine category of an activity based on its action text
function getActivityCategory(action) {
    const a = action.toLowerCase();
    if (a.includes('log in') || a.includes('logged in') || a.includes('login') ||
        a.includes('log out') || a.includes('logged out') || a.includes('logout')) {
        return 'Login';
    }
    if (a.includes('sale') || a.includes('receipt') || a.includes('transaction') ||
        a.includes('recorded sale') || a.includes('printed receipt') || a.includes('payment') ||
        a.includes('order') || a.includes('refund') || a.includes('void')) {
        return 'Sales';
    }
    if (a.includes('ingredient') || a.includes('inventory') || a.includes('stock') ||
        a.includes('increased') || a.includes('decreased') || a.includes('restock') ||
        a.includes('quantity')) {
        return 'Inventory';
    }
    // Everything else is Administrative
    return 'Admin';
}

// Get category badge HTML
function getCategoryBadge(category) {
    const map = {
        'Login': { bg: 'bg-info', label: 'Login / Logout', icon: 'fa-sign-in-alt' },
        'Sales': { bg: 'bg-success', label: 'Sales & Transactions', icon: 'fa-cash-register' },
        'Inventory': { bg: 'bg-warning text-dark', label: 'Inventory Update', icon: 'fa-boxes' },
        'Admin': { bg: 'bg-danger', label: 'Administrative', icon: 'fa-shield-alt' }
    };
    const info = map[category] || map['Admin'];
    return `<span class="badge ${info.bg}"><i class="fas ${info.icon} me-1"></i>${info.label}</span>`;
}

// Get all activity logs from localStorage (merged with sample data)
function getAllActivityLogs() {
    let logs = [];
    try {
        const stored = localStorage.getItem('systemActivityLogs');
        if (stored) logs = JSON.parse(stored);
    } catch (e) { logs = []; }

    // If empty, seed with sample data
    if (!logs || logs.length === 0) {
        logs = generateSeedActivityLogs();
        localStorage.setItem('systemActivityLogs', JSON.stringify(logs));
    }
    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return logs;
}

// Generate seed activity data so the log is not empty on first load
function generateSeedActivityLogs() {
    const today = new Date();
    const fmt = (d) => {
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    const ms = (h, m) => h * 3600000 + m * 60000;

    // Generate activities for today and past couple of days
    const seeds = [];
    let id = 1;

    // --- Today ---
    const t0 = new Date(today); t0.setHours(8, 5, 12, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Logged in', reference: 'System', timestamp: fmt(t0), category: 'Login', ip: '192.168.1.10' });

    const t1 = new Date(today); t1.setHours(8, 12, 45, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Updated system settings', reference: 'System Settings', timestamp: fmt(t1), category: 'Admin', ip: '192.168.1.10' });

    const t2 = new Date(today); t2.setHours(8, 30, 0, 0);
    seeds.push({ id: id++, userName: 'John Doe', action: 'Logged in', reference: 'System', timestamp: fmt(t2), category: 'Login', ip: '192.168.1.15' });

    const t3 = new Date(today); t3.setHours(9, 15, 33, 0);
    seeds.push({ id: id++, userName: 'John Doe', action: 'Recorded sale', reference: 'SALE-2001', timestamp: fmt(t3), category: 'Sales', ip: '192.168.1.15' });

    const t4 = new Date(today); t4.setHours(9, 17, 10, 0);
    seeds.push({ id: id++, userName: 'John Doe', action: 'Printed receipt', reference: 'REC-2001', timestamp: fmt(t4), category: 'Sales', ip: '192.168.1.15' });

    const t5 = new Date(today); t5.setHours(10, 0, 22, 0);
    seeds.push({ id: id++, userName: 'Jane Smith', action: 'Logged in', reference: 'System', timestamp: fmt(t5), category: 'Login', ip: '192.168.1.20' });

    const t6 = new Date(today); t6.setHours(10, 25, 5, 0);
    seeds.push({ id: id++, userName: 'Jane Smith', action: 'Increased ingredient quantity', reference: 'Chicken (+10 kg)', timestamp: fmt(t6), category: 'Inventory', ip: '192.168.1.20' });

    const t7 = new Date(today); t7.setHours(11, 2, 44, 0);
    seeds.push({ id: id++, userName: 'Jane Smith', action: 'Recorded sale', reference: 'SALE-2002', timestamp: fmt(t7), category: 'Sales', ip: '192.168.1.20' });

    const t8 = new Date(today); t8.setHours(11, 45, 18, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Added new menu item', reference: 'Grilled Salmon', timestamp: fmt(t8), category: 'Admin', ip: '192.168.1.10' });

    const t9 = new Date(today); t9.setHours(12, 10, 30, 0);
    seeds.push({ id: id++, userName: 'John Doe', action: 'Recorded sale', reference: 'SALE-2003', timestamp: fmt(t9), category: 'Sales', ip: '192.168.1.15' });

    const t10 = new Date(today); t10.setHours(13, 5, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Decreased ingredient quantity', reference: 'Tomatoes (-2 kg, Spoilage)', timestamp: fmt(t10), category: 'Inventory', ip: '192.168.1.10' });

    const t11 = new Date(today); t11.setHours(14, 0, 0, 0);
    seeds.push({ id: id++, userName: 'Sarah Williams', action: 'Logged in', reference: 'System', timestamp: fmt(t11), category: 'Login', ip: '192.168.1.25' });

    const t12 = new Date(today); t12.setHours(14, 20, 15, 0);
    seeds.push({ id: id++, userName: 'Sarah Williams', action: 'Recorded sale', reference: 'SALE-2004', timestamp: fmt(t12), category: 'Sales', ip: '192.168.1.25' });

    const t13 = new Date(today); t13.setHours(15, 30, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Created full system backup', reference: 'Backup', timestamp: fmt(t13), category: 'Admin', ip: '192.168.1.10' });

    const t14 = new Date(today); t14.setHours(16, 0, 0, 0);
    seeds.push({ id: id++, userName: 'John Doe', action: 'Logged out', reference: 'System', timestamp: fmt(t14), category: 'Login', ip: '192.168.1.15' });

    // --- Yesterday ---
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const y0 = new Date(yesterday); y0.setHours(7, 55, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Logged in', reference: 'System', timestamp: fmt(y0), category: 'Login', ip: '192.168.1.10' });

    const y1 = new Date(yesterday); y1.setHours(8, 30, 0, 0);
    seeds.push({ id: id++, userName: 'John Doe', action: 'Logged in', reference: 'System', timestamp: fmt(y1), category: 'Login', ip: '192.168.1.15' });

    const y2 = new Date(yesterday); y2.setHours(9, 0, 0, 0);
    seeds.push({ id: id++, userName: 'John Doe', action: 'Recorded sale', reference: 'SALE-1998', timestamp: fmt(y2), category: 'Sales', ip: '192.168.1.15' });

    const y3 = new Date(yesterday); y3.setHours(10, 15, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Approved staff account request', reference: 'Robert Johnson', timestamp: fmt(y3), category: 'Admin', ip: '192.168.1.10' });

    const y4 = new Date(yesterday); y4.setHours(11, 30, 0, 0);
    seeds.push({ id: id++, userName: 'Jane Smith', action: 'Logged in', reference: 'System', timestamp: fmt(y4), category: 'Login', ip: '192.168.1.20' });

    const y5 = new Date(yesterday); y5.setHours(12, 45, 0, 0);
    seeds.push({ id: id++, userName: 'Jane Smith', action: 'Recorded sale', reference: 'SALE-1999', timestamp: fmt(y5), category: 'Sales', ip: '192.168.1.20' });

    const y6 = new Date(yesterday); y6.setHours(14, 0, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Increased ingredient quantity', reference: 'Beef (+5 kg)', timestamp: fmt(y6), category: 'Inventory', ip: '192.168.1.10' });

    const y7 = new Date(yesterday); y7.setHours(15, 30, 0, 0);
    seeds.push({ id: id++, userName: 'Jane Smith', action: 'Recorded sale', reference: 'SALE-2000', timestamp: fmt(y7), category: 'Sales', ip: '192.168.1.20' });

    const y8 = new Date(yesterday); y8.setHours(17, 0, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Logged out', reference: 'System', timestamp: fmt(y8), category: 'Login', ip: '192.168.1.10' });

    // --- Two days ago ---
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const d0 = new Date(twoDaysAgo); d0.setHours(8, 0, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Logged in', reference: 'System', timestamp: fmt(d0), category: 'Login', ip: '192.168.1.10' });

    const d1 = new Date(twoDaysAgo); d1.setHours(9, 15, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Deleted user account', reference: 'Mike Brown', timestamp: fmt(d1), category: 'Admin', ip: '192.168.1.10' });

    const d2 = new Date(twoDaysAgo); d2.setHours(10, 30, 0, 0);
    seeds.push({ id: id++, userName: 'Robert Johnson', action: 'Logged in', reference: 'System', timestamp: fmt(d2), category: 'Login', ip: '192.168.1.30' });

    const d3 = new Date(twoDaysAgo); d3.setHours(11, 0, 0, 0);
    seeds.push({ id: id++, userName: 'Robert Johnson', action: 'Recorded sale', reference: 'SALE-1995', timestamp: fmt(d3), category: 'Sales', ip: '192.168.1.30' });

    const d4 = new Date(twoDaysAgo); d4.setHours(13, 0, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Decreased ingredient quantity', reference: 'Onions (-1 kg, Used)', timestamp: fmt(d4), category: 'Inventory', ip: '192.168.1.10' });

    const d5 = new Date(twoDaysAgo); d5.setHours(16, 0, 0, 0);
    seeds.push({ id: id++, userName: 'Admin', action: 'Generated PDF report', reference: 'Daily Sales', timestamp: fmt(d5), category: 'Admin', ip: '192.168.1.10' });

    return seeds;
}

// ===== Dashboard Recent Activity Timeline =====
function loadRecentActivities() {
    const container = document.getElementById('recentActivities');
    if (!container) return;

    const logs = getAllActivityLogs();
    const recent = logs.slice(0, 8); // Show last 8 activities

    if (recent.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">No recent activities.</p>';
        return;
    }

    const iconMap = {
        'Login': { icon: 'fa-sign-in-alt', color: 'text-info' },
        'Sales': { icon: 'fa-cash-register', color: 'text-success' },
        'Inventory': { icon: 'fa-boxes', color: 'text-warning' },
        'Admin': { icon: 'fa-shield-alt', color: 'text-danger' }
    };

    let html = '';
    recent.forEach(log => {
        const cat = log.category || getActivityCategory(log.action);
        const info = iconMap[cat] || iconMap['Admin'];
        const ts = new Date(log.timestamp);
        const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = ts.toLocaleDateString();

        html += `
            <div class="activity-item">
                <div class="d-flex align-items-start">
                    <div class="activity-icon me-3 ${info.color}" style="min-width:40px;">
                        <i class="fas ${info.icon}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong class="small">${log.userName}</strong>
                            <small class="text-muted">${timeStr}</small>
                        </div>
                        <p class="mb-0 small">${log.action}</p>
                        <small class="text-muted">${log.reference || ''} &middot; ${dateStr}</small>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

// ===== Old initializeActivityLog (for activityLogTable if it exists on other pages) =====
function initializeActivityLog() {
    const exportBtn = document.getElementById('exportActivityLog');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            showModalNotification('Exporting activity log...', 'info', 'Exporting');
        });
    }
    loadActivityLog();
}

function loadActivityLog() {
    const tableElem = document.getElementById('activityLogTable');
    if (!tableElem) return;

    const tbody = tableElem.getElementsByTagName('tbody')[0];
    if (!tbody) return;

    const logs = getAllActivityLogs().slice(0, 20);
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No activity logs found.</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    logs.forEach(log => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${log.timestamp}</td><td>${log.userName}</td><td>${log.action}</td><td>${log.reference || '-'}</td>`;
    });
}

// ===== Full Activity Log Page =====
let fullLogCurrentPage = 1;
const FULL_LOG_PAGE_SIZE = 15;
let fullLogFilteredData = [];

function initializeFullActivityLog() {
    // Category filter
    const categoryFilter = document.getElementById('activityCategoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function () {
            fullLogCurrentPage = 1;
            loadFullActivityLog();
        });
    }

    // User filter
    const userFilter = document.getElementById('activityUserFilter');
    if (userFilter) {
        userFilter.addEventListener('change', function () {
            fullLogCurrentPage = 1;
            loadFullActivityLog();
        });
    }

    // Filter button
    const filterBtn = document.getElementById('filterFullActivityBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function () {
            fullLogCurrentPage = 1;
            loadFullActivityLog();
        });
    }

    // Populate user dropdown
    populateUserFilter();

    // Initial load
    loadFullActivityLog();
}

function populateUserFilter() {
    const userFilter = document.getElementById('activityUserFilter');
    if (!userFilter) return;

    const logs = getAllActivityLogs();
    const users = [...new Set(logs.map(l => l.userName))];
    users.sort();

    // Keep the "All Users" option, add user options
    userFilter.innerHTML = '<option value="">All Users</option>';
    users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        userFilter.appendChild(opt);
    });
}

function loadFullActivityLog() {
    const tableElem = document.getElementById('fullActivityLogTable');
    if (!tableElem) return;

    const tbody = tableElem.getElementsByTagName('tbody')[0];
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm text-danger me-2" role="status"></div>Loading activity logs...</td></tr>';

    // Get filter values
    const categoryVal = document.getElementById('activityCategoryFilter')?.value || '';
    const userVal = document.getElementById('activityUserFilter')?.value || '';
    const fromDate = document.getElementById('activityFromDate')?.value || '';
    const toDate = document.getElementById('activityToDate')?.value || '';

    setTimeout(() => {
        let logs = getAllActivityLogs();

        // Apply category filter
        if (categoryVal) {
            logs = logs.filter(log => {
                const cat = log.category || getActivityCategory(log.action);
                return cat === categoryVal;
            });
        }

        // Apply user filter
        if (userVal) {
            logs = logs.filter(log => log.userName === userVal);
        }

        // Apply date filters
        if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            logs = logs.filter(log => new Date(log.timestamp) >= from);
        }
        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            logs = logs.filter(log => new Date(log.timestamp) <= to);
        }

        fullLogFilteredData = logs;

        // Update entry count
        const countBadge = document.getElementById('logEntryCount');
        if (countBadge) countBadge.textContent = `${logs.length} Entries`;

        // Paginate
        const totalPages = Math.max(1, Math.ceil(logs.length / FULL_LOG_PAGE_SIZE));
        if (fullLogCurrentPage > totalPages) fullLogCurrentPage = totalPages;

        const startIdx = (fullLogCurrentPage - 1) * FULL_LOG_PAGE_SIZE;
        const pageData = logs.slice(startIdx, startIdx + FULL_LOG_PAGE_SIZE);

        tbody.innerHTML = '';

        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2 d-block"></i>No activity logs match your filters.</td></tr>';
        } else {
            pageData.forEach(log => {
                const cat = log.category || getActivityCategory(log.action);
                const row = tbody.insertRow();
                row.classList.add('animate__animated', 'animate__fadeIn');
                row.innerHTML = `
                    <td>${log.action}</td>
                    <td>${getCategoryBadge(cat)}</td>
                    <td><code>${log.ip || 'N/A'}</code></td>
                    <td><small class="text-muted">${log.reference || '-'}</small></td>
                `;
            });
        }

        // Render pagination
        renderActivityPagination(totalPages);
    }, 400);
}

function renderActivityPagination(totalPages) {
    const paginationContainer = document.getElementById('activityPagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${fullLogCurrentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" tabindex="-1"><i class="fas fa-chevron-left"></i></a>`;
    prevLi.addEventListener('click', function (e) {
        e.preventDefault();
        if (fullLogCurrentPage > 1) {
            fullLogCurrentPage--;
            loadFullActivityLog();
        }
    });
    paginationContainer.appendChild(prevLi);

    // Page numbers (show max 5 pages around current)
    let startPage = Math.max(1, fullLogCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === fullLogCurrentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', function (e) {
            e.preventDefault();
            fullLogCurrentPage = i;
            loadFullActivityLog();
        });
        paginationContainer.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${fullLogCurrentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="fas fa-chevron-right"></i></a>`;
    nextLi.addEventListener('click', function (e) {
        e.preventDefault();
        if (fullLogCurrentPage < totalPages) {
            fullLogCurrentPage++;
            loadFullActivityLog();
        }
    });
    paginationContainer.appendChild(nextLi);

    // Style active page
    paginationContainer.querySelectorAll('.page-item.active .page-link').forEach(el => {
        el.style.backgroundColor = '#dc3545';
        el.style.borderColor = '#dc3545';
    });
}


// ===== Helper Functions =====
function logAdminActivity(action, details, status) {
    console.log(`Activity: ${action} | Details: ${details} | Status: ${status}`);

    // Persist to localStorage
    let logs = [];
    try {
        const stored = localStorage.getItem('systemActivityLogs');
        if (stored) logs = JSON.parse(stored);
    } catch (e) { logs = []; }

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    let uName = 'Admin';
    try {
        const u = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        uName = u.full_name || 'Admin';
    } catch (e) { }

    const newLog = {
        id: Date.now(),
        userName: uName,
        action: action,
        reference: details ? `${details} [${ts}]` : ts,
        timestamp: ts,
        category: getActivityCategory(action),
        ip: '192.168.1.10'
    };

    logs.unshift(newLog);

    // Keep max 500 entries
    if (logs.length > 500) logs = logs.slice(0, 500);

    localStorage.setItem('systemActivityLogs', JSON.stringify(logs));

    // Refresh dashboard recent activities if on dashboard
    if (document.getElementById('recentActivities')) {
        loadRecentActivities();
    }

    // Refresh full log if on activity log page
    if (document.getElementById('fullActivityLogTable')) {
        loadFullActivityLog();
    }
}

// ===== User Timestamp & Deletion Helper Functions =====

/**
 * Get current timestamp in database format (YYYY-MM-DD HH:MM:SS)
 */
function getCurrentTimestamp() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Mark a user as deleted (soft delete) by setting deleted_at timestamp
 * @param {number} userId - User ID to delete
 * @param {string} deletedBy - Name/ID of user performing the deletion
 */
async function markUserDeleted(userId, deletedBy = 'Admin') {
    try {
        const deleteTime = getCurrentTimestamp();
        const result = await usersDB.edit({
            id: userId,
            deleted_at: deleteTime
        });

        if (result && !result.error) {
            console.log(`✅ User ${userId} marked as deleted at ${deleteTime}`);
            return { success: true, timestamp: deleteTime };
        } else {
            console.error('❌ Failed to mark user as deleted:', result);
            return { success: false, error: result?.error };
        }
    } catch (err) {
        console.error('❌ Error marking user deleted:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Restore a deleted user by clearing deleted_at timestamp
 * @param {number} userId - User ID to restore
 */
async function restoreUserRecord(userId) {
    try {
        const result = await usersDB.edit({
            id: userId,
            deleted_at: null
        });

        if (result && !result.error) {
            console.log(`✅ User ${userId} restored (deleted_at cleared)`);
            return { success: true };
        } else {
            console.error('❌ Failed to restore user:', result);
            return { success: false, error: result?.error };
        }
    } catch (err) {
        console.error('❌ Error restoring user:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Update the updated_at timestamp for a user (call when modifying user data)
 * @param {number} userId - User ID
 */
async function updateUserTimestamp(userId) {
    try {
        const updateTime = getCurrentTimestamp();
        const result = await usersDB.edit({
            id: userId,
            updated_at: updateTime
        });

        if (result && !result.error) {
            console.log(`✅ User ${userId} updated_at set to ${updateTime}`);
            return { success: true, timestamp: updateTime };
        } else {
            console.error('❌ Failed to update user timestamp:', result);
            return { success: false };
        }
    } catch (err) {
        console.error('❌ Error updating user timestamp:', err);
        return { success: false };
    }
}

/**
 * Check if a user is marked as deleted
 * @param {object} user - User object from DB
 * @returns {boolean} - True if user is deleted
 */
function isUserDeleted(user) {
    return user && (user.deleted_at !== null && user.deleted_at !== undefined && user.deleted_at !== '');
}

/**
 * Get deletion information for a user
 * @param {object} user - User object from DB
 * @returns {object} - Deletion info { isDeleted, deletedAt, status }
 */
function getUserDeletionInfo(user) {
    const isDeleted = isUserDeleted(user);
    return {
        isDeleted: isDeleted,
        deletedAt: user.deleted_at || null,
        status: isDeleted ? 'Deleted' : 'Active',
        deletedDaysAgo: isDeleted ? Math.floor((Date.now() - new Date(user.deleted_at).getTime()) / (1000 * 60 * 60 * 24)) : null
    };
}

/**
 * Get user update history info
 * @param {object} user - User object from DB
 * @returns {object} - Update info { updatedAt, createdAt, lastModified }
 */
function getUserUpdateInfo(user) {
    const updated = user.updated_at ? new Date(user.updated_at).toLocaleString() : 'Never';
    const created = user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown';

    return {
        updatedAt: user.updated_at || null,
        createdAt: user.created_at || null,
        updatedAtDisplay: updated,
        createdAtDisplay: created,
        lastModified: user.updated_at || user.created_at || null
    };
}

/**
 * Update the last_login timestamp for a user (call when user logs in)
 * @param {number} userId - User ID
 */
async function updateUserLastLogin(userId) {
    try {
        const loginTime = getCurrentTimestamp();
        const result = await usersDB.edit({
            id: userId,
            last_login: loginTime
        });

        if (result && !result.error) {
            console.log(`✅ User ${userId} last_login updated to ${loginTime}`);
            return { success: true, timestamp: loginTime };
        } else {
            console.error('❌ Failed to update last_login:', result);
            return { success: false };
        }
    } catch (err) {
        console.error('❌ Error updating last_login:', err);
        return { success: false };
    }
}

/**
 * Get last login information for a user
 * @param {object} user - User object from DB
 * @returns {object} - Login info { lastLogin, lastLoginDisplay, timeSinceLastLogin, daysAgo }
 */
function getUserLastLoginInfo(user) {
    if (!user.last_login) {
        return {
            lastLogin: null,
            lastLoginDisplay: 'Never',
            timeSinceLastLogin: null,
            daysAgo: null,
            status: 'Never logged in'
        };
    }

    const lastLoginDate = new Date(user.last_login);
    const lastLoginDisplay = lastLoginDate.toLocaleString();
    const now = new Date();
    const diffMs = now.getTime() - lastLoginDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let timeSinceText = '';
    if (diffDays > 0) {
        timeSinceText = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        timeSinceText = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        timeSinceText = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }

    return {
        lastLogin: user.last_login,
        lastLoginDisplay: lastLoginDisplay,
        timeSinceLastLogin: timeSinceText,
        daysAgo: diffDays,
        hoursAgo: diffHours,
        status: `Last login: ${timeSinceText}`
    };
}

/**
 * Check if user is active (logged in recently)
 * @param {object} user - User object from DB
 * @param {number} daysThreshold - Threshold in days (default 30)
 * @returns {boolean} - True if user logged in within threshold
 */
function isUserActive(user, daysThreshold = 30) {
    if (!user.last_login) return false;

    const lastLoginDate = new Date(user.last_login);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

    return diffDays <= daysThreshold;
}

/**
 * Get user login statistics
 * @param {array} users - Array of user objects from DB
 * @returns {object} - Statistics { totalUsers, activeUsers, inactiveUsers, neverLoggedIn }
 */
function getUserLoginStats(users) {
    if (!Array.isArray(users)) return { totalUsers: 0, activeUsers: 0, inactiveUsers: 0, neverLoggedIn: 0 };

    let activeUsers = 0;
    let inactiveUsers = 0;
    let neverLoggedIn = 0;

    users.forEach(user => {
        if (!user.last_login) {
            neverLoggedIn++;
        } else if (isUserActive(user, 30)) {
            activeUsers++;
        } else {
            inactiveUsers++;
        }
    });

    return {
        totalUsers: users.length,
        activeUsers: activeUsers,
        inactiveUsers: inactiveUsers,
        neverLoggedIn: neverLoggedIn,
        activePercentage: users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0
    };
}

/**
 * Update user status (active/inactive) in database
 * @param {number} userId - User ID
 * @param {string} status - 'active' or 'inactive'
 * @returns {Promise} - Resolves when status is updated
 */
async function updateUserStatus(userId, status) {
    try {
        const response = await fetch('php/user_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                status: status
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ User ${userId} marked as ${status}:`, data);
        return data;
    } catch (error) {
        console.error(`❌ Failed to update user status:`, error);
        throw error;
    }
}

// showModalNotification and showConfirm are defined in main.js — not duplicated here