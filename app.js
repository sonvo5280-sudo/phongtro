// Application Logic for Room Management (Quản lý Phòng trọ)

// Floor layout definition
const FLOOR_CONFIG = [
    {
        name: 'Tầng trệt',
        rooms: ['MT1', 'MT2', '00', '01', '02', '03', '04', '05']
    },
    {
        name: 'Tầng 1',
        rooms: ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111']
    },
    {
        name: 'Tầng 2',
        rooms: ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211']
    }
];

// Current State
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let viewingMonth = currentMonth;
let viewingYear = currentYear;
let selectedRoomId = null;
let currentStatusFilter = 'thanhtien';

// Firebase Configuration & Initialization
const firebaseConfig = {
    apiKey: "AIzaSyDfFiyzR732p7bzk2bX0pcy037QawGcjHQ",
    authDomain: "phongtro-39cec.firebaseapp.com",
    databaseURL: "https://phongtro-39cec-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "phongtro-39cec",
    storageBucket: "phongtro-39cec.appspot.com",
    messagingSenderId: "721333586560",
    appId: "1:721333586560:web:b0d82eb231d1dc7a74f46b"
};

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.database();
    
    // Sync Firebase data to LocalStorage and trigger renders
    db.ref().on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Sync active rooms
            if (data.rooms_active) {
                localStorage.setItem('phongtro_rooms_active', JSON.stringify(data.rooms_active));
            } else {
                localStorage.removeItem('phongtro_rooms_active');
            }
            
            // Sync prices
            if (data.price_electricity !== undefined) {
                localStorage.setItem('phongtro_price_electricity', data.price_electricity);
            } else {
                localStorage.removeItem('phongtro_price_electricity');
            }
            if (data.price_water !== undefined) {
                localStorage.setItem('phongtro_price_water', data.price_water);
            } else {
                localStorage.removeItem('phongtro_price_water');
            }
            if (data.price_garbage !== undefined) {
                localStorage.setItem('phongtro_price_garbage', data.price_garbage);
            } else {
                localStorage.removeItem('phongtro_price_garbage');
            }
            
            // Sync monthly data
            // Clean up local monthly data that is not on Firebase
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('phongtro_data_')) {
                    const parts = key.split('_');
                    if (parts.length >= 4) {
                        const firebaseKey = `${parts[2]}_${parts[3]}`;
                        if (!data.monthly_data || !data.monthly_data[firebaseKey]) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
            
            if (data.monthly_data) {
                for (const key in data.monthly_data) {
                    localStorage.setItem(`phongtro_data_${key}`, JSON.stringify(data.monthly_data[key]));
                }
            }
        } else {
            // Firebase database is empty - wipe all cached application data locally
            localStorage.removeItem('phongtro_rooms_active');
            localStorage.removeItem('phongtro_price_electricity');
            localStorage.removeItem('phongtro_price_water');
            localStorage.removeItem('phongtro_price_garbage');
            
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('phongtro_data_')) {
                    localStorage.removeItem(key);
                }
            }
        }
        
        // Trigger UI updates
        const savedTab = localStorage.getItem('phongtro_active_tab') || 'home';
        if (savedTab === 'home') {
            renderDashboard();
        } else if (savedTab === 'status') {
            renderStatusDashboard();
        }
    });
}


// DOM Elements
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const monthYearDisplay = document.getElementById('month-year-display');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const floorsContainer = document.getElementById('floors-container');

// Navigation Elements
const navHome = document.getElementById('nav-home');
const navStatus = document.getElementById('nav-status');
const navAdvanced = document.getElementById('nav-advanced');
const homeDashboard = document.getElementById('home-dashboard');
const statusDashboard = document.getElementById('status-dashboard');
const advancedDashboard = document.getElementById('advanced-dashboard');
const statusTablesContainer = document.getElementById('status-tables-container');
const statusTotalValue = document.getElementById('status-total-value');

// Modal 1 (Room Edit Modal) Elements
const roomModal = document.getElementById('room-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelModalBtn = document.getElementById('cancel-modal');
const roomForm = document.getElementById('room-form');
const modalRoomId = document.getElementById('modal-room-id');
const tenantNameInput = document.getElementById('tenant-name');
const tenantPhoneInput = document.getElementById('tenant-phone');
const rentalPriceInput = document.getElementById('rental-price');
const electricityInput = document.getElementById('electricity-meter');
const occupantsCountSelect = document.getElementById('occupants-count');
const acOptionSelect = document.getElementById('ac-option');
const depositInput = document.getElementById('deposit-amount');

// Modal 2 (Room Summary Modal) Elements
const roomSummaryModal = document.getElementById('room-summary-modal');
const closeSummaryModalBtn = document.getElementById('close-summary-modal');
const summaryRoomId = document.getElementById('summary-room-id');
const summaryViewDetailsLink = document.getElementById('summary-view-details');
const summaryTenantName = document.getElementById('summary-tenant-name');
const summaryTenantPhone = document.getElementById('summary-tenant-phone');
const summaryRentalPrice = document.getElementById('summary-rental-price');
const summaryElectricity = document.getElementById('summary-electricity');
const summaryOccupants = document.getElementById('summary-occupants');
const summaryAc = document.getElementById('summary-ac');
const summaryEditBtn = document.getElementById('summary-edit-btn');
const summaryInvoiceBtn = document.getElementById('summary-invoice-btn');
const summaryDeleteBtn = document.getElementById('summary-delete-btn');

// Modal 3 (Invoice Modal) Elements
const invoiceModal = document.getElementById('invoice-modal');
const closeInvoiceModalBtn = document.getElementById('close-invoice-modal');
const cancelInvoiceModalBtn = document.getElementById('cancel-invoice-modal');
const exportInvoiceImgBtn = document.getElementById('export-invoice-img');
const invoiceForm = document.getElementById('invoice-form');
const invoiceModalRoomId = document.getElementById('invoice-modal-room-id');
const invoiceViewDetailsLink = document.getElementById('invoice-view-details');
const invoicePaymentStatusSelect = document.getElementById('invoice-payment-status');
const invoiceDateInput = document.getElementById('invoice-date');
const invoiceTableBody = document.getElementById('invoice-table-body');
const invoiceAddRowBtn = document.getElementById('invoice-add-row');
const invoiceTotalDisplay = document.getElementById('invoice-total-display');
const invoiceNotesTextarea = document.getElementById('invoice-notes');

// Quick Electric Calculator Inputs
const invoiceElectOldDisplay = document.getElementById('invoice-elect-old-display');
const invoiceElectNewInput = document.getElementById('invoice-elect-new');

// Format number with dots as thousand separator (e.g. 2.000, 2.500.000)
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Math.round(Number(num)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Convert formatted dot string to raw Number (e.g. "2.500.000" -> 2500000)
function getRawNumber(val) {
    if (!val) return 0;
    return Number(val.toString().replace(/\./g, '')) || 0;
}

// Global dynamic price getters
function getElectricPrice() {
    const price = localStorage.getItem('phongtro_price_electricity');
    return price !== null ? Number(price) : 4000;
}

function getWaterPrice() {
    const price = localStorage.getItem('phongtro_price_water');
    return price !== null ? Number(price) : 30000;
}

function getGarbagePrice() {
    const price = localStorage.getItem('phongtro_price_garbage');
    return price !== null ? Number(price) : 60000;
}

// Extract unit price from detail string (formats like "2 x 30.000", "2x30", etc.)
function extractUnitPrice(detailStr, defaultPrice) {
    if (!detailStr) return defaultPrice;
    let parts = detailStr.split(' x ');
    if (parts.length <= 1) {
        parts = detailStr.split('x');
    }
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1].trim();
        const raw = lastPart.replace(/\./g, '');
        if (!isNaN(raw) && raw !== '') {
            let num = Number(raw);
            if (num < 1000 && num > 0) {
                num = num * 1000;
            }
            return num;
        }
        return lastPart;
    }
    return defaultPrice;
}

// Dynamic input text formatting
function handleNumberInputFormatting(inputElement, onValueChange = null) {
    inputElement.addEventListener('input', (e) => {
        let cursorPosition = e.target.selectionStart;
        let originalLen = e.target.value.length;
        
        // Keep only digits
        let rawVal = e.target.value.replace(/\D/g, '');
        if (rawVal === '') {
            e.target.value = '';
            if (onValueChange) onValueChange(0);
            return;
        }
        
        let numVal = Number(rawVal);
        let formattedVal = formatNumber(numVal);
        e.target.value = formattedVal;
        
        // Correct cursor position to prevent jumping
        let newLen = formattedVal.length;
        cursorPosition = cursorPosition + (newLen - originalLen);
        e.target.setSelectionRange(cursorPosition, cursorPosition);
        
        if (onValueChange) {
            onValueChange(numVal);
        }
    });
}

// Custom Promise-based Confirm dialog overlay
function showCustomConfirm(title, message, isDangerous = false) {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirm-modal');
        const confirmTitle = document.getElementById('confirm-title');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmOkBtn = document.getElementById('confirm-ok-btn');
        const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
        
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        
        if (isDangerous) {
            confirmOkBtn.style.backgroundColor = '#dc2626';
            confirmOkBtn.style.color = '#ffffff';
        } else {
            confirmOkBtn.style.backgroundColor = 'var(--primary)';
            confirmOkBtn.style.color = '#ffffff';
        }
        
        const onOk = () => {
            closeModal();
            resolve(true);
        };
        
        const onCancel = () => {
            closeModal();
            resolve(false);
        };
        
        const closeModal = () => {
            confirmModal.classList.remove('open');
            confirmOkBtn.removeEventListener('click', onOk);
            confirmCancelBtn.removeEventListener('click', onCancel);
        };
        
        confirmOkBtn.addEventListener('click', onOk);
        confirmCancelBtn.addEventListener('click', onCancel);
        confirmModal.classList.add('open');
    });
}

// Custom Toast Notification popup
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initDatePicker(); // Initialize date variables before navigation restore
    initNavigation();
    initModal1Events();
    initModal2Events();
    initModal3Events();
    initFilterEvents();
    initScrollHeaderEvents();
    initAdvancedEvents();
    
    // Bind formatting to Modal 1 inputs
    handleNumberInputFormatting(rentalPriceInput);
    handleNumberInputFormatting(electricityInput);
    handleNumberInputFormatting(depositInput);
    
    // Bind formatting to Modal 3 electric input
    handleNumberInputFormatting(invoiceElectNewInput, () => {
        updateElectricityRow();
    });
});

// Sidebar collapse and mobile toggle logic
function initSidebar() {
    const sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (sidebarCollapsed && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
    }
    
    toggleSidebarBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open-mobile');
        } else {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
        }
    });

    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open-mobile');
        });
    }

    // Close sidebar on mobile when navigating
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open-mobile');
            }
        });
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open-mobile')) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isClickOnToggle = mobileNavToggle && (mobileNavToggle === e.target || mobileNavToggle.contains(e.target));
            if (!isClickInsideSidebar && !isClickOnToggle) {
                sidebar.classList.remove('open-mobile');
            }
        }
    });
}

// Switch tab layout and render corresponding content
function switchTab(tabName) {
    localStorage.setItem('phongtro_active_tab', tabName);
    
    // Reset active classes
    navHome.classList.remove('active');
    navStatus.classList.remove('active');
    if (navAdvanced) navAdvanced.classList.remove('active');
    
    // Hide all panels
    homeDashboard.style.display = 'none';
    statusDashboard.style.display = 'none';
    if (advancedDashboard) advancedDashboard.style.display = 'none';
    
    const filterDropdown = document.getElementById('status-filter-dropdown');
    
    if (tabName === 'home') {
        navHome.classList.add('active');
        homeDashboard.style.display = 'block';
        if (filterDropdown) filterDropdown.style.display = 'none';
        
        viewingMonth = currentMonth;
        viewingYear = currentYear;
        updateDateDisplay();
        
        if (prevMonthBtn) prevMonthBtn.style.display = 'none';
        if (nextMonthBtn) nextMonthBtn.style.display = 'none';
        
        renderDashboard();
    } else if (tabName === 'status') {
        navStatus.classList.add('active');
        statusDashboard.style.display = 'block';
        if (filterDropdown) filterDropdown.style.display = 'block';
        
        viewingMonth = currentMonth;
        viewingYear = currentYear;
        updateDateDisplay();
        
        if (prevMonthBtn) {
            prevMonthBtn.style.display = 'flex';
            prevMonthBtn.style.visibility = 'visible';
        }
        if (nextMonthBtn) {
            nextMonthBtn.style.display = 'flex';
            nextMonthBtn.style.visibility = 'visible';
        }
        updateNavigationButtons();
        
        renderStatusDashboard();
    } else if (tabName === 'advanced') {
        if (navAdvanced) navAdvanced.classList.add('active');
        if (advancedDashboard) advancedDashboard.style.display = 'block';
        if (filterDropdown) filterDropdown.style.display = 'none';
        
        if (prevMonthBtn) prevMonthBtn.style.display = 'none';
        if (nextMonthBtn) nextMonthBtn.style.display = 'none';
    }
}

// Navigation tab switching
function initNavigation() {
    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('home');
    });

    navStatus.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('status');
    });

    if (navAdvanced) {
        navAdvanced.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('advanced');
        });
    }

    // Restore active tab on load/reload
    const savedTab = localStorage.getItem('phongtro_active_tab') || 'home';
    switchTab(savedTab);
}

function initFilterEvents() {
    const filterBtn = document.getElementById('status-filter-btn');
    const dropdownContent = document.getElementById('filter-dropdown-content');
    const filterLabel = document.getElementById('filter-label');
    
    if (!filterBtn || !dropdownContent) return;
    
    // Toggle dropdown visibility
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdownContent.classList.remove('show');
    });
    
    // Handle filter item clicks
    dropdownContent.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Update active class
            dropdownContent.querySelectorAll('a').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            // Get chosen filter
            currentStatusFilter = item.getAttribute('data-filter');
            
            // Update button label
            const filterNames = {
                thanhtien: 'Bộ lọc: Tổng quan',
                phong: 'Bộ lọc: Tiền Phòng',
                dien: 'Bộ lọc: Tiền Điện',
                nuoc: 'Bộ lọc: Tiền Nước',
                rac: 'Bộ lọc: Tiền Rác'
            };
            filterLabel.textContent = filterNames[currentStatusFilter] || 'Bộ lọc';
            
            // Close dropdown
            dropdownContent.classList.remove('show');
            
            // Re-render Status Dashboard
            renderStatusDashboard();
        });
    });
}

function initScrollHeaderEvents() {
    let lastScrollTop = 0;
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;
    
    window.addEventListener('scroll', () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Hide only if scrolled down past the height of the header
        if (scrollTop > lastScrollTop && scrollTop > 70) {
            // Scrolling down
            topBar.classList.add('hide-header');
        } else {
            // Scrolling up
            topBar.classList.remove('hide-header');
        }
        
        // Prevent negative values on mobile elastic scroll
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });
}

function getRecentMonthsRange() {
    const range = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        range.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }
    return range;
}

function updateNavigationButtons() {
    const range = getRecentMonthsRange();
    const index = range.findIndex(item => item.month === viewingMonth && item.year === viewingYear);
    
    if (prevMonthBtn) {
        prevMonthBtn.style.visibility = (index === 0) ? 'hidden' : 'visible';
    }
    if (nextMonthBtn) {
        nextMonthBtn.style.visibility = (index === range.length - 1) ? 'hidden' : 'visible';
    }
}

function getFilteredAmount(invoice, filterType) {
    if (!invoice) return 0;
    if (filterType === 'thanhtien') {
        return Number(invoice.totalAmount) || 0;
    }
    
    if (!invoice.rows || !Array.isArray(invoice.rows)) return 0;
    
    let sum = 0;
    invoice.rows.forEach(row => {
        const nameNormalized = (row.name || '').toLowerCase().trim();
        if (filterType === 'phong' && (nameNormalized.startsWith('phòng') || nameNormalized === 'phòng' || nameNormalized === 'phong')) {
            sum += Number(row.amount) || 0;
        } else if (filterType === 'dien' && (nameNormalized.startsWith('điện') || nameNormalized === 'điện' || nameNormalized === 'dien')) {
            sum += Number(row.amount) || 0;
        } else if (filterType === 'nuoc' && (nameNormalized.startsWith('nước') || nameNormalized === 'nước' || nameNormalized === 'nuoc')) {
            sum += Number(row.amount) || 0;
        } else if (filterType === 'rac' && (nameNormalized.includes('rác') || nameNormalized.includes('rac'))) {
            sum += Number(row.amount) || 0;
        }
    });
    return sum;
}

function renderStatusDashboard() {
    statusTablesContainer.innerHTML = '';
    
    const isCurrentMonth = (viewingMonth === currentMonth && viewingYear === currentYear);
    
    const activeRooms = isCurrentMonth ? getActiveRooms() : {};
    const monthKey = getStorageKey(viewingMonth, viewingYear);
    const monthData = localStorage.getItem(monthKey) ? JSON.parse(localStorage.getItem(monthKey)) : {};
    
    // If past month, we use monthData as the source for activeRooms too
    const roomsSource = isCurrentMonth ? activeRooms : monthData;
    
    let totalAllFloors = 0;
    
    const filterHeaders = {
        thanhtien: 'Thành tiền',
        phong: 'Tiền Phòng',
        dien: 'Tiền Điện',
        nuoc: 'Tiền Nước',
        rac: 'Tiền Rác'
    };
    const column4Header = filterHeaders[currentStatusFilter] || 'Thành tiền';
    
    // Check if we should show the 'Mô tả' (Description) column
    const showDescColumn = (currentStatusFilter !== 'phong' && currentStatusFilter !== 'rac');
    const colspanVal = showDescColumn ? 4 : 3;
    
    FLOOR_CONFIG.forEach(floor => {
        const card = document.createElement('div');
        card.className = 'status-floor-card';
        
        const title = document.createElement('h3');
        title.className = 'floor-title';
        title.textContent = floor.name;
        card.appendChild(title);
        
        const table = document.createElement('table');
        table.className = 'status-table';
        
        const thead = document.createElement('thead');
        if (showDescColumn) {
            thead.innerHTML = `
                <tr>
                    <th style="width: 80px;">STT</th>
                    <th style="width: 150px;">Số phòng</th>
                    <th>Mô tả</th>
                    <th style="width: 200px; text-align: right;">${column4Header}</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th style="width: 80px;">STT</th>
                    <th style="width: 150px;">Số phòng</th>
                    <th style="width: 200px; text-align: right;">${column4Header}</th>
                </tr>
            `;
        }
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        let occupiedIndex = 0;
        
        floor.rooms.forEach(roomId => {
            const roomData = roomsSource[roomId];
            if (roomData && roomData.status === 'occupied') {
                occupiedIndex++;
                
                const invoice = isCurrentMonth 
                    ? (monthData[roomId] ? monthData[roomId].invoice : null)
                    : roomData.invoice;
                
                let descText = '';
                let descClass = '';
                let amountText = '-';
                let amountClass = '';
                
                if (!invoice) {
                    const padMonth = viewingMonth.toString().padStart(2, '0');
                    descText = `Chưa có hóa đơn tháng ${padMonth}/${viewingYear}`;
                    descClass = 'no-invoice';
                    amountText = '-';
                } else if (invoice.paymentStatus === 'unpaid') {
                    descText = 'Chưa đóng tiền';
                    descClass = 'unpaid';
                    amountText = '-';
                } else if (invoice.paymentStatus === 'paid') {
                    amountClass = 'paid';
                    
                    const amountVal = getFilteredAmount(invoice, currentStatusFilter);
                    amountText = formatNumber(amountVal) + ' đ';
                    totalAllFloors += amountVal;
                    
                    // Populate description based on filter
                    if (currentStatusFilter === 'thanhtien') {
                        descText = 'Đã đóng tiền';
                        descClass = 'paid';
                    } else if (currentStatusFilter === 'dien') {
                        const used = (invoice.newElectricity || 0) - (invoice.oldElectricity || 0);
                        const dienRow = invoice.rows ? invoice.rows.find(r => r.name === 'Điện') : null;
                        const price = extractUnitPrice(dienRow ? dienRow.detail : null, getElectricPrice());
                        descText = `${formatNumber(used)} x ${typeof price === 'number' ? formatNumber(price) : price}`;
                        descClass = 'info';
                    } else if (currentStatusFilter === 'nuoc') {
                        const nuocRow = invoice.rows ? invoice.rows.find(r => r.name === 'Nước') : null;
                        const price = extractUnitPrice(nuocRow ? nuocRow.detail : null, getWaterPrice());
                        descText = `${roomData.occupants || 1} x ${typeof price === 'number' ? formatNumber(price) : price}`;
                        descClass = 'info';
                    }
                }
                
                const statusAcClass = roomData.ac === 'yes' ? 'ac-yes' : 'ac-no';
                const tr = document.createElement('tr');
                if (showDescColumn) {
                    tr.innerHTML = `
                        <td>${occupiedIndex}</td>
                        <td><span class="room-no-badge ${statusAcClass}">${roomId}</span></td>
                        <td><span class="status-badge-pill ${descClass}">${descText}</span></td>
                        <td class="amount ${amountClass}" style="text-align: right;">${amountText}</td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td>${occupiedIndex}</td>
                        <td><span class="room-no-badge ${statusAcClass}">${roomId}</span></td>
                        <td class="amount ${amountClass}" style="text-align: right;">${amountText}</td>
                    `;
                }
                tbody.appendChild(tr);
            }
        });
        
        if (occupiedIndex === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="${colspanVal}" class="empty-status-row">Không có phòng nào đang thuê ở tầng này.</td>
            `;
            tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);
        card.appendChild(table);
        statusTablesContainer.appendChild(card);
    });
    
    // Update the footer title dynamically based on selected filter
    const footerTitles = {
        thanhtien: 'Tổng tiền thực thu (3 tầng):',
        phong: 'Tổng tiền Phòng thực thu (3 tầng):',
        dien: 'Tổng tiền Điện thực thu (3 tầng):',
        nuoc: 'Tổng tiền Nước thực thu (3 tầng):',
        rac: 'Tổng tiền Rác thực thu (3 tầng):'
    };
    const summaryTitleEl = document.getElementById('status-summary-title');
    if (summaryTitleEl) {
        summaryTitleEl.textContent = footerTitles[currentStatusFilter] || 'Tổng tiền thực thu (3 tầng):';
    }
    
    // Update the total sum in the summary footer
    statusTotalValue.textContent = formatNumber(totalAllFloors) + ' đ';
}

// Date Picker (Month & Year) logic
function initDatePicker() {
    const now = new Date();
    currentMonth = now.getMonth() + 1;
    currentYear = now.getFullYear();
    
    viewingMonth = currentMonth;
    viewingYear = currentYear;
    
    updateDateDisplay();
    
    if (prevMonthBtn) prevMonthBtn.style.display = 'none';
    if (nextMonthBtn) nextMonthBtn.style.display = 'none';
    
    prevMonthBtn.addEventListener('click', () => {
        const range = getRecentMonthsRange();
        const index = range.findIndex(item => item.month === viewingMonth && item.year === viewingYear);
        if (index > 0) {
            const prev = range[index - 1];
            viewingMonth = prev.month;
            viewingYear = prev.year;
            updateDateDisplay();
            updateNavigationButtons();
            renderStatusDashboard();
        }
    });
    
    nextMonthBtn.addEventListener('click', () => {
        const range = getRecentMonthsRange();
        const index = range.findIndex(item => item.month === viewingMonth && item.year === viewingYear);
        if (index !== -1 && index < range.length - 1) {
            const next = range[index + 1];
            viewingMonth = next.month;
            viewingYear = next.year;
            updateDateDisplay();
            updateNavigationButtons();
            renderStatusDashboard();
        }
    });
}

function updateDateDisplay() {
    const formattedMonth = viewingMonth.toString().padStart(2, '0');
    monthYearDisplay.textContent = `Tháng ${formattedMonth} / ${viewingYear}`;
}

// Data Handling (Local Storage)
function getActiveRooms() {
    const key = 'phongtro_rooms_active';
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    
    // Fallback: search for the newest month data in localStorage
    let newestKey = null;
    let newestYear = 0;
    let newestMonth = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('phongtro_data_')) {
            const parts = k.split('_');
            if (parts.length >= 4) {
                const month = parseInt(parts[2]);
                const year = parseInt(parts[3]);
                if (year > newestYear || (year === newestYear && month > newestMonth)) {
                    newestYear = year;
                    newestMonth = month;
                    newestKey = k;
                }
            }
        }
    }
    
    if (newestKey) {
        try {
            const fallbackRaw = localStorage.getItem(newestKey);
            if (fallbackRaw) {
                const fallbackData = JSON.parse(fallbackRaw);
                const active = {};
                for (const rId in fallbackData) {
                    active[rId] = { ...fallbackData[rId] };
                    delete active[rId].invoice;
                }
                localStorage.setItem(key, JSON.stringify(active));
                return active;
            }
        } catch (e) {
            console.error('Fallback load error:', e);
        }
    }
    return {};
}

function saveActiveRooms(activeRooms) {
    localStorage.setItem('phongtro_rooms_active', JSON.stringify(activeRooms));
    if (window.db) {
        db.ref('rooms_active').set(activeRooms);
    }
}

function getStorageKey(month, year) {
    return `phongtro_data_${month}_${year}`;
}

// Rendering Dashboard Room Grid
function renderDashboard() {
    floorsContainer.innerHTML = '';
    const roomDataMap = getActiveRooms();
    
    FLOOR_CONFIG.forEach(floor => {
        const floorSection = document.createElement('div');
        floorSection.className = 'floor-section';
        
        // Floor Header
        const floorHeader = document.createElement('div');
        floorHeader.className = 'floor-header';
        
        const floorTitle = document.createElement('h3');
        floorTitle.className = 'floor-title';
        floorTitle.textContent = floor.name;
        
        const floorLine = document.createElement('div');
        floorLine.className = 'floor-line';
        
        floorHeader.appendChild(floorTitle);
        floorHeader.appendChild(floorLine);
        floorSection.appendChild(floorHeader);
        
        // Rooms Grid
        const roomsGrid = document.createElement('div');
        roomsGrid.className = 'rooms-grid';
        
        floor.rooms.forEach(roomId => {
            const roomData = roomDataMap[roomId];
            const isOccupied = roomData && roomData.status === 'occupied';
            
            const roomCard = document.createElement('div');
            const acClass = isOccupied ? (roomData.ac === 'yes' ? 'ac-yes' : 'ac-no') : '';
            roomCard.className = `room-card ${isOccupied ? `state-occupied ${acClass}` : 'state-vacant'}`;
            roomCard.setAttribute('data-room-id', roomId);
            
            // Room Number Label
            const roomNumber = document.createElement('div');
            roomNumber.className = 'room-number';
            roomNumber.textContent = roomId;
            roomCard.appendChild(roomNumber);
            
            // Status Badge
            const statusBadge = document.createElement('span');
            statusBadge.className = 'room-status-badge';
            statusBadge.textContent = isOccupied ? 'Đã thuê' : 'Trống';
            roomCard.appendChild(statusBadge);
            
            // Tenant Name (if rented)
            if (isOccupied && roomData.tenantName) {
                const tenantName = document.createElement('div');
                tenantName.className = 'room-tenant';
                tenantName.textContent = roomData.tenantName;
                roomCard.appendChild(tenantName);
            }
            
            // Occupant Count Badge (if rented)
            if (isOccupied) {
                const occupantBadge = document.createElement('span');
                occupantBadge.className = `room-card-badge ${acClass}`;
                occupantBadge.textContent = roomData.occupants || '1';
                roomCard.appendChild(occupantBadge);
            }
            
            // Click Handler
            roomCard.addEventListener('click', () => {
                openRoomDialogFlow(roomId);
            });
            
            roomsGrid.appendChild(roomCard);
        });
        
        floorSection.appendChild(roomsGrid);
        floorsContainer.appendChild(floorSection);
    });
}

function openRoomDialogFlow(roomId) {
    const roomDataMap = getActiveRooms();
    const roomData = roomDataMap[roomId];
    
    if (roomData && roomData.status === 'occupied') {
        openRoomSummaryModal(roomId);
    } else {
        openRoomEditModal(roomId);
    }
}

// Modal 1: Room Register/Edit Info
function initModal1Events() {
    closeModalBtn.addEventListener('click', closeRoomEditModal);
    cancelModalBtn.addEventListener('click', closeRoomEditModal);
    roomModal.addEventListener('click', (e) => {
        if (e.target === roomModal) closeRoomEditModal();
    });
    
    roomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const activeRooms = getActiveRooms();
        
        const data = {
            status: 'occupied',
            tenantName: tenantNameInput.value.trim(),
            tenantPhone: tenantPhoneInput.value.trim(),
            rentalPrice: getRawNumber(rentalPriceInput.value),
            electricity: getRawNumber(electricityInput.value),
            occupants: occupantsCountSelect.value,
            ac: acOptionSelect.value,
            deposit: depositInput.value.trim() ? getRawNumber(depositInput.value) : 0
        };
        
        activeRooms[selectedRoomId] = data;
        saveActiveRooms(activeRooms);
        renderDashboard();
        closeRoomEditModal();
        
        // Immediately open Modal 2 (Summary)
        openRoomSummaryModal(selectedRoomId);
    });
}

function openRoomEditModal(roomId) {
    selectedRoomId = roomId;
    modalRoomId.textContent = roomId;
    roomForm.reset();
    
    const roomDataMap = getActiveRooms();
    const roomData = roomDataMap[roomId];
    
    if (roomData && roomData.status === 'occupied') {
        tenantNameInput.value = roomData.tenantName || '';
        tenantPhoneInput.value = roomData.tenantPhone || '';
        rentalPriceInput.value = roomData.rentalPrice ? formatNumber(roomData.rentalPrice) : '';
        electricityInput.value = roomData.electricity ? formatNumber(roomData.electricity) : '';
        occupantsCountSelect.value = roomData.occupants || '1';
        acOptionSelect.value = roomData.ac || 'no';
        depositInput.value = roomData.deposit ? formatNumber(roomData.deposit) : '';
    } else {
        depositInput.value = '';
        if (roomData && roomData.status === 'vacant') {
            electricityInput.value = roomData.electricity ? formatNumber(roomData.electricity) : '';
        }
    }
    
    roomModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeRoomEditModal() {
    roomModal.classList.remove('open');
    document.body.style.overflow = '';
}

// Modal 2: Room Summary Info
function initModal2Events() {
    closeSummaryModalBtn.addEventListener('click', closeRoomSummaryModal);
    roomSummaryModal.addEventListener('click', (e) => {
        if (e.target === roomSummaryModal) closeRoomSummaryModal();
    });
    
    summaryEditBtn.addEventListener('click', () => {
        const roomId = selectedRoomId;
        closeRoomSummaryModal();
        openRoomEditModal(roomId);
    });
    
    summaryInvoiceBtn.addEventListener('click', () => {
        closeRoomSummaryModal();
        openInvoiceModal();
    });
    
    summaryDeleteBtn.addEventListener('click', async () => {
        const ok = await showCustomConfirm(
            'Xóa người thuê',
            `Bạn có chắc chắn muốn xóa người thuê (Trả phòng) của phòng ${selectedRoomId}? Dữ liệu khách thuê sẽ bị xóa nhưng chỉ số điện vẫn được giữ lại.`,
            true
        );
        if (ok) {
            const activeRooms = getActiveRooms();
            const existingRoom = activeRooms[selectedRoomId] || {};
            const preservedElectricity = existingRoom.electricity || 0;
            
            const vacantData = {
                status: 'vacant',
                electricity: preservedElectricity
            };
            
            activeRooms[selectedRoomId] = vacantData;
            saveActiveRooms(activeRooms);
            renderDashboard();
            closeRoomSummaryModal();
        }
    });
}

function openRoomSummaryModal(roomId) {
    selectedRoomId = roomId;
    summaryRoomId.textContent = roomId;
    
    const roomDataMap = getActiveRooms();
    const roomData = roomDataMap[roomId];
    if (!roomData) return;
    
    summaryViewDetailsLink.href = `invoice.html?room=${roomId}`;
    
    summaryTenantName.textContent = roomData.tenantName || '---';
    summaryTenantPhone.textContent = roomData.tenantPhone || '---';
    summaryRentalPrice.textContent = roomData.rentalPrice ? formatNumber(roomData.rentalPrice) + ' đ' : '0 đ';
    summaryElectricity.textContent = roomData.electricity ? formatNumber(roomData.electricity) + ' kWh' : '0 kWh';
    summaryOccupants.textContent = roomData.occupants ? roomData.occupants + ' người' : '1 người';
    
    const summaryDeposit = document.getElementById('summary-deposit');
    if (summaryDeposit) {
        summaryDeposit.textContent = roomData.deposit ? formatNumber(roomData.deposit) + ' đ' : '0 đ';
    }
    
    summaryAc.textContent = roomData.ac === 'yes' ? 'Có' : 'Không';
    summaryAc.className = 'summary-value ' + (roomData.ac === 'yes' ? 'ac-yes' : 'ac-no');
    
    roomSummaryModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeRoomSummaryModal() {
    roomSummaryModal.classList.remove('open');
    document.body.style.overflow = '';
}

// Modal 3: Invoice Modal
function initModal3Events() {
    closeInvoiceModalBtn.addEventListener('click', closeInvoiceModal);
    cancelModalBtn.addEventListener('click', closeInvoiceModal);
    invoiceModal.addEventListener('click', (e) => {
        if (e.target === invoiceModal) closeInvoiceModal();
    });
    
    invoiceAddRowBtn.addEventListener('click', () => {
        const rowCount = invoiceTableBody.querySelectorAll('.invoice-table-row').length;
        renderInvoiceRow(rowCount + 1, { name: '', detail: '', amount: 0 });
        calculateTotalSum();
    });
    
    exportInvoiceImgBtn.addEventListener('click', () => {
        drawInvoiceCanvas();
    });
    
    invoiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const paymentStatus = invoicePaymentStatusSelect.value;
        if (paymentStatus === 'paid') {
            const ok = await showCustomConfirm(
                'Xác nhận đóng tiền',
                'Bạn có chắc chắn muốn lưu hóa đơn này với trạng thái "Đã đóng tiền"? Sau khi lưu, trạng thái này không thể chuyển lại thành "Chưa đóng tiền".',
                false
            );
            if (!ok) return;
        }
        
        saveInvoiceData();
    });

    // Auto electricity calculator bindings
    invoiceElectNewInput.addEventListener('input', () => {
        updateElectricityRow();
    });

    // Date change listener
    invoiceDateInput.addEventListener('change', () => {
        const selectedDateVal = invoiceDateInput.value;
        if (!selectedDateVal) return;
        
        const parts = selectedDateVal.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        
        loadInvoiceForMonthYear(selectedRoomId, month, year, selectedDateVal);
    });
}

function openInvoiceModal() {
    invoiceModalRoomId.textContent = selectedRoomId;
    invoiceTableBody.innerHTML = '';
    
    const activeRooms = getActiveRooms();
    const roomData = activeRooms[selectedRoomId];
    if (!roomData) return;
    
    invoiceViewDetailsLink.href = `invoice.html?room=${selectedRoomId}`;
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayDateStr = `${yyyy}-${mm}-${dd}`;
    
    invoiceDateInput.value = todayDateStr;
    
    loadInvoiceForMonthYear(selectedRoomId, today.getMonth() + 1, today.getFullYear(), todayDateStr);
    
    invoiceModal.classList.add('open');
}

function loadInvoiceForMonthYear(roomId, month, year, selectedDateVal) {
    const key = getStorageKey(month, year);
    const monthData = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : {};
    const roomDataInMonth = monthData[roomId];
    
    const activeRooms = getActiveRooms();
    const activeRoom = activeRooms[roomId] || {};
    
    let oldElect = activeRoom.electricity || 0;
    let savedInvoice = null;
    
    if (roomDataInMonth && roomDataInMonth.invoice) {
        savedInvoice = roomDataInMonth.invoice;
        oldElect = savedInvoice.oldElectricity !== undefined ? savedInvoice.oldElectricity : oldElect;
    }
    
    invoiceElectOldDisplay.textContent = formatNumber(oldElect);
    
    invoiceTableBody.innerHTML = '';
    
    if (savedInvoice && savedInvoice.rows && savedInvoice.rows.length > 0) {
        invoicePaymentStatusSelect.value = savedInvoice.paymentStatus || 'unpaid';
        invoiceNotesTextarea.value = savedInvoice.notes || '';
        invoiceElectNewInput.value = savedInvoice.newElectricity ? formatNumber(savedInvoice.newElectricity) : '';
        
        if (savedInvoice.paymentStatus === 'paid') {
            invoicePaymentStatusSelect.disabled = true;
        } else {
            invoicePaymentStatusSelect.disabled = false;
        }
        
        savedInvoice.rows.forEach((row, i) => {
            renderInvoiceRow(i + 1, row);
        });
    } else {
        invoicePaymentStatusSelect.disabled = false;
        invoicePaymentStatusSelect.value = 'unpaid';
        invoiceNotesTextarea.value = '';
        invoiceElectNewInput.value = '';
        
        const price = activeRoom.rentalPrice || 0;
        renderInvoiceRow(1, { name: 'Phòng', detail: `Tháng ${month}/${year}`, amount: price });
        
        const electPrice = getElectricPrice();
        renderInvoiceRow(2, { name: 'Điện', detail: `(Chưa ghi mới) x ${formatNumber(electPrice)}`, amount: 0 });
        
        const occupants = Number(activeRoom.occupants) || 1;
        const waterPrice = getWaterPrice();
        renderInvoiceRow(3, { name: 'Nước', detail: `${occupants} x ${formatNumber(waterPrice)}`, amount: occupants * waterPrice });
        
        const garbagePrice = getGarbagePrice();
        renderInvoiceRow(4, { name: 'Đổ rác', detail: '', amount: garbagePrice });
    }
    
    calculateTotalSum();
}

function closeInvoiceModal() {
    invoiceModal.classList.remove('open');
}

function renderInvoiceRow(stt, item) {
    const tr = document.createElement('tr');
    tr.className = 'invoice-table-row';
    
    const tdStt = document.createElement('td');
    tdStt.className = 'td-stt';
    tdStt.textContent = stt;
    tr.appendChild(tdStt);
    
    const tdKhoan = document.createElement('td');
    const inputKhoan = document.createElement('input');
    inputKhoan.type = 'text';
    inputKhoan.className = 'invoice-input invoice-item-name';
    inputKhoan.value = item.name || '';
    inputKhoan.placeholder = 'Khoản thu';
    tdKhoan.appendChild(inputKhoan);
    tr.appendChild(tdKhoan);
    
    const tdDetail = document.createElement('td');
    const inputDetail = document.createElement('input');
    inputDetail.type = 'text';
    inputDetail.className = 'invoice-input invoice-item-detail';
    inputDetail.value = item.detail || '';
    inputDetail.placeholder = 'Chi tiết';
    tdDetail.appendChild(inputDetail);
    tr.appendChild(tdDetail);
    
    const tdAmount = document.createElement('td');
    const inputAmount = document.createElement('input');
    inputAmount.type = 'text';
    inputAmount.className = 'invoice-input invoice-amount-input';
    inputAmount.value = formatNumber(item.amount || 0);
    inputAmount.placeholder = 'Thành tiền';
    handleNumberInputFormatting(inputAmount, (numVal) => {
        calculateTotalSum();
    });
    tdAmount.appendChild(inputAmount);
    tr.appendChild(tdAmount);
    
    const tdAction = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'invoice-action-btn';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    `;
    deleteBtn.addEventListener('click', () => {
        tr.remove();
        reindexSTT();
        calculateTotalSum();
    });
    tdAction.appendChild(deleteBtn);
    tr.appendChild(tdAction);
    
    invoiceTableBody.appendChild(tr);
}

function reindexSTT() {
    const rows = invoiceTableBody.querySelectorAll('.invoice-table-row');
    rows.forEach((row, index) => {
        row.querySelector('.td-stt').textContent = index + 1;
    });
}

function calculateTotalSum() {
    let total = 0;
    const inputs = invoiceTableBody.querySelectorAll('.invoice-amount-input');
    inputs.forEach(input => {
        total += getRawNumber(input.value);
    });
    invoiceTotalDisplay.textContent = formatNumber(total) + ' đ';
    return total;
}

function updateElectricityRow() {
    const oldElect = getRawNumber(invoiceElectOldDisplay.textContent);
    const newElectVal = invoiceElectNewInput.value;
    
    if (newElectVal === '') return;
    
    const newElect = getRawNumber(newElectVal);
    const used = Math.max(0, newElect - oldElect);
    const electPrice = getElectricPrice();
    const amount = used * electPrice;
    const detailText = `(${formatNumber(newElect)}-${formatNumber(oldElect)})=${formatNumber(used)} x ${formatNumber(electPrice)}`;
    
    const rows = invoiceTableBody.querySelectorAll('.invoice-table-row');
    let electRow = null;
    rows.forEach(row => {
        const nameInput = row.querySelector('.invoice-item-name');
        if (nameInput && nameInput.value.trim() === 'Điện') {
            electRow = row;
        }
    });
    
    if (electRow) {
        const detailInput = electRow.querySelector('.invoice-item-detail');
        const amountInput = electRow.querySelector('.invoice-amount-input');
        
        detailInput.value = detailText;
        amountInput.value = formatNumber(amount);
        
        calculateTotalSum();
    }
}

function saveInvoiceData() {
    const selectedDateVal = invoiceDateInput.value;
    if (!selectedDateVal) {
        alert('Vui lòng chọn ngày lập hóa đơn!');
        return;
    }
    
    const parts = selectedDateVal.split('-');
    const invoiceYear = parseInt(parts[0]);
    const invoiceMonth = parseInt(parts[1]);
    
    const rows = [];
    const tableRows = invoiceTableBody.querySelectorAll('.invoice-table-row');
    tableRows.forEach(row => {
        const name = row.querySelector('.invoice-item-name').value.trim();
        const detail = row.querySelector('.invoice-item-detail').value.trim();
        const amount = getRawNumber(row.querySelector('.invoice-amount-input').value);
        if (name) {
            rows.push({ name, detail, amount });
        }
    });
    
    const oldElect = getRawNumber(invoiceElectOldDisplay.textContent);
    
    const invoiceData = {
        paymentStatus: invoicePaymentStatusSelect.value,
        invoiceDate: selectedDateVal,
        oldElectricity: oldElect,
        newElectricity: invoiceElectNewInput.value ? getRawNumber(invoiceElectNewInput.value) : null,
        rows: rows,
        notes: invoiceNotesTextarea.value.trim(),
        totalAmount: calculateTotalSum()
    };
    
    const key = getStorageKey(invoiceMonth, invoiceYear);
    const monthData = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : {};
    
    const activeRooms = getActiveRooms();
    const activeRoom = activeRooms[selectedRoomId];
    
    if (activeRoom) {
        monthData[selectedRoomId] = {
            ...activeRoom,
            invoice: invoiceData
        };
        localStorage.setItem(key, JSON.stringify(monthData));
        if (window.db) {
            const firebaseKey = `${invoiceMonth}_${invoiceYear}`;
            db.ref(`monthly_data/${firebaseKey}`).set(monthData);
        }
        
        const newElectVal = invoiceElectNewInput.value.trim();
        if (newElectVal !== '') {
            const newElect = getRawNumber(newElectVal);
            activeRoom.electricity = newElect;
            saveActiveRooms(activeRooms);
        }
        
        limitInvoiceHistory(selectedRoomId);
    }
    
    closeInvoiceModal();
    renderDashboard();
}

function limitInvoiceHistory(roomId) {
    const history = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('phongtro_data_')) {
            const parts = key.split('_');
            if (parts.length >= 4) {
                const month = parseInt(parts[2]);
                const year = parseInt(parts[3]);
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data[roomId] && data[roomId].invoice) {
                        history.push({
                            key: key,
                            year: year,
                            month: month
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }
    
    history.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
    
    if (history.length > 12) {
        for (let i = 12; i < history.length; i++) {
            const keyToDelete = history[i].key;
            try {
                const data = JSON.parse(localStorage.getItem(keyToDelete));
                if (data && data[roomId]) {
                    delete data[roomId].invoice;
                    localStorage.setItem(keyToDelete, JSON.stringify(data));
                    if (window.db) {
                        const parts = keyToDelete.split('_');
                        const firebaseKey = `${parts[2]}_${parts[3]}`;
                        db.ref(`monthly_data/${firebaseKey}`).set(data);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
}

function drawInvoiceCanvas() {
    const activeRooms = getActiveRooms();
    const roomData = activeRooms[selectedRoomId];
    if (!roomData) return;
    
    const tenantName = roomData.tenantName || '---';
    const floorName = selectedRoomId.startsWith('MT') ? 'Tầng trệt' : 
                      (selectedRoomId.startsWith('1') ? 'Tầng 1' : 'Tầng 2');
    
    const paymentStatus = invoicePaymentStatusSelect.value;
    const notes = invoiceNotesTextarea.value.trim();
    
    const selectedDateVal = invoiceDateInput.value;
    if (!selectedDateVal) {
        alert('Vui lòng chọn ngày lập hóa đơn!');
        return;
    }
    const parts = selectedDateVal.split('-');
    const invoiceYear = parseInt(parts[0]);
    const invoiceMonth = parseInt(parts[1]);
    
    const rows = [];
    const tableRows = invoiceTableBody.querySelectorAll('.invoice-table-row');
    tableRows.forEach(row => {
        const name = row.querySelector('.invoice-item-name').value.trim();
        const detail = row.querySelector('.invoice-item-detail').value.trim();
        const amount = getRawNumber(row.querySelector('.invoice-amount-input').value);
        if (name) {
            rows.push({ name, detail, amount });
        }
    });
    
    const totalAmount = calculateTotalSum();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scale = 2;
    const canvasWidth = 600;
    const rowHeight = 35;
    const canvasHeight = 520 + (rows.length * rowHeight) + (notes ? 60 : 0);
    
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;
    ctx.scale(scale, scale);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    const margin = 40;
    const contentWidth = canvasWidth - (margin * 2);
    
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HÓA ĐƠN THANH TOÁN', canvasWidth / 2, 60);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Kỳ thanh toán: Tháng ${invoiceMonth.toString().padStart(2, '0')} / ${invoiceYear}`, canvasWidth / 2, 82);
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, 100);
    ctx.lineTo(canvasWidth - margin, 100);
    ctx.stroke();
    
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Thông tin phòng:', margin, 125);
    
    ctx.font = 'normal 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Tầng: ${floorName}`, margin, 145);
    ctx.fillText(`Số phòng: ${selectedRoomId}`, margin, 165);
    ctx.fillText(`Khách thuê: ${tenantName}`, margin, 185);
    
    const dateString = `${parts[2]}/${parts[1]}/${parts[0]}`;
    ctx.fillText(`Ngày lập: ${dateString}`, canvasWidth - margin - 180, 145);
    ctx.fillText(`Máy lạnh tự lắp: ${roomData.ac === 'yes' ? 'Có' : 'Không'}`, canvasWidth - margin - 180, 165);
    ctx.fillText(`Tiền cọc: ${roomData.deposit ? formatNumber(roomData.deposit) + ' đ' : 'Không'}`, canvasWidth - margin - 180, 185);
    
    ctx.save();
    if (paymentStatus === 'paid') {
        ctx.strokeStyle = '#166534';
        ctx.fillStyle = '#f0fdf4';
        ctx.lineWidth = 2;
        roundRect(ctx, canvasWidth - margin - 150, 200, 145, 30, 6, true, true);
        ctx.fillStyle = '#166534';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ĐÃ ĐÓNG TIỀN', canvasWidth - margin - 77, 219);
    } else {
        ctx.strokeStyle = '#b91c1c';
        ctx.fillStyle = '#fef2f2';
        ctx.lineWidth = 2;
        roundRect(ctx, canvasWidth - margin - 150, 200, 145, 30, 6, true, true);
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CHƯA ĐÓNG TIỀN', canvasWidth - margin - 77, 219);
    }
    ctx.restore();
    
    let y = 255;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(margin, y, contentWidth, 32);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(margin, y, contentWidth, 32);
    
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STT', margin + 12, y + 21);
    ctx.fillText('Khoản thu', margin + 55, y + 21);
    ctx.fillText('Chi tiết', margin + 205, y + 21);
    ctx.textAlign = 'right';
    ctx.fillText('Thành tiền (đ)', canvasWidth - margin - 12, y + 21);
    
    y += 32;
    ctx.font = 'normal 13px "Plus Jakarta Sans", sans-serif';
    
    rows.forEach((row, i) => {
        if (i % 2 === 1) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(margin, y, contentWidth, rowHeight);
        }
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(margin, y, contentWidth, rowHeight);
        
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText((i + 1).toString(), margin + 12, y + 22);
        
        ctx.fillStyle = '#0f172a';
        ctx.fillText(row.name, margin + 55, y + 22);
        
        ctx.fillStyle = '#64748b';
        ctx.fillText(row.detail || '-', margin + 205, y + 22);
        
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'right';
        ctx.fillText(formatNumber(row.amount), canvasWidth - margin - 12, y + 22);
        
        y += rowHeight;
    });
    
    y += 15;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Tổng cộng:', margin, y + 10);
    
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#4f46e5';
    ctx.textAlign = 'right';
    ctx.fillText(`${formatNumber(totalAmount)} đ`, canvasWidth - margin, y + 12);
    
    y += 40;
    
    if (notes) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(margin, y, contentWidth, 45);
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(margin, y, contentWidth, 45);
        
        ctx.fillStyle = '#475569';
        ctx.font = 'italic 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Ghi chú: ${notes}`, margin + 12, y + 26);
        
        y += 70;
    }
    
    ctx.fillStyle = '#475569';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Khách thuê', margin + 80, y);
    ctx.fillText('Người lập biểu', canvasWidth - margin - 80, y);
    
    ctx.font = 'italic 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(Ký và ghi rõ họ tên)', margin + 80, y + 18);
    ctx.fillText('(Ký và ghi rõ họ tên)', canvasWidth - margin - 80, y + 18);
    
    const link = document.createElement('a');
    const stateStr = paymentStatus === 'paid' ? 'DaDong' : 'ChuaDong';
    link.download = `HoaDon_${selectedRoomId}_Thang${invoiceMonth}_${invoiceYear}_${stateStr}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

// ----------------------------------------------------
// ADVANCED PANEL (NÂNG CAO) EVENT HANDLERS & LOGIC
// ----------------------------------------------------
function initAdvancedEvents() {
    const btnAdvInvoice = document.getElementById('btn-adv-invoice');
    const btnAdvRoom = document.getElementById('btn-adv-room');
    const btnAdvElectric = document.getElementById('btn-adv-electric');
    const btnAdvWater = document.getElementById('btn-adv-water');
    const btnAdvGarbage = document.getElementById('btn-adv-garbage');

    const advInvoiceModal = document.getElementById('adv-invoice-modal');
    const advRoomModal = document.getElementById('adv-room-modal');
    const advElectricModal = document.getElementById('adv-electric-modal');
    const advWaterModal = document.getElementById('adv-water-modal');
    const advGarbageModal = document.getElementById('adv-garbage-modal');

    // Format inputs dynamically
    const roomPriceInput = document.getElementById('adv-room-price');
    if (roomPriceInput) handleNumberInputFormatting(roomPriceInput);

    const electricPriceInput = document.getElementById('adv-electric-price');
    if (electricPriceInput) handleNumberInputFormatting(electricPriceInput);

    const waterPriceInput = document.getElementById('adv-water-price');
    if (waterPriceInput) handleNumberInputFormatting(waterPriceInput);

    const garbagePriceInput = document.getElementById('adv-garbage-price');
    if (garbagePriceInput) handleNumberInputFormatting(garbagePriceInput);

    // 1. INVOICE OVERALL MODAL (HÓA ĐƠN TỔNG HỢP)
    let advViewingMonth = currentMonth;
    let advViewingYear = currentYear;

    function updateAdvDateDisplay() {
        const advMonthDisplay = document.getElementById('adv-month-display');
        if (advMonthDisplay) {
            const padMonth = advViewingMonth.toString().padStart(2, '0');
            advMonthDisplay.textContent = `Tháng ${padMonth} / ${advViewingYear}`;
        }
    }

    if (btnAdvInvoice) {
        btnAdvInvoice.addEventListener('click', () => {
            advViewingMonth = viewingMonth; // Sync with currently selected viewing date
            advViewingYear = viewingYear;
            updateAdvDateDisplay();
            advInvoiceModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeAdvInvoice = () => {
        advInvoiceModal.classList.remove('open');
        document.body.style.overflow = '';
    };

    document.getElementById('close-adv-invoice-btn')?.addEventListener('click', closeAdvInvoice);
    document.getElementById('cancel-adv-invoice-btn')?.addEventListener('click', closeAdvInvoice);

    document.getElementById('adv-prev-month')?.addEventListener('click', () => {
        const range = getRecentMonthsRange();
        const index = range.findIndex(item => item.month === advViewingMonth && item.year === advViewingYear);
        if (index > 0) {
            const prev = range[index - 1];
            advViewingMonth = prev.month;
            advViewingYear = prev.year;
            updateAdvDateDisplay();
        }
    });

    document.getElementById('adv-next-month')?.addEventListener('click', () => {
        const range = getRecentMonthsRange();
        const index = range.findIndex(item => item.month === advViewingMonth && item.year === advViewingYear);
        if (index !== -1 && index < range.length - 1) {
            const next = range[index + 1];
            advViewingMonth = next.month;
            advViewingYear = next.year;
            updateAdvDateDisplay();
        }
    });

    document.getElementById('adv-invoice-submit')?.addEventListener('click', () => {
        window.open(`invoice2.html?month=${advViewingMonth}&year=${advViewingYear}`, '_blank');
        closeAdvInvoice();
    });

    // 2. ROOM BATCH PRICE MODAL (ÁP DỤNG GIÁ PHÒNG)
    if (btnAdvRoom) {
        btnAdvRoom.addEventListener('click', () => {
            document.getElementById('adv-room-form').reset();
            
            // Render room checklist checkboxes dynamically
            const listContainer = document.getElementById('adv-rooms-list');
            if (listContainer) {
                listContainer.innerHTML = '';
                FLOOR_CONFIG.forEach(floor => {
                    floor.rooms.forEach(roomId => {
                        const label = document.createElement('label');
                        label.className = 'room-checkbox-item';
                        label.innerHTML = `
                            <input type="checkbox" value="${roomId}" name="adv-select-room">
                            <span>${roomId}</span>
                        `;
                        listContainer.appendChild(label);
                    });
                });
            }

            advRoomModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeAdvRoom = () => {
        advRoomModal.classList.remove('open');
        document.body.style.overflow = '';
    };

    document.getElementById('close-adv-room-btn')?.addEventListener('click', closeAdvRoom);
    document.getElementById('cancel-adv-room-btn')?.addEventListener('click', closeAdvRoom);

    // Select all checkboxes toggle
    document.getElementById('adv-room-select-all')?.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('input[name="adv-select-room"]');
        if (checkboxes.length === 0) return;
        const someUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
        checkboxes.forEach(cb => {
            cb.checked = someUnchecked;
        });
    });

    document.getElementById('adv-room-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const priceVal = roomPriceInput.value;
        if (!priceVal) return;
        
        const price = getRawNumber(priceVal);
        if (isNaN(price) || price <= 0) {
            showToast('Giá phòng không hợp lệ!', 'error');
            return;
        }

        const selectedCBs = document.querySelectorAll('input[name="adv-select-room"]:checked');
        if (selectedCBs.length === 0) {
            showToast('Vui lòng chọn ít nhất một phòng!', 'error');
            return;
        }

        const roomIds = Array.from(selectedCBs).map(cb => cb.value);
        const confirmMsg = `Bạn có chắc chắn muốn áp dụng giá phòng mới: ${formatNumber(price)} đ/tháng cho các phòng [${roomIds.join(', ')}]?`;
        const ok = await showCustomConfirm('Áp dụng giá phòng hàng loạt', confirmMsg, false);
        
        if (ok) {
            try {
                const activeRooms = getActiveRooms();
                roomIds.forEach(roomId => {
                    if (!activeRooms[roomId]) {
                        activeRooms[roomId] = { status: 'vacant', electricity: 0 };
                    }
                    activeRooms[roomId].rentalPrice = price;
                });
                saveActiveRooms(activeRooms);
                closeAdvRoom();
                renderDashboard();
                showToast('Áp dụng giá phòng thành công!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Thiết lập giá phòng thất bại!', 'error');
            }
        }
    });

    // 3. ELECTRIC PRICE MODAL (ĐƠN GIÁ ĐIỆN CHUNG)
    if (btnAdvElectric) {
        btnAdvElectric.addEventListener('click', () => {
            if (electricPriceInput) electricPriceInput.value = formatNumber(getElectricPrice());
            advElectricModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeAdvElectric = () => {
        advElectricModal.classList.remove('open');
        document.body.style.overflow = '';
    };

    document.getElementById('close-adv-electric-btn')?.addEventListener('click', closeAdvElectric);
    document.getElementById('cancel-adv-electric-btn')?.addEventListener('click', closeAdvElectric);

    document.getElementById('adv-electric-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = electricPriceInput.value;
        if (!val) return;
        
        const price = getRawNumber(val);
        if (isNaN(price) || price < 0) {
            showToast('Đơn giá điện không hợp lệ!', 'error');
            return;
        }

        const ok = await showCustomConfirm('Cập nhật đơn giá điện', `Bạn có chắc chắn muốn cập nhật đơn giá điện chung thành ${formatNumber(price)} đ/kWh cho toàn bộ phòng?`, false);
        if (ok) {
            try {
                localStorage.setItem('phongtro_price_electricity', price);
                if (window.db) db.ref('price_electricity').set(price);
                closeAdvElectric();
                renderStatusDashboard(); // Refresh formulas in Trạng thái
                showToast('Cập nhật đơn giá điện thành công!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Cập nhật đơn giá điện thất bại!', 'error');
            }
        }
    });

    // 4. WATER PRICE MODAL (ĐƠN GIÁ NƯỚC CHUNG)
    if (btnAdvWater) {
        btnAdvWater.addEventListener('click', () => {
            if (waterPriceInput) waterPriceInput.value = formatNumber(getWaterPrice());
            advWaterModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeAdvWater = () => {
        advWaterModal.classList.remove('open');
        document.body.style.overflow = '';
    };

    document.getElementById('close-adv-water-btn')?.addEventListener('click', closeAdvWater);
    document.getElementById('cancel-adv-water-btn')?.addEventListener('click', closeAdvWater);

    document.getElementById('adv-water-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = waterPriceInput.value;
        if (!val) return;
        
        const price = getRawNumber(val);
        if (isNaN(price) || price < 0) {
            showToast('Đơn giá nước không hợp lệ!', 'error');
            return;
        }

        const ok = await showCustomConfirm('Cập nhật đơn giá nước', `Bạn có chắc chắn muốn cập nhật đơn giá nước chung thành ${formatNumber(price)} đ/người cho toàn bộ phòng?`, false);
        if (ok) {
            try {
                localStorage.setItem('phongtro_price_water', price);
                if (window.db) db.ref('price_water').set(price);
                closeAdvWater();
                renderStatusDashboard(); // Refresh formulas in Trạng thái
                showToast('Cập nhật đơn giá nước thành công!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Cập nhật đơn giá nước thất bại!', 'error');
            }
        }
    });

    // 5. GARBAGE PRICE MODAL (PHÍ ĐỔ RÁC CHUNG)
    if (btnAdvGarbage) {
        btnAdvGarbage.addEventListener('click', () => {
            if (garbagePriceInput) garbagePriceInput.value = formatNumber(getGarbagePrice());
            advGarbageModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeAdvGarbage = () => {
        advGarbageModal.classList.remove('open');
        document.body.style.overflow = '';
    };

    document.getElementById('close-adv-garbage-btn')?.addEventListener('click', closeAdvGarbage);
    document.getElementById('cancel-adv-garbage-btn')?.addEventListener('click', closeAdvGarbage);

    document.getElementById('adv-garbage-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = garbagePriceInput.value;
        if (!val) return;
        
        const price = getRawNumber(val);
        if (isNaN(price) || price < 0) {
            showToast('Phí đổ rác không hợp lệ!', 'error');
            return;
        }

        const ok = await showCustomConfirm('Cập nhật phí đổ rác', `Bạn có chắc chắn muốn cập nhật mức phí đổ rác chung thành ${formatNumber(price)} đ/tháng cho toàn bộ phòng?`, false);
        if (ok) {
            try {
                localStorage.setItem('phongtro_price_garbage', price);
                if (window.db) db.ref('price_garbage').set(price);
                closeAdvGarbage();
                renderStatusDashboard(); // Refresh formulas in Trạng thái
                showToast('Cập nhật phí đổ rác thành công!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Cập nhật phí đổ rác thất bại!', 'error');
            }
        }
    });
}

