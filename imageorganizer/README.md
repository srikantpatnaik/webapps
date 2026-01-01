# Image Organizer

A simple, dark-themed web application for organizing images with tags. Users can upload images from their device or paste them directly from the clipboard, add tags for organization, and view all images in a Pinterest-like grid layout.

## Features

- **Dark Theme**: Optimized for comfortable viewing in low-light environments
- **Mobile Responsive**: Works well on all device sizes
- **Image Upload**: Drag & drop, file selection, or paste from clipboard
- **Tagging System**: Add multiple tags to organize your images
- **Search Functionality**: Search through your images by tags
- **Grid Layout**: Pinterest-style grid that dynamically adjusts to different aspect ratios
- **Full-Resolution View**: Click on any image to view it in full size
- **Local Storage**: All images and tags are saved in your browser

## How to Use

1. **Upload Images**: 
   - Drag and drop images onto the upload area
   - Click the upload area to select files
   - Click "Paste from Clipboard" and use Ctrl+V (or Cmd+V) to paste

2. **Tag Images**:
   - Enter tags separated by commas in the tagging field
   - Click "Add Image" to apply tags to the most recently uploaded image

3. **Browse Images**:
   - All images appear in the grid layout after upload
   - Click on any image to view in full resolution

4. **Search Images**:
   - Enter a tag in the search field
   - Click "Search" to filter the gallery
   - Use "Clear" to reset the filter

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- Uses localStorage to persist images and tags
- Responsive grid layout using CSS Grid
- Dark theme implemented with CSS custom properties
- Mobile-first design approach

## Browser Support

Modern browsers that support:
- localStorage
- FileReader API
- CSS Grid
- ES6 JavaScript features

## License

This project is open source and available under the MIT License (see LICENSE file for details).