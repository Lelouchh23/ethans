// Common JavaScript Functions

// Show notification function (uses SweetAlert2 when available)
function showNotification(message, type = 'info') {
    // Prefer SweetAlert2 for a modern modal-style notification
    if (window.Swal) {
        const iconMap = {
            success: 'success',
            warning: 'warning',
            danger: 'error',
            info: 'info'
        };
        const titleMap = {
            success: 'Success',
            warning: 'Warning',
            danger: 'Error',
            info: 'Information'
        };
        Swal.fire({
            icon: iconMap[type] || 'info',
            title: titleMap[type] || 'Notification',
            text: message,
            timer: 2200,
            showConfirmButton: false,
            heightAuto: false
        });
        return;
    }

    // Fallback to Bootstrap alert toast if SweetAlert2 is not loaded
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px; max-width: 400px;';
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'danger' ? 'times-circle' : 'info-circle'} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 150);
        }
    }, 5000);
}

// Confirm dialog function (uses SweetAlert2 when available)
function showConfirm(message, callback) {
    // Prefer SweetAlert2 confirmation dialog
    if (window.Swal) {
        Swal.fire({
            title: 'Confirm Action',
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, proceed',
            cancelButtonText: 'No',
            confirmButtonColor: '#800000',
            cancelButtonColor: '#6c757d',
            heightAuto: false
        }).then((result) => {
            if (result.isConfirmed && typeof callback === 'function') {
                callback();
            }
        });
        return;
    }

    // Fallback to native confirm if SweetAlert2 is not loaded
    if (window.confirm(message) && typeof callback === 'function') {
        callback();
    }
}

// Modal notification function (uses SweetAlert2 when available)
function showModalNotification(msg, type, title) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title || 'Notification',
            text: msg,
            icon: type || 'info',
            confirmButtonColor: '#800000',
            heightAuto: false
        });
    } else {
        alert(`${title}: ${msg}`);
    }
}

// Format date function
function formatDate(date, format = 'mm/dd/yyyy') {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    switch (format) {
        case 'dd/mm/yyyy':
            return `${day}/${month}/${year}`;
        case 'yyyy-mm-dd':
            return `${year}-${month}-${day}`;
        default:
            return `${month}/${day}/${year}`;
    }
}

// Format time function
function formatTime(date) {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

// Validate email function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password strength
function validatePassword(password) {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Local storage helper functions
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to local storage:', error);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from local storage:', error);
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from local storage:', error);
        return false;
    }
}

// Export data function
function exportData(data, filename, type = 'application/json') {
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error('Error exporting data:', error);
        return false;
    }
}

// Import data function
function importData(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (callback) callback(data);
        } catch (error) {
            console.error('Error parsing imported file:', error);
            showNotification('Error importing file: Invalid format', 'danger');
        }
    };
    reader.onerror = function () {
        showNotification('Error reading file', 'danger');
    };
    reader.readAsText(file);
}

// Generate unique ID
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}`.toUpperCase();
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Calculate percentage
function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

// Sort array of objects by property
function sortByProperty(array, property, ascending = true) {
    return array.sort((a, b) => {
        const aValue = a[property];
        const bValue = b[property];

        if (aValue < bValue) return ascending ? -1 : 1;
        if (aValue > bValue) return ascending ? 1 : -1;
        return 0;
    });
}

// Filter array by multiple criteria
function filterArray(array, filters) {
    return array.filter(item => {
        return Object.keys(filters).every(key => {
            const filterValue = filters[key];
            const itemValue = item[key];

            if (filterValue === null || filterValue === undefined) return true;
            if (typeof filterValue === 'string') {
                return itemValue.toString().toLowerCase().includes(filterValue.toLowerCase());
            }
            if (typeof filterValue === 'number') {
                return itemValue === filterValue;
            }
            if (typeof filterValue === 'boolean') {
                return itemValue === filterValue;
            }
            return true;
        });
    });
}

// Group array by property
function groupBy(array, property) {
    return array.reduce((groups, item) => {
        const key = item[property];
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}

// Paginate array
function paginateArray(array, page = 1, pageSize = 10) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const totalPages = Math.ceil(array.length / pageSize);

    return {
        data: array.slice(startIndex, endIndex),
        page: page,
        pageSize: pageSize,
        totalItems: array.length,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Add loading class to body
    document.body.classList.add('loading');

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Remove loading class after page loads
    setTimeout(() => {
        document.body.classList.remove('loading');
    }, 500);

    // Initialize Sidebar Toggle
    const sidebarToggles = document.querySelectorAll('.sidebar-toggle');
    const dashboardLayout = document.querySelector('.dashboard-layout');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggles.length > 0 && (dashboardLayout || document.documentElement.classList.contains('sidebar-active'))) {
        // State is already applied by head script if present, but we sync here just in case
        const isMobile = window.innerWidth < 992;
        const sidebarState = localStorage.getItem('sidebarActive');

        if (sidebarState === 'true' && !isMobile) {
            if (dashboardLayout) dashboardLayout.classList.add('sidebar-active');
            document.documentElement.classList.add('sidebar-active');
        }

        // Remove initializing class after a tiny delay to allow the state to take effect without animation
        setTimeout(() => {
            document.documentElement.classList.remove('initializing');
        }, 50);

        sidebarToggles.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Toggle both for compatibility
                if (dashboardLayout) dashboardLayout.classList.toggle('sidebar-active');
                document.documentElement.classList.toggle('sidebar-active');

                const isActive = document.documentElement.classList.contains('sidebar-active');
                localStorage.setItem('sidebarActive', isActive);
            });
        });

        // Close sidebar when clicking outside (Only on mobile)
        document.addEventListener('click', function (e) {
            if (window.innerWidth < 992 &&
                document.documentElement.classList.contains('sidebar-active') &&
                sidebar && !sidebar.contains(e.target)) {

                // Don't close if clicking a toggle that was already handled
                let isToggle = false;
                sidebarToggles.forEach(t => { if (t.contains(e.target)) isToggle = true; });

                if (!isToggle) {
                    if (dashboardLayout) dashboardLayout.classList.remove('sidebar-active');
                    document.documentElement.classList.remove('sidebar-active');
                    localStorage.setItem('sidebarActive', 'false');
                }
            }
        });
    } else {
        // Fallback for pages without sidebar
        document.documentElement.classList.remove('initializing');
    }

    // Add animation classes to elements with data-animate attribute
    document.querySelectorAll('[data-animate]').forEach(element => {
        const animation = element.getAttribute('data-animate');
        element.classList.add('animate__animated', `animate__${animation}`);
    });
});

// Loading state for buttons
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

// Add fade-in animation to dynamically loaded content
function fadeInElement(element) {
    element.style.opacity = 0;
    element.style.transition = 'opacity 0.3s ease-in';

    setTimeout(() => {
        element.style.opacity = 1;
    }, 10);
}

// Scroll to element with animation
function scrollToElement(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy to clipboard', 'danger');
    });
}

// Export all functions for use in other files
window.showNotification = showNotification;
window.showConfirm = showConfirm;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.validateEmail = validateEmail;
window.validatePassword = validatePassword;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.removeFromLocalStorage = removeFromLocalStorage;
window.exportData = exportData;
window.importData = importData;
window.generateId = generateId;
window.formatCurrency = formatCurrency;
window.calculatePercentage = calculatePercentage;
window.sortByProperty = sortByProperty;
window.filterArray = filterArray;
window.groupBy = groupBy;
window.paginateArray = paginateArray;
window.setButtonLoading = setButtonLoading;
window.fadeInElement = fadeInElement;
window.scrollToElement = scrollToElement;
window.copyToClipboard = copyToClipboard;