# Image Resizer

A simple web application that allows you to paste an image and resize it to various dimensions while preserving the aspect ratio.

## Features

- Paste images directly from clipboard (Ctrl+V)
- Drag and drop image files
- Click to upload image files
- Resize options: 0.3x, 0.6x, 0.8x, 1.0x, 1.3x, 1.5x
- Real-time display of original and resized image
- Shows exact resolution of both original and resized images
- Download or copy the resized image to clipboard

## How to Use

1. Open the application in a web browser
2. Either:
   - Press Ctrl+V (Cmd+V on Mac) anywhere on the page to paste an image from clipboard
   - Drag and drop an image file onto the upload area
   - Click the upload area to select an image file
3. Select a resize factor from the buttons (0.3x, 0.6x, 0.8x, 1.3x, 1.5x)
4. The resized image will appear next to the original
5. Click "Download" to save the image or "Copy to Clipboard" to copy it

## Technical Details

- Pure HTML, CSS, and JavaScript (no external dependencies)
- Uses Canvas API for image processing
- Preserves aspect ratio during resizing
- Client-side only - no image uploads to servers
- Responsive design works on desktop and mobile

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Clipboard API support required for copy functionality (not available in all browsers)