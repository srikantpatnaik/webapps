# Video Player

A web-based video player that allows you to upload, store, and play HTML5-compatible videos directly in your browser with keyboard shortcuts.

## Features

- Upload and store videos locally in your browser's storage
- Play videos directly from URL endpoint (supports various video formats and raw endpoints like `/raw/`)
- Play videos using HTML5 video player with custom controls
- Automatic CORS proxy fallback for services that block cross-origin requests
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
- Progress bar with seek functionality
- Volume control with slider
- Playback speed control (0.25x to 2x)
- Loop toggle functionality
- Video zoom feature
- Video thumbnails for quick browsing
- Time display showing current position and total duration
- Responsive design for various screen sizes

## How to Use

1. Click on the upload area or drag and drop video files to add them to your collection
2. Browse your uploaded videos in the gallery
3. Click on a video thumbnail to play it in the modal player
4. Use keyboard shortcuts or the control buttons to control playback

## Supported Formats

The video player supports all HTML5-compatible video formats, including:
- MP4
- WebM
- OGG
- MOV
- AVI
- WMV
- MKV (if supported by your browser)

## Technical Details

- Videos are stored in the browser's localStorage as base64 encoded data
- Thumbnails are generated automatically from the first frame of each video
- All processing happens client-side - no server required
- Uses vanilla JavaScript, HTML5 video API, and modern CSS

## Privacy

All videos are stored locally in your browser and are not shared with any external service.