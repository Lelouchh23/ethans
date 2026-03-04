// admin-reports.js
// This file contains only the report logic for the reports page.
// It is a modular extraction of the report-related code from admin.js.

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
    populateStaffRevenueTable([]);
    populateFoodSalesTable([]);
}

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

const generateReportBtn = document.getElementById('generateReportBtn');
if (generateReportBtn) {
    generateReportBtn.addEventListener('click', function () {
        generateReport();
    });
}

const printReportBtn = document.getElementById('printReportBtn');
if (printReportBtn) {
    printReportBtn.addEventListener('click', function () {
        printReport();
    });
}

const downloadExcelBtn = document.getElementById('downloadExcelBtn');
if (downloadExcelBtn) {
    downloadExcelBtn.addEventListener('click', function () {
        exportToExcel();
    });
}

initializeTransactionEditModal();

const dateFrom = document.getElementById('reportDateFrom');
const dateTo = document.getElementById('reportDateTo');
if (dateFrom && dateTo) {
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    dateFrom.value = lastMonth.toISOString().split('T')[0];
    dateTo.value = today;
}

generateReport();

setInterval(() => {
    if (document.getElementById('reports-content')) {
        generateReport(true); // silent update
    }
}, 30000);

async function generateReport(silent = false) {
    if (!silent) {
        showModalNotification('Generating report data...', 'info', 'Loading');
    }
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
