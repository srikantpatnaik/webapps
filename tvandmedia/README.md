# Video Player

A web-based video player application with a single input field for media files and URLs. The app automatically detects the type of input and handles it appropriately:

- `file:///` paths: Prompts user to select corresponding local file
- HTTP/HTTPS URLs ending in `.m3u`: Loaded as M3U playlists
- HTTP/HTTPS URLs ending with popular formats (mp4, mkv, webm, mp3, wav, etc.): Played with save button available
- Other streaming endpoints: Played without save option

## Features

- Single input field for all media types with automatic detection
- Support for local file paths (`file:///`)
- Support for direct video URLs (with save functionality)
- Support for M3U playlist loading
- Play videos using HTML5 video player with custom controls
- Automatic CORS proxy fallback for services that block cross-origin requests
- Save button for download-enabled videos (next to remove button)
- Keyboard shortcuts for easy control:
  - **Space**: Play/Pause
  - **→ (Right Arrow)**: Seek forward 10 seconds
  - **← (Left Arrow)**: Seek backward 10 seconds
  - **↑ (Up Arrow)**: Increase volume by 10%
  - **↓ (Down Arrow)**: Decrease volume by 10%
  - **+ / =**: Increase playback speed
  - **-**: Decrease playback speed
  - **L**: Toggle loop mode
  - **z**: Zoom in/toggle (1x/1.5x)
  - **Z**: Zoom out
  - **0**: Reset zoom to 1x
  - **N**: Next video (when multiple videos present)
  - **B**: Previous video (when multiple videos present)
  - **A**: Toggle global loop (loop all videos)
  - **O**: Toggle keyboard shortcuts visibility
  - **M**: Mute/Unmute
  - **F**: Toggle fullscreen
  - **Esc**: Close video player
- **Mobile Gesture Controls**:
  - **Tap anywhere**: Play/Pause
  - **Top 30% screen vertical swipe**: Speed control (up for faster, down for slower)
  - **Middle 40% screen horizontal swipe**: Video navigation (left for next, right for previous)
  - **Bottom 30% screen horizontal swipe**: Fast seek (left for backward 30s, right for forward 30s)
  - **Native browser zoom/pan**: Use pinch-to-zoom and drag for panning
- Progress bar with seek functionality
- Volume control with slider
- Playback speed control (0.25x to 2x)
- Loop toggle functionality
- Video zoom feature
- Video thumbnails for quick browsing
- Time display showing current position and total duration
- Responsive design for various screen sizes

## How to Use

1. Enter a media path or URL in the single input field:
   - For local files: `file:///path/to/video.mp4` (this will prompt you to select the file)
   - For online videos: `https://example.com/video.mp4` (with save option)
   - For playlists: `https://example.com/playlist.m3u`
2. Click "Load Media" or press Enter
3. Browse your loaded media in the gallery
4. Click on a media thumbnail to play it in the modal player
5. Use keyboard shortcuts or the control buttons to control playback

## Supported Formats

The video player supports all HTML5-compatible video formats, including:
- MP4
- WebM
- OGG
- MOV
- AVI
- WMV
- MKV (if supported by your browser)
- M3U playlists

## Technical Details

- Videos are stored in the browser's localStorage as base64 encoded data
- Thumbnails are generated automatically from video frames
- All processing happens client-side - no server required
- Uses vanilla JavaScript, HTML5 video API, and modern CSS

## Privacy

All videos are stored locally in your browser and are not shared with any external service.