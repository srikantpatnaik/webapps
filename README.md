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

### Image Organizer
A simple, dark-themed web application for organizing images with tags. Users can upload images from their device or paste them directly from the clipboard, add tags for organization, and view all images in a Pinterest-like grid layout.

#### Features

- **Dark Theme**: Optimized for comfortable viewing in low-light environments
- **Mobile Responsive**: Works well on all device sizes
- **Image Upload**: Drag & drop, file selection, or paste from clipboard
- **Tagging System**: Add multiple tags to organize your images
- **Search Functionality**: Search through your images by tags
- **Grid Layout**: Pinterest-style grid that dynamically adjusts to different aspect ratios
- **Full-Resolution View**: Click on any image to view it in full size
- **Local Storage**: All images and tags are saved in your browser

### ESP32 Pinout Reference
A reference tool for ESP32 pinout diagrams with URL and tags management. Shows the pinout diagram and allows saving related resources with tags for easy organization.

#### Features

- **Pinout Diagram**: Displays the ESP32 WROOM DevKit pinout diagram
- **URL Management**: Save important URLs related to ESP32 projects
- **Tagging System**: Organize resources with multiple tags
- **Local Storage**: All saved resources are stored in your browser
- **Responsive Design**: Works well on all device sizes
- **Dark Theme**: Consistent with the rest of the web apps collection

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
- `/imageorganizer/` - Contains the Image Organizer application
- `/esp32/` - Contains the ESP32 Pinout Reference application

## GitHub Pages

This project is designed to work with GitHub Pages. Simply push this repository to GitHub and enable GitHub Pages for the repository to host the dashboard online.

## More App Ideas

- Simple hour based todo app for a week, track score and show stats week wise
- Simple pintrest type of webapp when I can upload or paste an image and it will store for me in browser, I can add tags and filter it according to tags

## License

This project is open source and available under the MIT License.
