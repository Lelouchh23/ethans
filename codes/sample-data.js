// Sample data for the restaurant POS system

// Sample menu items
const sampleMenuItems = [
    {
        id: 1,
        name: 'Beef Steak',
        category: 'Main Course',
        description: 'Grilled beef steak with vegetables',
        price: 24.99,
        available: true,
        ingredients: [
            { id: 1, name: 'Beef', quantity: 0.3, unit: 'kg' },
            { id: 11, name: 'Potatoes', quantity: 0.2, unit: 'kg' },
            { id: 4, name: 'Tomatoes', quantity: 0.1, unit: 'kg' },
            { id: 5, name: 'Onions', quantity: 0.05, unit: 'kg' }
        ],
        image: 'assets/products/beef-steak.jpg'
    },
    {
        id: 2,
        name: 'Chicken Curry',
        category: 'Main Course',
        description: 'Spicy chicken curry with rice',
        price: 18.99,
        available: true,
        ingredients: [
            { id: 2, name: 'Chicken', quantity: 0.25, unit: 'kg' },
            { id: 3, name: 'Rice', quantity: 0.15, unit: 'kg' },
            { id: 6, name: 'Garlic', quantity: 0.02, unit: 'kg' },
            { id: 5, name: 'Onions', quantity: 0.1, unit: 'kg' }
        ],
        image: 'assets/products/chicken-curry.jpg'
    },
    {
        id: 3,
        name: 'Vegetable Salad',
        category: 'Appetizer',
        description: 'Fresh mixed vegetable salad',
        price: 9.99,
        available: true,
        ingredients: [
            { id: 4, name: 'Tomatoes', quantity: 0.15, unit: 'kg' },
            { id: 12, name: 'Lettuce', quantity: 0.1, unit: 'kg' },
            { id: 13, name: 'Cucumber', quantity: 0.08, unit: 'kg' }
        ],
        image: 'assets/products/salad.jpg'
    },
    {
        id: 4,
        name: 'Garlic Bread',
        category: 'Appetizer',
        description: 'Toasted bread with garlic butter',
        price: 7.99,
        available: true,
        ingredients: [
            { id: 8, name: 'Flour', quantity: 0.1, unit: 'kg' },
            { id: 10, name: 'Butter', quantity: 0.05, unit: 'kg' },
            { id: 6, name: 'Garlic', quantity: 0.01, unit: 'kg' }
        ],
        image: 'assets/products/garlic-bread.jpg'
    },
    {
        id: 5,
        name: 'French Fries',
        category: 'Side Dish',
        description: 'Crispy golden french fries',
        price: 5.99,
        available: true,
        ingredients: [
            { id: 11, name: 'Potatoes', quantity: 0.2, unit: 'kg' }
        ],
        image: 'assets/products/fries.jpg'
    },
    {
        id: 6,
        name: 'Grilled Salmon',
        category: 'Main Course',
        description: 'Fresh grilled salmon with lemon butter sauce',
        price: 22.99,
        available: false,
        ingredients: [
            { id: 14, name: 'Salmon', quantity: 0.25, unit: 'kg' },
            { id: 10, name: 'Butter', quantity: 0.03, unit: 'kg' }
        ],
        image: 'assets/products/salmon.jpg'
    },
    {
        id: 7,
        name: 'Pasta Carbonara',
        category: 'Main Course',
        description: 'Creamy pasta with bacon and cheese',
        price: 16.99,
        available: true,
        ingredients: [
            { id: 15, name: 'Pasta', quantity: 0.15, unit: 'kg' },
            { id: 9, name: 'Cheese', quantity: 0.08, unit: 'kg' },
            { id: 16, name: 'Bacon', quantity: 0.1, unit: 'kg' }
        ],
        image: 'assets/products/pasta.jpg'
    },
    {
        id: 8,
        name: 'Chocolate Cake',
        category: 'Dessert',
        description: 'Rich chocolate cake with frosting',
        price: 8.99,
        available: true,
        ingredients: [
            { id: 8, name: 'Flour', quantity: 0.15, unit: 'kg' },
            { id: 17, name: 'Sugar', quantity: 0.1, unit: 'kg' },
            { id: 18, name: 'Cocoa Powder', quantity: 0.05, unit: 'kg' }
        ],
        image: 'assets/products/cake.jpg'
    }
];

// Sample ingredients
const sampleIngredients = [
    { id: 1, name: 'Beef', category: 'Meat', quantity: 15, unit: 'kg', threshold: 5, status: 'Normal' },
    { id: 2, name: 'Chicken', category: 'Meat', quantity: 8, unit: 'kg', threshold: 10, status: 'Low' },
    { id: 3, name: 'Rice', category: 'Grains', quantity: 25, unit: 'kg', threshold: 10, status: 'Normal' },
    { id: 4, name: 'Tomatoes', category: 'Vegetables', quantity: 5, unit: 'kg', threshold: 3, status: 'Normal' },
    { id: 5, name: 'Onions', category: 'Vegetables', quantity: 3, unit: 'kg', threshold: 5, status: 'Low' },
    { id: 6, name: 'Garlic', category: 'Spices', quantity: 2, unit: 'kg', threshold: 1, status: 'Normal' },
    { id: 7, name: 'Salt', category: 'Spices', quantity: 10, unit: 'kg', threshold: 2, status: 'Normal' },
    { id: 8, name: 'Flour', category: 'Grains', quantity: 12, unit: 'kg', threshold: 5, status: 'Normal' },
    { id: 9, name: 'Cheese', category: 'Dairy', quantity: 4, unit: 'kg', threshold: 3, status: 'Low' },
    { id: 10, name: 'Butter', category: 'Dairy', quantity: 6, unit: 'kg', threshold: 2, status: 'Normal' },
    { id: 11, name: 'Potatoes', category: 'Vegetables', quantity: 20, unit: 'kg', threshold: 8, status: 'Normal' },
    { id: 12, name: 'Lettuce', category: 'Vegetables', quantity: 8, unit: 'kg', threshold: 3, status: 'Normal' },
    { id: 13, name: 'Cucumber', category: 'Vegetables', quantity: 10, unit: 'kg', threshold: 4, status: 'Normal' },
    { id: 14, name: 'Salmon', category: 'Seafood', quantity: 0, unit: 'kg', threshold: 2, status: 'Critical' },
    { id: 15, name: 'Pasta', category: 'Grains', quantity: 15, unit: 'kg', threshold: 5, status: 'Normal' },
    { id: 16, name: 'Bacon', category: 'Meat', quantity: 7, unit: 'kg', threshold: 3, status: 'Normal' },
    { id: 17, name: 'Sugar', category: 'Baking', quantity: 20, unit: 'kg', threshold: 5, status: 'Normal' },
    { id: 18, name: 'Cocoa Powder', category: 'Baking', quantity: 3, unit: 'kg', threshold: 1, status: 'Normal' }
];

// Sample sales data
const sampleSales = [
    {
        id: 'SALE-1001',
        date: '2023-10-01',
        time: '09:20:45',
        items: [
            { id: 1, name: 'Beef Steak', quantity: 2 },
            { id: 5, name: 'French Fries', quantity: 1 }
        ],
        staff: 'John Doe',
        totalItems: 3
    },
    {
        id: 'SALE-1002',
        date: '2023-10-01',
        time: '12:15:33',
        items: [
            { id: 2, name: 'Chicken Curry', quantity: 3 },
            { id: 3, name: 'Vegetable Salad', quantity: 1 }
        ],
        staff: 'John Doe',
        totalItems: 4
    },
    {
        id: 'SALE-1003',
        date: '2023-10-01',
        time: '14:45:21',
        items: [
            { id: 7, name: 'Pasta Carbonara', quantity: 2 },
            { id: 8, name: 'Chocolate Cake', quantity: 1 },
            { id: 4, name: 'Garlic Bread', quantity: 2 }
        ],
        staff: 'Jane Smith',
        totalItems: 5
    }
];

// Sample activity logs
const sampleActivityLogs = [
    { id: 1, userId: 1, userName: 'John Doe', action: 'Logged in', reference: 'System', timestamp: '2023-10-01 09:15:23', status: 'Success' },
    { id: 2, userId: 1, userName: 'John Doe', action: 'Recorded sale', reference: 'SALE-1001', timestamp: '2023-10-01 09:20:45', status: 'Success' },
    { id: 3, userId: 1, userName: 'John Doe', action: 'Printed receipt', reference: 'REC-1001', timestamp: '2023-10-01 09:22:10', status: 'Success' },
    { id: 4, userId: 2, userName: 'Jane Smith', action: 'Logged in', reference: 'System', timestamp: '2023-10-01 14:30:00', status: 'Success' },
    { id: 5, userId: 2, userName: 'Jane Smith', action: 'Recorded sale', reference: 'SALE-1003', timestamp: '2023-10-01 14:45:21', status: 'Success' },
    { id: 6, userId: 1, userName: 'John Doe', action: 'Increased ingredient quantity', reference: 'Beef (+5kg)', timestamp: '2023-10-01 11:30:18', status: 'Success' },
    { id: 7, userId: 1, userName: 'John Doe', action: 'Decreased ingredient quantity', reference: 'Tomatoes (-2kg, Spoilage)', timestamp: '2023-10-01 14:22:07', status: 'Success' }
];

// Sample account requests
const sampleAccountRequests = [
    {
        id: 1,
        fullName: 'John Doe',
        username: 'johndoe',
        requestedRole: 'Staff',
        status: 'Approved',
        date: '2023-09-25',
        approvedBy: 'Admin',
        approvedDate: '2023-09-26'
    },
    {
        id: 2,
        fullName: 'Jane Smith',
        username: 'janesmith',
        requestedRole: 'Cashier',
        status: 'Approved',
        date: '2023-09-28',
        approvedBy: 'Admin',
        approvedDate: '2023-09-28'
    },
    {
        id: 3,
        fullName: 'Robert Johnson',
        username: 'robertj',
        requestedRole: 'Staff',
        status: 'Pending',
        date: '2023-10-01'
    }
];

// Initialize sample data in local storage if not exists
function initializeSampleData() {
    if (!localStorage.getItem('menuItems')) {
        localStorage.setItem('menuItems', JSON.stringify(sampleMenuItems));
    }
    
    if (!localStorage.getItem('ingredients')) {
        localStorage.setItem('ingredients', JSON.stringify(sampleIngredients));
    }
    
    if (!localStorage.getItem('sales')) {
        localStorage.setItem('sales', JSON.stringify(sampleSales));
    }
    
    if (!localStorage.getItem('activityLogs')) {
        localStorage.setItem('activityLogs', JSON.stringify(sampleActivityLogs));
    }
    
    if (!localStorage.getItem('accountRequests')) {
        localStorage.setItem('accountRequests', JSON.stringify(sampleAccountRequests));
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sampleMenuItems,
        sampleIngredients,
        sampleSales,
        sampleActivityLogs,
        sampleAccountRequests,
        initializeSampleData
    };
}