# Weather Dashboard

A mobile-first weather application that displays current weather data for cities using the wttr.in API.

## Features

- **Mobile-first design**: Responsive layout that works well on all device sizes
- **Current weather display**: Shows temperature, feels like, max/min temperatures, and humidity
- **Weather cards**: Each city is displayed in a card with uniform dark theme
- **Storage**: Weather data is stored in localStorage for offline access
- **Auto-refresh**: Stored data automatically refreshes every 5 minutes
- **Delete functionality**: Remove individual weather records as needed

## How to Use

1. Enter a city name in the input field
2. Click "Get Weather" to fetch and display current weather
3. The weather data will be stored and displayed as a card in the "Stored Weather Records" section
4. Use the "Clear Storage" button to remove all stored weather data
5. Click the delete button (🗑️) on individual cards to remove specific entries

## Technical Details

- Uses wttr.in API in JSON format (`?format=j1`) to fetch weather data
- Stores weather information in localStorage
- Built with vanilla HTML, CSS, and JavaScript (no external dependencies)
- Dark theme with consistent styling across all weather cards

## Design Elements

- Dark theme with carefully chosen color palette
- Small, subtle delete buttons that blend with the background
- Responsive grid layout for weather cards
- Proper typography and spacing for readability