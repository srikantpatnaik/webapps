# Weather Dashboard

A modern, dark-themed web application that displays real-time weather information with max/min temperatures for any city using wttr.in.

## Features

- **Real-time Weather Data**: Fetches current weather information from wttr.in including temperature, humidity, feels-like temperature, and weather description
- **Max/Min Temperatures**: Displays daily maximum and minimum temperatures from the forecast
- **Feels Like Temperature**: Shows the "feels like" temperature as the main temperature
- **Weather History Table**: Stores and displays weather data for multiple cities in a responsive table format
- **Auto-refresh**: Automatically refreshes all stored data every 5 minutes
- **Browser Storage**: Uses localStorage to save weather data between sessions
- **Responsive Design**: Works on both desktop and mobile devices with improved mobile experience
- **Deletion Support**: Easy removal of individual weather records with a trash icon
- **Dark Theme**: Easy on the eyes with a sleek dark interface

## Data Sources

- **Weather Data**: [wttr.in](https://wttr.in) - Provides comprehensive weather information without requiring an API key

## How to Use

1. Enter a city name in the input field
2. Click "Get Weather" or press Enter
3. View current weather information including feels like, max, and min temperatures
4. All searched cities are stored in the table below the main weather display
5. Data automatically refreshes every 5 minutes
6. Use the trash icon to delete individual records
7. Use "Clear Storage" button to remove all stored weather data

## Technologies Used

- HTML5
- CSS3 (with modern styling and dark theme)
- JavaScript (with modern async/await features)
- Browser localStorage API
- wttr.in JSON API

## GitHub Pages

This project is designed to work with GitHub Pages. Simply push this repository to GitHub and enable GitHub Pages for the repository to host the dashboard online.

## Directory Structure

- `/weather/` - Contains the Weather Dashboard application

## License

This project is open source and available under the MIT License.