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

### Image Resizer
A simple web application that allows you to paste an image and resize it to various dimensions while preserving the aspect ratio.

#### Features

- **Paste Functionality**: Paste images directly from clipboard (Ctrl+V)
- **Drag and Drop**: Drag and drop image files onto the upload area
- **Upload Support**: Click to upload image files from your device
- **Multiple Resize Factors**: Options for 0.3x, 0.6x, 0.8x, 1.0x, 1.3x, 1.5x scaling
- **Aspect Ratio Preservation**: Maintains the original aspect ratio during resizing
- **Resolution Display**: Shows exact resolution of both original and resized images
- **Side-by-Side Comparison**: Original and resized images displayed together
- **Download Option**: Download the resized image as a file
- **Copy to Clipboard**: Copy the resized image to clipboard
- **Client-Side Processing**: Images are processed locally with no server uploads

### Day Planner
A time-bound task management application designed to help users stay disciplined with their time allocation. The app allows users to plan tasks with specific start times and durations, track progress, and receive alerts before tasks are due.

#### Features

- **Task Management**: Add tasks with start times and duration in minutes
- **Time Tracking**: Monitor remaining time for active tasks
- **Status Tracking**: Tasks can be marked as pending, active, completed, or late
- **Alert System**: Audio warning 1 minute before a task is due to finish
- **Statistics**: Daily and weekly completion statistics
- **Archiving**: Previous week's tasks are automatically archived
- **Persistent Storage**: All tasks are saved in browser's local storage
- **Dark Theme**: Optimized for evening use and reduced eye strain
- **Mobile Responsive**: Works on both desktop and mobile devices

### Video Player
An HTML5 video player that allows you to upload, store, and play videos directly in your browser with keyboard shortcuts.

#### Features

- **Video Upload**: Drag & drop, file selection to add videos to your collection
- **Local Storage**: Videos stored in browser's localStorage
- **Keyboard Shortcuts**: Space (play/pause), Arrow Keys (seek), M (mute), F (fullscreen), Esc (close)
- **Playback Controls**: Play/pause, volume control, progress bar with seeking
- **Thumbnail Gallery**: Automatic thumbnail generation for uploaded videos
- **Responsive Design**: Works on both desktop and mobile devices
- **Client-Side Processing**: All processing happens locally with no server uploads

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
- `/imageresizer/` - Contains the Image Resizer application
- `/planner/` - Contains the Day Planner application
- `/videoplayer/` - Contains the Video Player application

## GitHub Pages

This project is designed to work with GitHub Pages. Simply push this repository to GitHub and enable GitHub Pages for the repository to host the dashboard online.

## More App Ideas

- Advanced photo editor with filters and effects
- Budget tracker with category-based spending insights
- Habit tracker with streaks and progress visualization
- Note-taking app with markdown support

## License

This project is open source and available under the MIT License.
