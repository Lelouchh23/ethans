// Staff Dashboard JavaScript - Fixed & Cleaned

// API URL for database operations (relative path works on any server)
const API_URL = "php/app.php";
const NOTIFICATIONS_API = 'php/notifications.php';

// Loading modal helper functions
function showLoadingModal(message = 'Loading data...') {
    if (window.Swal) {
        Swal.fire({
            title: message,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading(); }
        });
    }
}

function hideLoadingModal() {
    if (window.Swal) Swal.close();
}

// Database helper function
function createDB(table) {
    return {
        add: async (data) => {
            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...data, table })
                });
                return await res.json();
            } catch (err) {
                console.error(`Add failed [${table}]:`, err);
                return { error: err.message };
            }
        },
        show: async (filters = {}) => {
            try {
                const params = new URLSearchParams({ ...filters, table }).toString();
                const res = await fetch(`${API_URL}?${params}`);
                return await res.json();
            } catch (err) {
                console.error(`Show failed [${table}]:`, err);
                return [];
            }
        },
        edit: async (data) => {
            try {
                const res = await fetch(API_URL, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...data, table })
                });
                return await res.json();
            } catch (err) {
                console.error(`Edit failed [${table}]:`, err);
                return { error: err.message };
            }
        },
        delete: async (id) => {
            try {
                console.log(`[${table}] DELETE request - ID:`, id);
                const requestBody = { id, table };
                console.log(`[${table}] Request body:`, JSON.stringify(requestBody));
                
                const res = await fetch(API_URL, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });
                
                console.log(`[${table}] Response status:`, res.status, res.statusText);
                const responseText = await res.text();
                console.log(`[${table}] Raw response:`, responseText);
                
                try {
                    const jsonResponse = JSON.parse(responseText);
                    console.log(`[${table}] Parsed response:`, jsonResponse);
                    return jsonResponse;
                } catch (parseErr) {
                    console.error(`[${table}] JSON parse error:`, parseErr);
                    return { error: 'Invalid JSON response', raw: responseText };
                }
            } catch (err) {
                console.error(`Delete failed [${table}]:`, err);
                return { error: err.message };
            }
        }
    };
}

// Database objects for staff use
const menuCategoriesDB = createDB('menu_categories');
const menuItemsDB = createDB('menu_items');
const ingredientsDB = createDB('ingredients');
const ingredientCategoriesDB = createDB('ingredient_categories');
const unitsDB = createDB('units');
const salesDB = createDB('sales');
const saleItemsDB = createDB('sale_items');
const inventoryTransactionsDB = createDB('inventory_transactions');
const recipesDB = createDB('recipes');
const heldOrdersDB = createDB('held_orders');
const systemSettingsDB = createDB('system_settings');

// Global variables
let currentSaleItems = [];
let currentSaleId = null;
let allMenuItems = [];
let allCategories = [];
let allIngredients = [];
let currentCustomer = null;
let currentDiscount = 0;
let currentCoupon = null;
let currentOrderType = 'walk-in';
let systemSettings = {};
let idleTimer = null;
let lastActivityTime = Date.now();

/**
 * Create a notification for admin to track staff actions
 */
async function createNotification(userId, actionType, targetTable, targetId, description, reason = null) {
    try {
        const response = await fetch(NOTIFICATIONS_API, {
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
        return await response.json();
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
}

/**
 * Send email notification for system events
 * @param {string} eventType - Type of event (low_stock, expiring_ingredients, void_transaction, refund_transaction)
 * @param {object} eventData - Data related to the event
 */
async function sendEmailNotification(eventType, eventData) {
    // Only proceed if email notifications are enabled
    if (systemSettings.enable_email_notifications !== 'true') {
        return { success: true, sent: false, message: 'Email notifications disabled' };
    }
    
    try {
        const response = await fetch('php/send_notification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_type: eventType,
                event_data: eventData
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to send email notification:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Check for low stock and expiring ingredients and send notifications
 */
async function checkAndNotifyInventoryAlerts() {
    if (systemSettings.enable_email_notifications !== 'true') return;
    
    const lowStockItems = [];
    const expiringItems = [];
    
    allIngredients.forEach(ing => {
        if (ing.status === 'Low') {
            lowStockItems.push({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                threshold: ing.minLevel
            });
        }
        if (ing.expiryStatus === 'expired' || ing.expiryStatus === 'expiring') {
            expiringItems.push({
                name: ing.name,
                status: ing.expiryStatus,
                days: Math.abs(ing.daysUntilExpiry)
            });
        }
    });
    
    // Send low stock notification if any
    if (lowStockItems.length > 0) {
        await sendEmailNotification('low_stock', { items: lowStockItems });
    }
    
    // Send expiring notification if any
    if (expiringItems.length > 0) {
        await sendEmailNotification('expiring_ingredients', { items: expiringItems });
    }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function () {
    const safeInit = (label, fn) => {
        try {
            fn();
        } catch (error) {
            console.error(`[Staff Init] ${label} failed:`, error);
        }
    };

    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
    }

    safeInit('common features', initializeCommonStaffFeatures);
    safeInit('auto logout', initializeAutoLogout);

    if (document.getElementById('menuItemsGrid')) safeInit('menu functionality', initializeMenuFunctionality);
    if (document.getElementById('ingredientsListTable') || document.getElementById('ingredientsTable')) {
        safeInit('ingredients functionality', initializeIngredientsFunctionality);
    }
    if (document.getElementById('recentReceipts') || document.getElementById('receiptsList')) {
        safeInit('receipts functionality', initializeReceiptsFunctionality);
    }
    if (document.getElementById('changePasswordForm')) safeInit('account functionality', initializeAccountFunctionality);
    if (document.getElementById('activityLogTable')) safeInit('activity log functionality', initializeActivityLogFunctionality);

    // Only poll user data on pages that show user info
    if (document.querySelector('.navbar .dropdown-toggle')) {
        setInterval(refreshUserData, 15000);
    }
});

// ─── Common ──────────────────────────────────────────────────────────────────

function initializeCommonStaffFeatures() {
    const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const headerUserName = document.querySelector('.navbar .dropdown-toggle');
    if (headerUserName && user.full_name) {
        headerUserName.innerHTML = `<i class="fas fa-user-circle me-1"></i>${user.full_name}`;
    }

    document.querySelectorAll('#logoutBtn, #logoutBtnAccount').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            performStaffLogout();
        });
    });
}

function performStaffLogout() {
    showConfirm('Are you sure you want to logout?', async function () {
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
        window.location.href = 'index.html';
    });
}

// ─── Auto Logout Timer ────────────────────────────────────────────────────────

/**
 * Initialize auto-logout functionality based on system settings
 */
function initializeAutoLogout() {
    // Reset activity timer on user interaction
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });
    
    // Start checking idle time after settings are loaded
    startIdleCheck();
}

/**
 * Reset the idle timer on user activity
 */
function resetIdleTimer() {
    lastActivityTime = Date.now();
}

/**
 * Start periodic idle check
 */
function startIdleCheck() {
    // Check every 30 seconds
    setInterval(() => {
        const autoLogoutMinutes = parseInt(systemSettings.auto_logout_minutes) || 0;
        
        // If auto logout is disabled (0 or not set), don't do anything
        if (autoLogoutMinutes <= 0) return;
        
        const idleTime = (Date.now() - lastActivityTime) / 1000 / 60; // in minutes
        const warningTime = autoLogoutMinutes - 1; // Show warning 1 minute before
        
        if (idleTime >= autoLogoutMinutes) {
            // Auto logout
            performAutoLogout();
        } else if (idleTime >= warningTime && idleTime < warningTime + 0.5) {
            // Show warning (only once in the 30 second window)
            showIdleWarning(Math.ceil((autoLogoutMinutes - idleTime) * 60));
        }
    }, 30000);
}

/**
 * Show warning before auto logout
 */
function showIdleWarning(secondsLeft) {
    Swal.fire({
        title: 'Session Expiring',
        html: `<p>You will be logged out due to inactivity in <strong>${secondsLeft} seconds</strong>.</p><p>Move your mouse or press any key to stay logged in.</p>`,
        icon: 'warning',
        timer: 30000,
        timerProgressBar: true,
        showConfirmButton: true,
        confirmButtonText: 'Stay Logged In',
        confirmButtonColor: '#800000'
    }).then(() => {
        resetIdleTimer();
    });
}

/**
 * Perform automatic logout due to inactivity
 */
async function performAutoLogout() {
    try {
        await fetch('php/logout.php', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (err) {
        console.error('Auto logout server call failed:', err);
    }
    
    localStorage.removeItem('loggedInRole');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loggedInUserId');
    
    // Show message and redirect
    Swal.fire({
        title: 'Session Expired',
        text: 'You have been logged out due to inactivity.',
        icon: 'info',
        confirmButtonColor: '#800000'
    }).then(() => {
        window.location.href = 'index.html';
    });
}

// ─── Manager Approval ─────────────────────────────────────────────────────────

/**
 * Request manager approval for sensitive operations
 * Prompts for manager PIN and validates against admin/manager accounts
 */
async function requestManagerApproval(actionDescription) {
    return new Promise(async (resolve) => {
        const result = await Swal.fire({
            title: 'Manager Approval Required',
            html: `
                <p class="mb-3">A manager must authorize: <strong>${actionDescription}</strong></p>
                <div class="form-group">
                    <label class="form-label">Manager PIN or Password:</label>
                    <input type="password" id="managerPinInput" class="form-control" placeholder="Enter manager PIN" autocomplete="off">
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#800000',
            confirmButtonText: 'Authorize',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                return document.getElementById('managerPinInput').value;
            }
        });
        
        if (!result.isConfirmed || !result.value) {
            resolve(false);
            return;
        }
        
        const pin = result.value;
        
        try {
            // Validate PIN against admin/manager accounts
            const response = await fetch('php/verify_manager_pin.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pin })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Log the manager authorization
                logStaffActivity('Manager Authorization', `${actionDescription} - Approved by ${data.manager_name}`, 'Success');
                Swal.fire({
                    icon: 'success',
                    title: 'Authorized',
                    text: `Approved by ${data.manager_name}`,
                    timer: 1500,
                    showConfirmButton: false
                });
                resolve(true);
            } else {
                Swal.fire('Invalid PIN', data.message || 'The PIN entered is not valid.', 'error');
                logStaffActivity('Manager Authorization', `${actionDescription} - FAILED`, 'Failed');
                resolve(false);
            }
        } catch (err) {
            console.error('Manager verification failed:', err);
            Swal.fire('Error', 'Failed to verify manager credentials.', 'error');
            resolve(false);
        }
    });
}

// ─── Activity Logging (single authoritative version — async/DB) ───────────────

async function logStaffActivity(action, reference = 'N/A', status = 'Success') {
    const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    if (!user.id) return;

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'activity_logs',
                user_id: user.id,
                role_label: user.role_name || 'Staff',
                action,
                reference,
                status,
                ip_address: window.location.hostname,
                created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            })
        });

        if (document.getElementById('activityLogTable')) {
            loadActivityLog();
        }
    } catch (e) {
        console.error('Failed to log activity:', e);
    }
}

// ─── Menu / POS ───────────────────────────────────────────────────────────────

function initializeMenuFunctionality() {
    document.getElementById('menuSearch')?.addEventListener('input', filterMenuItems);

    document.getElementById('clearSaleBtn')?.addEventListener('click', () =>
        showConfirm('Are you sure you want to clear the cart?', clearCurrentSale)
    );
    document.getElementById('printerSetupBtn')?.addEventListener('click', showPrinterSetup);
    document.getElementById('checkoutBtn')?.addEventListener('click', processCheckout);
    document.getElementById('selectCustomerBtn')?.addEventListener('click', selectCustomer);
    document.getElementById('discountBtn')?.addEventListener('click', applyDiscount);
    document.getElementById('couponBtn')?.addEventListener('click', applyCoupon);
    document.getElementById('holdOrderBtn')?.addEventListener('click', holdOrder);
    document.getElementById('returnOrderBtn')?.addEventListener('click', handleReturn);

    // Order type toggle listeners
    document.querySelectorAll('input[name="orderType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentOrderType = normalizeOrderTypeValue(this.value);
        });
    });

    currentOrderType = getSelectedOrderType();

    // Load system settings for discount/coupon visibility
    loadSystemSettings();

    // Load categories first, then menu items
    loadCategoryTabs();
    loadMenuItems();
    updateSaleDisplay();

    // Check for restore parameter in URL (from held orders page)
    checkRestoreFromURL();
}

// Check URL for restore parameter and restore held order
async function checkRestoreFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const restoreId = urlParams.get('restore');

    if (!restoreId) return;

    // Clear URL parameter
    window.history.replaceState({}, document.title, window.location.pathname);

    showLoadingModal('Restoring held order...');

    try {
        const allHeldOrders = await heldOrdersDB.show();
        const order = allHeldOrders.find(o => o.id == restoreId);

        if (!order) {
            hideLoadingModal();
            Swal.fire('Error', 'Held order not found.', 'error');
            return;
        }

        // Restore cart from held order
        currentSaleItems = JSON.parse(order.items_json || '[]');
        currentCustomer = order.customer_name !== 'Walk-in Customer' ? order.customer_name : null;
        currentDiscount = parseFloat(order.discount_percent) || 0;
        currentOrderType = normalizeOrderTypeValue(order.order_type || 'walk-in');

        // Update order type toggle
        const orderTypeRadio = document.querySelector(`input[name="orderType"][value="${currentOrderType}"]`);
        if (orderTypeRadio) orderTypeRadio.checked = true;

        // Restore coupon if present
        if (order.coupon_code) {
            currentCoupon = {
                code: order.coupon_code,
                value: parseFloat(order.coupon_value) || 0,
                type: 'fixed',
                label: `${getCurrency()}${parseFloat(order.coupon_value).toFixed(2)} Off`
            };
        } else {
            currentCoupon = null;
        }

        // Mark held order as restored
        const staffUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        await heldOrdersDB.edit({
            id: order.id,
            status: 'restored',
            restored_at: new Date().toISOString(),
            restored_by: staffUser.id || null
        });

        hideLoadingModal();
        updateSaleDisplay();
        showModalNotification(`Order ${order.hold_ref} restored to cart.`, 'success', 'Order Restored');
        logStaffActivity('Restored Held Order', order.hold_ref, 'Success');

    } catch (err) {
        hideLoadingModal();
        console.error('Failed to restore held order:', err);
        Swal.fire('Error', 'Failed to restore held order.', 'error');
    }
}

// Load system settings from database
async function loadSystemSettings() {
    try {
        const settings = await systemSettingsDB.show();
        
        // Ensure settings is an array before iterating
        if (!Array.isArray(settings)) {
            console.warn('System settings response is not an array:', settings);
            return;
        }
        
        settings.forEach(s => {
            systemSettings[s.key] = s.value;
        });

        // Hide/show discount and coupon buttons based on settings
        const discountBtn = document.getElementById('discountBtn');
        const couponBtn = document.getElementById('couponBtn');

        if (discountBtn && systemSettings.enable_discount === 'false') {
            discountBtn.style.display = 'none';
        }
        if (couponBtn && systemSettings.enable_coupon === 'false') {
            couponBtn.style.display = 'none';
        }
    } catch (err) {
        console.error('Failed to load system settings:', err);
    }
}

// Load category tabs from database
async function loadCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;

    try {
        const categories = await menuCategoriesDB.show();
        allCategories = categories;

        // Build HTML: "All Products" first, then DB categories
        let html = '<button class="btn btn-category active" data-category="All">All Products</button>';
        categories.forEach(cat => {
            html += `<button class="btn btn-category" data-category="${cat.id}">${cat.name}</button>`;
        });
        tabsContainer.innerHTML = html;

        // Attach click listeners
        tabsContainer.querySelectorAll('.btn-category').forEach(tab => {
            tab.addEventListener('click', function () {
                tabsContainer.querySelectorAll('.btn-category').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                filterMenuItems();
            });
        });
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

function selectCustomer() {
    Swal.fire({
        title: 'Select Customer',
        input: 'text',
        inputLabel: 'Enter Customer Name',
        inputPlaceholder: 'Search or add new customer...',
        showCancelButton: true,
        confirmButtonColor: '#800000',
    }).then(result => {
        if (result.isConfirmed && result.value) {
            currentCustomer = result.value;
            showModalNotification(`Customer "${currentCustomer}" selected.`, 'success', 'Customer Selected');
            updateSaleDisplay();
            logStaffActivity('Selected Customer', currentCustomer, 'Success');
        }
    });
}

function applyDiscount() {
    Swal.fire({
        title: 'Apply Discount',
        input: 'number',
        inputLabel: 'Enter Discount Percentage (%)',
        inputPlaceholder: '0',
        inputAttributes: { min: 0, max: 100 },
        showCancelButton: true,
        confirmButtonColor: '#800000',
    }).then(result => {
        if (result.isConfirmed) {
            currentDiscount = parseFloat(result.value) || 0;
            updateSaleDisplay();
            logStaffActivity('Applied Discount', `${currentDiscount}%`, 'Success');
        }
    });
}

function applyCoupon() {
    Swal.fire({
        title: 'Apply Coupon',
        input: 'text',
        inputLabel: 'Enter Coupon Code',
        inputPlaceholder: 'SAVE10, FREE50, etc.',
        showCancelButton: true,
        confirmButtonColor: '#800000',
    }).then(result => {
        if (!result.isConfirmed) return;

        const code = result.value.toUpperCase();
        const coupons = {
            SAVE10: { code: 'SAVE10', type: 'percentage', value: 10, label: '10% Off' },
            FREE50: { code: 'FREE50', type: 'fixed',      value: 50, label: `${getCurrency()}50 Off` },
        };

        if (coupons[code]) {
            currentCoupon = coupons[code];
            showModalNotification(`Coupon "${code}" (${coupons[code].label}) applied!`, 'success', 'Coupon Applied');
            updateSaleDisplay();
            logStaffActivity('Applied Coupon', code, 'Success');
        } else {
            Swal.fire('Invalid Coupon', 'The coupon code entered is not valid.', 'error');
        }
    });
}

async function holdOrder() {
    if (currentSaleItems.length === 0) {
        Swal.fire('Error', 'Cart is empty. Nothing to hold.', 'error');
        return;
    }

    const { subtotal, discountAmount, taxes, total } = calcTotals();
    const selectedOrderType = getSelectedOrderType();
    const expiryHours = parseInt(systemSettings.hold_order_expiry_hours) || 5;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    const staffUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');

    const holdData = {
        hold_ref: 'HOLD-' + Date.now(),
        customer_name: currentCustomer || 'Walk-in Customer',
        order_type: selectedOrderType,
        items_json: JSON.stringify(currentSaleItems),
        subtotal: subtotal,
        discount_amount: discountAmount,
        discount_percent: currentDiscount,
        coupon_code: currentCoupon?.code || null,
        coupon_value: currentCoupon?.value || 0,
        taxes: taxes,
        total_amount: total,
        staff_id: staffUser.id || null,
        expires_at: expiresAt,
        status: 'active'
    };

    showLoadingModal('Holding order...');

    try {
        const result = await heldOrdersDB.add(holdData);
        hideLoadingModal();

        if (result.error) {
            Swal.fire('Error', result.error, 'error');
            return;
        }

        showModalNotification(`Order held until ${new Date(expiresAt).toLocaleTimeString()}. Expires in ${expiryHours} hours.`, 'info', 'Order Held');
        logStaffActivity('Held Order', holdData.hold_ref, 'Success');
        clearCurrentSale();
    } catch (err) {
        hideLoadingModal();
        console.error('Failed to hold order:', err);
        Swal.fire('Error', 'Failed to hold order. Please try again.', 'error');
    }
}

async function handleReturn() {
    showLoadingModal('Loading held orders...');

    try {
        // Get active held orders only
        const allHeldOrders = await heldOrdersDB.show();
        const activeOrders = allHeldOrders.filter(o => o.status === 'active');
        hideLoadingModal();

        if (activeOrders.length === 0) {
            Swal.fire('No Held Orders', 'No active held orders found to restore.', 'info');
            return;
        }

        // Build select options
        const inputOptions = {};
        activeOrders.forEach(order => {
            const createdAt = new Date(order.created_at).toLocaleTimeString();
            const expiresAt = new Date(order.expires_at).toLocaleTimeString();
            inputOptions[order.id] = `${order.hold_ref} - ${order.customer_name} - ${getCurrency()}${parseFloat(order.total_amount).toFixed(2)} (Created: ${createdAt})`;
        });

        const result = await Swal.fire({
            title: 'Restore Held Order',
            input: 'select',
            inputOptions,
            inputPlaceholder: 'Select an order to restore...',
            showCancelButton: true,
            confirmButtonColor: '#800000',
            confirmButtonText: 'Restore to Cart'
        });

        if (!result.isConfirmed || !result.value) return;

        const selectedOrder = activeOrders.find(o => o.id == result.value);
        if (!selectedOrder) return;

        // Restore cart from held order
        currentSaleItems = JSON.parse(selectedOrder.items_json || '[]');
        currentCustomer = selectedOrder.customer_name !== 'Walk-in Customer' ? selectedOrder.customer_name : null;
        currentDiscount = parseFloat(selectedOrder.discount_percent) || 0;
        currentOrderType = normalizeOrderTypeValue(selectedOrder.order_type || 'walk-in');

        // Update order type toggle
        const orderTypeRadio = document.querySelector(`input[name="orderType"][value="${currentOrderType}"]`);
        if (orderTypeRadio) orderTypeRadio.checked = true;

        // Restore coupon if present
        if (selectedOrder.coupon_code) {
            currentCoupon = {
                code: selectedOrder.coupon_code,
                value: parseFloat(selectedOrder.coupon_value) || 0,
                type: 'fixed', // Simplified for restoration
                label: `${getCurrency()}${parseFloat(selectedOrder.coupon_value).toFixed(2)} Off`
            };
        } else {
            currentCoupon = null;
        }

        // Mark held order as restored
        const staffUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        await heldOrdersDB.edit({
            id: selectedOrder.id,
            status: 'restored',
            restored_at: new Date().toISOString(),
            restored_by: staffUser.id || null
        });

        updateSaleDisplay();
        showModalNotification('Order restored to cart.', 'success', 'Order Restored');
        logStaffActivity('Restored Held Order', selectedOrder.hold_ref, 'Success');

    } catch (err) {
        hideLoadingModal();
        console.error('Failed to restore held order:', err);
        Swal.fire('Error', 'Failed to load held orders. Please try again.', 'error');
    }
}

async function loadMenuItems() {
    const menuGrid = document.getElementById('menuItemsGrid');
    if (!menuGrid) return;

    menuGrid.innerHTML = '<div class="col-12 text-center py-5"><div class="loading-spinner"></div><p class="mt-2">Fetching menu from system...</p></div>';

    showLoadingModal('Loading menu items...');

    try {
        const [menuItems, categories] = await Promise.all([
            menuItemsDB.show(),
            menuCategoriesDB.show()
        ]);

        // Create category lookup map
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.id] = cat.name;
        });

        // Transform DB items to include category_name and filter only active items
        allMenuItems = menuItems
            .filter(item => item.status === 'Active' || item.status === 'active')
            .map(item => {
                // Fix image path - handle both absolute and relative paths
                let imgPath = item.image_path || '';
                if (imgPath.startsWith('/')) {
                    imgPath = imgPath.substring(1); // Remove leading slash
                }
                return {
                    id: item.id,
                    name: item.name,
                    category_id: item.category_id,
                    category: categoryMap[item.category_id] || 'Uncategorized',
                    price: parseFloat(item.price_reference) || 0,
                    image: imgPath || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
                    description: item.description || '',
                    available: true
                };
            });

        displayMenuItems(allMenuItems);
    } catch (err) {
        console.error('Failed to load menu items:', err);
        menuGrid.innerHTML = '<div class="col-12 text-center py-5"><i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i><p class="text-muted">Failed to load menu items</p></div>';
    } finally {
        hideLoadingModal();
    }
}

function displayMenuItems(items) {
    const menuGrid = document.getElementById('menuItemsGrid');
    if (!menuGrid) return;

    if (items.length === 0) {
        menuGrid.innerHTML = '<div class="col-12 text-center py-5"><i class="fas fa-search fa-3x text-muted mb-3"></i><p class="text-muted">No items found matching your filter</p></div>';
        return;
    }

    menuGrid.innerHTML = items.map(item => {
        const imgSrc = item.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';
        return `
            <div class="col-6 col-md-4 col-lg-3 mb-3">
                <div class="menu-item-card" data-id="${item.id}" onclick="addItemToSale(${item.id})">
                    <div class="menu-item-img-container">
                        <img src="${imgSrc}" alt="${item.name}" class="menu-item-img">
                        <div class="price-tag">${getCurrency()}${parseFloat(item.price).toFixed(2)}</div>
                    </div>
                    <div class="p-2 text-center">
                        <div class="fw-bold mb-0 text-truncate" style="font-size:0.85rem">${item.name}</div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function filterMenuItems() {
    const searchTerm = document.getElementById('menuSearch')?.value.toLowerCase() || '';
    const activeTab  = document.querySelector('.btn-category.active');
    const categoryValue = activeTab ? activeTab.getAttribute('data-category') : 'All';

    const filtered = allMenuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryValue === 'All' || 
            item.category_id == categoryValue || 
            item.category === categoryValue;
        return matchesSearch && matchesCategory;
    });
    displayMenuItems(filtered);
}

function addItemToSale(itemId) {
    const product = allMenuItems.find(item => item.id == itemId);
    if (!product) return;

    const existing = currentSaleItems.find(item => item.id == itemId);
    if (existing) {
        existing.quantity += 1;
    } else {
        currentSaleItems.push({ id: product.id, name: product.name, price: product.price, img: product.image, quantity: 1 });
    }

    updateSaleDisplay();

    const card = document.querySelector(`.menu-item-card[data-id="${itemId}"]`);
    if (card) {
        card.classList.add('animate-add');
        setTimeout(() => card.classList.remove('animate-add'), 400);
    }
}

// Get tax rate from system settings (default 12%)
function getTaxRate() {
    return parseFloat(systemSettings.tax_rate) || 12;
}

// Get currency symbol from system settings (default 'P')
function getCurrency() {
    return systemSettings.currency_symbol || 'P';
}

// Format currency with symbol
function formatCurrency(amount) {
    return `${getCurrency()}${parseFloat(amount).toFixed(2)}`;
}

function normalizeOrderTypeValue(value) {
    const normalized = String(value || 'walk-in').trim().toLowerCase().replace(/[_\s]+/g, '-');
    if (normalized === 'dine-in' || normalized === 'dinein') return 'dine-in';
    if (normalized === 'walk-in' || normalized === 'walkin' || normalized === 'dine-out' || normalized === 'dineout' || normalized === 'take-out' || normalized === 'takeout') return 'walk-in';
    return 'walk-in';
}

function getSelectedOrderType() {
    const selectedOrderType = document.querySelector('input[name="orderType"]:checked')?.value;
    currentOrderType = normalizeOrderTypeValue(selectedOrderType || currentOrderType);
    return currentOrderType;
}

function calcTotals() {
    const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
    const grossSubtotal = currentSaleItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    let discountAmount = grossSubtotal * (currentDiscount / 100);
    if (currentCoupon) {
        discountAmount += currentCoupon.type === 'percentage'
            ? grossSubtotal * (currentCoupon.value / 100)
            : currentCoupon.value;
    }

    discountAmount = round2(discountAmount);

    const total = round2(Math.max(0, grossSubtotal - discountAmount));
    const taxRatePercent = getTaxRate();
    const taxRate = taxRatePercent / 100;

    const taxes = taxRate > 0
        ? round2(total - (total / (1 + taxRate)))
        : 0;
    const subtotal = round2(total - taxes);

    return { subtotal, discountAmount, taxes, total, taxRate: taxRatePercent, grossSubtotal };
}

function updateSaleDisplay() {
    const container   = document.getElementById('cartItemsList');
    const subtotalEl  = document.getElementById('cartSubtotal');
    const taxEl       = document.getElementById('cartTaxes');
    const totalEl     = document.getElementById('cartTotal');
    const cartCountEl = document.getElementById('cartCount');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (!container) return;

    const customerDisplay = document.querySelector('.customer-name-display');
    if (customerDisplay) customerDisplay.textContent = currentCustomer || 'Walk-in Customer';

    const currency = getCurrency();
    
    if (currentSaleItems.length === 0) {
        container.innerHTML = `<div class="text-center py-5 empty-cart-msg"><p class="text-muted">No items in cart</p></div>`;
        subtotalEl.textContent = `${currency}0.00`;
        taxEl.textContent      = `${currency}0.00`;
        totalEl.textContent    = `${currency}0.00`;
        cartCountEl.textContent = '0';
        checkoutBtn.disabled   = true;
        return;
    }

    const { subtotal, discountAmount, taxes, total, taxRate } = calcTotals();
    const itemsCount = currentSaleItems.reduce((acc, item) => acc + item.quantity, 0);

    container.innerHTML = currentSaleItems.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-price">${currency}${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div class="qty-controls">
                <button class="btn-qty" onclick="changeQty(${index}, -1)"><i class="fas fa-minus"></i></button>
                <span class="fw-bold mx-1">${item.quantity}</span>
                <button class="btn-qty" onclick="changeQty(${index}, 1)"><i class="fas fa-plus"></i></button>
                <button class="cart-item-remove ms-2" onclick="removeSaleItem(${index})"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`
    ).join('');

    subtotalEl.innerHTML = `${currency}${subtotal.toFixed(2)}` +
        (discountAmount > 0 ? ` <span class="text-danger small">(-${currency}${discountAmount.toFixed(2)})</span>` : '');
    taxEl.textContent       = `${currency}${taxes.toFixed(2)}`;
    totalEl.textContent     = `${currency}${total.toFixed(2)}`;
    cartCountEl.textContent = itemsCount;
    checkoutBtn.disabled    = false;
    
    // Update tax label with current rate
    const taxLabel = document.querySelector('#cartTaxes')?.closest('.d-flex')?.querySelector('.text-muted');
    if (taxLabel) taxLabel.textContent = `Taxes (${taxRate}%)`;
}

function changeQty(index, delta) {
    currentSaleItems[index].quantity += delta;
    if (currentSaleItems[index].quantity <= 0) currentSaleItems.splice(index, 1);
    updateSaleDisplay();
}

function removeSaleItem(index) {
    currentSaleItems.splice(index, 1);
    updateSaleDisplay();
}

function clearCurrentSale() {
    currentSaleItems = [];
    currentCustomer  = null;
    currentDiscount  = 0;
    currentCoupon    = null;
    currentOrderType = 'walk-in';
    
    // Reset order type toggle
    const walkInRadio = document.getElementById('orderTypeWalkIn');
    if (walkInRadio) walkInRadio.checked = true;
    
    updateSaleDisplay();
}

function processCheckout() {
    if (currentSaleItems.length === 0) return;

    const { subtotal, discountAmount, taxes, total } = calcTotals();
    const selectedOrderType = getSelectedOrderType();

    Swal.fire({
        title: 'Confirm Checkout',
        html: `
            <div class="text-start">
                <p><strong>Customer:</strong> ${currentCustomer || 'Walk-in Customer'}</p>
                <p><strong>Order Type:</strong> ${selectedOrderType === 'dine-in' ? 'Dine-in' : 'Walk-in'}</p>
                <p><strong>Items:</strong> ${currentSaleItems.length}</p>
                <hr>
                <p class="h4 text-center"><strong>Total: ${getCurrency()}${total.toFixed(2)}</strong></p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#800000',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Confirm & Complete'
    }).then(result => {
        if (result.isConfirmed) recordSale();
    });
}

async function recordSale() {
    const { subtotal, discountAmount, taxes, total, taxRate } = calcTotals();
    const selectedOrderType = getSelectedOrderType();
    const staffUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const receiptNo = 'SALE-' + Date.now();

    showLoadingModal('Processing transaction...');

    try {
        // Create sale record in database
        const saleData = {
            receipt_no: receiptNo,
            sale_datetime: new Date().toISOString(),
            staff_id: staffUser.id || null,
            total_items: currentSaleItems.reduce((acc, item) => acc + item.quantity, 0),
            total_amount: total,
            subtotal: subtotal,
            discount_amount: discountAmount,
            discount_percent: currentDiscount,
            coupon_code: currentCoupon?.code || null,
            coupon_value: currentCoupon?.value || 0,
            taxes: taxes,
            customer_name: currentCustomer || 'Walk-in Customer',
            order_type: selectedOrderType,
            status: 'completed',
            created_at: new Date().toISOString()
        };

        const saleResult = await salesDB.add(saleData);
        
        if (saleResult.error) {
            hideLoadingModal();
            Swal.fire('Error', saleResult.error, 'error');
            return;
        }

        // Get the sale ID from result - handle different response structures
        const saleId = saleResult.data?.[0]?.id || saleResult.id || saleResult[0]?.id;

        // Save sale items if we have a sale ID
        if (saleId) {
            for (const item of currentSaleItems) {
                const itemCategory = allMenuItems.find(m => m.id === item.id)?.category || 'Uncategorized';
                await saleItemsDB.add({
                    sale_id: saleId,
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    item_name: item.name,
                    category_name: itemCategory
                });
            }

            // Deduct ingredients from inventory based on recipes
            await deductIngredients(currentSaleItems);
        }

        hideLoadingModal();

        logStaffActivity('Recorded Sale', `${receiptNo} - Total: ${getCurrency()}${total.toFixed(2)} - Customer: ${saleData.customer_name}`, 'Success');

        // Create notification for successful payment
        await createNotification(
            staffUser.id || 1,
            'payment',
            'sales',
            saleId,
            `Payment completed: ${receiptNo} - ${getCurrency()}${total.toFixed(2)} (${saleData.customer_name})`
        );

        // Show receipt modal with print option
        showReceiptModal({
            receiptNo,
            saleDateTime: new Date().toLocaleString(),
            customer: currentCustomer || 'Walk-in Customer',
            orderType: selectedOrderType,
            items: [...currentSaleItems],
            subtotal,
            discountAmount,
            taxes,
            total,
            taxRate,
            staff: staffUser.full_name || 'Staff'
        });

    } catch (err) {
        hideLoadingModal();
        console.error('Failed to record sale:', err);
        Swal.fire('Error', 'Failed to process transaction. Please try again.', 'error');
    }
}

// Deduct ingredients from inventory based on recipes
async function deductIngredients(saleItems) {
    try {
        for (const item of saleItems) {
            // Get recipes for this menu item
            const recipes = await recipesDB.show({ menu_item_id: item.id });
            
            for (const recipe of recipes) {
                const ingredient = allIngredients.find(i => i.id === recipe.ingredient_id);
                if (!ingredient) continue;

                const deductQty = (parseFloat(recipe.qty_per_sale) || 0) * item.quantity;
                const newQty = Math.max(0, ingredient.quantity - deductQty);

                // Update ingredient quantity
                await ingredientsDB.edit({
                    id: recipe.ingredient_id,
                    current_quantity: newQty,
                    updated_at: new Date().toISOString()
                });

                // Log inventory transaction
                const staffUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
                await inventoryTransactionsDB.add({
                    ingredient_id: recipe.ingredient_id,
                    change_qty: -deductQty,
                    transaction_type: 'Sale Deduction',
                    reason: `Sold ${item.quantity}x ${item.name}`,
                    performed_by: staffUser.id || null,
                    prev_qty: ingredient.quantity,
                    new_qty: newQty,
                    timestamp: new Date().toISOString()
                });

                // Check for low stock and create notification
                const threshold = parseFloat(ingredient.low_stock_threshold) || 0;
                if (newQty <= threshold && newQty > 0) {
                    await createNotification(
                        staffUser.id || 1,
                        'low_stock',
                        'ingredients',
                        recipe.ingredient_id,
                        `Low stock alert: ${ingredient.name} is at ${newQty} ${ingredient.unit || 'units'} (threshold: ${threshold})`
                    );
                } else if (newQty === 0) {
                    await createNotification(
                        staffUser.id || 1,
                        'out_of_stock',
                        'ingredients',
                        recipe.ingredient_id,
                        `Out of stock: ${ingredient.name} is now depleted!`
                    );
                }
            }
        }
    } catch (err) {
        console.error('Failed to deduct ingredients:', err);
    }
}

// Show receipt modal with print option
const RECEIPT_PAPER_TYPE = 'THERMAL_80MM';

function getReceiptPaperConfig() {
    switch (RECEIPT_PAPER_TYPE) {
        case 'THERMAL_58MM':
            return {
                pageWidth: '58mm',
                pageHeight: '200mm',
                contentWidth: '52mm',
                printPadding: '2mm',
                fontSize: '11px'
            };
        case 'A4':
            return {
                pageWidth: '210mm',
                pageHeight: '297mm',
                contentWidth: '180mm',
                printPadding: '10mm',
                fontSize: '12px'
            };
        case 'THERMAL_80MM':
        default:
            return {
                pageWidth: '80mm',
                pageHeight: '220mm',
                contentWidth: '72mm',
                printPadding: '2mm',
                fontSize: '12px'
            };
    }
}

function getReceiptPrintStyles() {
    const paper = getReceiptPaperConfig();
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
            width: ${paper.pageWidth};
            max-width: ${paper.pageWidth};
        }
        body {
            font-family: 'Courier New', Courier, monospace;
            margin: 0;
            padding: 0;
            font-size: ${paper.fontSize};
            line-height: 1.4;
            background: #fff;
        }
        #receiptContent {
            width: ${paper.contentWidth} !important;
            max-width: ${paper.contentWidth} !important;
            margin: 0 auto !important;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 2px 0; vertical-align: top; }
        .text-center { text-align: center; }
        .text-end, .text-right { text-align: right; }
        .text-start, .text-left { text-align: left; }
        .d-flex { display: flex; }
        .justify-content-between { justify-content: space-between; }
        .fw-bold, strong { font-weight: bold; }
        .text-muted { color: #666; }
        .text-danger { color: #dc3545; }
        hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
        .mb-0 { margin-bottom: 0; }
        .mb-1 { margin-bottom: 2px; }
        .mb-2 { margin-bottom: 5px; }
        .mb-3 { margin-bottom: 8px; }
        .mt-3 { margin-top: 8px; }
        small { font-size: 10px; }
        h5 { font-size: 16px; margin-bottom: 3px; }

        @media print {
            @page {
                size: ${paper.pageWidth} ${paper.pageHeight};
                margin: 0;
            }
            html, body {
                width: ${paper.pageWidth};
                max-width: ${paper.pageWidth};
            }
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0;
                padding: ${paper.printPadding};
            }
        }
    `;
}

function buildBaseReceiptHtml(data) {
    const {
        receiptNo,
        saleDateTime,
        customer,
        orderType,
        items,
        subtotal,
        discountAmount,
        taxes,
        total,
        staff,
        taxRate
    } = data;

    const currency = getCurrency();
    const displayTaxRate = taxRate || getTaxRate();
    const paper = getReceiptPaperConfig();

    const itemsHtml = (Array.isArray(items) ? items : []).map(item => {
        const quantity = parseInt(item.quantity) || 1;
        const itemSubtotal = parseFloat(item.subtotal);
        const lineAmount = Number.isFinite(itemSubtotal)
            ? itemSubtotal
            : (parseFloat(item.price) || 0) * quantity;
        const itemCategory = item.category || allMenuItems.find(m => m.id === item.id)?.category || '';

        return `
            <tr>
                <td>${item.name || 'Unknown Item'}${itemCategory ? `<br><small class="text-muted">${itemCategory}</small>` : ''}</td>
                <td class="text-center">${quantity}</td>
                <td class="text-end">${currency}${lineAmount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    return `
        <div id="receiptContent" style="font-family: 'Courier New', monospace; width: ${paper.contentWidth}; max-width: ${paper.contentWidth}; margin: 0 auto; padding: 3mm 2.5mm; border: 1px dashed #000; line-height: 1.35;">
            <div class="text-center mb-3">
                <h5 class="mb-1"><strong>ETHAN'S CAFE</strong></h5>
                <small>Receipt #${receiptNo}</small><br>
                <small>${saleDateTime}</small>
            </div>
            <div class="mb-2">
                <small><strong>Customer:</strong> ${customer}</small><br>
                <small><strong>Order Type:</strong> ${orderType === 'dine-in' ? 'Dine-in' : 'Walk-in'}</small><br>
                <small><strong>Staff:</strong> ${staff}</small>
            </div>
            <hr style="border-style: dashed;">
            <table class="w-100" style="font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th class="text-start">Item</th>
                        <th class="text-center">Qty</th>
                        <th class="text-end">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <hr style="border-style: dashed;">
            <div style="font-size: 0.85rem;">
                <div class="d-flex justify-content-between">
                    <span>Subtotal:</span>
                    <span>${currency}${(parseFloat(subtotal) || 0).toFixed(2)}</span>
                </div>
                ${(parseFloat(discountAmount) || 0) > 0 ? `
                <div class="d-flex justify-content-between text-danger">
                    <span>Discount:</span>
                    <span>-${currency}${(parseFloat(discountAmount) || 0).toFixed(2)}</span>
                </div>` : ''}
                <div class="d-flex justify-content-between">
                    <span>Tax (${displayTaxRate}%):</span>
                    <span>${currency}${(parseFloat(taxes) || 0).toFixed(2)}</span>
                </div>
                <hr style="border-style: dashed;">
                <div class="d-flex justify-content-between fw-bold" style="font-size: 1.1rem;">
                    <span>TOTAL:</span>
                    <span>${currency}${(parseFloat(total) || 0).toFixed(2)}</span>
                </div>
            </div>
            <div class="text-center mt-3" style="border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 8px 0; margin: 10px 0;">
                <strong>✂ - - - CUT HERE - - - ✂</strong>
            </div>
            <div class="text-center" style="font-size: 0.75rem;">
                <p class="mb-1"><strong>KITCHEN COPY</strong></p>
                <p class="mb-1">Order #${String(receiptNo).replace('SALE-', '')}</p>
                <p class="mb-0">${orderType === 'dine-in' ? '🪑 DINE-IN' : '🚶 WALK-IN'}</p>
                ${(Array.isArray(items) ? items : []).map(item => `<p class="mb-0">${parseInt(item.quantity) || 1}x ${item.name || 'Unknown Item'}</p>`).join('')}
            </div>
            <div class="text-center mt-3">
                <small>Thank you for dining with us!</small>
            </div>
        </div>
    `;
}

function showReceiptModal(receiptData) {
    // Immediately print the receipt and clear the sale
    const receiptHtml = buildBaseReceiptHtml(receiptData);

    // Print the receipt immediately
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = receiptHtml;
    document.body.appendChild(tempDiv);
    printReceiptFromElement(tempDiv.querySelector('#receiptContent'));
    document.body.removeChild(tempDiv);
    clearCurrentSale();
}

// ─── Printer Detection & Print Functions ───────────────────────────────────────

/**
 * Check if printing is available
 * Note: Browser APIs cannot detect specific printers or paper status
 * For thermal printers, you would need a local print server or desktop app
 */
async function checkPrinterStatus() {
    // Check if print API is available
    if (!window.print) {
        return { available: false, message: 'Printing not supported in this browser' };
    }
    
    // Check for any connected printers using experimental API (Chrome only)
    // Note: This requires user gesture and may not be available in all browsers
    try {
        // Try to get printer info using the experimental API
        if ('queryLocalFonts' in window) {
            // Browser supports some advanced APIs, likely has print support
        }
    } catch (e) {
        console.log('Cannot detect printers:', e);
    }
    
    return { available: true, message: 'Print ready' };
}

/**
 * Print receipt using inline printing (most reliable method)
 * Opens Chrome's native print dialog with status feedback
 */
function printReceipt() {
    const receiptContent = document.getElementById('receiptContent');
    if (!receiptContent) {
        Swal.fire({
            icon: 'error',
            title: 'No Receipt',
            text: 'No receipt content found to print.',
            confirmButtonColor: '#800000'
        }).then(() => {
            window.location.href = 'staff-receipts.html';
        });
        return;
    }

    // Try to print directly
    attemptPrint(receiptContent);
}

/**
 * Attempt to print and show appropriate status
 */
function attemptPrint(receiptContent) {
    // Check if print is available
    if (!window.print) {
        showNoPrinterModal('Browser does not support printing');
        return;
    }

    // Create a hidden iframe for printing (avoids popup blockers)
    let printFrame = document.getElementById('printFrame');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'printFrame';
        printFrame.name = 'printFrame';
        printFrame.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;border:0;';
        document.body.appendChild(printFrame);
    }

    try {
        const printDocument = printFrame.contentWindow || printFrame.contentDocument;
        const doc = printDocument.document || printDocument;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - Ethan's Cafe</title>
                <style>
                    ${getReceiptPrintStyles()}
                </style>
            </head>
            <body>
                ${receiptContent.outerHTML}
            </body>
            </html>
        `);
        doc.close();

        // Wait for content to render then print
        setTimeout(() => {
            try {
                // Open print dialog directly
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                // Optionally, log print event
                logStaffActivity('Print Receipt', 'Receipt printed', 'Success');
            } catch (err) {
                console.error('Print failed:', err);
                showNoPrinterModal(err.message);
            }
        }, 300);
        
    } catch (err) {
        console.error('Print setup failed:', err);
        showNoPrinterModal(err.message);
    }
}

/**
 * Show no printer modal and redirect to receipts
 */
function showNoPrinterModal(errorMsg) {
    Swal.fire({
        icon: 'error',
        title: 'No Printer',
        html: `
            <div class="text-center">
                <i class="fas fa-print fa-3x text-danger mb-3"></i>
                <p class="fw-bold text-danger">No printer detected or printing failed</p>
                <p class="text-muted small">${errorMsg || 'Please check your printer connection'}</p>
                <hr>
                <p class="small">Transaction has been saved. You can print from the Receipts page later.</p>
            </div>
        `,
        confirmButtonText: 'Go to Receipts',
        confirmButtonColor: '#800000',
        allowOutsideClick: false
    }).then(() => {
        window.location.href = 'staff-receipts.html';
    });
    logStaffActivity('Print Receipt', 'Print failed: ' + (errorMsg || 'No printer'), 'Failed');
}

/**
 * Print receipt from an element (for auto-print feature)
 * Uses the same iframe method for reliability
 */
function printReceiptFromElement(element) {
    if (!element) {
        console.error('No element provided for printing');
        return;
    }

    // Create a hidden iframe for printing
    let printFrame = document.getElementById('printFrame');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'printFrame';
        printFrame.name = 'printFrame';
        printFrame.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;border:0;';
        document.body.appendChild(printFrame);
    }

    const printDocument = printFrame.contentWindow || printFrame.contentDocument;
    const doc = printDocument.document || printDocument;

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - Ethan's Cafe</title>
            <style>
                ${getReceiptPrintStyles()}
            </style>
        </head>
        <body>
            ${element.outerHTML}
        </body>
        </html>
    `);
    doc.close();

    // Print after content loads
    setTimeout(() => {
        try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        } catch (err) {
            console.error('Auto-print failed:', err);
        }
    }, 250);
}

/**
 * Show printer setup/test dialog
 */
function showPrinterSetup() {
    Swal.fire({
        title: '<i class="fas fa-print me-2"></i>Printer Setup',
        html: `
            <div class="text-start">
                <div class="alert alert-info mb-3">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Printer Status Check</strong>
                </div>
                
                <div id="printerStatusCheck" class="mb-3">
                    <p><i class="fas fa-spinner fa-spin me-2"></i>Checking printer...</p>
                </div>
                
                <hr>
                
                <h6 class="mb-2">Recommended Settings:</h6>
                <ul class="small text-muted">
                    <li>Paper size: 80mm (for thermal printers)</li>
                    <li>Margins: None or Minimum</li>
                    <li>Scale: 100%</li>
                    <li>Background graphics: ON</li>
                </ul>
                
                <hr>
                
                <h6 class="mb-2">Print a Test Receipt:</h6>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="printTestReceipt()">
                    <i class="fas fa-print me-2"></i>Print Test
                </button>
                
                <hr class="mt-3">
                
                <div class="alert alert-warning small mb-0">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Note:</strong> Detecting paper status requires a dedicated thermal printer driver or POS software. 
                    Web browsers cannot detect paper levels.
                </div>
            </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Close',
        confirmButtonColor: '#800000',
        width: 500,
        didOpen: async () => {
            // Check printer status
            const status = await checkPrinterStatus();
            const statusDiv = document.getElementById('printerStatusCheck');
            if (statusDiv) {
                if (status.available) {
                    statusDiv.innerHTML = `
                        <p class="text-success mb-1">
                            <i class="fas fa-check-circle me-2"></i>
                            <strong>Print Service Available</strong>
                        </p>
                        <p class="small text-muted mb-0">
                            Click "Print Test" below to verify your printer is working.
                        </p>
                    `;
                } else {
                    statusDiv.innerHTML = `
                        <p class="text-danger mb-1">
                            <i class="fas fa-times-circle me-2"></i>
                            <strong>${status.message}</strong>
                        </p>
                    `;
                }
            }
        }
    });
}

/**
 * Print a test receipt to verify printer setup
 */
function printTestReceipt() {
    const testHtml = `
        <div style="font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 15px; border: 1px dashed #000;">
            <div class="text-center mb-3">
                <h5 class="mb-1"><strong>ETHAN'S CAFE</strong></h5>
                <small>*** PRINTER TEST ***</small><br>
                <small>${new Date().toLocaleString()}</small>
            </div>
            
            <hr style="border-style: dashed;">
            
            <div style="font-size: 0.85rem;">
                <p><strong>Test Line 1:</strong> ABCDEFGHIJKLMNOP</p>
                <p><strong>Test Line 2:</strong> 1234567890</p>
                <p><strong>Test Line 3:</strong> !@#$%^&*()</p>
            </div>
            
            <hr style="border-style: dashed;">
            
            <div class="d-flex justify-content-between fw-bold">
                <span>TOTAL:</span>
                <span>${getCurrency()}123.45</span>
            </div>
            
            <hr style="border-style: dashed;">
            
            <div class="text-center">
                <small>If you can read this, your printer is working!</small>
            </div>
        </div>
    `;
    
    // Create temporary element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = testHtml;
    document.body.appendChild(tempDiv);
    
    // Print it
    printReceiptFromElement(tempDiv);
    
    // Remove temp element after a delay
    setTimeout(() => {
        document.body.removeChild(tempDiv);
    }, 1000);
    
    // Close the setup dialog
    Swal.close();
}

// Sync menu when admin makes changes
window.addEventListener('storage', e => {
    if (e.key === 'adminMenuItems') loadMenuItems();
});

// ─── Ingredients ──────────────────────────────────────────────────────────────

function initializeIngredientsFunctionality() {
    document.getElementById('ingredientSearch')?.addEventListener('input', filterIngredients);
    document.getElementById('ingredientCategoryFilter')?.addEventListener('change', filterIngredients);
    
    // Save update button listener
    const saveBtn = document.getElementById('confirmQuantityUpdate');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveIngredientUpdate);
    }
    
    loadIngredients();
}

async function loadIngredients() {
    const tableElem = document.getElementById('ingredientsListTable') || document.getElementById('ingredientsTable');
    if (!tableElem) return;

    const tbody = tableElem.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading ingredients...</td></tr>';

    showLoadingModal('Loading ingredients...');

    try {
        // Fetch ingredients, categories, and units from database
        const [ingredients, categories, units] = await Promise.all([
            ingredientsDB.show(),
            ingredientCategoriesDB.show(),
            unitsDB.show()
        ]);

        // Create lookup maps
        const categoryMap = {};
        categories.forEach(cat => { categoryMap[cat.id] = cat.name; });

        const unitMap = {};
        units.forEach(unit => { unitMap[unit.id] = unit.abbreviation || unit.name; });

        // Get system default for low stock threshold
        const defaultLowStockThreshold = parseFloat(systemSettings.low_stock_threshold) || 10;
        const expiryWarningDays = parseInt(systemSettings.expiry_warning_days) || 7;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const warningDate = new Date(today.getTime() + (expiryWarningDays * 24 * 60 * 60 * 1000));

        // Map ingredients with proper display info
        allIngredients = ingredients.map(ing => {
            const qty = parseFloat(ing.current_quantity) || 0;
            // Use ingredient's own threshold, or fall back to system default
            const threshold = ing.low_stock_threshold !== null && ing.low_stock_threshold !== undefined 
                ? parseFloat(ing.low_stock_threshold) 
                : defaultLowStockThreshold;
            
            let status = qty <= threshold ? 'Low' : 'Normal';
            let expiryStatus = null;
            let daysUntilExpiry = null;
            
            // Check expiry date
            if (ing.expiry_date) {
                const expiryDate = new Date(ing.expiry_date);
                expiryDate.setHours(0, 0, 0, 0);
                
                if (expiryDate < today) {
                    expiryStatus = 'expired';
                    daysUntilExpiry = Math.floor((today - expiryDate) / (1000 * 60 * 60 * 24)) * -1;
                } else if (expiryDate <= warningDate) {
                    expiryStatus = 'expiring';
                    daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
                }
            }

            return {
                id: ing.id,
                name: ing.name,
                category: categoryMap[ing.category_id] || 'Uncategorized',
                category_id: ing.category_id,
                quantity: qty,
                unit: unitMap[ing.unit_id] || '',
                unit_id: ing.unit_id,
                status: status,
                minLevel: threshold,
                expiry_date: ing.expiry_date,
                expiryStatus: expiryStatus,
                daysUntilExpiry: daysUntilExpiry
            };
        });

        displayIngredients(allIngredients);
        populateCategoryFilter(categories);
        
        // Check for alerts and send email notifications (once per session)
        if (!sessionStorage.getItem('inventoryAlertsChecked')) {
            sessionStorage.setItem('inventoryAlertsChecked', 'true');
            checkAndNotifyInventoryAlerts();
        }

    } catch (error) {
        console.error('Failed to load ingredients:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Failed to load ingredients</td></tr>';
    } finally {
        hideLoadingModal();
    }
}

/**
 * Populate the category filter dropdown with database categories
 */
function populateCategoryFilter(categories) {
    const filterSelect = document.getElementById('ingredientCategoryFilter');
    if (!filterSelect) return;

    // Keep the "All Categories" option
    filterSelect.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        filterSelect.appendChild(option);
    });
}

function displayIngredients(ingredients) {
    const tableElem = document.getElementById('ingredientsListTable') || document.getElementById('ingredientsTable');
    if (!tableElem) return;

    const tbody = tableElem.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = ingredients.map(ing => {
        // Determine row class based on status
        let rowClass = '';
        if (ing.expiryStatus === 'expired') {
            rowClass = 'table-danger';
        } else if (ing.status === 'Low' || ing.expiryStatus === 'expiring') {
            rowClass = 'table-warning';
        }
        
        // Build expiry badge if applicable
        let expiryBadge = '';
        if (ing.expiryStatus === 'expired') {
            expiryBadge = `<span class="badge bg-danger ms-1" title="Expired ${Math.abs(ing.daysUntilExpiry)} days ago"><i class="fas fa-skull-crossbones me-1"></i>EXPIRED</span>`;
        } else if (ing.expiryStatus === 'expiring') {
            expiryBadge = `<span class="badge bg-warning text-dark ms-1" title="Expires in ${ing.daysUntilExpiry} days"><i class="fas fa-clock me-1"></i>${ing.daysUntilExpiry}d</span>`;
        }
        
        return `
        <tr class="${rowClass}">
            <td>
                <strong>${ing.name}</strong>
                ${expiryBadge}
            </td>
            <td><span class="badge bg-secondary">${ing.category}</span></td>
            <td>
                <span class="fw-bold ${ing.status === 'Low' ? 'text-danger' : 'text-success'}">${ing.quantity}</span> 
                <small class="text-muted">${ing.unit}</small>
            </td>
            <td><small class="text-muted">${ing.minLevel ?? '-'} ${ing.unit}</small></td>
            <td>
                <span class="badge ${ing.status === 'Normal' ? 'bg-success' : 'bg-warning text-dark'}">
                    <i class="fas ${ing.status === 'Normal' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-1"></i>${ing.status}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-success" onclick="showRestockModal(${ing.id})" title="Restock">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-warning text-dark" onclick="showUsageModal(${ing.id})" title="Record Usage">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="showIngredientHistory(${ing.id})" title="View History">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Update total count if element exists
    const totalCount = document.getElementById('ingredientsTotalCount');
    if (totalCount) {
        totalCount.textContent = `${ingredients.length} ingredients`;
    }
}

// Track currently editing ingredient
let currentEditingIngredient = null;
let currentUpdateType = 'restock'; // 'restock' or 'usage'

/**
 * Show modal for restocking (adding) inventory
 */
function showRestockModal(id) {
    currentUpdateType = 'restock';
    showUpdateModal(id, 'restock');
}

/**
 * Show modal for recording usage (removing) inventory
 */
function showUsageModal(id) {
    currentUpdateType = 'usage';
    showUpdateModal(id, 'usage');
}

/**
 * Show ingredient transaction history
 */
async function showIngredientHistory(id) {
    const ingredient = allIngredients.find(ing => ing.id === id);
    if (!ingredient) return;

    try {
        // Fetch transactions for this ingredient
        const transactions = await inventoryTransactionsDB.show({ ingredient_id: id });
        
        let historyHtml = '';
        if (transactions && transactions.length > 0) {
            historyHtml = transactions.slice(-10).reverse().map(t => {
                const isPositive = parseFloat(t.change_qty) > 0;
                const date = new Date(t.timestamp).toLocaleDateString();
                const time = new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return `
                    <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                        <div>
                            <span class="badge ${isPositive ? 'bg-success' : 'bg-danger'} me-2">
                                ${isPositive ? '+' : ''}${t.change_qty}
                            </span>
                            <small class="text-muted">${t.reason || t.transaction_type}</small>
                        </div>
                        <small class="text-muted">${date} ${time}</small>
                    </div>
                `;
            }).join('');
        } else {
            historyHtml = '<p class="text-muted text-center py-3">No transaction history</p>';
        }

        // Use SweetAlert2 to show history
        Swal.fire({
            title: `<i class="fas fa-history me-2"></i>${ingredient.name}`,
            html: `
                <div class="text-start">
                    <p class="mb-2">
                        <strong>Current Stock:</strong> ${ingredient.quantity} ${ingredient.unit}<br>
                        <strong>Min Level:</strong> ${ingredient.minLevel} ${ingredient.unit}
                    </p>
                    <hr>
                    <h6>Recent Transactions:</h6>
                    <div style="max-height: 250px; overflow-y: auto;">
                        ${historyHtml}
                    </div>
                </div>
            `,
            width: 500,
            showCloseButton: true,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Failed to load history:', error);
        showModalNotification('Failed to load transaction history', 'error', 'Error');
    }
}

function showUpdateModal(id, type = 'restock') {
    const modalEl = document.getElementById('updateQuantityModal') || document.getElementById('increaseQuantityModal');
    if (!modalEl) return;

    // Find the ingredient from our loaded data
    const ingredient = allIngredients.find(ing => ing.id === id);
    if (!ingredient) {
        console.error('Ingredient not found:', id);
        return;
    }

    currentEditingIngredient = ingredient;
    currentUpdateType = type;

    // Populate modal with ingredient data
    const nameEl = document.getElementById('updateIngName');
    const currentStockEl = document.getElementById('currentStockDisplay');
    const unitEl = document.getElementById('stockUnitDisplay');
    const amountInput = document.getElementById('updateAmount');
    const unitTextEl = document.querySelector('.unit-text');

    if (nameEl) nameEl.textContent = ingredient.name;
    if (currentStockEl) currentStockEl.textContent = ingredient.quantity;
    if (unitEl) unitEl.textContent = ingredient.unit;
    if (unitTextEl) unitTextEl.textContent = ingredient.unit;
    if (amountInput) amountInput.value = '1.00';

    // Set the correct radio button based on type
    const increaseRadio = document.getElementById('increase');
    const decreaseRadio = document.getElementById('decrease');
    
    if (type === 'restock' && increaseRadio) {
        increaseRadio.checked = true;
    } else if (type === 'usage' && decreaseRadio) {
        decreaseRadio.checked = true;
    }

    // Update modal title based on type
    const modalTitle = modalEl.querySelector('.modal-title');
    if (modalTitle) {
        if (type === 'restock') {
            modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Restock Inventory';
        } else {
            modalTitle.innerHTML = '<i class="fas fa-minus-circle me-2"></i>Record Usage';
        }
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/**
 * Save updated ingredient quantity to database
 */
async function saveIngredientUpdate() {
    if (!currentEditingIngredient) {
        showModalNotification('No ingredient selected', 'warning', 'Error');
        return;
    }

    const quantityInput = document.getElementById('updateAmount');
    const changeQty = parseFloat(quantityInput?.value) || 0;

    if (changeQty <= 0) {
        showModalNotification('Please enter a valid quantity', 'warning', 'Validation Error');
        return;
    }

    const isIncrease = document.getElementById('increase')?.checked;
    const reason = document.getElementById('updateReason')?.value || 'Manual adjustment';
    const prevQty = currentEditingIngredient.quantity;
    const newQty = isIncrease ? prevQty + changeQty : prevQty - changeQty;

    if (newQty < 0) {
        showModalNotification('Cannot reduce below zero', 'warning', 'Validation Error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('confirmQuantityUpdate');
    const originalText = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
    }

    try {
        // Update ingredient in database
        await ingredientsDB.edit({
            id: currentEditingIngredient.id,
            current_quantity: newQty,
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });

        // Log the transaction
        const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        await inventoryTransactionsDB.add({
            ingredient_id: currentEditingIngredient.id,
            change_qty: isIncrease ? changeQty : -changeQty,
            transaction_type: isIncrease ? 'restock' : 'usage',
            reason: reason,
            performed_by: user.id || null,
            prev_qty: prevQty,
            new_qty: newQty,
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });

        // Create notification for admin
        const actionType = isIncrease ? 'restock' : 'usage';
        const description = `${isIncrease ? 'Restocked' : 'Used'} ${currentEditingIngredient.name}: ${isIncrease ? '+' : '-'}${changeQty} ${currentEditingIngredient.unit} (${prevQty} → ${newQty})`;
        await createNotification(user.id, actionType, 'ingredients', currentEditingIngredient.id, description, reason);

        // Close modal
        const modalEl = document.getElementById('updateQuantityModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        showModalNotification(
            `${currentEditingIngredient.name} updated: ${prevQty} → ${newQty} ${currentEditingIngredient.unit}`,
            'success',
            'Stock Updated'
        );

        // Log activity
        logStaffActivity('inventory', `Updated ${currentEditingIngredient.name}: ${isIncrease ? '+' : '-'}${changeQty} ${currentEditingIngredient.unit} (${reason})`);

        // Reload ingredients
        loadIngredients();

    } catch (error) {
        console.error('Failed to update ingredient:', error);
        showModalNotification('Failed to update stock: ' + error.message, 'error', 'Update Error');
    } finally {
        // Restore button state
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText || 'Save Update';
        }
    }
}

function filterIngredients() {
    const searchTerm = document.getElementById('ingredientSearch')?.value.toLowerCase() || '';
    const category   = document.getElementById('ingredientCategoryFilter')?.value || '';

    const filtered = allIngredients.filter(ing =>
        ing.name.toLowerCase().includes(searchTerm) &&
        (category === '' || ing.category === category)
    );
    displayIngredients(filtered);
}

// ─── Receipts ─────────────────────────────────────────────────────────────────
let allSales = [];
let currentSelectedSale = null;

function initializeReceiptsFunctionality() {
    // Load system settings for refund/void rules
    loadSystemSettings();
    
    // Load receipts list (for staff-receipts.html)
    if (document.getElementById('receiptsList')) {
        loadReceiptsList();
        
        // Filter button
        document.getElementById('filterReceipts')?.addEventListener('click', filterReceipts);
        
        // Set default dates
        const dateFrom = document.getElementById('receiptDateFrom');
        const dateTo = document.getElementById('receiptDateTo');
        if (dateFrom && dateTo) {
            const today = new Date().toISOString().split('T')[0];
            dateFrom.value = today;
            dateTo.value = today;
        }
        
        // Print receipt button
        document.getElementById('printReceiptBtn')?.addEventListener('click', printSelectedReceipt);
        
        // Initialize refund/void modal (action buttons are per-row in table)
        initializeTransactionEditModal();
    }
    
    // Load recent receipts sidebar (for dashboard)
    loadRecentReceipts();
}

async function loadReceiptsList() {
    const container = document.getElementById('receiptsList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-maroon" role="status"></div>
            <p class="mt-2 text-muted">Loading transactions...</p>
        </div>
    `;
    
    try {
        // Load from database
        const dbSales = await salesDB.show();
        const saleItems = await saleItemsDB.show();
        const menuItems = await menuItemsDB.show();
        
        // Map sale items to sales
        allSales = (Array.isArray(dbSales) ? dbSales : []).map(sale => {
            const saleId = parseInt(sale.id);
            const matchedItems = saleItems.filter(si => parseInt(si.sale_id) === saleId);
            
            const items = matchedItems.map(si => {
                const menuItemId = parseInt(si.menu_item_id);
                const menuItem = menuItems.find(mi => parseInt(mi.id) === menuItemId);
                return {
                    name: si.item_name || menuItem?.name || 'Unknown Item',
                    quantity: si.quantity,
                    price: parseFloat(si.unit_price) || 0,
                    subtotal: (parseFloat(si.unit_price) || 0) * (parseInt(si.quantity) || 1)
                };
            });
            
            const saleDate = new Date(sale.sale_datetime || sale.created_at);
            return {
                id: sale.id,
                receipt_no: sale.receipt_no || `SALE-${sale.id}`,
                date: saleDate.toLocaleDateString(),
                time: saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: saleDate.getTime(),
                sale_datetime: sale.sale_datetime || sale.created_at,
                total: parseFloat(sale.total_amount),
                subtotal: parseFloat(sale.subtotal) || 0,
                taxes: parseFloat(sale.taxes) || 0,
                discount_amount: parseFloat(sale.discount_amount) || 0,
                customer_name: sale.customer_name || 'Walk-in Customer',
                order_type: sale.order_type || 'walk-in',
                staff: sale.staff_name || 'Staff',
                items: items,
                status: sale.status || 'completed',
                adjusted_total: sale.adjusted_total ? parseFloat(sale.adjusted_total) : null,
                adjustment_reason: sale.adjustment_reason
            };
        });
        
        // Also load from localStorage as fallback
        const localSales = JSON.parse(localStorage.getItem('sales') || '[]');
        localSales.forEach(ls => {
            if (!allSales.find(s => s.id === ls.id)) {
                allSales.push(ls);
            }
        });
        
        displayReceipts(allSales);
    } catch (error) {
        console.error('Failed to load receipts:', error);
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-danger">
                    <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
                    <p class="mb-0">Failed to load transactions</p>
                </td>
            </tr>
        `;
    }
}

function displayReceipts(sales) {
    const container = document.getElementById('receiptsList');
    if (!container) return;
    
    if (sales.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-receipt fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">No transactions found</p>
                </td>
            </tr>
        `;
        updateDeleteButtonsState();
        return;
    }
    
    // Sort by date descending
    const sorted = [...sales].sort((a, b) => b.timestamp - a.timestamp);
    
    container.innerHTML = sorted.map(sale => {
        let statusBadge = '<span class="badge bg-success">Completed</span>';
        let rowClass = '';
        let totalClass = '';
        
        if (sale.status === 'voided') {
            statusBadge = '<span class="badge bg-dark">VOIDED</span>';
            rowClass = 'table-secondary';
            totalClass = 'text-decoration-line-through text-muted';
        } else if (sale.status === 'refunded') {
            statusBadge = '<span class="badge bg-warning text-dark">REFUNDED</span>';
            rowClass = 'table-warning';
            totalClass = 'text-decoration-line-through text-muted';
        } else if (sale.status === 'partial_refund') {
            statusBadge = '<span class="badge bg-info">PARTIAL</span>';
            rowClass = 'table-info';
        }
        
        // Calculate display total based on status
        let displayTotal = parseFloat(sale.total) || 0;
        if (sale.status === 'voided' || sale.status === 'refunded') {
            displayTotal = 0;
        } else if (sale.status === 'partial_refund' && sale.adjusted_total !== null && sale.adjusted_total !== undefined) {
            displayTotal = parseFloat(sale.adjusted_total);
        }
        
        const itemsPreview = sale.items.slice(0, 2).map(i => i.name).join(', ') + (sale.items.length > 2 ? '...' : '');
        
        // Disable refund/void button if already processed
        const isProcessed = sale.status === 'voided' || sale.status === 'refunded';
        const actionBtnDisabled = isProcessed ? 'disabled' : '';
        const actionBtnTitle = isProcessed ? 'Already processed' : 'Refund or Void';
        
        return `
            <tr class="${rowClass} receipt-row" style="cursor: pointer;" data-sale-id="${sale.id}">
                <td onclick="event.stopPropagation();"><input type="checkbox" class="form-check-input receipt-checkbox" value="${sale.id}" onchange="updateDeleteButtonsState()"></td>
                <td onclick="selectReceipt('${sale.id}')">#${sale.id}</td>
                <td onclick="selectReceipt('${sale.id}')">${sale.time}</td>
                <td onclick="selectReceipt('${sale.id}')"><small>${itemsPreview}</small></td>
                <td onclick="selectReceipt('${sale.id}')" class="fw-bold ${totalClass}">₱${displayTotal.toFixed(2)}</td>
                <td onclick="selectReceipt('${sale.id}')">${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="openRefundVoidModalById('${sale.id}')" ${actionBtnDisabled} title="${actionBtnTitle}">
                        <i class="fas fa-undo"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updateDeleteButtonsState();
}

// Toggle select all checkboxes
function toggleSelectAllReceipts() {
    const selectAll = document.getElementById('selectAllReceipts');
    const checkboxes = document.querySelectorAll('.receipt-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateDeleteButtonsState();
}

// Update delete buttons state based on selection
function updateDeleteButtonsState() {
    const checkboxes = document.querySelectorAll('.receipt-checkbox:checked');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const totalReceipts = document.querySelectorAll('.receipt-checkbox').length;
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = checkboxes.length === 0;
        if (checkboxes.length > 0) {
            deleteSelectedBtn.innerHTML = `<i class="fas fa-trash-alt me-1"></i>Delete Selected (${checkboxes.length})`;
        } else {
            deleteSelectedBtn.innerHTML = `<i class="fas fa-trash-alt me-1"></i>Delete Selected`;
        }
    }
    
    if (deleteAllBtn) {
        deleteAllBtn.disabled = totalReceipts === 0;
    }
    
    // Update select all checkbox state
    const selectAll = document.getElementById('selectAllReceipts');
    if (selectAll && totalReceipts > 0) {
        selectAll.checked = checkboxes.length === totalReceipts;
        selectAll.indeterminate = checkboxes.length > 0 && checkboxes.length < totalReceipts;
    }
}

// Delete selected receipts
async function deleteSelectedReceipts() {
    const checkboxes = document.querySelectorAll('.receipt-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const saleIds = Array.from(checkboxes).map(cb => cb.value);
    
    const result = await Swal.fire({
        title: 'Delete Selected Transactions?',
        html: `Are you sure you want to delete <strong>${saleIds.length}</strong> transaction(s)?<br><small class="text-danger">This action cannot be undone.</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    showLoadingModal('Deleting transactions...');
    
    try {
        // Remove from localStorage first
        const localSales = JSON.parse(localStorage.getItem('sales') || '[]');
        const updatedLocalSales = localSales.filter(s => !saleIds.includes(String(s.id)));
        localStorage.setItem('sales', JSON.stringify(updatedLocalSales));
        console.log('Updated localStorage, removed', saleIds.length, 'sales');
        
        // Also try to delete from database
        for (const saleId of saleIds) {
            console.log('Deleting sale ID:', saleId);
            
            // Delete sale items first
            const saleItems = await saleItemsDB.show();
            const saleItemsArr = Array.isArray(saleItems) ? saleItems : [];
            const itemsToDelete = saleItemsArr.filter(si => parseInt(si.sale_id) === parseInt(saleId));
            console.log('Items to delete for sale', saleId, ':', itemsToDelete);
            
            for (const item of itemsToDelete) {
                const itemDeleteResult = await saleItemsDB.delete(item.id);
                console.log('Delete item result:', itemDeleteResult);
            }
            
            // Delete the sale
            const saleDeleteResult = await salesDB.delete(parseInt(saleId));
            console.log('Delete sale result:', saleDeleteResult);
        }
        
        // Update allSales array
        allSales = allSales.filter(s => !saleIds.includes(String(s.id)));
        
        hideLoadingModal();
        
        Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `${saleIds.length} transaction(s) deleted successfully`,
            timer: 2000,
            showConfirmButton: false
        });
        
        logStaffActivity('Deleted Transactions', `Deleted ${saleIds.length} transactions`, 'Success');
        
        // Reload receipts
        loadReceiptsList();
    } catch (error) {
        hideLoadingModal();
        console.error('Delete error:', error);
        Swal.fire('Error', 'Failed to delete some transactions', 'error');
    }
}

// Delete all receipts
async function deleteAllReceipts() {
    console.log('=== DELETE ALL RECEIPTS STARTED ===');
    const totalReceipts = document.querySelectorAll('.receipt-checkbox').length;
    console.log('Total receipts found in UI:', totalReceipts);
    if (totalReceipts === 0) {
        console.log('No receipts to delete, exiting');
        return;
    }
    
    const result = await Swal.fire({
        title: 'Delete ALL Transactions?',
        html: `Are you sure you want to delete <strong>ALL ${totalReceipts}</strong> transaction(s)?<br><small class="text-danger">This action cannot be undone!</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, Delete All',
        cancelButtonText: 'Cancel',
        input: 'text',
        inputPlaceholder: 'Type DELETE to confirm',
        inputValidator: (value) => {
            if (value !== 'DELETE') {
                return 'Please type DELETE to confirm';
            }
        }
    });
    
    console.log('Swal result:', result);
    if (!result.isConfirmed) {
        console.log('User cancelled, exiting');
        return;
    }
    
    console.log('User confirmed deletion, proceeding...');
    showLoadingModal('Deleting all transactions...');
    
    try {
        // Clear localStorage sales first (since this is the fallback source)
        console.log('Clearing localStorage sales...');
        localStorage.removeItem('sales');
        localStorage.removeItem('sale_items');
        console.log('localStorage cleared');
        
        // Get all sales and sale items from database
        console.log('Fetching all sales from database...');
        const dbSales = await salesDB.show();
        const sales = Array.isArray(dbSales) ? dbSales : [];
        console.log('Sales fetched:', sales);
        console.log('Number of sales:', sales.length);
        
        console.log('Fetching all sale items from database...');
        const dbSaleItems = await saleItemsDB.show();
        const saleItems = Array.isArray(dbSaleItems) ? dbSaleItems : [];
        console.log('Sale items fetched:', saleItems);
        console.log('Number of sale items:', saleItems.length);
        
        // Delete all sale items first
        console.log('=== DELETING SALE ITEMS ===');
        let itemDeleteCount = 0;
        for (const item of saleItems) {
            console.log(`Deleting sale item ID: ${item.id}`);
            const itemResult = await saleItemsDB.delete(item.id);
            console.log(`Delete item ${item.id} result:`, itemResult);
            itemDeleteCount++;
        }
        console.log(`Finished deleting ${itemDeleteCount} sale items`);
        
        // Delete all sales
        console.log('=== DELETING SALES ===');
        let saleDeleteCount = 0;
        for (const sale of sales) {
            console.log(`Deleting sale ID: ${sale.id}, Receipt: ${sale.receipt_no}`);
            const saleResult = await salesDB.delete(sale.id);
            console.log(`Delete sale ${sale.id} result:`, saleResult);
            saleDeleteCount++;
        }
        console.log(`Finished deleting ${saleDeleteCount} sales`);
        
        // Also clear allSales array
        allSales = [];
        
        hideLoadingModal();
        console.log('=== DELETE ALL COMPLETED SUCCESSFULLY ===');
        
        Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'All transactions deleted successfully',
            timer: 2000,
            showConfirmButton: false
        });
        
        logStaffActivity('Deleted All Transactions', `Deleted ${sales.length} transactions`, 'Success');
        
        // Reload receipts
        console.log('Reloading receipts list...');
        loadReceiptsList();
    } catch (error) {
        hideLoadingModal();
        console.error('=== DELETE ALL ERROR ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        Swal.fire('Error', 'Failed to delete transactions: ' + error.message, 'error');
    }
}

function filterReceipts() {
    const dateFrom = document.getElementById('receiptDateFrom')?.value;
    const dateTo = document.getElementById('receiptDateTo')?.value;
    
    if (!dateFrom || !dateTo) {
        displayReceipts(allSales);
        return;
    }
    
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    const filtered = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= fromDate && saleDate <= toDate;
    });
    
    displayReceipts(filtered);
}

function selectReceipt(saleId) {
    const sale = allSales.find(s => String(s.id) === String(saleId));
    if (!sale) return;
    
    currentSelectedSale = sale;
    
    // Render receipt preview
    const preview = document.getElementById('receiptPreview');
    if (preview) {
        let statusText = '';
        if (sale.status === 'voided') {
            statusText = '<div class="text-center text-danger fw-bold mb-2">*** VOIDED ***</div>';
        } else if (sale.status === 'refunded') {
            statusText = '<div class="text-center text-warning fw-bold mb-2">*** REFUNDED ***</div>';
        } else if (sale.status === 'partial_refund') {
            statusText = '<div class="text-center text-info fw-bold mb-2">*** PARTIAL REFUND ***</div>';
        }
        
        const itemsHtml = sale.items.map(item => {
            const subtotal = parseFloat(item.subtotal) || (parseFloat(item.price) * (item.quantity || 1)) || 0;
            return `
                <div class="d-flex justify-content-between">
                    <span>${item.name || 'Unknown'} x${item.quantity || 1}</span>
                    <span>₱${subtotal.toFixed(2)}</span>
                </div>
            `;
        }).join('');
        
        // Calculate display total based on status
        const originalTotal = parseFloat(sale.total) || 0;
        let displayTotal = originalTotal;
        if (sale.status === 'voided' || sale.status === 'refunded') {
            displayTotal = 0;
        } else if (sale.status === 'partial_refund' && sale.adjusted_total !== null && sale.adjusted_total !== undefined) {
            displayTotal = parseFloat(sale.adjusted_total);
        }
        
        // Calculate refund amount for partial
        const refundedAmount = originalTotal - displayTotal;
        
        preview.innerHTML = `
            <div class="text-center mb-3">
                <strong>ETHAN'S CAFE</strong><br>
                <small>Receipt #${sale.id}</small>
            </div>
            ${statusText}
            <hr class="my-2">
            <small class="text-muted">${sale.date} ${sale.time}</small>
            <hr class="my-2">
            ${itemsHtml}
            <hr class="my-2">
            ${sale.status === 'partial_refund' ? `
                <div class="d-flex justify-content-between text-muted">
                    <span>Original Total</span>
                    <span>₱${originalTotal.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between text-danger">
                    <span>Refunded</span>
                    <span>-₱${refundedAmount.toFixed(2)}</span>
                </div>
            ` : ''}
            <div class="d-flex justify-content-between fw-bold ${sale.status === 'voided' || sale.status === 'refunded' ? 'text-decoration-line-through text-muted' : ''}">
                <span>${sale.status === 'partial_refund' ? 'ADJUSTED TOTAL' : 'TOTAL'}</span>
                <span>₱${displayTotal.toFixed(2)}</span>
            </div>
            ${sale.adjustment_reason ? '<div class="mt-2 small text-muted"><strong>Reason:</strong> ' + sale.adjustment_reason + '</div>' : ''}
            <hr class="my-2">
            <div class="text-center small">
                <span>Staff: ${sale.staff}</span>
            </div>
        `;
    }
    
    // Enable action buttons
    document.getElementById('printReceiptBtn')?.removeAttribute('disabled');
    document.getElementById('newSaleFromReceiptBtn')?.removeAttribute('disabled');
    
    // Highlight selected row in table
    document.querySelectorAll('#receiptsList tr.receipt-row').forEach(row => {
        row.classList.remove('table-primary');
        if (row.dataset.saleId === String(saleId)) {
            row.classList.add('table-primary');
        }
    });
}

/**
 * Open refund/void modal by sale ID (called from table action button)
 */
function openRefundVoidModalById(saleId) {
    const sale = allSales.find(s => String(s.id) === String(saleId));
    if (!sale) {
        showModalNotification('Transaction not found', 'error', 'Error');
        return;
    }
    
    currentSelectedSale = sale;
    openRefundVoidModal();
}

function printSelectedReceipt() {
    if (!currentSelectedSale) {
        printReceipt();
        return;
    }

    const sale = currentSelectedSale;
    const originalTotal = parseFloat(sale.total) || 0;

    // Calculate display total based on status
    let displayTotal = originalTotal;
    if (sale.status === 'voided' || sale.status === 'refunded') {
        displayTotal = 0;
    } else if (sale.status === 'partial_refund' && sale.adjusted_total !== null && sale.adjusted_total !== undefined) {
        displayTotal = parseFloat(sale.adjusted_total);
    }

    const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
    const taxRatePercent = getTaxRate();
    const taxRateDecimal = taxRatePercent / 100;

    let taxes = parseFloat(sale.taxes);
    let subtotal = parseFloat(sale.subtotal);

    const hasValidBreakdown =
        Number.isFinite(subtotal) &&
        Number.isFinite(taxes) &&
        Math.abs((subtotal + taxes) - displayTotal) <= 0.05;

    if (!hasValidBreakdown) {
        taxes = taxRateDecimal > 0 ? round2(displayTotal - (displayTotal / (1 + taxRateDecimal))) : 0;
        subtotal = round2(displayTotal - taxes);
    }

    const receiptHtml = buildBaseReceiptHtml({
        receiptNo: sale.receipt_no || `SALE-${sale.id}`,
        saleDateTime: sale.sale_datetime ? new Date(sale.sale_datetime).toLocaleString() : `${sale.date} ${sale.time}`,
        customer: sale.customer_name || 'Walk-in Customer',
        orderType: sale.order_type || 'walk-in',
        items: sale.items || [],
        subtotal,
        discountAmount: parseFloat(sale.discount_amount) || 0,
        taxes,
        total: displayTotal,
        staff: sale.staff || 'Staff',
        taxRate: taxRatePercent
    });

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = receiptHtml;
    document.body.appendChild(tempDiv);
    printReceiptFromElement(tempDiv.querySelector('#receiptContent'));
    setTimeout(() => {
        if (tempDiv.parentNode) {
            tempDiv.parentNode.removeChild(tempDiv);
        }
    }, 700);
}

function loadRecentReceipts() {
    const container = document.getElementById('recentReceipts');
    if (!container) return;
    container.innerHTML = '<a href="#" class="list-group-item list-group-item-action">No recent receipts</a>';
}

/**
 * Open refund/void modal for the selected transaction
 */
function openRefundVoidModal() {
    if (!currentSelectedSale) {
        showModalNotification('Please select a transaction first', 'warning', 'No Selection');
        return;
    }
    
    const sale = currentSelectedSale;
    const total = parseFloat(sale.total) || 0;

    // Check refund time limit
    const refundTimeLimitHours = parseInt(systemSettings.refund_time_limit_hours) || 24;
    const saleDateTime = new Date(sale.sale_datetime || sale.date + ' ' + sale.time);
    const hoursSinceSale = (Date.now() - saleDateTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSale > refundTimeLimitHours && sale.status === 'completed') {
        Swal.fire({
            icon: 'warning',
            title: 'Refund Time Expired',
            html: `This transaction is older than ${refundTimeLimitHours} hours.<br>Refunds are no longer allowed.<br><br><small class="text-muted">Contact admin to adjust this limit.</small>`
        });
        return;
    }

    // Hide partial refund option if disabled in settings
    const partialRefundOption = document.querySelector('#txnActionType option[value="partial_refund"]');
    if (partialRefundOption) {
        partialRefundOption.style.display = systemSettings.allow_partial_refund === 'false' ? 'none' : '';
    }
    
    // Populate modal fields
    document.getElementById('editTransactionId').value = sale.id;
    document.getElementById('txnReference').value = sale.id;
    document.getElementById('txnOriginalTotal').value = `₱${total.toFixed(2)}`;
    document.getElementById('txnDateTime').value = `${sale.date} ${sale.time}`;
    document.getElementById('txnStaff').value = sale.staff;
    
    // Populate items list (without checkboxes initially)
    renderTransactionItems(sale.items, false);
    
    // Reset form fields
    document.getElementById('txnActionType').value = '';
    document.getElementById('txnAdjustedTotal').value = '';
    document.getElementById('txnAdjustmentReason').value = '';
    document.getElementById('adjustedTotalContainer').classList.add('d-none');
    document.getElementById('selectAllHeader')?.classList.add('d-none');
    document.getElementById('itemSelectionHint')?.style.setProperty('display', 'none');
    document.getElementById('refundSummaryAlert')?.classList.add('d-none');
    
    // Show current status if exists
    const statusAlert = document.getElementById('txnCurrentStatusAlert');
    const statusText = document.getElementById('txnCurrentStatusText');
    if (sale.status && sale.status !== 'completed') {
        statusAlert.classList.remove('d-none');
        let statusMsg = '';
        const adjTotal = parseFloat(sale.adjusted_total) || 0;
        if (sale.status === 'voided') {
            statusMsg = `This transaction was VOIDED. Reason: ${sale.adjustment_reason || 'N/A'}`;
        } else if (sale.status === 'refunded') {
            statusMsg = `This transaction was REFUNDED. Reason: ${sale.adjustment_reason || 'N/A'}`;
        } else if (sale.status === 'partial_refund') {
            statusMsg = `Partial refund applied. Adjusted total: ₱${adjTotal.toFixed(2)}. Reason: ${sale.adjustment_reason || 'N/A'}`;
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
 * Render transaction items in modal table
 */
function renderTransactionItems(items, showRefundQty = false) {
    const itemsBody = document.getElementById('txnItemsList');
    const refundQtyHeader = document.getElementById('refundQtyHeader');
    
    if (showRefundQty) {
        refundQtyHeader?.classList.remove('d-none');
    } else {
        refundQtyHeader?.classList.add('d-none');
    }
    
    itemsBody.innerHTML = items.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        const subtotal = parseFloat(item.subtotal) || (price * qty);
        
        return `
            <tr>
                <td>${item.name || 'Unknown'}</td>
                <td class="text-center">${qty}</td>
                ${showRefundQty ? `
                <td class="text-center bg-warning-subtle">
                    <input type="number" class="form-control form-control-sm refund-qty-input text-center" 
                           data-index="${index}" 
                           data-price="${price}"
                           data-max-qty="${qty}"
                           min="0" max="${qty}" value="0"
                           style="width: 60px; margin: auto;"
                           onchange="calculateRefundTotal()" oninput="validateRefundQty(this)">
                </td>
                ` : ''}
                <td class="text-end">₱${price.toFixed(2)}</td>
                <td class="text-end">₱${subtotal.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Validate refund quantity input
 */
function validateRefundQty(input) {
    const max = parseInt(input.dataset.maxQty) || 0;
    let val = parseInt(input.value) || 0;
    
    if (val < 0) val = 0;
    if (val > max) val = max;
    
    input.value = val;
    calculateRefundTotal();
}

/**
 * Calculate refund total from quantity inputs
 */
function calculateRefundTotal() {
    const qtyInputs = document.querySelectorAll('.refund-qty-input');
    let total = 0;
    
    qtyInputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        const price = parseFloat(input.dataset.price) || 0;
        total += qty * price;
    });
    
    document.getElementById('calculatedRefundAmount').textContent = `₱${total.toFixed(2)}`;
    document.getElementById('txnAdjustedTotal').value = total.toFixed(2);
}

/**
 * Initialize transaction edit modal events
 */
function initializeTransactionEditModal() {
    // Action type change handler
    const actionType = document.getElementById('txnActionType');
    if (actionType) {
        actionType.addEventListener('change', function() {
            const adjustedContainer = document.getElementById('adjustedTotalContainer');
            const refundSummary = document.getElementById('refundSummaryAlert');
            const itemHint = document.getElementById('itemSelectionHint');
            
            if (this.value === 'partial_refund') {
                // Show refund qty column
                adjustedContainer?.classList.remove('d-none');
                refundSummary?.classList.remove('d-none');
                itemHint?.style.setProperty('display', 'inline');
                
                // Re-render items with refund qty inputs
                if (currentSelectedSale) {
                    renderTransactionItems(currentSelectedSale.items, true);
                }
            } else {
                adjustedContainer?.classList.add('d-none');
                refundSummary?.classList.add('d-none');
                itemHint?.style.setProperty('display', 'none');
                
                // Re-render items without refund qty inputs
                if (currentSelectedSale) {
                    renderTransactionItems(currentSelectedSale.items, false);
                }
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
    const refundAmount = parseFloat(document.getElementById('txnAdjustedTotal').value) || 0;
    
    // Validation
    if (!actionType) {
        Swal.fire('Error', 'Please select an action type', 'warning');
        return;
    }
    
    // Check if reason is required based on settings
    const requireReason = systemSettings.require_reason_for_void !== 'false';
    if (requireReason && !reason) {
        Swal.fire('Error', 'Please provide a reason for this adjustment', 'warning');
        return;
    }
    
    // Get refunded items with quantities for partial refund
    let refundedItems = [];
    if (actionType === 'partial_refund') {
        const qtyInputs = document.querySelectorAll('.refund-qty-input');
        let hasRefund = false;
        
        qtyInputs.forEach(input => {
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                hasRefund = true;
                const idx = parseInt(input.dataset.index);
                if (currentSelectedSale?.items[idx]) {
                    refundedItems.push({
                        name: currentSelectedSale.items[idx].name,
                        qty: qty,
                        originalQty: currentSelectedSale.items[idx].quantity
                    });
                }
            }
        });
        
        if (!hasRefund) {
            Swal.fire('Error', 'Please enter quantity to refund for at least one item', 'warning');
            return;
        }
    }
    
    // Build selected items text for display
    const selectedItems = refundedItems.map(item => `${item.name} x${item.qty}`);
    
    // Confirm action
    let confirmText = '';
    if (actionType === 'void') {
        confirmText = 'VOID this entire transaction? The total will be set to ₱0.00';
    } else if (actionType === 'refund') {
        confirmText = `Issue a FULL REFUND of ₱${currentSelectedSale?.total?.toFixed(2)}?`;
    } else {
        confirmText = `Issue a PARTIAL REFUND of ₱${refundAmount.toFixed(2)} for: ${selectedItems.join(', ')}?`;
    }
    
    // Check if manager approval is required for void
    if (actionType === 'void' && systemSettings.require_manager_void === 'true') {
        const managerApproved = await requestManagerApproval('Void Transaction');
        if (!managerApproved) {
            return;
        }
    }
    
    const result = await Swal.fire({
        title: 'Confirm Action',
        html: `<p>${confirmText}</p><p class="text-muted small">This action will be logged and notified to admin.</p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#800000',
        confirmButtonText: 'Yes, proceed'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        
        // Find the sale in allSales
        const saleIndex = allSales.findIndex(s => String(s.id) === String(saleId));
        if (saleIndex === -1) {
            Swal.fire('Error', 'Transaction not found', 'error');
            return;
        }
        
        const sale = allSales[saleIndex];
        const originalTotal = parseFloat(sale.total) || 0;
        
        // Calculate adjusted total (remaining amount after refund)
        const newStatus = actionType === 'partial_refund' ? 'partial_refund' : 
                          actionType === 'void' ? 'voided' : 'refunded';
        let newAdjustedTotal = 0;
        if (actionType === 'partial_refund') {
            // Adjusted total = original - refund amount (what customer keeps)
            newAdjustedTotal = originalTotal - refundAmount;
        } else if (actionType === 'void' || actionType === 'refund') {
            newAdjustedTotal = 0;
        }
        
        // Build refund description with items if partial
        let refundDetails = reason;
        if (actionType === 'partial_refund' && selectedItems.length > 0) {
            refundDetails = `${reason} | Items: ${selectedItems.join(', ')}`;
        }
        
        // Update in database
        await salesDB.edit({
            id: parseInt(saleId) || saleId,
            status: newStatus,
            adjusted_total: newAdjustedTotal,
            adjusted_by: user.id,
            adjusted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            adjustment_reason: refundDetails
        });
        
        // Update local record
        allSales[saleIndex].status = newStatus;
        allSales[saleIndex].adjusted_total = newAdjustedTotal;
        allSales[saleIndex].adjustment_reason = refundDetails;
        
        // Update localStorage too
        const localSales = JSON.parse(localStorage.getItem('sales') || '[]');
        const localIdx = localSales.findIndex(s => String(s.id) === String(saleId));
        if (localIdx !== -1) {
            localSales[localIdx].status = newStatus;
            localSales[localIdx].adjusted_total = newAdjustedTotal;
            localSales[localIdx].adjusted_by = user.full_name || user.username;
            localSales[localIdx].adjusted_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
            localSales[localIdx].adjustment_reason = refundDetails;
            localStorage.setItem('sales', JSON.stringify(localSales));
        }
        
        // Create notification for admin
        const notifDesc = actionType === 'void' ? 
            `Transaction #${saleId} VOIDED. Original: ₱${originalTotal.toFixed(2)}` :
            actionType === 'refund' ?
            `Transaction #${saleId} REFUNDED. Amount: ₱${originalTotal.toFixed(2)}` :
            `Transaction #${saleId} PARTIAL REFUND of ₱${refundAmount.toFixed(2)}. Remaining: ₱${newAdjustedTotal.toFixed(2)}`;
        
        await createNotification(user.id, actionType, 'sales', saleId, notifDesc, reason);
        
        // Send email notification if enabled
        const emailEventType = actionType === 'void' ? 'void_transaction' : 'refund_transaction';
        await sendEmailNotification(emailEventType, {
            transaction_id: saleId,
            original_amount: `₱${originalTotal.toFixed(2)}`,
            refund_amount: actionType === 'partial_refund' ? `₱${refundAmount.toFixed(2)}` : `₱${originalTotal.toFixed(2)}`,
            refund_type: actionType,
            staff_name: user.full_name || user.username,
            reason: reason
        });
        
        // Log activity
        logStaffActivity('sales', `${actionType.toUpperCase()}: Transaction #${saleId} - ${reason}`);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('transactionEditModal'));
        if (modal) modal.hide();
        
        // Refresh display
        displayReceipts(allSales);
        selectReceipt(saleId);
        
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

// ─── Account ──────────────────────────────────────────────────────────────────

function initializeAccountFunctionality() {
    loadAccountData();

    document.getElementById('editAccountBtn')?.addEventListener('click', () => toggleAccountEdit());

    document.getElementById('sendAccountRequestBtn')?.addEventListener('click', async function () {
        const fullName    = document.getElementById('accFullName')?.value.trim();
        const email       = document.getElementById('accEmail')?.value.trim();
        const currentPass = document.getElementById('currentPass')?.value;
        const newPass     = document.getElementById('newPass')?.value;
        const confirmPass = document.getElementById('confirmPass')?.value;

        if (fullName || email)                           await saveAccountInfo();
        if (currentPass || newPass || confirmPass)       await handlePasswordUpdate();

        toggleAccountEdit(false);
    });
}

function toggleAccountEdit(forceState) {
    const editBtn = document.getElementById('editAccountBtn');
    const sendBtn = document.getElementById('sendAccountRequestBtn');
    const inputs  = document.querySelectorAll('#accountInfoForm input, #changePasswordForm input');

    const isLocked = forceState !== undefined ? !forceState : editBtn.classList.contains('btn-outline-maroon');

    if (isLocked) {
        editBtn.classList.replace('btn-outline-maroon', 'btn-maroon');
        editBtn.innerHTML = '<i class="fas fa-times me-1"></i> Cancel';
        sendBtn.classList.remove('d-none');
        inputs.forEach(input => input.disabled = false);
    } else {
        editBtn.classList.replace('btn-maroon', 'btn-outline-maroon');
        editBtn.innerHTML = '<i class="fas fa-edit me-1"></i> Edit';
        sendBtn.classList.add('d-none');
        inputs.forEach(input => input.disabled = true);
        loadAccountData();
        document.getElementById('changePasswordForm')?.reset();
    }
}

function loadAccountData() {
    const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    if (!user.id) return;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    set('profFullName', user.full_name);
    set('profRole', user.role_name || 'Staff Member');
    set('profEmployeeId', `STF-${String(user.id).padStart(5, '0')}`);
    set('profStatus', user.status || 'Active');
    set('profActivityName', user.full_name);

    if (user.created_at) {
        set('profJoinDate', new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
    }

    setVal('accFullName', user.full_name || '');
    setVal('accUsername', user.username || '');
    setVal('accEmail',    user.email    || '');
    setVal('accPhone',    user.phone    || '');
}

async function saveAccountInfo() {
    const user     = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const fullName = document.getElementById('accFullName')?.value.trim();
    const username = document.getElementById('accUsername')?.value.trim();
    const email    = document.getElementById('accEmail')?.value.trim();
    const phone    = document.getElementById('accPhone')?.value.trim();

    if (!fullName) {
        showModalNotification('Full Name is required', 'warning', 'Validation');
        return;
    }

    if (!username) {
        showModalNotification('Username is required', 'warning', 'Validation');
        return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        showModalNotification('Username must be 3-30 characters (letters, numbers, underscores only)', 'warning', 'Validation');
        return;
    }

    showLoadingModal('Updating account...');

    try {
        // Use dedicated profile update endpoint
        const res = await fetch('php/update_profile.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                full_name: fullName,
                username: username,
                email: email,
                phone: phone
            })
        });
        const data = await res.json();
        hideLoadingModal();
        
        if (data.error) {
            showModalNotification(data.error, 'danger', 'Error');
            return;
        }

        // Update localStorage with new info
        user.full_name = fullName;
        user.username = username;
        user.email = email;
        user.phone = phone;
        localStorage.setItem('loggedInUser', JSON.stringify(user));

        // Update UI
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('profFullName', fullName);
        const headerUserName = document.querySelector('.navbar .dropdown-toggle');
        if (headerUserName) headerUserName.innerHTML = `<i class="fas fa-user-circle me-1"></i>${fullName}`;

        showModalNotification('Account updated successfully!', 'success', 'Success');
        logStaffActivity('Updated Account Info', `Name: ${fullName}, Username: ${username}`, 'Success');
    } catch (err) {
        hideLoadingModal();
        console.error('Failed to update account:', err);
        showModalNotification('Failed to update account.', 'danger', 'Error');
    }
}

async function handlePasswordUpdate() {
    const user        = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const currentPass = document.getElementById('currentPass')?.value;
    const newPass     = document.getElementById('newPass')?.value;
    const confirmPass = document.getElementById('confirmPass')?.value;

    if (!currentPass || !newPass || !confirmPass) {
        showModalNotification('Please fill in all password fields', 'warning', 'Validation');
        return;
    }
    if (newPass !== confirmPass) {
        showModalNotification('New passwords do not match', 'warning', 'Validation');
        return;
    }
    if (newPass.length < 6) {
        showModalNotification('Password must be at least 6 characters', 'warning', 'Validation');
        return;
    }

    showLoadingModal('Changing password...');

    try {
        // Use dedicated password change endpoint
        const res = await fetch('php/change_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                current_password: currentPass,
                new_password: newPass
            })
        });
        const data = await res.json();
        hideLoadingModal();
        
        if (data.error) {
            showModalNotification(data.error, 'danger', 'Error');
            return;
        }

        showModalNotification('Password changed successfully!', 'success', 'Success');
        logStaffActivity('Changed Password', '', 'Success');
        document.getElementById('changePasswordForm')?.reset();
    } catch (err) {
        hideLoadingModal();
        console.error('Failed to change password:', err);
        showModalNotification('Failed to change password.', 'danger', 'Error');
    }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function initializeActivityLogFunctionality() {
    loadActivityLog();
    setInterval(loadActivityLog, 10000);
}

async function loadActivityLog() {
    const tableElem = document.getElementById('activityLogTable');
    if (!tableElem) return;

    const tbody = tableElem.querySelector('tbody');
    if (!tbody) return;

    const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    if (!user.id) return;

    try {
        const res  = await fetch(`${API_URL}?table=activity_logs&user_id=${user.id}`);
        const logs = await res.json();

        if (!Array.isArray(logs)) {
            console.error('Invalid logs data:', logs);
            return;
        }

        logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        tbody.innerHTML = logs.length === 0
            ? '<tr><td colspan="4" class="text-center py-4">No activity recorded yet.</td></tr>'
            : logs.map(log => `
                <tr>
                    <td>${log.created_at}</td>
                    <td>${log.action}</td>
                    <td>${log.reference}</td>
                    <td>
                        <span class="badge ${log.status === 'Success' ? 'bg-success' : log.status === 'Pending' ? 'bg-warning' : 'bg-danger'}">
                            ${log.status}
                        </span>
                    </td>
                </tr>`
            ).join('');

    } catch (err) {
        console.error('Failed to load activity logs:', err);
    }
}

// ─── User Sync ────────────────────────────────────────────────────────────────

async function refreshUserData() {
    const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    if (!user.id) return;

    try {
        const res   = await fetch(`${API_URL}?table=users&id=${user.id}`);
        const users = await res.json();
        const dbUser = Array.isArray(users) ? users[0] : users;

        if (dbUser?.id && (dbUser.full_name !== user.full_name || dbUser.email !== user.email)) {
            localStorage.setItem('loggedInUser', JSON.stringify({ ...user, ...dbUser }));

            const headerUserName = document.querySelector('.navbar .dropdown-toggle');
            if (headerUserName) {
                headerUserName.innerHTML = `<i class="fas fa-user-circle me-1"></i>${dbUser.full_name}`;
            }

            if (document.getElementById('accountInfoForm')) loadAccountData();
        }
    } catch (e) {
        console.error('User data sync failed:', e);
    }
}

async function updateUserStatus(userId, status) {
    const response = await fetch('php/user_status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, status })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}