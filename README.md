# Air Quality & Weather Dashboard

A modern, dark-themed web application that displays real-time weather information and simulated air quality data for any city.

## Features

- **Real-time Weather Data**: Fetches current weather information including temperature, humidity, feels-like temperature, and rain probability from wttr.in
- **Air Quality Index (AQI)**: Displays simulated AQI data (note: actual AQI requires API keys from most providers)
- **City Storage**: Remembers your last searched city using browser's localStorage
- **Auto-refresh**: Automatically updates data when you return to the page (on focus)
- **Responsive Design**: Works on both desktop and mobile devices
- **Dark Theme**: Easy on the eyes with a sleek dark interface

## Data Sources

- **Weather Data**: [wttr.in](https://wttr.in) - Provides comprehensive weather information without requiring an API key
- **AQI Data**: Simulated based on weather conditions (most real AQI sources require API keys)

## How to Use

1. Enter a city name in the input field
2. Click "Get Weather" or press Enter
3. View your weather and air quality information
4. The city is saved in your browser - when you return, it will automatically load the last city
5. When you return to the tab, the data automatically refreshes

## Technologies Used

- HTML5
- CSS3 (with modern styling and dark theme)
- JavaScript (with modern async/await features)
- Browser localStorage API

## GitHub Pages

This project is designed to work with GitHub Pages. Simply push this repository to GitHub and enable GitHub Pages for the repository to host the dashboard online.

## Limitations

- Actual AQI data typically requires API keys from services like OpenWeatherMap, AirVisual, etc.
- This implementation provides simulated AQI data as a demonstration
- Data accuracy depends on the upstream weather service (wttr.in)

## License

This project is open source and available under the MIT License.