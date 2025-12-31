# Web Apps Collection

A collection of modern, dark-themed web applications for various purposes.

## Apps Included

### Weather Dashboard
A modern, dark-themed web application that displays real-time weather information with max/min temperatures for any city using wttr.in.

#### Features

- **Real-time Weather Data**: Fetches current weather information from wttr.in including temperature, humidity, feels-like temperature, and weather description
- **Max/Min Temperatures**: Displays daily maximum and minimum temperatures from the forecast
- **Feels Like Temperature**: Shows the "feels like" temperature as the main temperature
- **Weather History Table**: Stores and displays weather data for multiple cities in a responsive table format
- **Auto-refresh**: Automatically refreshes all stored data every 5 minutes
- **Browser Storage**: Uses localStorage to save weather data between sessions
- **Responsive Design**: Works on both desktop and mobile devices with improved mobile experience
- **Deletion Support**: Easy removal of individual weather records with a trash icon
- **Dark Theme**: Easy on the eyes with a sleek dark interface

#### Data Sources

- **Weather Data**: [wttr.in](https://wttr.in) - Provides comprehensive weather information without requiring an API key

### Expense Logger
A simple expense tracking application that helps you manage your spending by logging expenses with date, amount, and item description.

#### Features

- **Expense Logging**: Add expenses with date, amount, and item description
- **Monthly Organization**: Expenses are automatically organized by month
- **Current Month View**: See all expenses for the current month at a glance
- **Archived Months**: All previous months stored in expandable/collapsible sections
- **Monthly Totals**: Automatic calculation and display of total expenses per month
- **Data Persistence**: All expenses are stored locally in your browser
- **Currency Formatting**: Amounts displayed with ₹ symbol, no decimals, and converted to 'K' format for thousands (e.g., ₹1500 becomes ₹1.5K)
- **Mobile Optimization**: Horizontal scrolling for tables on small screens and improved mobile responsiveness

### FIRE Calculator
Financial Independence, Retire Early calculator to help plan your financial future.

#### Features

- **Savings Rate Calculation**: Calculates how much you're saving each month
- **FIRE Number**: Estimates the total amount needed for financial independence
- **Timeline Projection**: Shows how long until you reach financial independence
- **Visual Charts**: Interactive charts showing your financial journey

## How to Use

1. Access the main index.html file to see the dashboard with all available apps
2. Click on any app to launch it
3. Each app has its own documentation in its README file

## Technologies Used

- HTML5
- CSS3 (with modern styling and dark theme)
- JavaScript (with modern async/await features)
- Browser localStorage API

## Directory Structure

- `/weather/` - Contains the Weather Dashboard application
- `/expenses/` - Contains the Expense Logger application
- `/fire/` - Contains the FIRE Calculator application

## GitHub Pages

This project is designed to work with GitHub Pages. Simply push this repository to GitHub and enable GitHub Pages for the repository to host the dashboard online.

## More App Ideas

- Simple hour based todo app for a week, track score and show stats week wise
- Simple pintrest type of webapp when I can upload or paste an image and it will store for me in browser, I can add tags and filter it according to tags

## License

This project is open source and available under the MIT License.
