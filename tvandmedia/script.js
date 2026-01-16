// Video Player JavaScript functionality

class VideoPlayerApp {
    constructor() {
        this.videos = [];
        this.currentVideos = [...this.videos];
        this.currentVideoIndex = -1; // Track current video index
        this.globalLoop = false; // Global loop setting
        this.defaultLoop = true; // Single loop mode enabled by default
        this.isLoadingVideos = true; // Flag to track loading state
        this.playlistUrls = []; // Track loaded playlist URLs
        this.initElements();
        this.bindEvents();
        this.initializeVideoPlayer();
        this.initializeVideoPlayerControls();
        this.initializeLoopState();
        // Render the gallery immediately to show the loading state
        this.renderGallery();

        // Load videos asynchronously after initialization
        this.loadStoredVideos()
            .then(() => {
                this.isLoadingVideos = false;
                // After loading videos, re-render the gallery
                this.renderGallery();

                // Force a small layout update to ensure visibility
                setTimeout(() => {
                    this.videoGallery.offsetHeight; // Trigger reflow
                }, 100);
            })
            .catch(err => {
                console.error('Error loading videos:', err);
                this.isLoadingVideos = false;
                // Re-render gallery even if loading fails
                this.renderGallery();

                // Force a small layout update to ensure visibility
                setTimeout(() => {
                    this.videoGallery.offsetHeight; // Trigger reflow
                }, 100);
            });
    }

    async loadStoredVideos() {
        try {
            // Try to load from IndexedDB first
            await this.loadFromIndexedDB();
            console.log('Videos loaded from IndexedDB');
        } catch (error) {
            console.warn('IndexedDB not available or failed to load:', error);
            // Fallback to localStorage if IndexedDB fails
            try {
                this.videos = JSON.parse(localStorage.getItem('storedVideos')) || [];
                console.log('Videos loaded from localStorage');
                this.updateTotalSizeDisplay();
            } catch (localStorageError) {
                console.error('Error loading from localStorage:', localStorageError);
                this.videos = [];
            }
        }

        // Load playlist URLs as well
        this.loadPlaylistUrls();
    }

    initializeVideoPlayer() {
        // Set initial values for video player
        this.videoPlayer.volume = 1;
        this.videoPlayer.playbackRate = 1;
        this.videoPlayer.loop = this.defaultLoop; // Set to default loop state
        this.videoPlayer.controls = false; // Hide native controls

        // Initialize panning variables
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.panX = 0;
        this.panY = 0;

        // Initialize cursor hide functionality
        this.cursorHideTimeout = null;
        this.isCursorHidden = false;

        // Load saved zoom level
        this.loadZoomLevel();
    }

    initializeVideoPlayerControls() {
        // Set up touchpad zoom and other control-specific functionality
        this.setupTouchpadZoom();

        // Set up video panning functionality
        this.setupVideoPanning();

        // Initialize video modal controls visibility
        this.setupControlsVisibility();

        // Setup cursor hiding functionality
        this.setupCursorHiding();

    }

    setupCursorHiding() {
        // Function to hide cursor
        this.hideCursor = () => {
            if (!this.isCursorHidden) {
                this.videoModal.style.cursor = 'none';
                this.isCursorHidden = true;
                // Also hide cursor from embedded elements
                const videoContainer = this.videoModal.querySelector('.video-container');
                if (videoContainer) {
                    videoContainer.style.cursor = 'none';
                }
                const videoPlayer = this.videoModal.querySelector('.video-player');
                if (videoPlayer) {
                    videoPlayer.style.cursor = 'none';
                }
            }
        };

        // Function to show cursor
        this.showCursor = () => {
            this.videoModal.style.cursor = 'default';
            this.isCursorHidden = false;
            // Also show cursor on embedded elements
            const videoContainer = this.videoModal.querySelector('.video-container');
            if (videoContainer) {
                videoContainer.style.cursor = 'default';
            }
            const videoPlayer = this.videoModal.querySelector('.video-player');
            if (videoPlayer) {
                videoPlayer.style.cursor = 'default';
            }
        };

        // Hide cursor immediately when video starts playing
        this.videoPlayer.addEventListener('play', () => {
            if (this.videoModal.style.display === 'block') {
                // Hide cursor immediately
                this.hideCursor();
            }
        });

        // Also hide cursor immediately when video starts without delay
        this.videoPlayer.addEventListener('playing', () => {
            if (this.videoModal.style.display === 'block') {
                this.hideCursor();
            }
        });

        // Show cursor when mouse moves
        this.videoModal.addEventListener('mousemove', () => {
            this.showCursor();
            this.startCursorHideTimer(); // Restart the timer
        });

        // Show cursor when controls are shown
        this.videoPlayer.addEventListener('play', () => {
            this.showCursor();
        });

        // Hide cursor when video is paused
        this.videoPlayer.addEventListener('pause', () => {
            this.hideCursor();
        });

        // Hide cursor when video ends (but not if controls are active)
        this.videoPlayer.addEventListener('ended', () => {
            // Don't hide immediately after video ends - user might want to see controls
            setTimeout(() => {
                if (this.videoModal.style.display === 'block' && this.videoPlayer.paused) {
                    this.hideCursor();
                }
            }, 2000);
        });
    }

    startCursorHideTimer() {
        // Clear existing timer
        clearTimeout(this.cursorHideTimeout);

        // Set new timer to hide cursor after 3 seconds of inactivity
        this.cursorHideTimeout = setTimeout(() => {
            if (this.videoModal.style.display === 'block' && !this.videoPlayer.paused) {
                const controls = this.videoModal.querySelector('.video-controls');
                // Only hide cursor if controls are not visible
                if (controls && controls.style.opacity !== '1') {
                    this.hideCursor();
                }
            }
        }, 3000); // Hide cursor after 3 seconds of inactivity
    }

    setupControlsVisibility() {
        const videoModal = this.videoModal;
        const controls = videoModal.querySelector('.video-controls');

        // Initially hide controls
        controls.style.opacity = '0';
        controls.style.visibility = 'hidden';

        // Show controls when mouse moves near bottom
        videoModal.addEventListener('mousemove', (e) => {
            // Calculate distance from bottom (within 100px)
            const distanceFromBottom = videoModal.clientHeight - e.clientY;

            if (distanceFromBottom <= 100) {
                this.showControls();
            } else {
                // If not near bottom, start hiding timer
                this.startHideControlsTimer();
            }
        });

        // Start the auto-hide timer when modal is loaded
        this.startHideControlsTimer();
    }

    showControls() {
        const controls = this.videoModal.querySelector('.video-controls');

        clearTimeout(this.hideControlsTimeout);
        controls.style.opacity = '1';
        controls.style.visibility = 'visible';

        // Restart the auto-hide timer
        this.startHideControlsTimer();
    }

    startHideControlsTimer() {
        // Clear any existing timer
        clearTimeout(this.hideControlsTimeout);

        // Set up timer to hide controls after 1 second
        this.hideControlsTimeout = setTimeout(() => {
            const controls = this.videoModal.querySelector('.video-controls');
            controls.style.opacity = '0';
            controls.style.visibility = 'hidden';
        }, 1000);
    }

    initElements() {
        this.mediaInput = document.getElementById('mediaInput');
        this.loadMediaBtn = document.getElementById('loadMediaBtn');
        this.fileInput = document.getElementById('fileInput');
        this.videoInfo = document.getElementById('videoInfo');
        this.videoGallery = document.getElementById('videoGallery');
        this.videoModal = document.getElementById('videoModal');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.closeModal = document.getElementById('closeModal');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.progressBar = document.getElementById('progressBar');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.speedDisplay = document.getElementById('speedDisplay');
        this.loopBtn = document.getElementById('loopBtn');
        this.globalLoopBtn = document.getElementById('globalLoopBtn');
        
        // Initialize history state management
        this.isModalOpen = false;
        this.setupHistoryStateManagement();
    }

    setupHistoryStateManagement() {
        // Listen for popstate events (back/forward button)
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.modalOpen) {
                // If the state indicates modal should be open, open it
                this.openVideoModal();
            } else if (this.isModalOpen) {
                // If modal is open but state doesn't indicate it should be, close it
                this.closeVideoModal(false); // Don't push state when closing via popstate
            }
        });
    }

    openVideoModal() {
        if (this.isModalOpen) return;
        
        this.videoModal.style.display = 'block';
        this.isModalOpen = true;
        
        // Push a state to the history stack when opening the modal
        history.pushState({ modalOpen: true }, '', window.location.pathname);
    }

    closeVideoModal(pushState = true) {
        if (!this.isModalOpen) return;
        
        this.videoModal.style.display = 'none';
        this.videoPlayer.pause();
        this.isModalOpen = false;
        
        // Show cursor when modal is closed
        this.videoModal.style.cursor = 'default';
        this.isCursorHidden = false;
        // Reset zoom when closing modal
        this.resetZoom();
        // Clean up any blob URLs
        this.cleanupVideoResources();
        
        // If pushState is true, push a new state without modalOpen
        if (pushState) {
            history.pushState({ modalOpen: false }, '', window.location.pathname);
        }
    }

    bindEvents() {
        // Load media from single input field
        this.loadMediaBtn.addEventListener('click', () => {
            const input = this.mediaInput.value.trim();
            if (input) {
                this.handleMediaInput(input);
            } else {
                alert('Please enter a media path or URL');
            }
        });

        // Allow pressing Enter in the media input
        this.mediaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadMediaBtn.click();
            }
        });

        // Handle file input changes
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });

        // Modal events
        this.closeModal.addEventListener('click', () => {
            this.closeVideoModal();
        });

        this.videoModal.addEventListener('click', (e) => {
            if (e.target === this.videoModal) {
                this.closeVideoModal();
            }
        });

        // Video player events
        this.videoPlayer.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay();
        });

        this.videoPlayer.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.updateTimeDisplay();
        });

        this.videoPlayer.addEventListener('ended', () => {
            if (!this.videoPlayer.loop) {
                this.playPauseBtn.textContent = '▶';

                // If global loop is enabled, play the next video automatically
                if (this.globalLoop && this.videos.length > 1) {
                    setTimeout(() => {
                        this.playNextVideo();
                    }, 500); // Small delay to allow for smooth transition
                }
            }
        });

        // Control button events
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePlayPause();
        });

        this.volumeBtn.addEventListener('click', () => {
            this.toggleMute();
        });

        this.volumeSlider.addEventListener('input', () => {
            this.videoPlayer.volume = this.volumeSlider.value;
            this.updateVolumeButton();
        });

        this.progressBar.parentElement.addEventListener('click', (e) => {
            const rect = this.progressBar.parentElement.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.videoPlayer.currentTime = pos * this.videoPlayer.duration;
        });

        this.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Speed control button event
        this.speedDisplay.addEventListener('click', () => {
            this.changeSpeed();
        });

        // Loop button event
        this.loopBtn.addEventListener('click', () => {
            this.toggleLoop();
        });

        // Global loop button event
        this.globalLoopBtn.addEventListener('click', () => {
            this.toggleGlobalLoop();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard shortcuts when video modal is open
            if (this.videoModal.style.display === 'block') {
                this.handleKeyboardShortcuts(e);
            }
        });

        // Make total size display clickable to clear all storage
        const totalSizeDisplay = document.getElementById('totalSizeDisplay');
        if (totalSizeDisplay) {
            totalSizeDisplay.style.cursor = 'pointer';
            totalSizeDisplay.title = 'Click to clear all storage (IndexedDB and local files)';
            totalSizeDisplay.addEventListener('click', () => {
                this.clearAllStorageWithConfirmation();
            });
        }
    }

    handleFiles(files) {
        if (!files || files.length === 0) {
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check if it's an M3U playlist file
            if (file.name && file.name.toLowerCase().endsWith('.m3u')) {
                this.processM3UFile(file);
            }
            // Check if it's a video or audio file
            else if (file.type && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
                if (file.type.startsWith('video/')) {
                    this.processVideoFile(file);
                } else {
                    this.processAudioFile(file);
                }
            } else {
                // Alert user that unsupported files were dropped/selected
                const fileName = file.name || 'Unknown file';
                alert(`Skipping unsupported file: ${fileName}. Only video, audio, and M3U playlist files are supported.`);
            }
        }
    }

    // Handle media input by detecting the type of input
    handleMediaInput(input) {
        // Detect input type
        if (input.startsWith('file:///')) {
            // Local file path (simulate file opening)
            this.handleLocalFile(input);
        } else if (input.startsWith('http://') || input.startsWith('https://')) {
            // Check if it's an M3U playlist
            if (input.toLowerCase().endsWith('.m3u')) {
                this.loadM3UPlaylist(input);
            } else {
                // Check if URL ends with popular audio/video formats
                const videoFormats = ['.mp3', '.wav', '.mp4', '.mkv', '.webm', '.mov', '.avi', '.wmv', '.flv', '.m4v'];
                const isVideoFormat = videoFormats.some(format => input.toLowerCase().endsWith(format));

                if (isVideoFormat) {
                    // Handle as regular video URL and show save button
                    this.loadVideoFromUrl(input, true); // Pass true to indicate save should be available
                } else {
                    // For other URLs, try to infer if it's a streaming endpoint
                    this.loadVideoFromUrl(input, false); // Default behavior, no save for streaming
                }
            }
        } else {
            // If it's neither a file:// nor http:// URL, treat as invalid input
            alert('Invalid input. Please enter a valid file path starting with file:/// or a URL starting with http:// or https://');
        }
    }

    // Handle local file by attempting to process it if possible
    handleLocalFile(filePath) {
        // Extract the actual file path from file:// URL
        const actualPath = filePath.replace(/^file:\/\/\//, '');
        const fileName = actualPath.split('/').pop().split('\\').pop(); // Get filename from path

        // Note: Modern browsers cannot directly read local file:// URLs due to security restrictions
        // We'll notify the user and suggest an alternative approach
        alert(`Browser security prevents direct access to local files: ${actualPath}\n\nPlease use the standard file selection dialog to open: ${fileName}`);

        // Create a file input to allow user to select the file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.multiple = false;

        // When the user selects the file, process it
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                this.processVideoFile(file, true); // Pass true to indicate it's from a local file
            }
        };

        // Show the file input dialog
        input.click();
    }

    processVideoFile(file, isLocalFile = false) {
        // Show loading message
        if (this.videoInfo) {
            this.videoInfo.textContent = `Processing: ${file.name}...`;
        }

        // Check for duplicate video by comparing file properties
        const isDuplicate = this.videos.some(video =>
            video.originalFileName === file.name &&
            video.size === file.size &&
            video.timestamp &&
            new Date().getTime() - new Date(video.timestamp).getTime() < 60000 // Within 1 minute
        );

        if (isDuplicate) {
            alert('This video already exists in your collection.');
            this.updateVideoInfoText();
            return;
        }

        // Create a temporary video element to get duration and thumbnail
        const tempVideo = document.createElement('video');

        // Create a blob URL for the file to enable streaming
        const videoBlobUrl = URL.createObjectURL(file);
        tempVideo.preload = 'metadata';
        tempVideo.src = videoBlobUrl;

        tempVideo.onloadedmetadata = () => {
            try {
                // Generate thumbnail at 1 second
                const canvas = document.createElement('canvas');
                // Set fixed dimensions for thumbnails to avoid huge canvas sizes
                // Use 320x240 as a standard thumbnail size
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');

                // Capture frame at 1 second if duration is sufficient, otherwise at 0
                const seekTime = tempVideo.duration > 1 ? 1 : 0;

                const captureFrame = () => {
                    try {
                        // Clear canvas first
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        // Calculate scaling to fit video into thumbnail while maintaining aspect ratio
                        const videoAspect = tempVideo.videoWidth / tempVideo.videoHeight;
                        const canvasAspect = canvas.width / canvas.height;
                        
                        let renderWidth, renderHeight, offsetX, offsetY;
                        
                        if (videoAspect > canvasAspect) {
                            // Video is wider than canvas
                            renderHeight = canvas.height;
                            renderWidth = tempVideo.videoWidth * (canvas.height / tempVideo.videoHeight);
                            offsetX = (canvas.width - renderWidth) / 2;
                            offsetY = 0;
                        } else {
                            // Video is taller than canvas
                            renderWidth = canvas.width;
                            renderHeight = tempVideo.videoHeight * (canvas.width / tempVideo.videoWidth);
                            offsetX = 0;
                            offsetY = (canvas.height - renderHeight) / 2;
                        }
                        
                        // Draw the video frame scaled to fit the canvas
                        ctx.drawImage(tempVideo, offsetX, offsetY, renderWidth, renderHeight);
                        
                        // Add a subtle border
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(0, 0, canvas.width, canvas.height);
                        
                        const thumbnail = canvas.toDataURL('image/jpeg', 0.8); // 80% quality for smaller file size

                        // Store the file object reference and other properties
                        // We'll handle the actual file streaming later when the video is played
                        const videoData = {
                            id: Date.now() + Math.random().toString(36).substr(2, 9),
                            file: file, // Store the original file object
                            originalFileName: file.name, // Store the original file name for comparison
                            name: file.name,
                            size: file.size,
                            duration: tempVideo.duration,
                            thumbnail: thumbnail,
                            timestamp: new Date().toISOString(),
                            allowSave: true, // Local files can be saved to storage
                            type: 'local_file' // Mark as local file
                        };

                        this.videos.push(videoData);
                        this.saveToStorage();
                        this.updateTotalSizeDisplay();

                        // Instead of reloading the page, just refresh the gallery
                        this.renderGallery();

                        // Show success message
                        this.videoInfo.textContent = `Added: ${file.name} to your collection`;

                        // Reset the text after a few seconds
                        setTimeout(() => {
                            this.updateVideoInfoText();
                        }, 3000);

                        // Clean up the blob URL after we're done with metadata
                        URL.revokeObjectURL(videoBlobUrl);
                    } catch (drawError) {
                        console.error('Error drawing thumbnail:', drawError);

                        // Create an error video data with a fallback thumbnail
                        const videoData = {
                            id: Date.now() + Math.random().toString(36).substr(2, 9),
                            file: file,
                            originalFileName: file.name,
                            name: file.name,
                            size: file.size,
                            duration: tempVideo.duration,
                            thumbnail: '', // Will use fallback in gallery
                            timestamp: new Date().toISOString(),
                            allowSave: true, // Local files can be saved
                            type: 'local_file'
                        };

                        this.videos.push(videoData);
                        this.saveToStorage();
                        this.updateTotalSizeDisplay();
                        this.renderGallery();

                        // Notify user that video was added despite thumbnail error
                        this.videoInfo.textContent = `Added: ${file.name} (thumbnail error occurred)`;
                        setTimeout(() => {
                            this.updateVideoInfoText();
                        }, 3000);

                        // Clean up the blob URL after we're done with metadata
                        URL.revokeObjectURL(videoBlobUrl);
                    }
                };

                // If video duration is too short, just use the first frame
                if (seekTime === 0) {
                    captureFrame();
                } else {
                    // Capture frame at 1 second
                    tempVideo.currentTime = seekTime;

                    const onSeeked = () => {
                        captureFrame();
                        tempVideo.removeEventListener('seeked', onSeeked);
                    };

                    tempVideo.addEventListener('seeked', onSeeked, { once: true });
                }
            } catch (error) {
                console.error('Error processing video metadata:', error);
                alert('Error processing video file metadata.');
                this.updateVideoInfoText();

                // Clean up the blob URL after error
                URL.revokeObjectURL(videoBlobUrl);
            }
        };

        tempVideo.onerror = (event) => {
            console.error('Error loading video metadata:', event);
            alert('Error processing video file. The file may be corrupted or incompatible.');
            this.updateVideoInfoText();

            // Clean up the blob URL after error
            URL.revokeObjectURL(videoBlobUrl);
        };

        // Set a timeout to handle cases where metadata never loads
        setTimeout(() => {
            if (tempVideo.readyState === 0) {
                console.error('Timeout waiting for video metadata');
                alert('Video file took too long to load. May be corrupted or incompatible.');
                this.updateVideoInfoText();

                // Clean up the blob URL after timeout
                URL.revokeObjectURL(videoBlobUrl);
            }
        }, 10000); // 10 second timeout
    }

    processAudioFile(file, isLocalFile = false) {
        // Show loading message
        if (this.videoInfo) {
            this.videoInfo.textContent = `Processing: ${file.name}...`;
        }

        // Check for duplicate audio by comparing file properties
        const isDuplicate = this.videos.some(video =>
            video.originalFileName === file.name &&
            video.size === file.size &&
            video.timestamp &&
            new Date().getTime() - new Date(video.timestamp).getTime() < 60000 // Within 1 minute
        );

        if (isDuplicate) {
            alert('This audio file already exists in your collection.');
            this.updateVideoInfoText();
            return;
        }

        // Create a temporary audio element to get duration
        const tempAudio = document.createElement('audio');

        // Create a blob URL for the file to enable streaming
        const audioBlobUrl = URL.createObjectURL(file);
        tempAudio.preload = 'metadata';
        tempAudio.src = audioBlobUrl;

        tempAudio.onloadedmetadata = () => {
            try {
                // For audio files, we don't have a video thumbnail
                // Use a default audio icon or generate a waveform visualization
                const audioData = {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    file: file, // Store the original file object
                    originalFileName: file.name, // Store the original file name for comparison
                    name: file.name,
                    size: file.size,
                    duration: tempAudio.duration,
                    thumbnail: '', // No thumbnail for audio files
                    timestamp: new Date().toISOString(),
                    allowSave: true, // Local files can be saved to storage
                    type: 'local_file', // Mark as local file
                    isAudio: true // Mark as audio file for UI differentiation
                };

                this.videos.push(audioData);
                this.saveToStorage();
                this.updateTotalSizeDisplay();

                // Instead of reloading the page, just refresh the gallery
                this.renderGallery();

                // Show success message
                this.videoInfo.textContent = `Added: ${file.name} to your collection`;

                // Reset the text after a few seconds
                setTimeout(() => {
                    this.updateVideoInfoText();
                }, 3000);

                // Clean up the blob URL after we're done with metadata
                URL.revokeObjectURL(audioBlobUrl);
            } catch (error) {
                console.error('Error processing audio metadata:', error);
                alert('Error processing audio file metadata.');
                this.updateVideoInfoText();

                // Clean up the blob URL after error
                URL.revokeObjectURL(audioBlobUrl);
            }
        };

        tempAudio.onerror = (event) => {
            console.error('Error loading audio metadata:', event);
            alert('Error processing audio file. The file may be corrupted or incompatible.');
            this.updateVideoInfoText();

            // Clean up the blob URL after error
            URL.revokeObjectURL(audioBlobUrl);
        };

        // Set a timeout to handle cases where metadata never loads
        setTimeout(() => {
            if (tempAudio.readyState === 0) {
                console.error('Timeout waiting for audio metadata');
                alert('Audio file took too long to load. May be corrupted or incompatible.');
                this.updateVideoInfoText();

                // Clean up the blob URL after timeout
                URL.revokeObjectURL(audioBlobUrl);
            }
        }, 10000); // 10 second timeout
    }

    // Process M3U playlist file
    processM3UFile(file) {
        // Show loading message
        if (this.videoInfo) {
            this.videoInfo.textContent = `Processing M3U playlist: ${file.name}...`;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const m3uContent = e.target.result;
                console.log('M3U file content:', m3uContent);
                
                // Parse the M3U playlist
                const playlistItems = this.parseM3U(m3uContent);
                console.log('Parsed playlist items:', playlistItems);

                if (playlistItems.length === 0) {
                    // Try to parse as simple list of files (one per line)
                    const lines = m3uContent.split('\n').filter(line => line.trim() !== '');
                    console.log('Lines in M3U file:', lines);
                    
                    // Check if any lines look like video files
                    const videoLines = lines.filter(line => {
                        const trimmed = line.trim();
                        return !trimmed.startsWith('#') && this.isVideoFile(trimmed);
                    });
                    
                    if (videoLines.length === 0) {
                        alert('No valid channels or video files found in the M3U playlist. The file may be empty or in an unsupported format.');
                        this.updateVideoInfoText();
                        return;
                    }
                    
                    // Create playlist items from video lines
                    for (const line of videoLines) {
                        playlistItems.push({
                            url: line.trim(),
                            channelName: this.extractFileName(line.trim()),
                            tvgId: undefined,
                            logo: undefined,
                            groupId: 'Local Videos',
                            userAgent: undefined,
                            httpReferrer: undefined,
                            isVlcOpt: false
                        });
                    }
                    
                    console.log('Created playlist items from video lines:', playlistItems);
                }

                // Generate a unique identifier for this local playlist
                const playlistId = `local_m3u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const playlistName = file.name.replace('.m3u', '').replace('.M3U', '');
                
                // Add this local M3U file to playlist history with "local:" prefix
                const localPlaylistIdentifier = `local:${file.name}`;
                if (!this.playlistUrls.includes(localPlaylistIdentifier)) {
                    this.playlistUrls.push(localPlaylistIdentifier);
                }

                // Add parsed channels to the videos array
                let addedCount = 0;
                for (const item of playlistItems) {
                    // Create a unique ID for the playlist item
                    const id = `${playlistId}_${addedCount}`;

                    // Check if this is a local file path or a URL
                    const isLocalFile = !item.url.startsWith('http://') && !item.url.startsWith('https://');
                    
                    const videoData = {
                        id: id,
                        src: item.url,
                        name: item.channelName,
                        size: 0, // Size unknown for streams/local paths
                        duration: undefined, // Duration unknown initially
                        thumbnail: item.logo || '',
                        timestamp: new Date().toISOString(),
                        type: isLocalFile ? 'local_m3u_path' : 'm3u', // Different type for local paths
                        groupId: item.groupId,
                        tvgId: item.tvgId,
                        isStream: !isLocalFile, // Only mark as stream for URLs
                        playlistName: playlistName, // Track which playlist this stream came from
                        isLocalPlaylist: true, // Mark as local playlist (not URL-based)
                        isLocalPath: isLocalFile, // Mark if it's a local file path
                        playlistUrl: localPlaylistIdentifier // Track which playlist this item came from
                    };

                    // Add to videos array if not already present
                    const isDuplicate = this.videos.some(video => video.src === videoData.src);
                    if (!isDuplicate) {
                        this.videos.push(videoData);
                        addedCount++;
                    }
                }

                // Save to storage and update UI
                this.saveToStorage();
                this.updateTotalSizeDisplay();
                this.renderGallery();
                this.renderPlaylistHistory(); // Update playlist history display

                // Show success message
                this.videoInfo.textContent = `Loaded ${addedCount} items from playlist: ${playlistName}`;

                // Reset the text after a few seconds
                setTimeout(() => {
                    this.updateVideoInfoText();
                }, 3000);

            } catch (error) {
                console.error('Error processing M3U file:', error);
                alert(`Error processing M3U playlist: ${error.message}`);
                this.updateVideoInfoText();
            }
        };

        reader.onerror = (error) => {
            console.error('Error reading M3U file:', error);
            alert('Error reading M3U playlist file. The file may be corrupted or inaccessible.');
            this.updateVideoInfoText();
        };

        reader.readAsText(file);
    }

    updateVideoInfoText() {
        if (this.videoInfo) {
            this.videoInfo.textContent = 'No video loaded';
        }
    }

    async clearAllStorage() {
        // Clear both IndexedDB and localStorage for consistency
        try {
            // Clear IndexedDB
            const deleteReq = indexedDB.deleteDatabase('VideoPlayerDB');
            deleteReq.onsuccess = () => {
                console.log('IndexedDB cleared successfully');
            };
            deleteReq.onerror = () => {
                console.error('Error clearing IndexedDB');
            };
        } catch (error) {
            console.error('Error during IndexedDB deletion:', error);
        }

        // Clear localStorage
        localStorage.removeItem('storedVideos');

        // Empty current videos array
        this.videos = [];

        // Clear playlist URLs as well
        this.playlistUrls = [];

        // Refresh gallery display
        this.renderGallery();

        // Update size display
        this.updateTotalSizeDisplay();
        this.renderPlaylistHistory();

        // Update info text
        if (this.videoInfo) {
            this.videoInfo.textContent = 'No video loaded';
        }
    }

    saveToStorage() {
        // Save playlist URLs separately
        this.savePlaylistUrls();

        // Try to save using the available storage option
        this.saveToIndexedDB()
            .catch(() => {
                // Fallback to localStorage if IndexedDB fails
                this.saveToLocalStorageAsFallback();
            });
    }

    // Save playlist URLs separately
    savePlaylistUrls() {
        try {
            localStorage.setItem('playlistUrls', JSON.stringify(this.playlistUrls));
        } catch (e) {
            console.error('Error saving playlist URLs:', e);
        }
    }

    // Load playlist URLs
    loadPlaylistUrls() {
        try {
            const urls = localStorage.getItem('playlistUrls');
            if (urls) {
                this.playlistUrls = JSON.parse(urls);
            } else {
                this.playlistUrls = [];
            }
        } catch (e) {
            console.error('Error loading playlist URLs:', e);
            this.playlistUrls = [];
        }
        this.renderPlaylistHistory();
    }

    // Render playlist history
    renderPlaylistHistory() {
        const playlistHistory = document.getElementById('playlistHistory');
        if (!playlistHistory) return;

        // Clear the current content
        playlistHistory.innerHTML = '';

        // Show a heading if there are playlists
        if (this.playlistUrls.length > 0) {
            const heading = document.createElement('h4');
            heading.textContent = 'Loaded Playlists:';
            heading.style.margin = '0 0 10px 0';
            heading.style.color = 'var(--accent)';
            playlistHistory.appendChild(heading);
        }

        // Add each playlist URL with a remove button
        this.playlistUrls.forEach((url, index) => {
            const playlistItem = document.createElement('div');
            playlistItem.className = 'playlist-url-item';

            const urlDisplay = document.createElement('div');
            urlDisplay.className = 'playlist-url';
            urlDisplay.textContent = url;
            urlDisplay.title = url; // Show full URL on hover

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-playlist-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = `Remove playlist: ${url}`;
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removePlaylist(index);
            });

            playlistItem.appendChild(urlDisplay);
            playlistItem.appendChild(removeBtn);
            playlistHistory.appendChild(playlistItem);
        });

        // Show message if no playlists loaded
        if (this.playlistUrls.length === 0) {
            const noPlaylistsMsg = document.createElement('div');
            noPlaylistsMsg.textContent = 'No playlists loaded';
            noPlaylistsMsg.style.color = 'var(--text-secondary)';
            noPlaylistsMsg.style.textAlign = 'center';
            noPlaylistsMsg.style.fontStyle = 'italic';
            noPlaylistsMsg.style.padding = '10px 0';
            playlistHistory.appendChild(noPlaylistsMsg);
        }
    }

    updateTotalSizeDisplay() {
        let totalSize = 0;

        if (this.videos && Array.isArray(this.videos)) {
            // Only count videos that are actually stored (not streamed/local files)
            // Only stored_video types take up space in IndexedDB/localStorage
            totalSize = this.videos.reduce((sum, video) => {
                if (video.type === 'stored_video') {
                    return sum + (video.size || 0);
                }
                return sum; // For non-stored videos, don't add to total
            }, 0);
        }

        const sizeDisplay = document.getElementById('totalSizeDisplay');
        if (sizeDisplay) {
            if (totalSize >= 1024 * 1024 * 1024) { // 1 GB in bytes
                // Convert to GB if greater than or equal to 1 GB
                const sizeInGB = Math.floor(totalSize / (1024 * 1024 * 1024));
                sizeDisplay.textContent = `${sizeInGB} GB`;
            } else {
                // Otherwise display in MB
                const sizeInMB = Math.floor(totalSize / (1024 * 1024));
                sizeDisplay.textContent = `${sizeInMB} MB`;
            }
        }
    }

    saveToIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject('IndexedDB not supported');
                return;
            }

            const request = indexedDB.open('VideoPlayerDB', 1);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['videos'], 'readwrite');
                const store = transaction.objectStore('videos');

                // Clear existing data and add current videos
                const clearRequest = store.clear();

                clearRequest.onsuccess = () => {
                    if (this.videos && this.videos.length > 0) {
                        for (const video of this.videos) {
                            // Create a copy without File/Blob objects, which can't be stored in IndexedDB
                            let videoCopy;
                            if (video.file) {
                                // For local files, create a copy without the file object
                                // If it's a local file being streamed, we'll need to exclude it from storage
                                // since file objects can't be serialized to IndexedDB
                                videoCopy = { ...video };
                                delete videoCopy.file; // Remove the file object which can't be stored
                            } else {
                                // For other videos (stored/base64, URLs), just copy normally
                                videoCopy = { ...video };
                            }

                            store.add(videoCopy);
                        }
                    } else {
                        // If no videos to save, just complete the transaction
                    }
                };

                transaction.oncomplete = () => {
                    console.log('Videos saved to IndexedDB successfully');
                    resolve();
                };

                transaction.onerror = (event) => {
                    console.error('Transaction error:', event.target.error);
                    reject(event.target.error);
                };
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    const store = db.createObjectStore('videos', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    loadFromIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject('IndexedDB not supported');
                return;
            }

            const request = indexedDB.open('VideoPlayerDB', 1);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['videos'], 'readonly');
                const store = transaction.objectStore('videos');
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    // Restore video data - note that file objects won't be preserved
                    this.videos = getAllRequest.result.map(video => {
                        // If it's a video that was previously stored as base64, mark it appropriately
                        if (video.src && typeof video.src === 'string' && video.src.startsWith('data:')) {
                            // This is a stored video in base64 format
                            return { ...video, type: 'stored_video' };
                        } else if (video.type === 'local_file') {
                            // Files can't be stored in IndexedDB, so mark them as needing re-upload
                            // This will happen when a user closes the browser and comes back
                            // In a real scenario, we'd need to re-upload them, but for now we'll keep the metadata
                            return { ...video, needsReUpload: true };
                        } else {
                            return video;
                        }
                    });

                    console.log('Videos loaded from IndexedDB');
                    this.updateTotalSizeDisplay();
                    resolve(this.videos);
                };

                getAllRequest.onerror = (event) => {
                    console.error('Error getting videos:', event.target.error);
                    reject(event.target.error);
                };
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    const store = db.createObjectStore('videos', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    saveToLocalStorageAsFallback() {
        try {
            // Check if the data will fit in localStorage
            const dataString = JSON.stringify(this.videos);

            // Check for localStorage quota
            localStorage.setItem('storedVideos', dataString);
            console.log('Videos saved to localStorage');
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                // Storage quota exceeded even for localStorage
                alert('Storage quota exceeded. Please remove some videos or clear your browser storage to make room for new videos.');

                // Remove the last added video to maintain state consistency
                this.videos.pop();
            } else {
                console.error('Error saving to localStorage:', e);
                alert('Error saving video data. Please try again.');
            }
        }
    }

    saveToLocalStorage() {
        // Deprecated function - redirect to new storage system
        this.saveToStorage();
    }

    renderGallery() {
        // Clear the gallery first
        this.videoGallery.innerHTML = '';

        // Show loading state if we're still loading videos and have no videos yet
        // This ensures the gallery is never completely blank during initial load
        if (this.isLoadingVideos && this.videos.length === 0) {
            this.videoGallery.innerHTML = '<p class="loading-videos">Loading videos...</p>';
            return;
        }

        // Check if we have videos to display
        if (!this.videos || this.videos.length === 0) {
            this.videoGallery.innerHTML = '<p class="no-videos">No videos to display. Upload some videos to get started.</p>';
            return;
        }

        // Filter out videos that need re-upload before rendering
        const videosToDisplay = this.videos.filter(video => !(video.type === 'local_file' && video.needsReUpload));

        videosToDisplay.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.dataset.id = video.id;

            // Create save and remove buttons for all videos (including streams)
            // For streams, we'll add save buttons but they'll show appropriate messages when clicked
            
            // Add save button for videos that allow saving
            if (video.allowSave) {
                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-btn';
                saveBtn.innerHTML = '💾';
                saveBtn.title = `Save ${video.name}`;
                saveBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the video click event
                    this.saveVideo(video);
                });
                videoItem.appendChild(saveBtn);
            }

            // Add save to storage button for videos that can be saved to storage
            // For M3U streams, this will attempt to download and save the stream
            if ((video.type === 'url' && video.allowSave) || 
                video.type === 'local_file' || 
                video.type === 'm3u' || 
                video.type === 'local_m3u_path') {
                
                const saveToStorageBtn = document.createElement('button');
                saveToStorageBtn.className = 'save-to-storage-btn';
                saveToStorageBtn.innerHTML = '📥';
                
                // Set appropriate title based on video type
                if (video.type === 'local_file') {
                    if (video.needsReUpload) {
                        saveToStorageBtn.title = `Re-upload ${video.name} to restore (was lost on reload)`;
                    } else {
                        saveToStorageBtn.title = `Save ${video.name} to storage (streamed)`;
                    }
                } else if (video.type === 'm3u' || video.type === 'local_m3u_path') {
                    saveToStorageBtn.title = `Save ${video.name} to storage (M3U stream)`;
                } else {
                    saveToStorageBtn.title = `Save ${video.name} to storage`;
                }
                
                saveToStorageBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the video click event
                    this.saveVideoToStorage(video);
                });
                videoItem.appendChild(saveToStorageBtn);
            }

            // Add remove button for all videos
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = `Remove ${video.name}`;
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the video click event
                this.removeVideo(video.id);
            });
            videoItem.appendChild(removeBtn);

            const thumbnail = document.createElement('img');
            thumbnail.alt = `Thumbnail for ${video.name}`;
            thumbnail.className = 'video-thumbnail';
            thumbnail.loading = 'lazy';

            // Set up error handler first
            thumbnail.onerror = () => {
                this.showFallbackThumbnail(thumbnail, video);
            };

            // Set up load handler to detect successful loads
            thumbnail.onload = () => {
                // Thumbnail loaded successfully
                thumbnail.style.backgroundColor = '';
                thumbnail.style.display = '';
                thumbnail.textContent = '';
            };

            // For M3U streams, use the logo; for videos, use the thumbnail
            let thumbnailUrl = video.thumbnail;
            
            // Check if we should use a fallback immediately
            const shouldUseFallback = !thumbnailUrl || 
                                     thumbnailUrl.trim() === '' || 
                                     (video.isStream && !this.isValidUrl(thumbnailUrl));
            
            if (shouldUseFallback) {
                // Show fallback immediately without trying to load
                const fallbackContainer = this.showFallbackThumbnail(thumbnail, video);
                if (fallbackContainer) {
                    // If showFallbackThumbnail returned a container (because thumbnail had no parent),
                    // use the container instead of the thumbnail
                    videoItem.appendChild(fallbackContainer);
                    // The container is now the thumbnail, so we don't need to append the original thumbnail
                } else {
                    // If showFallbackThumbnail didn't return a container (it replaced the thumbnail in-place),
                    // we still need to append the thumbnail to the videoItem
                    videoItem.appendChild(thumbnail);
                }
            } else {
                // Try to load the thumbnail
                thumbnail.src = thumbnailUrl;
                videoItem.appendChild(thumbnail);
                
                // Set a timeout to show fallback if image takes too long to load
                setTimeout(() => {
                    if (!thumbnail.complete || thumbnail.naturalWidth === 0) {
                        const fallbackContainer = this.showFallbackThumbnail(thumbnail, video);
                        if (fallbackContainer) {
                            // Replace thumbnail with container
                            thumbnail.parentNode.replaceChild(fallbackContainer, thumbnail);
                        }
                    }
                }, 1000); // 1 second timeout
            }

            const videoInfo = document.createElement('div');
            videoInfo.className = 'video-info';

            const title = document.createElement('div');
            title.className = 'video-title';
            title.textContent = video.name;

            const meta = document.createElement('div');
            meta.className = 'video-meta';

            // For streams, show group info instead of duration/size
            if (video.isStream) {
                const groupInfo = video.groupId || 'Live Stream';
                meta.textContent = `📺 ${groupInfo}`;
            } else {
                const duration = this.formatTime(video.duration);
                const size = this.formatFileSize(video.size);
                meta.textContent = `${duration} • ${size}`;

                // Indicate if the video is currently stored or streamed
                if (video.type === 'local_file') {
                    if (video.needsReUpload) {
                        meta.textContent += ` • ⚠️ (needs re-upload)`;
                    } else {
                        meta.textContent += ` • 📁 (streamed)`;
                    }
                } else if (video.type === 'stored_video') {
                    meta.textContent += ` • 💾 (stored)`;
                }
            }

            videoInfo.appendChild(title);
            videoInfo.appendChild(meta);

            videoItem.appendChild(thumbnail);
            videoItem.appendChild(videoInfo);

            videoItem.addEventListener('click', () => {
                this.playVideo(video);
            });

            this.videoGallery.appendChild(videoItem);
        });
    }

    playVideo(video) {
        // Log for debugging
        console.log('Attempting to play video:', video);

        // Find the index of this video in the videos array
        const videoIndex = this.videos.findIndex(v => v.id === video.id);
        if (videoIndex !== -1) {
            this.currentVideoIndex = videoIndex;
        }

        // Handle different video types
        if (video.type === 'local_file' && video.file) {
            // For local files, create a blob URL from the stored file object
            const videoBlobUrl = URL.createObjectURL(video.file);
            this.videoPlayer.src = videoBlobUrl;
            this.videoInfo.textContent = `Playing: ${video.name} ${video.duration ? '(' + this.formatTime(video.duration) + ')' : ''}`;

            // Store the URL to revoke later when video stops
            this.currentVideoBlobUrl = videoBlobUrl;
        } else if (video.type === 'local_file' && video.needsReUpload) {
            // This is a local file that was previously added but the file object was lost
            // (since file objects can't be stored in IndexedDB)
            alert(`This video "${video.name}" needs to be re-uploaded as the file reference was lost. Please re-select the file to continue.`);
            return; // Abort play attempt
        } else if (video.type === 'local_m3u_path') {
            // For local file paths from M3U playlists, provide options
            const userChoice = confirm(
                `To play "${video.name}" from your local M3U playlist:\n\n` +
                `Option 1: Select the actual file now (will be added to your collection)\n` +
                `Option 2: Cancel and set up a local server for streaming\n\n` +
                `Click OK to select the file, or Cancel to learn about local server setup.`
            );
            
            if (userChoice) {
                // User wants to select the file
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*,audio/*';
                input.multiple = false;

                input.onchange = (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        // Process the selected file and update the video entry
                        this.processVideoFile(file, true);
                        
                        // Find the updated video entry and play it
                        setTimeout(() => {
                            const updatedVideo = this.videos.find(v => v.originalFileName === file.name || v.name === video.name);
                            if (updatedVideo) {
                                this.playVideo(updatedVideo);
                            }
                        }, 500);
                    }
                };

                input.click();
            } else {
                // User wants to learn about local server setup
                alert(
                    `To stream local media files through M3U playlists:\n\n` +
                    `1. Set up a local HTTP server:\n` +
                    `   - Python: Run "python3 -m http.server 8000" in your media folder\n` +
                    `   - Node.js: Use "http-server" or "serve" packages\n` +
                    `   - Other: Any web server software works\n\n` +
                    `2. Update your M3U file to use HTTP URLs instead of local paths:\n` +
                    `   Change: /path/to/video.mp4\n` +
                    `   To: http://localhost:8000/video.mp4\n\n` +
                    `3. Load the updated M3U file via URL input (not file upload)\n\n` +
                    `This allows the browser to stream files securely.`
                );
            }
            return; // Don't proceed with normal playback
        } else if (video.isStream) {
            // For live streams, try the direct URL first
            this.videoPlayer.src = video.src;
            this.videoInfo.textContent = `Playing: ${video.name}`;
        } else {
            // For regular videos, make sure the src is valid
            if (!video.src) {
                alert('Video source is not defined');
                return;
            }
            this.videoPlayer.src = video.src;
            this.videoInfo.textContent = `Playing: ${video.name} ${video.duration ? '(' + this.formatTime(video.duration) + ')' : ''}`;
        }

        this.videoPlayer.load(); // Explicitly load the source

        // Wait for metadata to load to update info display and set proper size
        this.videoPlayer.onloadedmetadata = () => {
            // For streams, we don't have duration typically
            if (!video.isStream) {
                this.videoInfo.textContent = `Playing: ${video.name} (${this.formatTime(video.duration || this.videoPlayer.duration)})`;
            }

            this.updateTimeDisplay();

            // Apply saved zoom level to the new video
            setTimeout(() => {
                if (this.videoPlayer && this.videoPlayer.videoWidth && this.videoPlayer.videoHeight) {
                    // Load and apply the saved zoom level
                    this.loadZoomLevel();
                }
            }, 100);
        };

        // Handle error loading video
        this.videoPlayer.onerror = (e) => {
            console.error('Error loading video:', e);
            console.error('Video src type:', typeof video.src);
            console.error('Video src length:', video.src ? video.src.length : 'undefined');

            // If it's a stream and failed, try with CORS proxy
            if (video.isStream) {
                const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${video.src}`;
                console.log('Trying with CORS proxy:', corsProxyUrl);
                this.videoPlayer.src = corsProxyUrl;
                this.videoPlayer.load();
            } else {
                alert('Failed to load the video. The file may be corrupted or incompatible.');
            }
        };

        this.videoPlayer.oncanplay = () => {
            // Video is ready to play
            console.log('Video is ready to play');
        };

        // Handle waiting state for live streams
        this.videoPlayer.onwaiting = () => {
            console.log('Video player is waiting for data...');
            this.videoInfo.textContent = `Buffering: ${video.name}`;
        };

        this.videoPlayer.onstalled = () => {
            console.log('Video player stalled - network issue?');
            this.videoInfo.textContent = `Connection issue with: ${video.name}`;
        };

        // Clean up blob URL when video ends
        this.videoPlayer.onended = () => {
            if (this.currentVideoBlobUrl) {
                URL.revokeObjectURL(this.currentVideoBlobUrl);
                this.currentVideoBlobUrl = null;
            }
        };

        // Clean up blob URL when video is paused for a long time or changed
        this.videoPlayer.onpause = () => {
            if (this.currentVideoBlobUrl) {
                // Only revoke if the video has ended or if we're switching to another video
                if (this.videoPlayer.currentTime >= this.videoPlayer.duration || this.videoPlayer.ended) {
                    URL.revokeObjectURL(this.currentVideoBlobUrl);
                    this.currentVideoBlobUrl = null;
                }
            }
        };

        // Update controls to show live stream indicators if needed
        if (video.isStream) {
            this.timeDisplay.textContent = 'LIVE'; // Change time display for live streams
        } else {
            // Reset time display for regular videos
            this.timeDisplay.textContent = `${this.formatTime(0)} / ${this.formatTime(video.duration || 0)}`;
        }

        this.openVideoModal();

        // Play the video after a short delay to ensure it's ready
        setTimeout(() => {
            // Check if the video is ready to play before attempting to play
            if (this.videoPlayer.readyState >= 2) { // HAVE_CURRENT_DATA
                this.videoPlayer.play()
                    .then(() => {
                        this.playPauseBtn.textContent = '⏸';
                        console.log('Video played successfully');
                    })
                    .catch(error => {
                        console.error('Error attempting to play video:', error);

                        // For streams, if direct play fails, try with proxy
                        if (video.isStream) {
                            console.log('Retrying stream with proxy...');
                            const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${video.src}`;
                            this.videoPlayer.src = corsProxyUrl;
                            this.videoPlayer.load();

                            setTimeout(() => {
                                this.videoPlayer.play()
                                    .then(() => {
                                        this.playPauseBtn.textContent = '⏸';
                                    })
                                    .catch(retryErr => {
                                        console.error('Retry failed for stream:', retryErr);
                                        alert('Could not play the stream. It may be unavailable or blocked by CORS policies.');
                                    });
                            }, 100);
                        } else {
                            alert('Could not play the video. It may still be loading.');
                        }
                    });
            } else {
                // If not ready, set up an event listener
                this.videoPlayer.oncanplaythrough = () => {
                    this.videoPlayer.play()
                        .then(() => {
                            this.playPauseBtn.textContent = '⏸';
                        })
                        .catch(error => {
                            console.error('Error attempting to play video:', error);
                            alert('Could not play the video. It may still be loading.');
                        });
                };
            }
        }, 100);
    }

    togglePlayPause() {
        if (this.videoPlayer.paused) {
            this.videoPlayer.play();
            this.playPauseBtn.textContent = '⏸';
        } else {
            this.videoPlayer.pause();
            this.playPauseBtn.textContent = '▶';
        }
    }

    toggleMute() {
        this.videoPlayer.muted = !this.videoPlayer.muted;
        this.updateVolumeButton();
    }

    updateVolumeButton() {
        if (this.videoPlayer.muted || this.videoPlayer.volume === 0) {
            this.volumeBtn.textContent = '🔇';
        } else {
            this.volumeBtn.textContent = '🔊';
        }
    }

    updateProgress() {
        const percentage = (this.videoPlayer.currentTime / this.videoPlayer.duration) * 100;
        this.progressBar.style.width = `${percentage}%`;
    }

    updateTimeDisplay() {
        const currentTime = this.videoPlayer.currentTime || 0;
        const duration = this.videoPlayer.duration || 0;
        
        this.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.videoModal.requestFullscreen) {
                this.videoModal.requestFullscreen();
            } else if (this.videoModal.mozRequestFullScreen) { /* Firefox */
                this.videoModal.mozRequestFullScreen();
            } else if (this.videoModal.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                this.videoModal.webkitRequestFullscreen();
            } else if (this.videoModal.msRequestFullscreen) { /* IE/Edge */
                this.videoModal.msRequestFullscreen();
            }
            this.fullscreenBtn.textContent = '⛶'; // Change to minimize icon
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari & Opera */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
            this.fullscreenBtn.textContent = '⛶'; // Change back to maximize icon
        }

        // Ensure cursor visibility is reset after fullscreen toggle
        setTimeout(() => {
            if (!document.fullscreenElement && this.videoModal.style.display === 'block' && !this.videoPlayer.paused) {
                // Restart cursor hiding timer
                this.startCursorHideTimer();
            } else if (!document.fullscreenElement) {
                // Show cursor when exiting fullscreen if video is not playing
                this.videoModal.style.cursor = 'default';
                this.isCursorHidden = false;
            }
        }, 100);
    }


    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    loadVideoFromUrl(url, allowSave = false) {
        try {
            new URL(url);
        } catch (e) {
            alert('Invalid URL format');
            return;
        }

        // Check if URL is for a video
        if (!/\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv|f4v|m4v|3gp|3g2|mpg|mpeg|dat|asf|avi|flv|qt|mov)$/i.test(url) && !url.includes('/raw/') && !url.includes('http://ai:7801')) {
            alert('URL does not appear to be a video. This player supports common video formats (MP4, WebM, OGG, etc.), raw endpoints, or AI service URLs.');
            return;
        }

        // Create a video object for the gallery with save option
        const fileName = url.substring(url.lastIndexOf('/') + 1);
        const videoData = {
            id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            src: url,
            name: fileName,
            size: 0, // Size unknown for URL
            duration: undefined, // Duration unknown initially
            thumbnail: '', // Thumbnail will be created if possible
            timestamp: new Date().toISOString(),
            type: 'url',
            allowSave: allowSave, // Add flag for save functionality
            isStream: !allowSave // Treat non-save URLs as streams
        };

        // Check if this URL is already in the collection
        const isDuplicate = this.videos.some(video => video.src === url && video.type === 'url');
        if (isDuplicate) {
            alert('This video URL is already in your collection.');
            return;
        }

        // Add to videos array
        this.videos.push(videoData);
        this.saveToStorage();
        this.updateTotalSizeDisplay();
        this.renderGallery();

        // Set up error handler that suggests CORS proxy
        let attemptedWithProxy = false;
        this.videoPlayer.onerror = (e) => {
            console.error('Video loading error:', e);
            if (!attemptedWithProxy && !url.startsWith('https://cors-anywhere.herokuapp.com/')) {
                // Try with CORS proxy
                attemptedWithProxy = true;
                const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
                console.log('Trying with CORS proxy:', corsProxyUrl);
                this.videoPlayer.src = corsProxyUrl;
                this.videoPlayer.load();
            } else {
                // Already tried with proxy or proxy was already in use
                const CORS_MESSAGE = `Failed to load video from URL. This is likely a CORS issue.\n\nIf the video is still not loading:\n1. The server may not allow external access\n2. The CORS proxy service may be down\n3. The URL may be incorrect or inaccessible`;
                alert(CORS_MESSAGE);
            }
        };

        this.videoPlayer.onloadedmetadata = () => {
            // Successfully loaded, continue with playback
            videoData.duration = this.videoPlayer.duration;

            // Generate thumbnail if possible
            this.generateThumbnailFromUrl(videoData);

            // Update the video info with duration
            this.videoInfo.textContent = `Playing: ${fileName} (${this.formatTime(this.videoPlayer.duration)})`;

            this.videoModal.style.display = 'block';

            // Play the video after a short delay to ensure it's ready
            setTimeout(() => {
                this.videoPlayer.play();
                this.playPauseBtn.textContent = '⏸';
            }, 100);
        };

        // Set the video source directly
        this.videoPlayer.src = url;
        this.videoPlayer.load();
    }

    // Generate thumbnail from a video URL
    generateThumbnailFromUrl(videoData) {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = videoData.src;

        tempVideo.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 200; // Fixed width for thumbnails
            canvas.height = 150; // Fixed height for thumbnails
            const ctx = canvas.getContext('2d');

            // Capture frame at the middle of the video
            const seekTime = tempVideo.duration > 0 ? tempVideo.duration / 2 : 1;
            tempVideo.currentTime = seekTime;

            const captureFrame = () => {
                try {
                    ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                    const thumbnail = canvas.toDataURL('image/jpeg');

                    // Update the video data with the thumbnail
                    videoData.thumbnail = thumbnail;

                    // Update the gallery to show the new thumbnail
                    this.saveToStorage();
                    this.renderGallery();
                } catch (drawError) {
                    console.error('Error drawing thumbnail:', drawError);
                }
            };

            const onSeeked = () => {
                captureFrame();
                tempVideo.removeEventListener('seeked', onSeeked);
            };

            tempVideo.addEventListener('seeked', onSeeked, { once: true });
        };
    }

    toggleLoop() {
        this.videoPlayer.loop = !this.videoPlayer.loop;
        this.updateLoopButton();
    }

    updateLoopButton() {
        if (this.loopBtn) {
            this.loopBtn.textContent = this.videoPlayer.loop ? '🔄' : '🔁';
            this.loopBtn.title = this.videoPlayer.loop ? 'Disable Loop' : 'Enable Loop';
        }
    }

    initializeLoopState() {
        // Initialize the loop button to match the default state
        this.updateLoopButton();
    }

    changeSpeed() {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentSpeed = this.videoPlayer.playbackRate;
        const currentIndex = speeds.indexOf(currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        this.videoPlayer.playbackRate = speeds[nextIndex];
        this.speedDisplay.textContent = `${speeds[nextIndex]}x`;
    }

    handleKeyboardShortcuts(e) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.videoPlayer.currentTime += 10; // Seek forward 10 seconds
                break;
            case 'ArrowLeft':
                // Check if Alt key is also pressed (Alt+Left arrow for back navigation)
                if (e.altKey) {
                    e.preventDefault();
                    this.closeVideoModal();
                } else {
                    e.preventDefault();
                    this.videoPlayer.currentTime -= 10; // Seek backward 10 seconds
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this.videoPlayer.volume < 1) {
                    this.videoPlayer.volume = Math.min(1, this.videoPlayer.volume + 0.1);
                    this.volumeSlider.value = this.videoPlayer.volume;
                }
                this.updateVolumeButton();
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (this.videoPlayer.volume > 0) {
                    this.videoPlayer.volume = Math.max(0, this.videoPlayer.volume - 0.1);
                    this.volumeSlider.value = this.videoPlayer.volume;
                }
                this.updateVolumeButton();
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'n':
            case 'N':
                e.preventDefault();
                if (this.videos.length > 1) {
                    this.playNextVideo();
                }
                break;
            case 'b':
            case 'B':
                e.preventDefault();
                if (this.videos.length > 1) {
                    this.playPrevVideo();
                }
                break;
            case 'l':
            case 'L':
                e.preventDefault();
                // Toggle local loop for current video only
                this.toggleLoop();
                break;
            case 'a':
            case 'A':
                e.preventDefault();
                // Toggle global loop for all videos
                this.toggleGlobalLoop();
                break;
            case 'o':  // Toggle keyboard shortcuts
            case 'O':
                e.preventDefault();
                // Toggle keyboard shortcuts visibility
                this.toggleKeyboardShortcuts();
                break;
            case 'z':  // Zoom in/toggle
                e.preventDefault();
                this.toggleZoom();
                break;
            case 'Z':  // Zoom out
                e.preventDefault();
                this.zoomOut();
                break;
            case '0':
                e.preventDefault();
                this.resetZoom();
                break;
            case '+':
            case '=': // For key combinations like Shift+=
                e.preventDefault();
                this.increaseSpeed();
                break;
            case '-':
                e.preventDefault();
                this.decreaseSpeed();
                break;
            case 'Escape':
                this.closeVideoModal();
                break;
            default:
                // Other keys do nothing for video player
                break;
        }
    }

    increaseSpeed() {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentSpeed = this.videoPlayer.playbackRate;
        const currentIndex = speeds.indexOf(currentSpeed);
        if (currentIndex < speeds.length - 1) {
            this.videoPlayer.playbackRate = speeds[currentIndex + 1];
            this.speedDisplay.textContent = `${speeds[currentIndex + 1]}x`;
        }
    }

    decreaseSpeed() {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentSpeed = this.videoPlayer.playbackRate;
        const currentIndex = speeds.indexOf(currentSpeed);
        if (currentIndex > 0) {
            this.videoPlayer.playbackRate = speeds[currentIndex - 1];
            this.speedDisplay.textContent = `${speeds[currentIndex - 1]}x`;
        }
    }

    toggleZoom() {
        const container = this.videoPlayer.parentElement;
        const currentTransform = container.style.transform;
        let currentZoom = 1;

        // Extract current zoom value
        if (currentTransform && currentTransform.includes('scale(')) {
            try {
                const scaleMatch = currentTransform.match(/scale\(([0-9.]+)(?:,\s*([0-9.]+))?\)/);
                if (scaleMatch) {
                    currentZoom = parseFloat(scaleMatch[1]) || 1;
                }
            } catch(e) {
                currentZoom = 1;
                // If parsing fails, start with default zoom
            }
        }

        // Use a more gradual increment for smoother zooming - changed from 1.1 to 1.05 (5% instead of 10%)
        const zoomFactor = 1.05; // 5% increment for even smoother zoom
        const newZoom = currentZoom * zoomFactor;

        // Limit zoom range
        const finalZoom = Math.min(3, newZoom); // Cap at 3x zoom

        // Apply zoom with center origin, keeping panning if any
        container.style.transform = `scale(${finalZoom}) translate(${this.panX}px, ${this.panY}px)`;
        container.style.transformOrigin = 'center center';

        // Update the zoom indicator in the UI
        this.updateZoomIndicator(finalZoom);
    }

    zoomOut() {
        const container = this.videoPlayer.parentElement;
        const currentTransform = container.style.transform;
        let currentZoom = 1;

        // Extract current zoom value
        if (currentTransform && currentTransform.includes('scale(')) {
            try {
                const scaleMatch = currentTransform.match(/scale\(([0-9.]+)(?:,\s*([0-9.]+))?\)/);
                if (scaleMatch) {
                    currentZoom = parseFloat(scaleMatch[1]) || 1;
                }
            } catch(e) {
                currentZoom = 1;
            }
        }

        // Use a more gradual decrement for smoother zooming - changed from 0.9 to 0.95 (reduce by 5% instead of 10%)
        const zoomFactor = 0.95; // Reduce by 5% for even smoother zoom
        const newZoom = currentZoom * zoomFactor;

        // Clamp to minimum zoom of 0.5
        const finalZoom = Math.max(0.5, newZoom);

        // Apply zoom with center origin, keeping panning if any
        container.style.transform = `scale(${finalZoom}) translate(${this.panX}px, ${this.panY}px)`;
        container.style.transformOrigin = 'center center';

        // Update the zoom indicator in the UI
        this.updateZoomIndicator(finalZoom);
    }

    resetZoom() {
        const container = this.videoPlayer.parentElement;

        // Reset zoom, panning, and scaling to original state
        if (container) {
            container.style.transform = 'none';
            container.style.transformOrigin = 'center center';
        }

        // Reset panning values
        this.panX = 0;
        this.panY = 0;

        this.updateZoomIndicator(1);
    }

    // Clean up video resources like blob URLs to prevent memory leaks
    cleanupVideoResources() {
        if (this.currentVideoBlobUrl) {
            URL.revokeObjectURL(this.currentVideoBlobUrl);
            this.currentVideoBlobUrl = null;
        }
    }

    // Enable panning functionality
    setupVideoPanning() {
        const container = this.videoPlayer.parentElement;
        const videoModal = this.videoModal;

        // Mouse events for panning
        videoModal.addEventListener('mousedown', (e) => {
            // Only pan when video is zoomed in
            if (this.getZoomLevel() <= 1) return;

            // Only pan on left mouse button, and not on controls
            if (e.button !== 0) return;

            // Don't pan if clicking on controls
            if (e.target.closest('.video-controls')) return;

            this.isDragging = true;
            this.dragStartX = e.clientX - this.panX;
            this.dragStartY = e.clientY - this.panY;
            videoModal.classList.add('grabbing');
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            this.panX = e.clientX - this.dragStartX;
            this.panY = e.clientY - this.dragStartY;

            const currentZoom = this.getZoomLevel();
            container.style.transform = `scale(${currentZoom}) translate(${this.panX}px, ${this.panY}px)`;
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            videoModal.classList.remove('grabbing');
        });

        // Touch events for mobile panning
        videoModal.addEventListener('touchstart', (e) => {
            if (this.getZoomLevel() <= 1) return;

            if (e.touches.length === 1) {
                this.isDragging = true;
                this.dragStartX = e.touches[0].clientX - this.panX;
                this.dragStartY = e.touches[0].clientY - this.panY;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;

            this.panX = e.touches[0].clientX - this.dragStartX;
            this.panY = e.touches[0].clientY - this.dragStartY;

            const currentZoom = this.getZoomLevel();
            container.style.transform = `scale(${currentZoom}) translate(${this.panX}px, ${this.panY}px)`;

            e.preventDefault(); // Prevent scrolling on touch devices
        });

        document.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    // Helper to extract current zoom level
    getZoomLevel() {
        const container = this.videoPlayer.parentElement;
        const currentTransform = container.style.transform;

        if (currentTransform && currentTransform.includes('scale(')) {
            try {
                // Extract the scale value from transform string like "scale(1.5) translate(10px, 20px)"
                const scaleMatch = currentTransform.match(/scale\(([0-9.]+)\)/);
                if (scaleMatch && scaleMatch[1]) {
                    return parseFloat(scaleMatch[1]);
                }
            } catch(e) {
                return 1; // Default zoom level
            }
        }
        return 1; // Default zoom level
    }

    updateZoomIndicator(zoomLevel) {
        // Add zoom indicator to the UI if needed, or update a status element
        // For now, we can just update the button text if there's a zoom button
        
        // Save zoom level to localStorage
        this.saveZoomLevel(zoomLevel);
    }

    // Save zoom level to localStorage
    saveZoomLevel(zoomLevel) {
        try {
            localStorage.setItem('videoZoomLevel', zoomLevel.toString());
        } catch (e) {
            console.error('Error saving zoom level:', e);
        }
    }

    // Load zoom level from localStorage
    loadZoomLevel() {
        try {
            const savedZoom = localStorage.getItem('videoZoomLevel');
            if (savedZoom) {
                const zoomLevel = parseFloat(savedZoom);
                if (!isNaN(zoomLevel) && zoomLevel >= 0.5 && zoomLevel <= 3) {
                    // Apply the saved zoom level
                    const container = this.videoPlayer.parentElement;
                    if (container) {
                        container.style.transform = `scale(${zoomLevel}) translate(${this.panX}px, ${this.panY}px)`;
                        container.style.transformOrigin = 'center center';
                    }
                }
            }
        } catch (e) {
            console.error('Error loading zoom level:', e);
        }
    }

    playNextVideo() {
        if (this.videos.length <= 1) return;

        // Find current video index based on src
        const currentSrc = this.videoPlayer.src;
        let currentIndex = -1;

        for (let i = 0; i < this.videos.length; i++) {
            if (this.videos[i].src === currentSrc || this.videos[i].src === currentSrc.split('?')[0]) {
                currentIndex = i;
                break;
            }
        }

        // If not found in stored videos, use internal tracking
        if (currentIndex === -1) {
            currentIndex = this.currentVideoIndex;
        }

        // Find the next valid video that can be played (not needing re-upload)
        let nextIndex = currentIndex;
        let attempts = 0;

        do {
            nextIndex = (nextIndex + 1) % this.videos.length;
            attempts++;

            // Check if this video can be played (not a local file that needs re-upload)
            const video = this.videos[nextIndex];
            if (!(video.type === 'local_file' && video.needsReUpload)) {
                // Update internal tracking
                this.currentVideoIndex = nextIndex;
                // Play the next video
                this.playVideo(video);
                return; // Exit successfully
            }
        } while (attempts < this.videos.length); // Stop after checking all videos once

        // If we get here, all videos need re-upload
        alert('All videos need to be re-uploaded. Please re-select your files.');
    }

    playPrevVideo() {
        if (this.videos.length <= 1) return;

        // Find current video index based on src
        const currentSrc = this.videoPlayer.src;
        let currentIndex = -1;

        for (let i = 0; i < this.videos.length; i++) {
            if (this.videos[i].src === currentSrc || this.videos[i].src === currentSrc.split('?')[0]) {
                currentIndex = i;
                break;
            }
        }

        // If not found in stored videos, use internal tracking
        if (currentIndex === -1) {
            currentIndex = this.currentVideoIndex;
        }

        // Find the previous valid video that can be played (not needing re-upload)
        let prevIndex = currentIndex;
        let attempts = 0;

        do {
            prevIndex = (prevIndex - 1 + this.videos.length) % this.videos.length;
            attempts++;

            // Check if this video can be played (not a local file that needs re-upload)
            const video = this.videos[prevIndex];
            if (!(video.type === 'local_file' && video.needsReUpload)) {
                // Update internal tracking
                this.currentVideoIndex = prevIndex;
                // Play the previous video
                this.playVideo(video);
                return; // Exit successfully
            }
        } while (attempts < this.videos.length); // Stop after checking all videos once

        // If we get here, all videos need re-upload
        alert('All videos need to be re-uploaded. Please re-select your files.');
    }

    toggleGlobalLoop() {
        this.globalLoop = !this.globalLoop;

        // Update UI to reflect the global loop status
        const globalLoopBtn = document.getElementById('globalLoopBtn');
        if (globalLoopBtn) {
            globalLoopBtn.textContent = this.globalLoop ? '🔁' : '↺';
            globalLoopBtn.title = this.globalLoop ? 'Disable Global Loop (Will auto-play next video when current ends)' : 'Enable Global Loop (Will auto-play next video when current ends)';
        }

        // Show temporary status
        this.showMessage(`Global Loop: ${this.globalLoop ? 'ON' : 'OFF'}`);
    }

    toggleKeyboardShortcuts() {
        const shortcutsDiv = document.querySelector('.keyboard-shortcuts');
        if (shortcutsDiv.style.opacity === '1') {
            shortcutsDiv.style.opacity = '0';
            shortcutsDiv.style.visibility = 'hidden';
            this.showMessage('Keyboard Shortcuts: HIDDEN');
        } else {
            shortcutsDiv.style.opacity = '0.8';
            shortcutsDiv.style.visibility = 'visible';
            this.showMessage('Keyboard Shortcuts: VISIBLE');
        }
    }

    showMessage(message) {
        // Create or update a temporary message element
        let messageEl = document.getElementById('video-message');

        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'video-message';
            messageEl.style.position = 'absolute';
            messageEl.style.top = '50%';
            messageEl.style.left = '50%';
            messageEl.style.transform = 'translate(-50%, -50%)';
            messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            messageEl.style.color = 'white';
            messageEl.style.padding = '10px 20px';
            messageEl.style.borderRadius = '5px';
            messageEl.style.zIndex = '2000';
            messageEl.style.fontSize = '16px';
            messageEl.style.pointerEvents = 'none';
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s ease';
            this.videoModal.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.style.opacity = '1';

        // Fade out after 2 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
        }, 2000);
    }

    // Touchpad zoom handler
    setupTouchpadZoom() {
        const container = this.videoPlayer.parentElement;
        let lastWheelEventTime = 0;

        // Listen for wheel events (for touchpad pinch gesture, without requiring Ctrl key)
        container.addEventListener('wheel', (e) => {
            // Only zoom on vertical scroll (deltaY), not horizontal
            if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) {
                return; // Ignore horizontal scrolling
            }

            // Optional: Check for Ctrl/Meta/Alt to only zoom with those keys
            // Remove this check to enable zoom on any wheel event
            // if (!e.ctrlKey && !e.metaKey) return;

            e.preventDefault();

            const currentTime = Date.now();
            // Throttle zoom events to make them smoother (limit to ~60fps) - increased from 16ms to 30ms for slower zoom
            if (currentTime - lastWheelEventTime < 30) { // Increased to 30ms for slower response
                return;
            }
            lastWheelEventTime = currentTime;

            const currentTransform = container.style.transform;
            let currentZoom = 1;

            // Extract current zoom value
            if (currentTransform && currentTransform.includes('scale(')) {
                try {
                    const scaleMatch = currentTransform.match(/scale\(([0-9.]+)(?:,\s*([0-9.]+))?\)/);
                    if (scaleMatch) {
                        currentZoom = parseFloat(scaleMatch[1]) || 1;
                    }
                } catch(e) {
                    currentZoom = 1;
                }
            }

            // Use a more gradual zoom scale for smoother experience
            // Calculate zoom factor based on deltaY for more precise control - reduced from 0.02 to 0.01 for even smoother zoom
            const zoomIntensity = 0.01; // Further reduced from 0.02 for even smoother zoom
            let zoomFactor;

            if (e.deltaY < 0) {
                // Scrolling up (zoom in)
                zoomFactor = 1 + zoomIntensity;
            } else {
                // Scrolling down (zoom out)
                zoomFactor = 1 - zoomIntensity;
            }

            let newZoom = currentZoom * zoomFactor;

            // Limit zoom range
            newZoom = Math.max(0.5, Math.min(3, newZoom));

            // Apply zoom with center origin and maintain panning if present
            // Extract panning values if they exist in the transform
            let panX = this.panX || 0;
            let panY = this.panY || 0;

            // Check for translation in the current transform
            if (currentTransform && currentTransform.includes('translate')) {
                try {
                    const translateMatch = currentTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
                    if (translateMatch) {
                        panX = parseFloat(translateMatch[1]) || 0;
                        panY = parseFloat(translateMatch[2]) || 0;
                    }
                } catch(e) {
                    // If parsing fails, use current panX and panY
                }
            }

            // Apply the transformation
            container.style.transform = `scale(${newZoom}) translate(${panX}px, ${panY}px)`;
            container.style.transformOrigin = 'center center';

            this.updateZoomIndicator(newZoom);
        }, { passive: false });
    }

    // Method to load and parse M3U playlist
    async loadM3UPlaylist(url) {
        if (!url) {
            alert('Please provide a valid M3U playlist URL');
            return;
        }

        try {
            // Check if this playlist URL is already loaded
            if (this.playlistUrls.includes(url)) {
                alert('This playlist is already loaded');
                return;
            }

            // Fetch the M3U playlist content
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const m3uContent = await response.text();

            // Parse the M3U playlist
            const playlistItems = this.parseM3U(m3uContent);

            if (playlistItems.length === 0) {
                alert('No valid channels found in the M3U playlist');
                return;
            }

            // Add parsed channels to the videos array
            for (const item of playlistItems) {
                // Create a unique ID for the playlist item
                const id = `m3u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const videoData = {
                    id: id,
                    src: item.url,
                    name: item.channelName,
                    size: 0, // Stream URLs don't have a defined size
                    duration: undefined, // Live streams don't have a duration
                    thumbnail: item.logo || '',
                    timestamp: new Date().toISOString(),
                    type: 'm3u', // Mark as M3U playlist item
                    groupId: item.groupId,
                    tvgId: item.tvgId,
                    isStream: true, // Mark as live stream
                    playlistUrl: url // Track which playlist this stream came from
                };

                // Add to videos array if not already present
                const isDuplicate = this.videos.some(video => video.src === videoData.src);
                if (!isDuplicate) {
                    this.videos.push(videoData);
                }
            }

            // Add to playlist URLs list
            this.playlistUrls.push(url);

            // Save to storage and update UI
            this.saveToStorage();
            this.updateTotalSizeDisplay();
            this.renderGallery();

            // Show success message
            this.videoInfo.textContent = `Loaded ${playlistItems.length} channels from playlist: ${playlistItems.length} items`;

        } catch (error) {
            console.error('Error loading M3U playlist:', error);
            alert(`Error loading M3U playlist: ${error.message}`);
        }
    }

    // Method to parse M3U content
    parseM3U(content) {
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const playlistItems = [];

        // Check if this is an extended M3U file
        const isExtendedM3U = lines[0] === '#EXTM3U';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Extended M3U format with metadata
                const extinfLine = line;
                const streamUrl = lines[i + 1]?.trim(); // Get the next line as the stream URL

                if (streamUrl) {
                    // Extract attributes from EXTINF line
                    const item = this.extractChannelInfo(extinfLine, streamUrl);

                    // Add the parsed item to the list
                    if (item) {
                        playlistItems.push(item);
                        i++; // Skip the URL line since we've processed it
                    }
                }
            } else if (!line.startsWith('#') && this.isVideoFile(line)) {
                // Simple M3U format - just file paths/URLs
                // Check if it's a video file (common video extensions)
                const item = {
                    url: line,
                    channelName: this.extractFileName(line),
                    tvgId: undefined,
                    logo: undefined,
                    groupId: 'Local Videos',
                    userAgent: undefined,
                    httpReferrer: undefined,
                    isVlcOpt: false
                };
                playlistItems.push(item);
            }
        }

        return playlistItems;
    }

    // Helper method to check if a string is a video file
    isVideoFile(path) {
        const videoExtensions = ['.mp4', '.mkv', '.webm', '.mov', '.avi', '.wmv', '.flv', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogg', '.ogv', '.ts', '.m2ts', '.mts', '.vob', '.mp3', '.wav', '.aac', '.flac', '.m4a', '.wma', '.opus'];
        const lowerPath = path.toLowerCase();
        return videoExtensions.some(ext => lowerPath.endsWith(ext));
    }

    // Helper method to extract file name from path
    extractFileName(path) {
        // Extract filename from path (handles both / and \ separators)
        const parts = path.split(/[\\/]/);
        return parts[parts.length - 1] || 'Unknown Video';
    }

    // Method to extract channel info from EXTINF line
    extractChannelInfo(extinfLine, streamUrl) {
        // Extract attributes from EXTINF line
        // Format example: #EXTINF:-1 tvg-id="4TVNews.in@SD" tvg-logo="..." group-title="News",4TV News (576p)

        const attributes = {};

        // Extract the attributes part
        const attributesPart = extinfLine.substring('#EXTINF:'.length).split(',')[0].trim();

        // Extract the channel name
        const channelNameMatch = extinfLine.match(/,(.+)$/);
        const channelName = channelNameMatch ? channelNameMatch[1].trim() : 'Unknown Channel';

        // Extract individual attributes using regex
        const attributeRegex = /(\w+)=["']([^"']*)["']/g;
        let match;
        while ((match = attributeRegex.exec(extinfLine)) !== null) {
            const [, attrName, attrValue] = match;
            attributes[attrName.toLowerCase()] = attrValue;
        }

        // Return the channel object
        return {
            url: streamUrl,
            channelName: channelName,
            tvgId: attributes['tvg-id'] || attributes['tvg_id'] || undefined,
            logo: attributes['tvg-logo'] || attributes['tvg_logo'] || attributes['logo'] || undefined,
            groupId: attributes['group-title'] || attributes['group_title'] || attributes['group'] || 'Other',
            userAgent: attributes['user-agent'] || attributes['user_agent'] || undefined,
            httpReferrer: attributes['http-referrer'] || attributes['http_referrer'] || undefined,
            isVlcOpt: extinfLine.toLowerCase().includes('extvlcopt')
        };
    }

    // Method to remove a specific video by ID
    removeVideo(videoId) {
        if (!confirm('Are you sure you want to remove this video?')) {
            return;
        }

        // Filter out the specific video
        this.videos = this.videos.filter(video => video.id !== videoId);

        // Save to storage and update UI
        this.saveToStorage();
        this.updateTotalSizeDisplay();
        this.renderGallery();

        // Update info text if no videos remain
        if (this.videos.length === 0) {
            if (this.videoInfo) {
                this.videoInfo.textContent = 'No video loaded';
            }
        }
    }

    // Method to save a video to browser storage (download and store)
    saveVideoToStorage(video) {
        if (video.type === 'local_file' && video.file) {
            // For local files that are streamed, convert to base64 and save
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = e.target.result;

                // Create a new video object with the base64 data replacing the file object
                const newVideoData = {
                    id: video.id, // Keep the same ID
                    src: base64Data, // Replace file with base64 data
                    name: video.name,
                    size: video.size,
                    duration: video.duration,
                    thumbnail: video.thumbnail,
                    timestamp: new Date().toISOString(),
                    allowSave: true, // Stored videos can be saved
                    type: 'stored_video' // Mark as stored video
                };

                // Replace the existing video entry
                const index = this.videos.findIndex(v => v.id === video.id);
                if (index !== -1) {
                    this.videos[index] = newVideoData;
                }

                this.saveToStorage();
                this.updateTotalSizeDisplay();
                this.renderGallery();

                // Show success message
                this.showMessage(`Saved "${video.name}" to storage`);
            };
            reader.onerror = (error) => {
                console.error('Error converting file to base64:', error);
                alert('Error converting file to storage format: ' + error.message);
            };
            reader.readAsDataURL(video.file);
        } else if (video.type === 'local_file' && video.needsReUpload) {
            // For local files that need re-upload, prompt user to re-upload
            alert(`Cannot save "${video.name}" to storage because it needs to be re-uploaded. Please re-select the file first.`);
        } else if (video.src && video.src.startsWith('http')) {
            // For URL videos, fetch and store
            // Show loading message
            this.showMessage(`Downloading "${video.name}"...`);
            
            // Try with CORS proxy if direct fetch fails
            const tryDownload = (url, useProxy = false) => {
                const fetchUrl = useProxy ? `https://cors-anywhere.herokuapp.com/${url}` : url;
                
                fetch(fetchUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64Data = e.target.result;

                            // Create a new video object with the base64 data
                            const newVideoData = {
                                id: Date.now() + Math.random().toString(36).substr(2, 9),
                                src: base64Data,
                                name: video.name,
                                size: blob.size,
                                duration: video.duration,
                                thumbnail: video.thumbnail,
                                timestamp: new Date().toISOString(),
                                allowSave: true // Stored videos can be saved
                            };

                            // Add to videos array
                            this.videos.push(newVideoData);
                            this.saveToStorage();
                            this.updateTotalSizeDisplay();
                            this.renderGallery();

                            // Show success message
                            this.showMessage(`Saved "${video.name}" to storage`);
                        };
                        reader.readAsDataURL(blob);
                    })
                    .catch(error => {
                        console.error('Error downloading video:', error);
                        
                        if (!useProxy) {
                            // Try with CORS proxy
                            console.log('Trying with CORS proxy...');
                            tryDownload(url, true);
                        } else {
                            // Both direct and proxy attempts failed
                            const errorMessage = `Failed to download "${video.name}" for storage.\n\n` +
                                               `Possible reasons:\n` +
                                               `1. The server may block downloads (CORS issue)\n` +
                                               `2. The video URL may be protected or require authentication\n` +
                                               `3. Network connection issue\n` +
                                               `4. The CORS proxy service may be unavailable\n\n` +
                                               `Try downloading the video manually and uploading it as a file.`;
                            alert(errorMessage);
                        }
                    });
            };
            
            // Start download attempt
            tryDownload(video.src);
        } else if (video.src && video.src.startsWith('file://')) {
            // For file:// URLs, we need to prompt user to upload the actual file
            alert(`For local files, please use the upload interface to add the file directly to storage`);
        } else if (!video.src) {
            // Video has no source
            alert(`Cannot save "${video.name}" to storage - no source available`);
        } else {
            // For videos already in storage, just let user know
            alert(`${video.name} is already in storage`);
        }
    }

    // Method to save a video to the user's device
    saveVideo(video) {
        try {
            // Check if video has a valid source
            if (!video.src) {
                if (video.type === 'local_file' && video.needsReUpload) {
                    alert(`Cannot save "${video.name}" because it needs to be re-uploaded. Please re-select the file first.`);
                    return;
                } else if (video.type === 'local_file' && video.file) {
                    // For local files with file object, create blob URL
                    const videoBlobUrl = URL.createObjectURL(video.file);
                    const a = document.createElement('a');
                    a.href = videoBlobUrl;
                    a.download = video.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    // Clean up the blob URL
                    URL.revokeObjectURL(videoBlobUrl);
                    return;
                } else {
                    alert(`Cannot save "${video.name}" - no source available`);
                    return;
                }
            }

            // For local files or videos loaded from URL
            let sourceUrl = video.src;

            // For videos stored as base64, create a Blob URL
            if (video.src.startsWith('data:')) {
                // Extract MIME type and data
                const parts = video.src.split(';base64,');
                const mimeType = parts[0].split(':')[1];
                const byteCharacters = atob(parts[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                sourceUrl = URL.createObjectURL(blob);
            }

            // Create a temporary link element to trigger download
            const a = document.createElement('a');
            a.href = sourceUrl;
            a.download = video.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up if we created a blob URL
            if (sourceUrl.startsWith('blob:')) {
                URL.revokeObjectURL(sourceUrl);
            }
        } catch (error) {
            console.error('Error saving video:', error);
            alert('Error saving video: ' + error.message);
        }
    }

    // Method to remove a specific playlist and its videos
    removePlaylist(index) {
        if (index < 0 || index >= this.playlistUrls.length) {
            return;
        }

        const playlistUrl = this.playlistUrls[index];

        if (!confirm(`Are you sure you want to remove the playlist: ${playlistUrl}? This will remove all associated videos.`)) {
            return;
        }

        // Remove all videos associated with this playlist URL
        this.videos = this.videos.filter(video => video.playlistUrl !== playlistUrl);

        // Remove the playlist URL from the list
        this.playlistUrls.splice(index, 1);

        // Save to storage and update UI
        this.saveToStorage();
        this.updateTotalSizeDisplay();
        this.renderGallery();
        this.renderPlaylistHistory();

        // Update info text if no videos remain
        if (this.videos.length === 0) {
            if (this.videoInfo) {
                this.videoInfo.textContent = 'No video loaded';
            }
        }
    }

    // Method to clear only M3U playlist items (to allow removal of all streams)
    clearM3UStreams() {
        // Filter out only the M3U playlist items
        this.videos = this.videos.filter(video => !video.isStream);

        // Clear all playlist URLs as well
        this.playlistUrls = [];

        // Save to storage and update UI
        this.saveToStorage();
        this.updateTotalSizeDisplay();
        this.renderGallery();
        this.renderPlaylistHistory();

        // Update info text
        if (this.videoInfo) {
            this.videoInfo.textContent = 'No video loaded';
        }
    }

    // Helper method to show fallback thumbnail
    showFallbackThumbnail(thumbnailElement, video) {
        // Create a container div to replace the img element
        const container = document.createElement('div');
        container.className = 'fallback-thumbnail';
        container.style.width = '100%';
        container.style.height = '200px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.objectFit = 'contain';
        
        // For streams, try to use a generic TV icon; for videos, show default video icon
        if (video.isStream) {
            // Try to use group-specific icons based on groupId
            let icon = '📺'; // Default TV icon
            let bgColor = '#333';
            
            if (video.groupId) {
                const group = video.groupId.toLowerCase();
                if (group.includes('movie') || group.includes('film')) {
                    icon = '🎬';
                    bgColor = '#1a237e';
                } else if (group.includes('sport') || group.includes('sports')) {
                    icon = '⚽';
                    bgColor = '#1b5e20';
                } else if (group.includes('news')) {
                    icon = '📰';
                    bgColor = '#bf360c';
                } else if (group.includes('music')) {
                    icon = '🎵';
                    bgColor = '#4a148c';
                } else if (group.includes('kid') || group.includes('children')) {
                    icon = '🧸';
                    bgColor = '#e65100';
                } else if (group.includes('documentary')) {
                    icon = '📚';
                    bgColor = '#33691e';
                }
            }
            
            container.style.backgroundColor = bgColor;
            container.textContent = icon;
            container.style.fontSize = '2rem';
            container.style.color = 'white';
            container.style.fontWeight = 'bold';
        } else {
            // For non-stream videos
            container.style.backgroundColor = '#333';
            container.textContent = '📹';
            container.style.fontSize = '2rem';
            container.style.color = 'white';
        }
        
        // Replace the img element with our container, but only if it has a parent
        if (thumbnailElement.parentNode) {
            thumbnailElement.parentNode.replaceChild(container, thumbnailElement);
        } else {
            // If the thumbnail element doesn't have a parent yet, return the container instead
            // The caller should use this container instead of the original thumbnail element
            return container;
        }
    }

    // Helper method to check if a URL is valid
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Check if it's a data URL
        if (url.startsWith('data:')) return true;
        
        // For M3U logos, be more lenient - allow relative URLs and other protocols
        // Many M3U files use relative paths for logos
        if (url.trim() === '') return false;
        
        // Check if it's a valid URL (including relative URLs)
        try {
            // Try to parse as URL - this will work for absolute URLs
            const parsedUrl = new URL(url, window.location.origin);
            // Allow http, https, and also data URLs (already handled above)
            return parsedUrl.protocol === 'http:' || 
                   parsedUrl.protocol === 'https:' || 
                   parsedUrl.protocol === 'data:' ||
                   // Allow relative URLs (protocol will be empty or the page's protocol)
                   parsedUrl.protocol === '' || 
                   parsedUrl.protocol === window.location.protocol;
        } catch {
            // If URL parsing fails, it might be a relative path
            // Check if it looks like a path (starts with /, ./, ../, or has common image extensions)
            const isRelativePath = /^(\/|\.\/|\.\.\/|[a-zA-Z]:\\)/.test(url) || 
                                  /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url);
            return isRelativePath;
        }
    }

    // Method to clear all storage with confirmation
    clearAllStorageWithConfirmation() {
        const totalSize = this.videos.reduce((sum, video) => {
            if (video.type === 'stored_video') {
                return sum + (video.size || 0);
            }
            return sum;
        }, 0);

        const sizeInMB = Math.floor(totalSize / (1024 * 1024));
        const videoCount = this.videos.length;

        const confirmationMessage = `Are you sure you want to clear ALL storage?\n\n` +
                                   `This will remove:\n` +
                                   `• ${videoCount} video(s) from your collection\n` +
                                   `• ${sizeInMB} MB of stored data\n` +
                                   `• All IndexedDB and localStorage data\n\n` +
                                   `This action cannot be undone.`;

        if (confirm(confirmationMessage)) {
            this.clearAllStorage();
            alert('All storage has been cleared successfully.');
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayerApp = new VideoPlayerApp();
});

