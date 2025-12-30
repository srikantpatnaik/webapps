# Expense Logger

A simple expense tracking application that helps you manage your spending by logging expenses with date, amount, and item description.

## Features

- **Expense Logging**: Add expenses with date, amount, and item description
- **Monthly Organization**: Expenses are automatically organized by month
- **Current Month View**: See all expenses for the current month at a glance
- **Archived Months**: All previous months stored in expandable/collapsible sections
- **Monthly Totals**: Automatic calculation and display of total expenses per month
- **Data Persistence**: All expenses are stored locally in your browser
- **Currency Formatting**: Amounts displayed with ₹ symbol, no decimals, and converted to 'K' format for thousands (e.g., ₹1500 becomes ₹1.5K)

## How to Use

1. Enter the date, amount (as whole number), and item description in the input fields
2. Click "Add Expense" to record the expense
3. Expenses will appear in the current month section
4. Previous months are automatically archived in the "Archived Months" section
5. Click on month headers to expand/collapse month sections
6. Use the delete button (🗑️) to remove individual expenses

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript (no external dependencies)
- Uses localStorage for data persistence
- Dark theme with consistent styling
- Responsive design that works on mobile and desktop
- Automatic date formatting to dd-mm format
- Currency formatting with rupee symbol (₹) and 'K' format for thousands (e.g., ₹1500 becomes ₹1.5K)
- Mobile-optimized with horizontal scrolling for tables on small screens