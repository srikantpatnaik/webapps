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
        this.useTextThumbnails = true; // Default to text thumbnails
        this.currentFilter = 'all'; // Default filter
        this.isLocked = false; // Track if media gallery is locked
        this.passkey = null; // Store the passkey
        this.autoLockTimeout = null; // Timer for auto-lock
        this.autoLockInterval = 30000; // 30 seconds in milliseconds

        // Initialize lock feature enabled state
        const savedLockEnabled = localStorage.getItem('lockFeatureEnabled');
        this._isLockFeatureEnabled = savedLockEnabled !== null ? savedLockEnabled === 'true' : true;
        this.defaultPlaybackRate = 1; // Default playback rate
        this.initElements();
        this.initFilterControls(); // Initialize filter controls
        this.bindEvents();
        this.initLockOverlay();
        this.initializeVideoPlayer();
        this.initActivityListeners(); // Initialize auto-lock functionality
        this.initializeVideoPlayerControls();
        this.initializeLoopState();

        // Load lock state early in the initialization process
        this.loadLockState();

        // Load saved playback rate
        const savedRate = this.loadPlaybackRate();
        if (this.videoPlayer) {
            this.videoPlayer.playbackRate = savedRate;
            if (this.speedDisplay) {
                this.speedDisplay.textContent = `${savedRate}x`;
            }
        }

        // Update the lock button to reflect the current state after initialization
        this.updateLockButton();

        // If the app is locked initially, clear the auto-lock timer
        if (this.isLocked) {
            this.clearAutoLockTimer();
            // If app is locked on startup, make sure video is paused
            if (this.videoPlayer && !this.videoPlayer.paused) {
                this.videoPlayer.pause();
            }
        } else {
            // If the app is not locked, start the auto-lock timer
            this.startAutoLockTimer();
        }

        // Render the gallery immediately to show the loading state (considering lock state)
        this.renderGallery();

        // Load videos asynchronously after initialization
        this.loadStoredVideos()
            .then(() => {
                this.isLoadingVideos = false;
                // After loading videos, re-render the gallery (lock state already loaded)
                this.renderGallery();

                // Regenerate missing thumbnails for saved media
                this.regenerateMissingThumbnails();

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
                let videos = JSON.parse(localStorage.getItem('storedVideos')) || [];

                // Process videos to regenerate missing thumbnails
                this.videos = videos.map(video => {
                    const updatedVideo = { ...video };

                    // If thumbnail is missing for any saved media, try to regenerate it
                    if (!updatedVideo.thumbnail || updatedVideo.thumbnail.trim() === '') {
                        if (updatedVideo.src && updatedVideo.src.startsWith('data:')) {
                            // For stored videos, we can generate a thumbnail from the base64 source
                            if (updatedVideo.src.startsWith('data:video/')) {
                                // For video files, we need to create a temporary video element to generate thumbnail
                                this.generateThumbnailFromBase64(updatedVideo);
                            } else if (updatedVideo.src.startsWith('data:image/')) {
                                // For image files, use the base64 source as thumbnail
                                updatedVideo.thumbnail = updatedVideo.src;
                            }
                        }
                    }

                    return updatedVideo;
                });

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

    // Load lock state and passkey
    loadLockState() {
        try {
            const locked = localStorage.getItem('galleryLocked');
            if (locked !== null) {
                this.isLocked = locked === 'true';
            }

            const passkey = localStorage.getItem('galleryPasskey');
            if (passkey) {
                this.passkey = passkey;
            }

            // Update the lock button to reflect the current state
            this.updateLockButton();

            // Update the gallery to reflect the lock state
            if (this.videoGallery) {
                this.renderGallery();
            }
        } catch (e) {
            console.error('Error loading lock state:', e);
        }
    }

    initializeVideoPlayer() {
        // Set initial values for video player
        this.videoPlayer.volume = 0; // Muted by default
        this.videoPlayer.playbackRate = 1;
        this.videoPlayer.loop = this.defaultLoop; // Set to default loop state
        this.videoPlayer.controls = false; // Hide native controls

        // Update volume button to reflect muted state
        this.updateVolumeButton();

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

        // Setup mobile gesture controls
        this.setupMobileGestureControls();
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
        this.thumbnailToggle = document.getElementById('thumbnailToggle');
        this.lockToggle = document.getElementById('lockToggle');
        this.helpButton = document.getElementById('helpButton');
        this.lockButton = document.getElementById('lockButton');
        this.helpModal = document.getElementById('helpModal');
        this.helpClose = document.getElementById('helpClose');

        // Initialize history state management
        this.isModalOpen = false;
        this.setupHistoryStateManagement();
    }

    initLockOverlay() {
        this.lockOverlay = document.getElementById('lockOverlay');
        this.unlockPasskeyInput = document.getElementById('unlockPasskeyInput');
        this.unlockSubmitBtn = document.getElementById('unlockSubmitBtn');
        this.cancelUnlockBtn = document.getElementById('cancelUnlockBtn');
        this.unlockErrorMessage = document.getElementById('unlockErrorMessage');

        // Bind events for the lock overlay
        if (this.unlockSubmitBtn) {
            this.unlockSubmitBtn.addEventListener('click', () => {
                this.submitUnlock();
            });
        }

        if (this.cancelUnlockBtn) {
            this.cancelUnlockBtn.addEventListener('click', () => {
                this.cancelUnlock();
            });
        }

        if (this.unlockPasskeyInput) {
            this.unlockPasskeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitUnlock();
                }
            });
        }
    }

    // Start the auto-lock timer
    startAutoLockTimer() {
        // Clear any existing timer
        this.clearAutoLockTimer();

        // Only start the timer if lock feature is enabled
        if (!this.isLockFeatureEnabled()) {
            return;
        }

        // Set a new timer to lock the app after the specified interval
        this.autoLockTimeout = setTimeout(() => {
            if (!this.isLocked) {
                this.lockGallery();
            }
        }, this.autoLockInterval);
    }

    // Clear the auto-lock timer
    clearAutoLockTimer() {
        if (this.autoLockTimeout) {
            clearTimeout(this.autoLockTimeout);
            this.autoLockTimeout = null;
        }
    }

    // Reset the auto-lock timer on user activity
    resetAutoLockTimer() {
        if (!this.isLocked) {
            this.startAutoLockTimer();
        }
    }

    // Initialize activity listeners to reset the auto-lock timer
    initActivityListeners() {
        // List of events that constitute user activity
        const activityEvents = [
            'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup',
            'touchstart', 'touchend', 'touchmove', 'scroll', 'wheel',
            'focus', 'blur', 'resize'
        ];

        // Add event listeners for each activity event
        activityEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.resetAutoLockTimer();
            }, { passive: true });
        });

        // Start the initial timer
        this.startAutoLockTimer();
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

        // Apply saved zoom level when opening the modal
        setTimeout(() => {
            this.loadZoomLevel();
        }, 100);

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
        // Save current zoom level before closing modal (don't reset it)
        const currentZoom = this.getZoomLevel();
        this.saveZoomLevel(currentZoom);
        // Clean up any blob URLs
        this.cleanupVideoResources();
        // Ensure video player is visible when modal is closed
        this.videoPlayer.style.display = 'block';
        // Hide the image display if it exists
        const imageElement = this.videoModal.querySelector('.image-display');
        if (imageElement) {
            imageElement.style.display = 'none';
        }
        
        // If pushState is true, push a new state without modalOpen
        if (pushState) {
            history.pushState({ modalOpen: false }, '', window.location.pathname);
        }
    }

    bindEvents() {
        // Load media from single input field
        this.loadMediaBtn.addEventListener('click', () => {
            if (this.isLocked) {
                // Don't show alert since the interface is already disabled
                return;
            }
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
                if (!this.isLocked) {
                    this.loadMediaBtn.click();
                }
                // Don't show alert since the interface is already disabled
            }
        });

        // Handle file input changes
        this.fileInput.addEventListener('change', (e) => {
            if (this.isLocked) {
                // Don't show alert since the interface is already disabled
                return;
            }
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
            // Handle global keyboard shortcuts (available even when modal is not open)
            if (e.shiftKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                if (this.isLockFeatureEnabled()) {
                    // Only allow lock/unlock if not locked, or allow unlock if locked
                    if (!this.isLocked) {
                        this.toggleLock();
                    } else {
                        // If locked, show the unlock overlay
                        this.showUnlockOverlay();
                    }
                }
                return;
            }

            // If the app is locked, prevent all other keyboard shortcuts
            if (this.isLocked) {
                // Allow keyboard events for lock overlay elements (password input, buttons)
                if (e.target.closest('.lock-overlay')) {
                    // Don't prevent the event for lock overlay elements
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Only handle other keyboard shortcuts when video modal is open
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
                if (!this.isLocked) {
                    this.clearAllStorageWithConfirmation();
                }
            });
        }

        // Handle thumbnail toggle switch
        if (this.thumbnailToggle) {
            // Load saved preference, default to text thumbnails for new users
            const savedPreference = localStorage.getItem('useTextThumbnails');
            if (savedPreference !== null) {
                this.useTextThumbnails = savedPreference === 'true';
                this.thumbnailToggle.checked = this.useTextThumbnails;
            } else {
                // For new users, default to text thumbnails
                this.useTextThumbnails = true;
                this.thumbnailToggle.checked = true;
                localStorage.setItem('useTextThumbnails', 'true');
            }

            this.thumbnailToggle.addEventListener('change', (e) => {
                if (!this.isLocked) {
                    this.useTextThumbnails = e.target.checked;
                    localStorage.setItem('useTextThumbnails', this.useTextThumbnails);
                    this.renderGallery();
                }
            });
        }

        // Handle help button
        if (this.helpButton) {
            this.helpButton.addEventListener('click', () => {
                if (!this.isLocked) {
                    this.showHelpModal();
                }
            });
        }

        // Handle help modal close button
        if (this.helpClose) {
            this.helpClose.addEventListener('click', () => {
                this.hideHelpModal();
            });
        }

        // Handle lock button
        if (this.lockButton) {
            this.lockButton.addEventListener('click', () => {
                if (this.isLockFeatureEnabled()) {
                    this.toggleLock();
                }
            });
        }

        // Handle lock toggle switch
        if (this.lockToggle) {
            this.lockToggle.checked = this._isLockFeatureEnabled;

            this.lockToggle.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                localStorage.setItem('lockFeatureEnabled', isEnabled);
                this._isLockFeatureEnabled = isEnabled;

                // If disabling the lock feature, unlock if currently locked
                if (!isEnabled && this.isLocked) {
                    this.isLocked = false;
                    this.passkey = null;
                    this.saveLockState();
                    this.updateLockButton();
                    this.renderGallery();
                    this.startAutoLockTimer();
                }
            });
        }

        // Close help modal when clicking outside
        if (this.helpModal) {
            this.helpModal.addEventListener('click', (e) => {
                if (e.target === this.helpModal) {
                    this.hideHelpModal();
                }
            });
        }

        // Close help modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.helpModal.style.display === 'block') {
                this.hideHelpModal();
            }
        });

        // Handle paste event on media input to allow pasting images from clipboard
        this.mediaInput.addEventListener('paste', (e) => {
            if (this.isLocked) {
                // Don't show alert since the interface is already disabled
                e.preventDefault();
                return;
            }
            this.handlePasteEvent(e);
        });

        // Handle export button
        const exportButton = document.getElementById('exportButton');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                if (!this.isLocked) {
                    this.exportSavedMedia();
                }
            });
        }

        // Handle import button
        const importButton = document.getElementById('importButton');
        const importFileInput = document.getElementById('importFileInput');

        if (importButton && importFileInput) {
            importButton.addEventListener('click', () => {
                if (!this.isLocked) {
                    // Clear the file input to allow selecting the same file again
                    importFileInput.value = '';
                    importFileInput.click();
                }
            });

            importFileInput.addEventListener('change', (e) => {
                if (this.isLocked) {
                    return;
                }

                if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];

                    // Validate file type
                    if (file.type !== 'application/zip' && !file.name.toLowerCase().endsWith('.zip')) {
                        alert('Please select a valid ZIP file.');
                        return;
                    }

                    this.importMediaFromZip(file);
                }
            });
        }
    }

    // Handle paste event to process clipboard images
    handlePasteEvent(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;

        // Look for image data in clipboard
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                // Get the image as a blob
                const blob = items[i].getAsFile();

                // Create a file from the blob
                const file = new File([blob], `clipboard_image_${Date.now()}.${blob.type.split('/')[1]}`, { type: blob.type });

                // Process the image file
                this.processImageFile(file);

                // Prevent the default paste behavior
                e.preventDefault();

                // Show a notification to the user
                this.showNotification('Image pasted and added to gallery');

                return; // Exit after processing the first image
            }
        }
    }

    // Show notification to user
    showNotification(message) {
        // Create or update notification element
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 15px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999';
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(notification);
        }

        // Update and show notification
        notification.textContent = message;
        notification.style.opacity = '1';

        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
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
            // Check if it's a video, audio, or image file
            else if (file.type && (file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.startsWith('image/'))) {
                if (file.type.startsWith('video/')) {
                    this.processVideoFile(file);
                } else if (file.type.startsWith('audio/')) {
                    this.processAudioFile(file);
                } else if (file.type.startsWith('image/')) {
                    this.processImageFile(file);
                }
            } else {
                // Alert user that unsupported files were dropped/selected
                const fileName = file.name || 'Unknown file';
                alert(`Skipping unsupported file: ${fileName}. Only video, audio, image, and M3U playlist files are supported.`);
            }
        }
    }

    // Handle media input by detecting the type of input
    handleMediaInput(input) {
        // Check if input is base64 encoded image data
        if (this.isBase64Image(input)) {
            // Handle as base64 image data
            this.handleBase64Image(input);
            return;
        }

        // Detect input type
        if (input.startsWith('file:///')) {
            // Local file path (simulate file opening)
            this.handleLocalFile(input);
        } else if (input.startsWith('http://') || input.startsWith('https://')) {
            // Check if it's an M3U playlist
            if (input.toLowerCase().endsWith('.m3u')) {
                this.loadM3UPlaylist(input);
            } else {
                // Check if URL ends with popular audio/video/image formats
                const mediaFormats = ['.mp3', '.wav', '.mp4', '.mkv', '.webm', '.mov', '.avi', '.wmv', '.flv', '.m4v',
                                     '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
                const isMediaFormat = mediaFormats.some(format => input.toLowerCase().endsWith(format));
                const isImageFormat = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].some(format => input.toLowerCase().endsWith(format));

                if (isImageFormat) {
                    // Handle as image URL
                    this.loadImageFromUrl(input);
                } else if (isMediaFormat) {
                    // Handle as regular video/audio URL and show save button
                    this.loadVideoFromUrl(input, true); // Pass true to indicate save should be available
                } else {
                    // For other URLs, try to infer if it's a streaming endpoint
                    // First, try to check if it's an image by sending a HEAD request
                    this.checkAndLoadImageOrVideo(input);
                }
            }
        } else {
            // If it's neither a file:// nor http:// URL, treat as invalid input
            alert('Invalid input. Please enter a valid file path starting with file:/// or a URL starting with http:// or https://');
        }
    }

    // Check if input is base64 encoded image data
    isBase64Image(input) {
        // Check if input starts with data:image/ and contains base64
        return /^data:image\/[a-zA-Z]*;base64,/.test(input);
    }

    // Handle base64 image data
    handleBase64Image(base64Data) {
        // Create a filename for the base64 image
        const timestamp = new Date().getTime();
        const fileName = `pasted_image_${timestamp}.jpg`; // Default to jpg, could be improved to detect actual format

        // Create a blob from the base64 data
        const byteCharacters = atob(base64Data.split(',')[1]); // Remove data:image/...;base64, prefix
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: 'image/jpeg' }); // Default to jpeg, could be improved
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        // Process the image file
        this.processImageFile(file);
    }

    // Check if URL is an image or video by sending a HEAD request
    checkAndLoadImageOrVideo(input) {
        // Send a HEAD request to determine content type
        fetch(input, { method: 'HEAD' })
            .then(response => {
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.startsWith('image/')) {
                    // It's an image
                    this.loadImageFromUrl(input);
                } else {
                    // Assume it's a video/audio stream
                    this.loadVideoFromUrl(input, false);
                }
            })
            .catch(error => {
                console.error('Error checking content type:', error);
                // If HEAD request fails, try loading as video
                this.loadVideoFromUrl(input, false);
            });
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
        // Allow re-upload if video needs re-upload (file object was lost)
        const existingVideoIndex = this.videos.findIndex(video =>
            video.originalFileName === file.name &&
            video.size === file.size &&
            video.timestamp &&
            new Date().getTime() - new Date(video.timestamp).getTime() < 60000 // Within 1 minute
        );

        if (existingVideoIndex !== -1) {
            const existingVideo = this.videos[existingVideoIndex];
            
            // If the video needs re-upload, replace it with the new file
            if (existingVideo.type === 'local_file' && existingVideo.needsReUpload) {
                // Remove the old entry that needs re-upload
                this.videos.splice(existingVideoIndex, 1);
                // Continue processing to add the new file
            } else {
                // Otherwise, it's a true duplicate
                alert('This video already exists in your collection.');
                this.updateVideoInfoText();
                return;
            }
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
        // Allow re-upload if audio needs re-upload (file object was lost)
        const existingAudioIndex = this.videos.findIndex(video =>
            video.originalFileName === file.name &&
            video.size === file.size &&
            video.timestamp &&
            new Date().getTime() - new Date(video.timestamp).getTime() < 60000 // Within 1 minute
        );

        if (existingAudioIndex !== -1) {
            const existingAudio = this.videos[existingAudioIndex];
            
            // If the audio needs re-upload, replace it with the new file
            if (existingAudio.type === 'local_file' && existingAudio.needsReUpload) {
                // Remove the old entry that needs re-upload
                this.videos.splice(existingAudioIndex, 1);
                // Continue processing to add the new file
            } else {
                // Otherwise, it's a true duplicate
                alert('This audio file already exists in your collection.');
                this.updateVideoInfoText();
                return;
            }
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

    processImageFile(file, isLocalFile = false) {
        // Show loading message
        if (this.videoInfo) {
            this.videoInfo.textContent = `Processing: ${file.name}...`;
        }

        // Check for duplicate image by comparing file properties
        const existingImageIndex = this.videos.findIndex(video =>
            video.originalFileName === file.name &&
            video.size === file.size &&
            video.timestamp &&
            new Date().getTime() - new Date(video.timestamp).getTime() < 60000 // Within 1 minute
        );

        if (existingImageIndex !== -1) {
            const existingImage = this.videos[existingImageIndex];

            // If the image needs re-upload, replace it with the new file
            if (existingImage.type === 'local_file' && existingImage.needsReUpload) {
                // Remove the old entry that needs re-upload
                this.videos.splice(existingImageIndex, 1);
                // Continue processing to add the new file
            } else {
                // Otherwise, it's a true duplicate
                alert('This image already exists in your collection.');
                this.updateVideoInfoText();
                return;
            }
        }

        // Create an image object to get dimensions and generate thumbnail
        const img = new Image();

        // Create a blob URL for the file to enable loading
        const imageBlobUrl = URL.createObjectURL(file);
        img.src = imageBlobUrl;

        img.onload = () => {
            try {
                // Generate thumbnail from the image
                const canvas = document.createElement('canvas');
                // Set fixed dimensions for thumbnails to avoid huge canvas sizes
                // Use 320x240 as a standard thumbnail size
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');

                // Calculate scaling to fit image into thumbnail while maintaining aspect ratio
                const imageAspect = img.width / img.height;
                const canvasAspect = canvas.width / canvas.height;

                let renderWidth, renderHeight, offsetX, offsetY;

                if (imageAspect > canvasAspect) {
                    // Image is wider than canvas
                    renderHeight = canvas.height;
                    renderWidth = img.width * (canvas.height / img.height);
                    offsetX = (canvas.width - renderWidth) / 2;
                    offsetY = 0;
                } else {
                    // Image is taller than canvas
                    renderWidth = canvas.width;
                    renderHeight = img.height * (canvas.width / img.width);
                    offsetX = 0;
                    offsetY = (canvas.height - renderHeight) / 2;
                }

                // Draw the image scaled to fit the canvas
                ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);

                // Add a subtle border
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);

                const thumbnail = canvas.toDataURL('image/jpeg', 0.8); // 80% quality for smaller file size

                // Store the file object reference and other properties
                const imageData = {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    file: file, // Store the original file object
                    originalFileName: file.name, // Store the original file name for comparison
                    name: file.name,
                    size: file.size,
                    width: img.width,
                    height: img.height,
                    duration: 0, // Images don't have duration
                    thumbnail: thumbnail,
                    timestamp: new Date().toISOString(),
                    allowSave: true, // Local files can be saved to storage
                    type: 'local_file', // Mark as local file
                    isImage: true // Mark as image file for UI differentiation
                };

                this.videos.push(imageData);
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

                // Clean up the blob URL after we're done
                URL.revokeObjectURL(imageBlobUrl);
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Error processing image file.');
                this.updateVideoInfoText();

                // Clean up the blob URL after error
                URL.revokeObjectURL(imageBlobUrl);
            }
        };

        img.onerror = (event) => {
            console.error('Error loading image:', event);
            alert('Error processing image file. The file may be corrupted or incompatible.');
            this.updateVideoInfoText();

            // Clean up the blob URL after error
            URL.revokeObjectURL(imageBlobUrl);
        };

        // Set a timeout to handle cases where image never loads
        setTimeout(() => {
            if (!img.complete) {
                console.error('Timeout waiting for image to load');
                alert('Image file took too long to load. May be corrupted or incompatible.');
                this.updateVideoInfoText();

                // Clean up the blob URL after timeout
                URL.revokeObjectURL(imageBlobUrl);
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
                    
                    // Check if any lines look like video or image files
                    const mediaLines = lines.filter(line => {
                        const trimmed = line.trim();
                        return !trimmed.startsWith('#') && (this.isVideoFile(trimmed) || this.isImageFile(trimmed));
                    });

                    if (mediaLines.length === 0) {
                        alert('No valid channels, video, or image files found in the M3U playlist. The file may be empty or in an unsupported format.');
                        this.updateVideoInfoText();
                        return;
                    }

                    // Create playlist items from media lines
                    for (const line of mediaLines) {
                        const isImage = this.isImageFile(line.trim());
                        playlistItems.push({
                            url: line.trim(),
                            channelName: this.extractFileName(line.trim()),
                            tvgId: undefined,
                            logo: undefined,
                            groupId: isImage ? 'Images' : 'Local Videos',
                            userAgent: undefined,
                            httpReferrer: undefined,
                            isVlcOpt: false,
                            isImage: isImage
                        });
                    }

                    console.log('Created playlist items from media lines:', playlistItems);
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
                        duration: item.isImage ? 0 : undefined, // Images don't have duration
                        thumbnail: item.logo || '',
                        timestamp: new Date().toISOString(),
                        type: isLocalFile ? 'local_m3u_path' : 'm3u', // Different type for local paths
                        groupId: item.groupId,
                        tvgId: item.tvgId,
                        isStream: !isLocalFile && !item.isImage, // Only mark as stream for URLs that aren't images
                        isImage: item.isImage, // Mark as image if it's an image file
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
        localStorage.removeItem('galleryLocked');
        localStorage.removeItem('galleryPasskey');

        // Empty current videos array
        this.videos = [];

        // Clear playlist URLs as well
        this.playlistUrls = [];

        // Reset lock state
        this.isLocked = false;
        this.passkey = null;
        this.updateLockButton();

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

        // Save lock state and passkey
        this.saveLockState();

        // Try to save using the available storage option
        this.saveToIndexedDB()
            .catch(() => {
                // Fallback to localStorage if IndexedDB fails
                this.saveToLocalStorageAsFallback();
            });
    }

    // Save lock state and passkey
    saveLockState() {
        try {
            localStorage.setItem('galleryLocked', this.isLocked.toString());
            if (this.passkey) {
                localStorage.setItem('galleryPasskey', this.passkey);
            }
        } catch (e) {
            console.error('Error saving lock state:', e);
        }
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
            heading.textContent = '';
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
                            const updatedVideo = { ...video, type: 'stored_video' };

                            // If thumbnail is empty or missing, generate one from the base64 source
                            if (!updatedVideo.thumbnail || updatedVideo.thumbnail.trim() === '') {
                                // For stored videos, we can generate a thumbnail from the base64 source
                                if (updatedVideo.src.startsWith('data:video/')) {
                                    // For video files, we need to create a temporary video element to generate thumbnail
                                    this.generateThumbnailFromBase64(updatedVideo);
                                } else if (updatedVideo.src.startsWith('data:image/')) {
                                    // For image files, use the base64 source as thumbnail
                                    updatedVideo.thumbnail = updatedVideo.src;
                                }
                            }

                            return updatedVideo;
                        } else if (video.type === 'local_file') {
                            // Files can't be stored in IndexedDB, so mark them as needing re-upload
                            // This will happen when a user closes the browser and comes back
                            // In a real scenario, we'd need to re-upload them, but for now we'll keep the metadata
                            return { ...video, needsReUpload: true };
                        } else {
                            // For other video types, check if thumbnail is missing and regenerate if needed
                            const updatedVideo = { ...video };

                            // If thumbnail is missing for any saved media, try to regenerate it
                            if (!updatedVideo.thumbnail || updatedVideo.thumbnail.trim() === '') {
                                if (updatedVideo.src && updatedVideo.src.startsWith('data:')) {
                                    // For stored videos, we can generate a thumbnail from the base64 source
                                    if (updatedVideo.src.startsWith('data:video/')) {
                                        // For video files, we need to create a temporary video element to generate thumbnail
                                        this.generateThumbnailFromBase64(updatedVideo);
                                    } else if (updatedVideo.src.startsWith('data:image/')) {
                                        // For image files, use the base64 source as thumbnail
                                        updatedVideo.thumbnail = updatedVideo.src;
                                    }
                                }
                            }

                            return updatedVideo;
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

    // Generate thumbnail from base64 video source
    generateThumbnailFromBase64(video) {
        // Create a temporary video element to generate thumbnail
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = video.src;

        tempVideo.onloadedmetadata = () => {
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

                    // Update the video's thumbnail
                    video.thumbnail = thumbnail;

                    // Update the gallery to show the new thumbnail
                    this.renderGallery();
                } catch (drawError) {
                    console.error('Error drawing thumbnail from base64:', drawError);
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
        };

        tempVideo.onerror = (event) => {
            console.error('Error loading base64 video for thumbnail generation:', event);
        };
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

        // If gallery is locked and lock feature is enabled, show empty gallery without advertising it's locked
        if (this.isLocked && this.isLockFeatureEnabled()) {
            // Show empty gallery message without indicating it's locked
            this.videoGallery.innerHTML = '<p class="no-videos">No videos to display. Upload some videos to get started.</p>';
            return;
        }

        // Get filtered videos based on current filter
        const filteredVideos = this.getFilteredVideos();

        // Show loading state if we're still loading videos and have no videos yet
        // This ensures the gallery is never completely blank during initial load
        if (this.isLoadingVideos && this.videos.length === 0) {
            this.videoGallery.innerHTML = '<p class="loading-videos">Loading videos...</p>';
            return;
        }

        // Check if we have videos to display after filtering
        if (!filteredVideos || filteredVideos.length === 0) {
            // Show different message based on filter
            let message = 'No videos to display. Upload some videos to get started.';
            if (this.currentFilter !== 'all') {
                message = `No ${this.currentFilter} items found.`;
            }
            this.videoGallery.innerHTML = `<p class="no-videos">${message}</p>`;
            return;
        }

        // Filter out videos that need re-upload before rendering
        const videosToDisplay = filteredVideos.filter(video => !(video.type === 'local_file' && video.needsReUpload));

        videosToDisplay.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.dataset.id = video.id;

            // Add save button for videos that allow saving
            if (video.allowSave && !video.isLiveTV) {
                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-btn';
                saveBtn.innerHTML = '💾';
                saveBtn.title = `Save ${video.name} to PC`;
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

            if (this.useTextThumbnails) {
                // Create text-based thumbnail
                const textThumbnail = document.createElement('div');
                textThumbnail.className = 'text-thumbnail';
                
                // Create icon based on video type
                let icon = '📹';
                let bgColor = '#333';
                
                if (video.isStream) {
                    icon = '📺';
                    bgColor = '#1a237e';
                    
                    // Use group-specific colors for streams
                    if (video.groupId) {
                        const group = video.groupId.toLowerCase();
                        if (group.includes('movie') || group.includes('film')) {
                            bgColor = '#1a237e';
                        } else if (group.includes('sport') || group.includes('sports')) {
                            bgColor = '#1b5e20';
                        } else if (group.includes('news')) {
                            bgColor = '#bf360c';
                        } else if (group.includes('music')) {
                            bgColor = '#4a148c';
                        } else if (group.includes('kid') || group.includes('children')) {
                            bgColor = '#e65100';
                        } else if (group.includes('documentary')) {
                            bgColor = '#33691e';
                        }
                    }
                } else if (video.isAudio) {
                    icon = '🎵';
                    bgColor = '#4a148c';
                } else if (video.isImage) {
                    icon = '🖼️';
                    bgColor = '#4a148c';
                }

                textThumbnail.style.backgroundColor = bgColor;
                textThumbnail.style.color = 'white';
                textThumbnail.style.display = 'flex';
                textThumbnail.style.alignItems = 'center';
                textThumbnail.style.justifyContent = 'center';
                textThumbnail.style.fontSize = '1.5rem';
                textThumbnail.style.height = '60px';
                textThumbnail.style.borderRadius = '4px';
                textThumbnail.style.marginBottom = '8px';
                textThumbnail.textContent = icon;

                videoItem.appendChild(textThumbnail);
            } else {
                // Create image thumbnail (original behavior)
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

                // For image files, use the image as thumbnail if available
                if (video.isImage && video.file) {
                    // Create a blob URL for the image file to use as thumbnail
                    thumbnailUrl = URL.createObjectURL(video.file);

                    // Set up onload to revoke the URL after loading
                    thumbnail.onload = () => {
                        // Thumbnail loaded successfully
                        thumbnail.style.backgroundColor = '';
                        thumbnail.style.display = '';
                        thumbnail.textContent = '';

                        // Revoke the blob URL after loading to free memory
                        URL.revokeObjectURL(thumbnailUrl);
                    };

                    // Set up onerror to handle loading errors
                    thumbnail.onerror = () => {
                        // Revoke the blob URL on error
                        URL.revokeObjectURL(thumbnailUrl);
                        this.showFallbackThumbnail(thumbnail, video);
                    };
                }

                // Check if we should use a fallback immediately
                const shouldUseFallback = !thumbnailUrl ||
                                         thumbnailUrl.trim() === '' ||
                                         (video.isStream && !this.isValidUrl(thumbnailUrl));

                if (shouldUseFallback && !video.isImage) {
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
                } else if (!video.isImage) {
                    // Try to load the thumbnail for non-image files
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
                } else if (video.isImage) {
                    // For image files, we've already set the thumbnail.src above
                    thumbnail.src = thumbnailUrl;
                    videoItem.appendChild(thumbnail);
                }
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
            } else if (video.isImage) {
                // For images, show dimensions and size
                const dimensions = `${video.width}x${video.height}`;
                const size = this.formatFileSize(video.size);
                meta.textContent = `${dimensions} • ${size}`;

                // Indicate if the image is currently stored or streamed
                if (video.type === 'local_file') {
                    if (video.needsReUpload) {
                        meta.textContent += ` • ⚠️ (needs re-upload)`;
                    } else {
                        meta.textContent += ` • 🖼️ (image)`;
                    }
                } else if (video.type === 'stored_video') {
                    meta.textContent += ` • 💾 (stored)`;
                }
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
        if (video.isImage) {
            // For image files, hide the video player and show an image element in the same container
            let imageSrc;

            if (video.type === 'local_file' && video.file) {
                imageSrc = URL.createObjectURL(video.file);
            } else if (video.type === 'stored_video' && video.src) {
                imageSrc = video.src; // For stored images, use the base64 src
            } else if (video.src && video.src.startsWith('http')) {
                imageSrc = video.src; // For image URLs
            } else {
                alert('Image source is not available');
                return;
            }

            // Hide the video player element
            this.videoPlayer.style.display = 'none';

            // Create or reuse an image element in the same container
            let imageElement = this.videoModal.querySelector('.image-display');
            if (!imageElement) {
                imageElement = document.createElement('img');
                imageElement.className = 'image-display';
                imageElement.style.maxWidth = '100%';
                imageElement.style.maxHeight = 'calc(100% - 70px)'; // Account for control bar height
                imageElement.style.objectFit = 'contain';
                imageElement.style.display = 'block';
                imageElement.style.cursor = 'grab';
                imageElement.style.backgroundColor = 'black';

                // Insert after the video player element
                this.videoPlayer.insertAdjacentElement('afterend', imageElement);
            }

            imageElement.src = imageSrc;

            // Make sure the image is visible and video is hidden
            imageElement.style.display = 'block';

            this.videoInfo.textContent = `Viewing: ${video.name} (${video.width || 'unknown'}x${video.height || 'unknown'})`;

            // Store the URL to revoke later when closing modal (only for blob URLs)
            if (video.type === 'local_file' && video.file) {
                this.currentVideoBlobUrl = imageSrc;
            } else {
                this.currentVideoBlobUrl = null; // Don't revoke for base64 or URLs
            }

            // Set up image-specific controls and interactions using the same video player
            this.setupImageViewerControls(imageElement);

            // Apply saved zoom level after setting up the image
            setTimeout(() => {
                this.loadZoomLevel(); // Apply saved zoom level instead of resetting
            }, 100);
        } else if (video.type === 'local_file' && video.file) {
            // For local files, create a blob URL from the stored file object
            const videoBlobUrl = URL.createObjectURL(video.file);
            // Hide the image display if it exists
            const imageElement = this.videoModal.querySelector('.image-display');
            if (imageElement) {
                imageElement.style.display = 'none';
            }
            this.videoPlayer.style.display = 'block';
            this.videoPlayer.src = videoBlobUrl;
            this.videoInfo.textContent = `Playing: ${video.name} ${video.duration ? '(' + this.formatTime(video.duration) + ')' : ''}`;

            // Store the URL to revoke later when video stops
            this.currentVideoBlobUrl = videoBlobUrl;

            // Load the video to ensure it displays properly
            this.videoPlayer.load();

            // Apply saved zoom level after setting up the video
            setTimeout(() => {
                this.loadZoomLevel(); // Apply saved zoom level instead of resetting
            }, 100);
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
            // Hide the image display if it exists
            const imageElement = this.videoModal.querySelector('.image-display');
            if (imageElement) {
                imageElement.style.display = 'none';
            }
            this.videoPlayer.style.display = 'block';
            this.videoPlayer.src = video.src;
            this.videoInfo.textContent = `Playing: ${video.name}`;

            // Load the video to ensure it displays properly
            this.videoPlayer.load();

            // Apply saved zoom level after setting up the video
            setTimeout(() => {
                this.loadZoomLevel(); // Apply saved zoom level instead of resetting
            }, 100);
        } else {
            // For regular videos, make sure the src is valid
            if (!video.src) {
                alert('Video source is not defined');
                return;
            }
            // Hide the image display if it exists
            const imageElement = this.videoModal.querySelector('.image-display');
            if (imageElement) {
                imageElement.style.display = 'none';
            }
            this.videoPlayer.style.display = 'block';
            this.videoPlayer.src = video.src;
            this.videoInfo.textContent = `Playing: ${video.name} ${video.duration ? '(' + this.formatTime(video.duration) + ')' : ''}`;

            // Load the video to ensure it displays properly
            this.videoPlayer.load();

            // Apply saved zoom level after setting up the video
            setTimeout(() => {
                this.loadZoomLevel(); // Apply saved zoom level instead of resetting
            }, 100);
        }

        // this.videoPlayer.load(); // Explicitly load the source - moved to individual sections

        // Wait for metadata to load to update info display and set proper size
        this.videoPlayer.onloadedmetadata = () => {
            // For streams, we don't have duration typically
            if (!video.isStream) {
                this.videoInfo.textContent = `Playing: ${video.name} (${this.formatTime(video.duration || this.videoPlayer.duration)})`;
            }

            this.updateTimeDisplay();

            // Apply saved zoom level and playback rate to the new video
            setTimeout(() => {
                if (this.videoPlayer && this.videoPlayer.videoWidth && this.videoPlayer.videoHeight) {
                    // Load and apply the saved zoom level
                    this.loadZoomLevel();

                    // Load and apply the saved playback rate
                    const savedRate = this.loadPlaybackRate();
                    this.videoPlayer.playbackRate = savedRate;
                    this.speedDisplay.textContent = `${savedRate}x`;
                }
            }, 100);
        };

        // Handle error loading video
        this.videoPlayer.onerror = (e) => {
            console.error('Error loading video:', e);
            console.error('Video src type:', typeof video.src);
            console.error('Video src length:', video.src ? video.src.length : 'undefined');

            // Helper function to check if URL is a local address
            const isLocalAddress = (url) => {
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname;
                    return hostname === 'localhost' ||
                           hostname === '127.0.0.1' ||
                           hostname === '0.0.0.0' ||
                           hostname === '::1' ||
                           hostname.startsWith('192.168.') ||
                           hostname.startsWith('10.') ||
                           hostname.startsWith('172.') ||
                           hostname.endsWith('.local');
                } catch {
                    return false;
                }
            };

            // If it's a stream and failed, try with CORS proxy (but not for local addresses)
            if (video.isStream && !isLocalAddress(video.src)) {
                const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${video.src}`;
                console.log('Trying with CORS proxy:', corsProxyUrl);
                this.videoPlayer.src = corsProxyUrl;
                this.videoPlayer.load();
            } else if (video.isStream && isLocalAddress(video.src)) {
                // For local addresses, provide specific error message
                alert(`Failed to load stream from local address: ${video.src}\n\n` +
                      `Local addresses (localhost, 127.0.0.1, 0.0.0.0) cannot use CORS proxy.\n` +
                      `Make sure the local server is running and accessible directly.`);
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

    // Set up image viewer controls with similar functionality to video player
    setupImageViewerControls(imageElement) {
        // Show video controls for images (reuse existing video controls)
        const videoControls = this.videoModal.querySelector('.video-controls');
        if (videoControls) {
            videoControls.style.display = 'block';
            videoControls.style.opacity = '0';
            videoControls.style.visibility = 'visible';
        }

        // Hide image-specific controls if they exist (we'll use video controls instead)
        const imageControls = this.videoModal.querySelector('.image-controls');
        if (imageControls) {
            imageControls.style.display = 'none';
        }

        // Set up mouse move to show controls (same as video)
        this.setupControlsVisibility();

        // Set up panning for images using the same mechanism as videos
        this.setupVideoPanning();
    }

    // Timer to hide image controls
    startHideImageControlsTimer(controls) {
        clearTimeout(this.hideImageControlsTimeout);
        this.hideImageControlsTimeout = setTimeout(() => {
            if (controls) {
                controls.style.opacity = '0';
                controls.style.visibility = 'hidden';
            }
        }, 3000); // Hide controls after 3 seconds of inactivity
    }

    // Set up image panning functionality
    setupImagePanning(imageElement) {
        const container = imageElement.parentElement;
        const videoModal = this.videoModal;

        // Mouse events for panning (desktop only)
        videoModal.addEventListener('mousedown', (e) => {
            // Only pan when image is zoomed in
            if (this.getZoomLevel() <= 1) return;

            // Only pan on left mouse button, and not on controls
            if (e.button !== 0) return;

            // Don't pan if clicking on controls
            if (e.target.closest('.video-controls') || e.target.closest('.image-controls')) return;

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
            
            // Helper function to check if URL is a local address
            const isLocalAddress = (url) => {
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname;
                    return hostname === 'localhost' || 
                           hostname === '127.0.0.1' || 
                           hostname === '0.0.0.0' ||
                           hostname === '::1' ||
                           hostname.startsWith('192.168.') ||
                           hostname.startsWith('10.') ||
                           hostname.startsWith('172.') ||
                           hostname.endsWith('.local');
                } catch {
                    return false;
                }
            };
            
            if (!attemptedWithProxy && !url.startsWith('https://cors-anywhere.herokuapp.com/') && !isLocalAddress(url)) {
                // Try with CORS proxy (but not for local addresses)
                attemptedWithProxy = true;
                const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
                console.log('Trying with CORS proxy:', corsProxyUrl);
                this.videoPlayer.src = corsProxyUrl;
                this.videoPlayer.load();
            } else if (isLocalAddress(url)) {
                // For local addresses, provide specific error message
                alert(`Failed to load video from local address: ${url}\n\n` +
                      `Local addresses (localhost, 127.0.0.1, 0.0.0.0) cannot use CORS proxy.\n` +
                      `Make sure the local server is running and accessible directly.`);
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

    // Load image from URL
    loadImageFromUrl(url) {
        try {
            new URL(url);
        } catch (e) {
            alert('Invalid URL format');
            return;
        }

        // Check if URL is for an image
        if (!/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url)) {
            alert('URL does not appear to be an image. This player supports common image formats (JPG, PNG, GIF, WebP, etc.).');
            return;
        }

        // Create an image object for the gallery
        const fileName = url.substring(url.lastIndexOf('/') + 1);
        const imageData = {
            id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            src: url,
            name: fileName,
            size: 0, // Size unknown for URL
            width: 0, // Width unknown initially
            height: 0, // Height unknown initially
            duration: 0, // Images don't have duration
            thumbnail: url, // Use the image URL as thumbnail
            timestamp: new Date().toISOString(),
            type: 'url',
            allowSave: true, // Images can be saved
            isImage: true // Mark as image
        };

        // Check if this URL is already in the collection
        const isDuplicate = this.videos.some(video => video.src === url && video.type === 'url' && video.isImage);
        if (isDuplicate) {
            alert('This image URL is already in your collection.');
            return;
        }

        // Add to videos array
        this.videos.push(imageData);
        this.saveToStorage();
        this.updateTotalSizeDisplay();
        this.renderGallery();

        // Set up error handler that suggests CORS proxy
        let attemptedWithProxy = false;

        // Create or reuse an image element
        let imageElement = this.videoModal.querySelector('.image-display');
        if (!imageElement) {
            imageElement = document.createElement('img');
            imageElement.className = 'image-display';
            imageElement.style.maxWidth = '100%';
            imageElement.style.maxHeight = 'calc(100% - 70px)'; // Account for control bar height
            imageElement.style.objectFit = 'contain';
            imageElement.style.position = 'absolute';
            imageElement.style.top = '0';
            imageElement.style.left = '0';
            imageElement.style.display = 'block';

            // Insert after the video player element
            this.videoPlayer.insertAdjacentElement('afterend', imageElement);
        }

        // Hide the video player and show the image
        this.videoPlayer.style.display = 'none';
        imageElement.style.display = 'block';

        imageElement.onerror = (e) => {
            console.error('Image loading error:', e);

            // Helper function to check if URL is a local address
            const isLocalAddress = (url) => {
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname;
                    return hostname === 'localhost' ||
                           hostname === '127.0.0.1' ||
                           hostname === '0.0.0.0' ||
                           hostname === '::1' ||
                           hostname.startsWith('192.168.') ||
                           hostname.startsWith('10.') ||
                           hostname.startsWith('172.') ||
                           hostname.endsWith('.local');
                } catch {
                    return false;
                }
            };

            if (!attemptedWithProxy && !url.startsWith('https://cors-anywhere.herokuapp.com/') && !isLocalAddress(url)) {
                // Try with CORS proxy (but not for local addresses)
                attemptedWithProxy = true;
                const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
                console.log('Trying with CORS proxy:', corsProxyUrl);
                imageElement.src = corsProxyUrl;
            } else if (isLocalAddress(url)) {
                // For local addresses, provide specific error message
                alert(`Failed to load image from local address: ${url}\n\n` +
                      `Local addresses (localhost, 127.0.0.1, 0.0.0.0) cannot use CORS proxy.\n` +
                      `Make sure the local server is running and accessible directly.`);
            } else {
                // Already tried with proxy or proxy was already in use
                const CORS_MESSAGE = `Failed to load image from URL. This is likely a CORS issue.\n\nIf the image is still not loading:\n1. The server may not allow external access\n2. The CORS proxy service may be down\n3. The URL may be incorrect or inaccessible`;
                alert(CORS_MESSAGE);
            }
        };

        imageElement.onload = () => {
            // Successfully loaded, update image data with dimensions
            imageData.width = imageElement.naturalWidth;
            imageData.height = imageElement.naturalHeight;

            // Update the video info with dimensions
            this.videoInfo.textContent = `Viewing: ${fileName} (${imageData.width}x${imageData.height})`;

            this.videoModal.style.display = 'block';
        };

        // Set the image source directly
        imageElement.src = url;
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

    // Method to check if lock feature is enabled
    isLockFeatureEnabled() {
        return this._isLockFeatureEnabled;
    }

    changeSpeed() {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentSpeed = this.videoPlayer.playbackRate;
        const currentIndex = speeds.indexOf(currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        this.videoPlayer.playbackRate = speeds[nextIndex];
        this.speedDisplay.textContent = `${speeds[nextIndex]}x`;

        // Save the new playback rate
        this.savePlaybackRate(speeds[nextIndex]);
    }

    handleKeyboardShortcuts(e) {
        // Check if we're currently viewing an image
        const imageElement = this.videoModal.querySelector('.image-display');
        const isImageViewing = imageElement && imageElement.style.display !== 'none';

        switch(e.key) {
            case ' ':
                e.preventDefault();
                if (!isImageViewing) {
                    this.togglePlayPause();
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (isImageViewing) {
                    // For images, go to next image
                    this.playNextVideo();
                } else {
                    this.videoPlayer.currentTime += 10; // Seek forward 10 seconds
                }
                break;
            case 'ArrowLeft':
                // Check if Alt key is also pressed (Alt+Left arrow for back navigation)
                if (e.altKey) {
                    e.preventDefault();
                    this.closeVideoModal();
                } else {
                    e.preventDefault();
                    if (isImageViewing) {
                        // For images, go to previous image
                        this.playPrevVideo();
                    } else {
                        this.videoPlayer.currentTime -= 10; // Seek backward 10 seconds
                    }
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (isImageViewing) {
                    // For images, zoom in when arrow up is pressed
                    this.toggleZoom();
                } else {
                    if (this.videoPlayer.volume < 1) {
                        this.videoPlayer.volume = Math.min(1, this.videoPlayer.volume + 0.1);
                        this.volumeSlider.value = this.videoPlayer.volume;
                    }
                    this.updateVolumeButton();
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (isImageViewing) {
                    // For images, zoom out when arrow down is pressed
                    this.zoomOut();
                } else {
                    if (this.videoPlayer.volume > 0) {
                        this.videoPlayer.volume = Math.max(0, this.videoPlayer.volume - 0.1);
                        this.volumeSlider.value = this.videoPlayer.volume;
                    }
                    this.updateVolumeButton();
                }
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                if (!isImageViewing) {
                    this.toggleMute();
                }
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
                if (!isImageViewing) {
                    // Toggle local loop for current video only
                    this.toggleLoop();
                }
                break;
            case 'a':
            case 'A':
                e.preventDefault();
                if (!isImageViewing) {
                    // Toggle global loop for all videos
                    this.toggleGlobalLoop();
                }
                break;
            case 's':
            case 'S':
                e.preventDefault();
                // Save current playing media (video or image) to browser storage
                this.saveCurrentVideoToStorage();
                break;
            case 'o':  // Toggle keyboard shortcuts
            case 'O':
                e.preventDefault();
                // Toggle keyboard shortcuts visibility
                this.toggleKeyboardShortcuts();
                break;
            case 'z':  // Zoom in/toggle
                e.preventDefault();
                if (isImageViewing) {
                    this.toggleZoom();
                } else {
                    this.toggleZoom();
                }
                break;
            case 'Z':  // Zoom out
                e.preventDefault();
                if (isImageViewing) {
                    this.zoomOut();
                } else {
                    this.zoomOut();
                }
                break;
            case '0':
                e.preventDefault();
                if (isImageViewing) {
                    this.resetZoom();
                } else {
                    this.resetZoom();
                }
                break;
            case '+':
            case '=': // For key combinations like Shift+=
                e.preventDefault();
                if (isImageViewing) {
                    // For images, zoom in with + key
                    this.toggleZoom();
                } else {
                    this.increaseSpeed();
                }
                break;
            case '-':
                e.preventDefault();
                if (isImageViewing) {
                    // For images, zoom out with - key
                    this.zoomOut();
                } else {
                    this.decreaseSpeed();
                }
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

            // Save the new playback rate
            this.savePlaybackRate(speeds[currentIndex + 1]);
        }
    }

    decreaseSpeed() {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentSpeed = this.videoPlayer.playbackRate;
        const currentIndex = speeds.indexOf(currentSpeed);
        if (currentIndex > 0) {
            this.videoPlayer.playbackRate = speeds[currentIndex - 1];
            this.speedDisplay.textContent = `${speeds[currentIndex - 1]}x`;

            // Save the new playback rate
            this.savePlaybackRate(speeds[currentIndex - 1]);
        }
    }

    toggleZoom() {
        // Determine which element to zoom (video or image)
        const imageElement = this.videoModal.querySelector('.image-display');
        const isImageViewing = imageElement && imageElement.style.display !== 'none';

        let elementToZoom;
        if (isImageViewing) {
            elementToZoom = imageElement;
        } else {
            elementToZoom = this.videoPlayer;
        }

        const container = elementToZoom.parentElement;
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
        // Determine which element to zoom (video or image)
        const imageElement = this.videoModal.querySelector('.image-display');
        const isImageViewing = imageElement && imageElement.style.display !== 'none';

        let elementToZoom;
        if (isImageViewing) {
            elementToZoom = imageElement;
        } else {
            elementToZoom = this.videoPlayer;
        }

        const container = elementToZoom.parentElement;
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
        // Determine which element to zoom (video or image)
        const imageElement = this.videoModal.querySelector('.image-display');
        const isImageViewing = imageElement && imageElement.style.display !== 'none';

        let elementToZoom;
        if (isImageViewing) {
            elementToZoom = imageElement;
        } else {
            elementToZoom = this.videoPlayer;
        }

        const container = elementToZoom.parentElement;

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

        // Hide the image display if it exists
        const imageElement = this.videoModal.querySelector('.image-display');
        if (imageElement) {
            imageElement.style.display = 'none';
        }
    }

    // Enable panning functionality (desktop only - mobile uses native zoom/pan)
    setupVideoPanning() {
        // Determine which element to use for panning (video or image)
        const imageElement = this.videoModal.querySelector('.image-display');
        const isImageViewing = imageElement && imageElement.style.display !== 'none';

        let elementToPan;
        if (isImageViewing) {
            elementToPan = imageElement;
        } else {
            elementToPan = this.videoPlayer;
        }

        const container = elementToPan.parentElement;
        const videoModal = this.videoModal;

        // Mouse events for panning (desktop only)
        videoModal.addEventListener('mousedown', (e) => {
            // Only pan when video/image is zoomed in
            if (this.getZoomLevel() <= 1) return;

            // Only pan on left mouse button, and not on controls
            if (e.button !== 0) return;

            // Don't pan if clicking on controls
            if (e.target.closest('.video-controls') || e.target.closest('.image-controls')) return;

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

        // Mobile: No custom panning - use native browser zoom/pan
        // Touch events are handled in setupMobileGestureControls for other gestures
    }

    // Helper to extract current zoom level
    getZoomLevel() {
        // Determine which element to check zoom for (video or image)
        const imageElement = this.videoModal.querySelector('.image-display');
        const isImageViewing = imageElement && imageElement.style.display !== 'none';

        let elementToCheck;
        if (isImageViewing) {
            elementToCheck = imageElement;
        } else {
            elementToCheck = this.videoPlayer;
        }

        const container = elementToCheck.parentElement;
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
        const filteredVideos = this.getFilteredVideos();
        if (filteredVideos.length <= 1) return;

        // Get current video index in the filtered list
        let currentIndex = this.getCurrentVideoIndexInFilteredList();
        if (currentIndex === -1) {
            // If current video is not in the filtered list, try to find it by src
            const currentSrc = this.videoPlayer.src;
            const currentVideo = this.videos.find(video =>
                video.src === currentSrc ||
                video.src === currentSrc.split('?')[0] ||
                (video.file && URL.createObjectURL(video.file) === currentSrc)
            );

            if (currentVideo) {
                currentIndex = filteredVideos.findIndex(video => video.id === currentVideo.id);
            }
        }

        if (currentIndex === -1) {
            // If still not found, start from the beginning
            currentIndex = 0;
        }

        // Find the next valid video in the filtered list that can be played (not needing re-upload)
        let nextIndex = currentIndex;
        let attempts = 0;

        do {
            nextIndex = (nextIndex + 1) % filteredVideos.length;
            attempts++;

            // Check if this video can be played (not a local file that needs re-upload)
            const video = filteredVideos[nextIndex];
            if (!(video.type === 'local_file' && video.needsReUpload)) {
                // Update internal tracking to the actual index in the main videos array
                this.currentVideoIndex = this.videos.findIndex(v => v.id === video.id);
                // Play the next video
                this.playVideo(video);
                return; // Exit successfully
            }
        } while (attempts < filteredVideos.length); // Stop after checking all filtered videos once

        // If we get here, all filtered videos need re-upload
        alert('All filtered videos need to be re-uploaded. Please re-select your files.');
    }

    playPrevVideo() {
        const filteredVideos = this.getFilteredVideos();
        if (filteredVideos.length <= 1) return;

        // Get current video index in the filtered list
        let currentIndex = this.getCurrentVideoIndexInFilteredList();
        if (currentIndex === -1) {
            // If current video is not in the filtered list, try to find it by src
            const currentSrc = this.videoPlayer.src;
            const currentVideo = this.videos.find(video =>
                video.src === currentSrc ||
                video.src === currentSrc.split('?')[0] ||
                (video.file && URL.createObjectURL(video.file) === currentSrc)
            );

            if (currentVideo) {
                currentIndex = filteredVideos.findIndex(video => video.id === currentVideo.id);
            }
        }

        if (currentIndex === -1) {
            // If still not found, start from the end
            currentIndex = filteredVideos.length - 1;
        }

        // Find the previous valid video in the filtered list that can be played (not needing re-upload)
        let prevIndex = currentIndex;
        let attempts = 0;

        do {
            prevIndex = (prevIndex - 1 + filteredVideos.length) % filteredVideos.length;
            attempts++;

            // Check if this video can be played (not a local file that needs re-upload)
            const video = filteredVideos[prevIndex];
            if (!(video.type === 'local_file' && video.needsReUpload)) {
                // Update internal tracking to the actual index in the main videos array
                this.currentVideoIndex = this.videos.findIndex(v => v.id === video.id);
                // Play the previous video
                this.playVideo(video);
                return; // Exit successfully
            }
        } while (attempts < filteredVideos.length); // Stop after checking all filtered videos once

        // If we get here, all filtered videos need re-upload
        alert('All filtered videos need to be re-uploaded. Please re-select your files.');
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
        if (shortcutsDiv.style.opacity === '1' || shortcutsDiv.style.opacity === '0.8') {
            shortcutsDiv.style.opacity = '0';
            shortcutsDiv.style.visibility = 'hidden';
            this.showMessage('HIDDEN');
        } else {
            shortcutsDiv.style.opacity = '0.8';
            shortcutsDiv.style.visibility = 'visible';
            this.showMessage('VISIBLE');
        }
    }

    saveCurrentVideoToStorage() {
        // Find the current video being played
        if (this.currentVideoIndex >= 0 && this.currentVideoIndex < this.videos.length) {
            const currentVideo = this.videos[this.currentVideoIndex];

            // Call the existing saveVideoToStorage method
            this.saveVideoToStorage(currentVideo);

            // Print "saved" message
            this.showMessage('Saved');
        } else {
            // If we don't have a current video index, try to find the video by src
            const currentSrc = this.videoPlayer.src;
            const currentVideo = this.videos.find(video =>
                video.src === currentSrc ||
                video.src === currentSrc.split('?')[0] ||
                (video.file && URL.createObjectURL(video.file) === currentSrc)
            );

            if (currentVideo) {
                this.saveVideoToStorage(currentVideo);
                this.showMessage('Saved');
            } else {
                console.log('No current video found to save');
            }
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

    // Mobile gesture controls for video player
    setupMobileGestureControls() {
        const videoContainer = this.videoPlayer.parentElement;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        const minSwipeDistance = 80; // Increased from 50 to 80 to avoid accidental swipes
        const screenHeight = window.innerHeight;
        const topZoneHeight = screenHeight * 0.3; // Top 30% for speed control
        const bottomZoneHeight = screenHeight * 0.3; // Bottom 30% for fast seek
        const middleZoneHeight = screenHeight * 0.4; // Middle 40% for video navigation

        // Double-tap detection variables
        let lastTapTime = 0;
        const doubleTapDelay = 300; // ms

        // Long press detection variables
        let longPressTimer = null;
        const longPressDelay = 3000; // 3 seconds for long press

        // Add touch to pause/play anywhere on screen
        videoContainer.addEventListener('touchstart', (e) => {
            // Store touch start position
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;

            // Start long press timer
            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                // Long press detected - save current video
                this.saveCurrentVideoToStorage();
                this.showMessage('Saved');
            }, longPressDelay);

            // Single tap to pause/play (check if it's a tap, not a swipe)
            this.touchStartTime = Date.now();
        }, { passive: true });

        // Clear long press timer on touch end
        videoContainer.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);
        }, { passive: true });

        // Clear long press timer on touch move (to prevent long press if user starts swiping)
        videoContainer.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        }, { passive: true });

        // Combine the existing touchend logic with the long press timer clearing
        const originalTouchEndHandler = (e) => {
            clearTimeout(longPressTimer); // Clear the long press timer

            const currentTime = Date.now();
            const tapLength = currentTime - lastTapTime;

            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;

            // Check if it's a tap (not a swipe)
            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);
            const touchDuration = Date.now() - this.touchStartTime;

            // If it's a short tap (less than 300ms) and small movement (less than 10px), treat as tap
            if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
                // Check for double tap
                if (tapLength < doubleTapDelay && tapLength > 0) {
                    // Double tap detected - toggle fullscreen
                    this.toggleFullscreen();
                } else {
                    // Single tap - pause/play
                    this.togglePlayPause();
                }

                lastTapTime = currentTime;
                return;
            }

            // Otherwise handle swipe gestures
            this.handleSwipeGesture(touchStartY, topZoneHeight, middleZoneHeight, bottomZoneHeight);
        };

        videoContainer.addEventListener('touchend', originalTouchEndHandler, { passive: true });

        // Handle swipe gesture
        this.handleSwipeGesture = (startY, topZoneHeight, middleZoneHeight, bottomZoneHeight) => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            // Determine which zone the touch started in
            const isTopZone = startY < topZoneHeight;
            const isMiddleZone = startY >= topZoneHeight && startY < (topZoneHeight + middleZoneHeight);
            const isBottomZone = startY >= (topZoneHeight + middleZoneHeight);

            // Check if it's a horizontal swipe (left/right) in middle zone for video/image navigation
            if (isMiddleZone && absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
                if (deltaX > 0) {
                    // Swipe right -> previous video/image
                    if (this.videos.length > 1) {
                        this.playPrevVideo();
                    }
                } else {
                    // Swipe left -> next video/image
                    if (this.videos.length > 1) {
                        this.playNextVideo();
                    }
                }
            }
            // Check if it's a vertical swipe (up/down) in top zone for speed control
            else if (isTopZone && absDeltaY > absDeltaX && absDeltaY > minSwipeDistance * 1.5) {
                // Check if we're viewing an image (no speed control for images)
                const imageElement = this.videoModal.querySelector('.image-display');
                const isImageViewing = imageElement && imageElement.style.display !== 'none';

                if (!isImageViewing) {
                    // Require longer swipe for speed control to avoid accidental inputs
                    if (deltaY > 0) {
                        // Swipe down -> slow playback
                        this.decreaseSpeed();
                    } else {
                        // Swipe up -> fast playback
                        this.increaseSpeed();
                    }
                }
            }
            // Check if it's a horizontal swipe (left/right) in bottom zone for fast seek
            else if (isBottomZone && absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
                // Check if we're viewing an image (no seeking for images)
                const imageElement = this.videoModal.querySelector('.image-display');
                const isImageViewing = imageElement && imageElement.style.display !== 'none';

                if (!isImageViewing) {
                    if (deltaX > 0) {
                        // Swipe right -> seek forward 30 seconds
                        this.videoPlayer.currentTime = Math.min(this.videoPlayer.duration, this.videoPlayer.currentTime + 30);
                    } else {
                        // Swipe left -> seek backward 30 seconds
                        this.videoPlayer.currentTime = Math.max(0, this.videoPlayer.currentTime - 30);
                    }
                }
            }
        };

        // Pinch to zoom and two-finger drag panning functionality
        let initialDistance = null;
        let initialZoom = 1;
        let initialCenterX = 0;
        let initialCenterY = 0;
        let initialPanX = 0;
        let initialPanY = 0;

        videoContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault(); // Prevent default browser behavior

                // Calculate initial distance between touches
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );

                // Calculate initial center point
                initialCenterX = (touch1.clientX + touch2.clientX) / 2;
                initialCenterY = (touch1.clientY + touch2.clientY) / 2;

                // Get current zoom level and panning values
                initialZoom = this.getZoomLevel();
                initialPanX = this.panX || 0;
                initialPanY = this.panY || 0;
            }
        }, { passive: false });

        videoContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialDistance !== null) {
                e.preventDefault(); // Prevent default browser zoom behavior

                // Calculate current distance between touches
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );

                // Calculate current center point
                const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
                const currentCenterY = (touch1.clientY + touch2.clientY) / 2;

                // Calculate zoom factor based on distance change
                const scale = currentDistance / initialDistance;
                let newZoom = initialZoom * scale;

                // Calculate panning offset based on center movement
                const panOffsetX = (currentCenterX - initialCenterX);
                const panOffsetY = (currentCenterY - initialCenterY);

                // Limit zoom range
                newZoom = Math.max(0.5, Math.min(3, newZoom));

                // Calculate new pan positions
                let newPanX = initialPanX + panOffsetX;
                let newPanY = initialPanY + panOffsetY;

                // Apply zoom with center origin and panning
                const container = this.videoPlayer.parentElement;
                container.style.transform = `scale(${newZoom}) translate(${newPanX}px, ${newPanY}px)`;
                container.style.transformOrigin = 'center center';

                // Update panning values for continued movement
                this.panX = newPanX;
                this.panY = newPanY;

                this.updateZoomIndicator(newZoom);
            }
        }, { passive: false });

        videoContainer.addEventListener('touchend', () => {
            // Reset initial values when touch ends
            if (initialDistance !== null) {
                initialDistance = null;
                initialCenterX = 0;
                initialCenterY = 0;
            }
        });
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
            // Use a CORS proxy if direct fetch fails due to CORS policy
            let m3uContent;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                m3uContent = await response.text();
            } catch (fetchError) {
                console.warn('Direct fetch failed, attempting CORS proxy:', fetchError);

                // Try using a CORS proxy as fallback
                const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const proxyResponse = await fetch(corsProxyUrl);
                if (!proxyResponse.ok) {
                    throw new Error(`CORS proxy request failed! status: ${proxyResponse.status}`);
                }
                m3uContent = await proxyResponse.text();
            }

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

                    // Check if this is a Live TV stream (ends with .m3u8)
                    const isLiveTV = this.isLiveTVStream(item.url);

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
                        isStream: !item.isImage, // Mark as live stream if not an image
                        isImage: item.isImage, // Mark as image if it's an image file
                        isLiveTV: isLiveTV, // Mark as Live TV if it's an .m3u8 stream
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
            } else if (!line.startsWith('#') && this.isImageFile(line)) {
                // Simple M3U format - image files
                // Check if it's an image file (common image extensions)
                const item = {
                    url: line,
                    channelName: this.extractFileName(line),
                    tvgId: undefined,
                    logo: undefined,
                    groupId: 'Images',
                    userAgent: undefined,
                    httpReferrer: undefined,
                    isVlcOpt: false,
                    isImage: true // Mark as image file
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

    // Helper method to check if a string is an image file
    isImageFile(path) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        const lowerPath = path.toLowerCase();
        return imageExtensions.some(ext => lowerPath.endsWith(ext));
    }

    // Helper method to check if a URL is a Live TV stream (ends with .m3u8)
    isLiveTVStream(url) {
        if (!url || typeof url !== 'string') return false;
        const lowerUrl = url.toLowerCase();
        return lowerUrl.endsWith('.m3u8');
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

        // Check if the URL is an image file
        const isImage = this.isImageFile(streamUrl);

        // Return the channel object
        return {
            url: streamUrl,
            channelName: channelName,
            tvgId: attributes['tvg-id'] || attributes['tvg_id'] || undefined,
            logo: attributes['tvg-logo'] || attributes['tvg_logo'] || attributes['logo'] || undefined,
            groupId: attributes['group-title'] || attributes['group_title'] || attributes['group'] || 'Other',
            userAgent: attributes['user-agent'] || attributes['user_agent'] || undefined,
            httpReferrer: attributes['http-referrer'] || attributes['http_referrer'] || undefined,
            isVlcOpt: extinfLine.toLowerCase().includes('extvlcopt'),
            isImage: isImage
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
        if (video.type === 'stored_video') {
            // Video is already stored, just show message
            this.showMessage(`"${video.name}" is already stored`);
            return;
        }

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
                    duration: video.isImage ? 0 : video.duration, // Images don't have duration
                    thumbnail: video.thumbnail,
                    timestamp: new Date().toISOString(),
                    allowSave: true, // Stored videos can be saved
                    type: 'stored_video', // Mark as stored video
                    isImage: video.isImage // Preserve image flag
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

            // Helper function to check if URL is a local address
            const isLocalAddress = (url) => {
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname;
                    return hostname === 'localhost' ||
                           hostname === '127.0.0.1' ||
                           hostname === '0.0.0.0' ||
                           hostname === '::1' ||
                           hostname.startsWith('192.168.') ||
                           hostname.startsWith('10.') ||
                           hostname.startsWith('172.') ||
                           hostname.endsWith('.local');
                } catch {
                    return false;
                }
            };

            // Helper function to normalize local addresses (convert 0.0.0.0 to localhost)
            const normalizeLocalAddress = (url) => {
                try {
                    const urlObj = new URL(url);
                    if (urlObj.hostname === '0.0.0.0') {
                        // Replace 0.0.0.0 with localhost
                        urlObj.hostname = 'localhost';
                        return urlObj.toString();
                    }
                } catch {
                    // If URL parsing fails, return the original URL
                }
                return url;
            };

            // Try with CORS proxy if direct fetch fails (but not for local addresses)
            const tryDownload = (url, useProxy = false) => {
                // Don't use proxy for local addresses
                if (isLocalAddress(url) && useProxy) {
                    // Local addresses shouldn't use CORS proxy
                    const errorMessage = `Cannot download from local address "${url}" using CORS proxy.\n\n` +
                                       `Local addresses (localhost, 127.0.0.1, 0.0.0.0) cannot be accessed through CORS proxy.\n` +
                                       `Please ensure the local server is running and accessible directly.`;
                    alert(errorMessage);
                    return;
                }

                // Normalize local addresses (convert 0.0.0.0 to localhost)
                let fetchUrl = isLocalAddress(url) ? normalizeLocalAddress(url) : url;
                fetchUrl = useProxy ? `https://cors-anywhere.herokuapp.com/${fetchUrl}` : fetchUrl;

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

                            // For M3U streams, update the existing entry instead of creating a new one
                            if (video.type === 'm3u' || video.type === 'local_m3u_path') {
                                // Update the existing video entry
                                const index = this.videos.findIndex(v => v.id === video.id);
                                if (index !== -1) {
                                    this.videos[index] = {
                                        ...this.videos[index],
                                        src: base64Data,
                                        size: blob.size,
                                        type: 'stored_video',
                                        isStream: undefined, // Remove stream property since it's now stored
                                        allowSave: true
                                    };
                                }
                            } else {
                                // For regular URL videos/images, create a new video object with the base64 data
                                const newVideoData = {
                                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                                    src: base64Data,
                                    name: video.name,
                                    size: blob.size,
                                    duration: video.isImage ? 0 : video.duration, // Images don't have duration
                                    thumbnail: video.thumbnail,
                                    timestamp: new Date().toISOString(),
                                    allowSave: true, // Stored videos can be saved
                                    isImage: video.isImage // Preserve image flag
                                };

                                // Add to videos array
                                this.videos.push(newVideoData);
                            }

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

                        if (!useProxy && !isLocalAddress(url)) {
                            // Try with CORS proxy (but not for local addresses)
                            console.log('Trying with CORS proxy...');
                            tryDownload(url, true);
                        } else {
                            // Both direct and proxy attempts failed, or it's a local address
                            let errorMessage;
                            if (isLocalAddress(url)) {
                                // Check if this might be a CORS issue between localhost and 0.0.0.0
                                const currentOrigin = window.location.origin;
                                const urlObj = new URL(url);
                                const urlOrigin = urlObj.origin;

                                if (currentOrigin !== urlOrigin) {
                                    errorMessage = `Failed to download from local address "${url}".\n\n` +
                                                 `CORS Issue Detected:\n` +
                                                 `• Current page: ${currentOrigin}\n` +
                                                 `• Video server: ${urlOrigin}\n\n` +
                                                 `Solutions:\n` +
                                                 `1. Access the video player via ${urlOrigin.replace('8001', '8000')} instead of ${currentOrigin}\n` +
                                                 `2. Or serve the video from ${currentOrigin.replace('8000', '8001')}\n` +
                                                 `3. Use the same hostname (localhost) for both servers`;
                                } else {
                                    errorMessage = `Failed to download from local address "${url}".\n\n` +
                                                 `Possible reasons:\n` +
                                                 `1. The local server may not be running\n` +
                                                 `2. The server may be blocking the request\n` +
                                                 `3. The URL may be incorrect\n\n` +
                                                 `Make sure the local server is running and accessible.`;
                                }
                            } else {
                                errorMessage = `Failed to download "${video.name}" for storage.\n\n` +
                                             `Possible reasons:\n` +
                                             `1. The server may block downloads (CORS issue)\n` +
                                             `2. The video URL may be protected or require authentication\n` +
                                             `3. Network connection issue\n` +
                                             `4. The CORS proxy service may be unavailable\n\n` +
                                             `Try downloading the video manually and uploading it as a file.`;
                            }
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
            // For videos already in storage, just let user know (without popup)
            this.showMessage(`"${video.name}" is already in storage`);
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
                    let fileBlobUrl;
                    if (video.isImage) {
                        // For image files
                        fileBlobUrl = URL.createObjectURL(video.file);
                    } else {
                        // For video files
                        fileBlobUrl = URL.createObjectURL(video.file);
                    }

                    const a = document.createElement('a');
                    a.href = fileBlobUrl;
                    a.download = video.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    // Clean up the blob URL
                    URL.revokeObjectURL(fileBlobUrl);
                    return;
                } else {
                    alert(`Cannot save "${video.name}" - no source available`);
                    return;
                }
            }

            // For local files or videos loaded from URL
            let sourceUrl = video.src;

            // For videos/images stored as base64, create a Blob URL
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

        if (!confirm(`Are you sure you want to remove the playlist: ${playlistUrl}? This will remove all associated videos that haven't been saved to storage.`)) {
            return;
        }

        // Remove all videos associated with this playlist URL, except those that have been saved to storage
        this.videos = this.videos.filter(video =>
            video.playlistUrl !== playlistUrl ||  // Keep videos not from this playlist
            video.type === 'stored_video'        // Keep videos from this playlist that were saved to storage
        );

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
        // Filter out only the M3U playlist items that haven't been saved to storage
        this.videos = this.videos.filter(video =>
            !video.isStream ||  // Keep videos that are not streams
            video.type === 'stored_video'  // Keep videos that were saved to storage
        );

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
        } else if (video.isImage) {
            // For images
            container.style.backgroundColor = '#4a148c';
            container.textContent = '🖼️';
            container.style.fontSize = '2rem';
            container.style.color = 'white';
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

    // Show video menu (3-dots menu) for actions
    showVideoMenu(event, video) {
        event.preventDefault();
        event.stopPropagation();
        
        // Remove any existing menu
        const existingMenu = document.querySelector('.video-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Create menu container
        const menu = document.createElement('div');
        menu.className = 'video-context-menu';
        menu.style.position = 'absolute';
        menu.style.backgroundColor = 'var(--bg-secondary)';
        menu.style.border = '1px solid var(--border)';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        menu.style.zIndex = '1000';
        menu.style.minWidth = '150px';
        menu.style.padding = '5px 0';
        
        // Position menu near the click
        const rect = event.target.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 5}px`;
        
        // Add menu items
        const menuItems = [];
        
        // Save to PC option (if allowed and not Live TV)
        if (video.allowSave && !video.isLiveTV) {
            menuItems.push({
                text: '💾 Save to PC',
                action: () => this.saveVideo(video),
                disabled: false
            });
        }
        
        // Save to IndexedDB option (if allowed and not Live TV)
        if (!video.isLiveTV && ((video.type === 'url' && video.allowSave) || 
            video.type === 'local_file' || 
            video.type === 'm3u' || 
            video.type === 'local_m3u_path')) {
            
            let title = 'Save to Storage';
            if (video.type === 'local_file') {
                if (video.needsReUpload) {
                    title = '⚠️ Re-upload to restore';
                } else {
                    title = '📥 Save to Storage (streamed)';
                }
            } else if (video.type === 'm3u' || video.type === 'local_m3u_path') {
                title = '📥 Save to Storage (M3U stream)';
            }
            
            menuItems.push({
                text: title,
                action: () => this.saveVideoToStorage(video),
                disabled: false
            });
        }
        
        // Play option
        menuItems.push({
            text: '▶ Play',
            action: () => this.playVideo(video),
            disabled: false
        });
        
        // Remove option
        menuItems.push({
            text: '🗑️ Remove',
            action: () => this.removeVideo(video.id),
            disabled: false
        });
        
        // Add menu items to menu
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.textContent = item.text;
            menuItem.style.padding = '8px 12px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.color = item.disabled ? 'var(--text-secondary)' : 'var(--text-primary)';
            menuItem.style.fontSize = '0.9rem';
            
            if (!item.disabled) {
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.action();
                    menu.remove();
                });
                
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.backgroundColor = 'var(--bg-tertiary)';
                });
                
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.backgroundColor = '';
                });
            } else {
                menuItem.style.cursor = 'not-allowed';
            }
            
            menu.appendChild(menuItem);
        });
        
        // Add menu to document
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        // Use setTimeout to avoid immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 10);
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

    // Show help modal
    showHelpModal() {
        if (this.helpModal) {
            this.helpModal.style.display = 'block';
            // Prevent scrolling on body when modal is open
            document.body.style.overflow = 'hidden';
        }
    }

    // Hide help modal
    hideHelpModal() {
        if (this.helpModal) {
            this.helpModal.style.display = 'none';
            // Restore scrolling on body
            document.body.style.overflow = '';
        }
    }

    // Toggle lock/unlock functionality
    async toggleLock() {
        if (this.isLocked) {
            // Show the unlock overlay
            this.showUnlockOverlay();
        } else {
            // Lock the gallery immediately without confirmation
            if (this.passkey === null) {
                // First time setting passkey
                const newPasskey = prompt('Set a passkey to lock the gallery:');

                if (newPasskey && newPasskey.trim() !== '') {
                    this.passkey = newPasskey.trim();
                    this.lockGallery();
                }
            } else {
                // Lock immediately without confirmation
                this.lockGallery();
            }
        }
    }

    // Lock the gallery and make the entire app unusable
    lockGallery() {
        this.isLocked = true;
        this.saveLockState(); // Save the locked state
        this.updateLockButton();
        this.renderGallery(); // Re-render to hide media
        this.showMessage('Gallery locked');
        this.showLockOverlay(); // Show the lock overlay

        // Clear the auto-lock timer when locked (no need to auto-lock when already locked)
        this.clearAutoLockTimer();

        // Pause video if it's currently playing
        if (this.videoPlayer && !this.videoPlayer.paused) {
            this.videoPlayer.pause();
        }

        // Hide video modal and controls if visible
        if (this.videoModal && this.videoModal.style.display === 'block') {
            // Hide video controls
            const videoControls = this.videoModal.querySelector('.video-controls');
            if (videoControls) {
                videoControls.style.display = 'none';
            }

            // Hide close button
            if (this.closeModal) {
                this.closeModal.style.display = 'none';
            }

            // Make sure the video player is not visible through the lock
            if (this.videoPlayer) {
                this.videoPlayer.style.visibility = 'hidden';
                this.videoPlayer.style.opacity = '0';
            }

            // Hide any image display if present
            const imageElement = this.videoModal.querySelector('.image-display');
            if (imageElement) {
                imageElement.style.visibility = 'hidden';
                imageElement.style.opacity = '0';
            }
        }
    }

    // Show the lock overlay to make the entire app unusable
    showLockOverlay() {
        if (this.lockOverlay) {
            this.lockOverlay.classList.remove('hidden');

            // Remove any existing global password input listener
            this.removeGlobalPasswordInput();

            // Disable all inputs and buttons in the main interface
            this.disableMainInterface();
        }
    }

    // Show the unlock overlay
    showUnlockOverlay() {
        if (this.lockOverlay) {
            this.lockOverlay.classList.remove('hidden');

            // Clear any previous error messages
            this.clearUnlockErrorMessage();

            // Focus the password input
            if (this.unlockPasskeyInput) {
                this.unlockPasskeyInput.focus();
                this.unlockPasskeyInput.select();

                // Move cursor to end of text
                this.unlockPasskeyInput.setSelectionRange(
                    this.unlockPasskeyInput.value.length,
                    this.unlockPasskeyInput.value.length
                );
            }

            // Add event listener to allow typing anywhere to enter password
            this.setupGlobalPasswordInput();

            // Disable main interface
            this.disableMainInterface();
        }
    }

    // Submit the unlock passkey
    submitUnlock() {
        const enteredPasskey = this.unlockPasskeyInput.value.trim();

        if (enteredPasskey === this.passkey) {
            this.unlockGallery();
        } else {
            this.showUnlockErrorMessage('Incorrect passkey!');
            this.unlockPasskeyInput.value = '';
            this.unlockPasskeyInput.focus();
        }
    }

    // Cancel the unlock process
    cancelUnlock() {
        this.lockOverlay.classList.add('hidden');
        this.clearUnlockErrorMessage();
        this.unlockPasskeyInput.value = '';

        // Remove global password input listener when canceling unlock
        this.removeGlobalPasswordInput();

        // Re-enable main interface if not locked
        if (!this.isLocked) {
            this.enableMainInterface();
        }

        // When canceling unlock, the app remains locked, so ensure timer is cleared
        // (the timer shouldn't be running when locked anyway)
        this.clearAutoLockTimer();
    }

    // Unlock the gallery
    unlockGallery() {
        this.isLocked = false;
        this.saveLockState(); // Save the unlocked state
        this.updateLockButton();
        this.renderGallery(); // Re-render to show media
        this.showMessage('Gallery unlocked');
        this.hideLockOverlay(); // Hide the lock overlay

        // Restart the auto-lock timer when unlocked
        this.startAutoLockTimer();

        // Restore video modal and controls if they were visible before locking
        if (this.videoModal && this.videoModal.style.display === 'block') {
            // Show video controls
            const videoControls = this.videoModal.querySelector('.video-controls');
            if (videoControls) {
                videoControls.style.display = 'block';
            }

            // Show close button
            if (this.closeModal) {
                this.closeModal.style.display = 'block';
            }

            // Make sure the video player is visible again
            if (this.videoPlayer) {
                this.videoPlayer.style.visibility = 'visible';
                this.videoPlayer.style.opacity = '1';
            }

            // Show any image display if present
            const imageElement = this.videoModal.querySelector('.image-display');
            if (imageElement) {
                imageElement.style.visibility = 'visible';
                imageElement.style.opacity = '1';
            }
        }
    }

    // Hide the lock overlay
    hideLockOverlay() {
        if (this.lockOverlay) {
            this.lockOverlay.classList.add('hidden');
            this.clearUnlockErrorMessage();
            this.unlockPasskeyInput.value = '';

            // Remove global password input listener
            this.removeGlobalPasswordInput();

            // Enable main interface
            this.enableMainInterface();
        }
    }

    // Disable the main interface when locked and lock feature is enabled
    disableMainInterface() {
        if (!this.isLockFeatureEnabled()) {
            // If lock feature is disabled, don't disable the interface
            return;
        }

        // Disable all input elements
        const inputs = document.querySelectorAll('input, textarea, button, select');
        inputs.forEach(input => {
            if (!input.closest('.lock-overlay')) { // Don't disable lock overlay elements
                input.disabled = true;
                input.classList.add('disabled-by-lock');
            }
        });

        // Disable all clickable elements
        const clickableElements = document.querySelectorAll('*[onclick], *[ondblclick], [tabindex]:not([tabindex="-1"])');
        clickableElements.forEach(element => {
            if (!element.closest('.lock-overlay')) { // Don't disable lock overlay elements
                element.classList.add('disabled-by-lock');
                element.setAttribute('aria-disabled', 'true');
                element.style.pointerEvents = 'none'; // Prevent all pointer events
            }
        });

        // Disable all event listeners that might bypass the lock
        const eventTypes = ['click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup',
                          'touchstart', 'touchend', 'touchmove', 'focus', 'blur', 'input', 'change'];
        eventTypes.forEach(eventType => {
            document.addEventListener(eventType, this.preventEventDuringLock, true); // Use capture phase
        });

        // If video modal is open, make sure it's also disabled
        if (this.videoModal && this.videoModal.style.display === 'block') {
            // Disable video player controls specifically
            const videoControls = this.videoModal.querySelector('.video-controls');
            if (videoControls) {
                videoControls.style.pointerEvents = 'none';
                videoControls.style.opacity = '0';
                videoControls.style.visibility = 'hidden';
            }

            // Disable the video player itself and make it invisible
            if (this.videoPlayer) {
                this.videoPlayer.style.pointerEvents = 'none';
                this.videoPlayer.style.visibility = 'hidden';
                this.videoPlayer.style.opacity = '0';
            }

            // Also hide any image display if present
            const imageElement = this.videoModal.querySelector('.image-display');
            if (imageElement) {
                imageElement.style.pointerEvents = 'none';
                imageElement.style.visibility = 'hidden';
                imageElement.style.opacity = '0';
            }

            // Hide the close button as well
            if (this.closeModal) {
                this.closeModal.style.display = 'none';
            }
        }

        // Disable drag and drop
        document.addEventListener('dragover', this.preventDragDuringLock);
        document.addEventListener('drop', this.preventDragDuringLock);
    }

    // Enable the main interface when unlocked
    enableMainInterface() {
        if (!this.isLockFeatureEnabled()) {
            // If lock feature is disabled, just re-enable everything without checking lock state
            // Re-enable all input elements
            const inputs = document.querySelectorAll('.disabled-by-lock');
            inputs.forEach(input => {
                input.disabled = false;
                input.classList.remove('disabled-by-lock');
            });

            // Re-enable all clickable elements
            const clickableElements = document.querySelectorAll('[aria-disabled="true"]');
            clickableElements.forEach(element => {
                element.classList.remove('disabled-by-lock');
                element.removeAttribute('aria-disabled');
                element.style.pointerEvents = ''; // Restore pointer events
            });

            // Re-enable all event listeners
            const eventTypes = ['click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup',
                              'touchstart', 'touchend', 'touchmove', 'focus', 'blur', 'input', 'change'];
            eventTypes.forEach(eventType => {
                document.removeEventListener(eventType, this.preventEventDuringLock, true); // Use capture phase
            });

            // Re-enable video modal controls if modal is open
            if (this.videoModal && this.videoModal.style.display === 'block') {
                // Re-enable video player controls
                const videoControls = this.videoModal.querySelector('.video-controls');
                if (videoControls) {
                    videoControls.style.pointerEvents = '';
                    // Restore controls to their normal state (they might be hidden for other reasons)
                    // Don't force visibility here as it might be controlled by other logic
                }

                // Re-enable the video player
                if (this.videoPlayer) {
                    this.videoPlayer.style.pointerEvents = '';
                    this.videoPlayer.style.visibility = '';
                    this.videoPlayer.style.opacity = '';
                }

                // Also restore any image display if present
                const imageElement = this.videoModal.querySelector('.image-display');
                if (imageElement) {
                    imageElement.style.pointerEvents = '';
                    imageElement.style.visibility = '';
                    imageElement.style.opacity = '';
                }

                // Show the close button again
                if (this.closeModal) {
                    this.closeModal.style.display = 'block';
                }
            }

            // Re-enable drag and drop
            document.removeEventListener('dragover', this.preventDragDuringLock);
            document.removeEventListener('drop', this.preventDragDuringLock);
            return;
        }

        // Only proceed with normal unlock behavior if lock feature is enabled
        // Re-enable all input elements
        const inputs = document.querySelectorAll('.disabled-by-lock');
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('disabled-by-lock');
        });

        // Re-enable all clickable elements
        const clickableElements = document.querySelectorAll('[aria-disabled="true"]');
        clickableElements.forEach(element => {
            element.classList.remove('disabled-by-lock');
            element.removeAttribute('aria-disabled');
            element.style.pointerEvents = ''; // Restore pointer events
        });

        // Re-enable all event listeners
        const eventTypes = ['click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup',
                          'touchstart', 'touchend', 'touchmove', 'focus', 'blur', 'input', 'change'];
        eventTypes.forEach(eventType => {
            document.removeEventListener(eventType, this.preventEventDuringLock, true); // Use capture phase
        });

        // Re-enable video modal controls if modal is open
        if (this.videoModal && this.videoModal.style.display === 'block') {
            // Re-enable video player controls
            const videoControls = this.videoModal.querySelector('.video-controls');
            if (videoControls) {
                videoControls.style.pointerEvents = '';
                // Restore controls to their normal state (they might be hidden for other reasons)
                // Don't force visibility here as it might be controlled by other logic
            }

            // Re-enable the video player
            if (this.videoPlayer) {
                this.videoPlayer.style.pointerEvents = '';
                this.videoPlayer.style.visibility = '';
                this.videoPlayer.style.opacity = '';
            }

            // Also restore any image display if present
            const imageElement = this.videoModal.querySelector('.image-display');
            if (imageElement) {
                imageElement.style.pointerEvents = '';
                imageElement.style.visibility = '';
                imageElement.style.opacity = '';
            }

            // Show the close button again
            if (this.closeModal) {
                this.closeModal.style.display = 'block';
            }
        }

        // Re-enable drag and drop
        document.removeEventListener('dragover', this.preventDragDuringLock);
        document.removeEventListener('drop', this.preventDragDuringLock);
    }

    // Prevent drag and drop events during lock
    preventDragDuringLock = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    // Save playback rate to localStorage
    savePlaybackRate(rate) {
        try {
            localStorage.setItem('videoPlaybackRate', rate.toString());
        } catch (e) {
            console.error('Error saving playback rate:', e);
        }
    }

    // Load playback rate from localStorage
    loadPlaybackRate() {
        try {
            const savedRate = localStorage.getItem('videoPlaybackRate');
            if (savedRate) {
                const rate = parseFloat(savedRate);
                if (!isNaN(rate) && rate >= 0.25 && rate <= 2) {
                    return rate;
                }
            }
        } catch (e) {
            console.error('Error loading playback rate:', e);
        }
        return 1; // Default rate if none saved or invalid
    }

    // Setup global password input when unlock overlay is shown
    setupGlobalPasswordInput() {
        // Remove any existing global password listeners
        this.removeGlobalPasswordInput();

        // Add a keydown listener to capture all keystrokes when unlock overlay is visible
        document.addEventListener('keydown', this.handleGlobalPasswordInput, true);
    }

    // Remove global password input listener
    removeGlobalPasswordInput() {
        document.removeEventListener('keydown', this.handleGlobalPasswordInput, true);
    }

    // Handle global password input when unlock overlay is shown
    handleGlobalPasswordInput = (e) => {
        // Only handle if the unlock overlay is visible and the event is not from the password input itself
        if (this.lockOverlay && !this.lockOverlay.classList.contains('hidden') &&
            !e.target.closest('#unlockPasskeyInput')) {

            // Only process printable characters
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();

                // Add the character to the password input
                const input = this.unlockPasskeyInput;
                if (input) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const currentValue = input.value;

                    // Insert the character at the cursor position
                    input.value = currentValue.substring(0, start) + e.key + currentValue.substring(end);

                    // Move cursor to after the inserted character
                    input.setSelectionRange(start + 1, start + 1);

                    // Focus the input to ensure it stays focused
                    input.focus();
                }
            }
            // Handle Enter key to submit
            else if (e.key === 'Enter') {
                e.preventDefault();
                this.submitUnlock();
            }
            // Handle Backspace
            else if (e.key === 'Backspace') {
                e.preventDefault();

                const input = this.unlockPasskeyInput;
                if (input) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const currentValue = input.value;

                    if (start === end && start > 0) {
                        // Delete character before cursor
                        input.value = currentValue.substring(0, start - 1) + currentValue.substring(end);
                        input.setSelectionRange(start - 1, start - 1);
                    } else if (start !== end) {
                        // Delete selected text
                        input.value = currentValue.substring(0, start) + currentValue.substring(end);
                        input.setSelectionRange(start, start);
                    }

                    // Focus the input to ensure it stays focused
                    input.focus();
                }
            }
            // Handle Delete
            else if (e.key === 'Delete') {
                e.preventDefault();

                const input = this.unlockPasskeyInput;
                if (input) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const currentValue = input.value;

                    if (start === end && start < currentValue.length) {
                        // Delete character after cursor
                        input.value = currentValue.substring(0, start) + currentValue.substring(end + 1);
                        input.setSelectionRange(start, start);
                    } else if (start !== end) {
                        // Delete selected text
                        input.value = currentValue.substring(0, start) + currentValue.substring(end);
                        input.setSelectionRange(start, start);
                    }

                    // Focus the input to ensure it stays focused
                    input.focus();
                }
            }
            // Handle Arrow keys for navigation
            else if (e.key === 'ArrowLeft') {
                e.preventDefault();

                const input = this.unlockPasskeyInput;
                if (input) {
                    const start = input.selectionStart;
                    const newPos = Math.max(0, start - 1);
                    input.setSelectionRange(newPos, newPos);
                    input.focus();
                }
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();

                const input = this.unlockPasskeyInput;
                if (input) {
                    const start = input.selectionStart;
                    const newPos = Math.min(input.value.length, start + 1);
                    input.setSelectionRange(newPos, newPos);
                    input.focus();
                }
            }
            // Handle Tab to cycle between unlock buttons
            else if (e.key === 'Tab') {
                e.preventDefault();

                // Focus the submit button if currently on input, otherwise cycle
                if (document.activeElement === input) {
                    this.unlockSubmitBtn.focus();
                } else {
                    input.focus();
                }
            }
        }
    }

    // Prevent events during lock (used in capture phase to intercept events before they reach targets)
    preventEventDuringLock = (e) => {
        // Only prevent events if lock feature is enabled and gallery is locked
        if (this.isLockFeatureEnabled() && this.isLocked) {
            // Only prevent events that are not coming from the lock overlay
            if (!e.target.closest('.lock-overlay')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    }

    // Show error message for unlock
    showUnlockErrorMessage(message) {
        if (this.unlockErrorMessage) {
            this.unlockErrorMessage.textContent = message;
        }
    }

    // Clear unlock error message
    clearUnlockErrorMessage() {
        if (this.unlockErrorMessage) {
            this.unlockErrorMessage.textContent = '';
        }
    }

    // Update lock button appearance
    updateLockButton() {
        if (this.lockButton) {
            // Only show lock/unlock button if lock feature is enabled
            if (this.isLockFeatureEnabled()) {
                this.lockButton.textContent = this.isLocked ? '🔓' : '🔒';
                this.lockButton.title = this.isLocked ? 'Unlock media gallery' : 'Lock media gallery';
                this.lockButton.style.display = 'inline-flex'; // Show the button
            } else {
                this.lockButton.style.display = 'none'; // Hide the button when lock feature is disabled
            }
        }

        // Show/hide lock overlay based on lock state and if lock feature is enabled
        if (this.isLocked && this.isLockFeatureEnabled()) {
            this.showLockOverlay();
        } else {
            this.hideLockOverlay();
        }

        // Manage auto-lock timer based on lock state and feature enabled status
        if (this.isLocked && this.isLockFeatureEnabled()) {
            this.clearAutoLockTimer();
        } else if (this.isLockFeatureEnabled() && !this.isLocked) {
            // Only start auto-lock timer if lock feature is enabled AND we're not currently locked
            this.startAutoLockTimer();
        } else {
            // If lock feature is disabled, ensure timer is cleared
            this.clearAutoLockTimer();
        }
    }

    // Update upload section based on lock state
    updateUploadSection() {
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            if (this.isLocked && this.isLockFeatureEnabled()) {
                // Disable upload functionality when locked and lock feature is enabled
                uploadSection.style.opacity = '0.5';
                uploadSection.style.pointerEvents = 'none';
            } else {
                // Enable upload functionality when unlocked or lock feature is disabled
                uploadSection.style.opacity = '1';
                uploadSection.style.pointerEvents = 'auto';
            }
        }
    }

    // Initialize filter controls
    initFilterControls() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.setActiveFilter(filter);

                // Save the selected filter to localStorage
                localStorage.setItem('selectedFilter', filter);
            });
        });

        // Restore the last selected filter from localStorage
        const savedFilter = localStorage.getItem('selectedFilter');
        if (savedFilter) {
            this.setActiveFilter(savedFilter);
        } else {
            // Default to 'all' if no saved filter
            this.setActiveFilter('all');
        }
    }

    // Set active filter and update UI
    setActiveFilter(filter) {
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Store current filter
        this.currentFilter = filter;

        // Re-render gallery with filter applied
        this.renderGallery();
    }

    // Filter videos based on current filter
    getFilteredVideos() {
        if (!this.currentFilter || this.currentFilter === 'all') {
            return this.videos;
        }

        return this.videos.filter(video => {
            switch (this.currentFilter) {
                case 'saved':
                    return video.type === 'stored_video';
                case 'streaming':
                    return video.isStream || video.type === 'm3u' || video.type === 'local_m3u_path';
                case 'images':
                    return video.isImage;
                case 'audio':
                    return video.isAudio;
                default:
                    return true;
            }
        });
    }

    // Get index of current video in the filtered list
    getCurrentVideoIndexInFilteredList() {
        const filteredVideos = this.getFilteredVideos();
        if (this.currentVideoIndex >= 0 && this.currentVideoIndex < this.videos.length) {
            const currentVideo = this.videos[this.currentVideoIndex];
            return filteredVideos.findIndex(video => video.id === currentVideo.id);
        }
        return -1;
    }

    // Get video by index in the filtered list
    getVideoByFilteredListIndex(index) {
        const filteredVideos = this.getFilteredVideos();
        if (index >= 0 && index < filteredVideos.length) {
            return filteredVideos[index];
        }
        return null;
    }

    // Method to regenerate thumbnails for all saved media that don't have thumbnails
    regenerateMissingThumbnails() {
        // Iterate through all videos and regenerate thumbnails for those that are missing
        this.videos.forEach(video => {
            if ((!video.thumbnail || video.thumbnail.trim() === '') &&
                video.src &&
                video.src.startsWith('data:')) {

                if (video.src.startsWith('data:video/')) {
                    // For video files, generate thumbnail from base64 source
                    this.generateThumbnailFromBase64(video);
                } else if (video.src.startsWith('data:image/')) {
                    // For image files, use the base64 source as thumbnail
                    video.thumbnail = video.src;
                }
            }
        });

        // Update the gallery to reflect the new thumbnails
        this.renderGallery();
    }

    // Export all saved media to an uncompressed zip file
    async exportSavedMedia() {
        try {
            // Filter to get only saved media (stored as base64 in storage)
            const savedVideos = this.videos.filter(video => video.type === 'stored_video');

            if (savedVideos.length === 0) {
                alert('No saved media to export.');
                return;
            }

            // Create a new JSZip instance
            const zip = new JSZip();

            // Create a metadata file to store video information
            const metadata = {
                exportedAt: new Date().toISOString(),
                totalVideos: savedVideos.length,
                videos: []
            };

            // Add each saved video to the zip
            for (let i = 0; i < savedVideos.length; i++) {
                const video = savedVideos[i];

                // Extract file extension from the base64 data
                let fileExtension = '.bin'; // default
                let mimeType = '';

                if (video.src.startsWith('data:video/')) {
                    mimeType = 'video';
                    fileExtension = this.getFileExtensionFromMimeType(video.src);
                } else if (video.src.startsWith('data:image/')) {
                    mimeType = 'image';
                    fileExtension = this.getFileExtensionFromMimeType(video.src);
                } else if (video.src.startsWith('data:audio/')) {
                    mimeType = 'audio';
                    fileExtension = this.getFileExtensionFromMimeType(video.src);
                }

                // Create a clean filename
                const cleanName = this.sanitizeFilename(video.name || `media_${i}`);
                const filename = `${cleanName}${fileExtension}`;

                // Extract base64 data
                const base64Data = video.src.split(',')[1];
                const binaryData = atob(base64Data);
                const arrayBuffer = new ArrayBuffer(binaryData.length);
                const uint8Array = new Uint8Array(arrayBuffer);

                for (let j = 0; j < binaryData.length; j++) {
                    uint8Array[j] = binaryData.charCodeAt(j);
                }

                // Add the media file to the zip
                zip.file(filename, uint8Array);

                // Add video metadata
                metadata.videos.push({
                    id: video.id,
                    name: video.name,
                    originalFilename: video.name,
                    filename: filename,
                    size: video.size,
                    duration: video.duration,
                    timestamp: video.timestamp,
                    type: video.type,
                    isImage: video.isImage,
                    isAudio: video.isAudio
                });
            }

            // Add metadata file to the zip
            zip.file('metadata.json', JSON.stringify(metadata, null, 2));

            // Generate the zip file as a blob
            const zipBlob = await zip.generateAsync({type: "blob", compression: "STORE"}); // STORE means no compression

            // Create a download link
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `saved_media_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up the URL object
            URL.revokeObjectURL(url);

            this.showMessage(`Exported ${savedVideos.length} media files successfully!`);
        } catch (error) {
            console.error('Error exporting media:', error);
            alert('Error exporting media: ' + error.message);
        }
    }

    // Import media from a zip file
    async importMediaFromZip(file) {
        try {
            if (!file) {
                alert('No file selected for import.');
                return;
            }

            // Show loading message
            this.showMessage('Importing media...');

            // Load the zip file
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);

            // Check if metadata file exists
            const metadataFile = zipContent.file('metadata.json');
            if (!metadataFile) {
                alert('Invalid zip file: Missing metadata.json');
                return;
            }

            // Load metadata
            const metadataJson = await metadataFile.async('text');
            const metadata = JSON.parse(metadataJson);

            // Process each file in the zip (excluding metadata.json)
            const files = Object.keys(zipContent.files).filter(filename => filename !== 'metadata.json');

            let importedCount = 0;

            for (const filename of files) {
                const fileEntry = zipContent.files[filename];

                // Skip directories
                if (fileEntry.dir) continue;

                // Get file content as ArrayBuffer
                const arrayBuffer = await fileEntry.async('arraybuffer');

                // Convert ArrayBuffer to base64
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                // Determine MIME type based on file extension
                const fileExt = filename.split('.').pop().toLowerCase();
                const mimeType = this.getMimeTypeFromFileExtension(fileExt);

                // Create base64 URL
                const base64Url = `data:${mimeType};base64,${base64Data}`;

                // Find metadata for this file
                const videoMetadata = metadata.videos.find(v => v.filename === filename) || {};

                // Create video object
                const newVideo = {
                    id: videoMetadata.id || Date.now() + Math.random().toString(36).substr(2, 9),
                    src: base64Url,
                    name: videoMetadata.name || filename,
                    size: videoMetadata.size || arrayBuffer.byteLength,
                    duration: videoMetadata.duration,
                    thumbnail: '', // Will be generated later
                    timestamp: videoMetadata.timestamp || new Date().toISOString(),
                    allowSave: true,
                    type: 'stored_video',
                    isImage: videoMetadata.isImage,
                    isAudio: videoMetadata.isAudio
                };

                // Check if this video already exists (by name and size)
                const existingIndex = this.videos.findIndex(v =>
                    v.name === newVideo.name && v.size === newVideo.size
                );

                if (existingIndex === -1) {
                    // Add to videos array if not duplicate
                    this.videos.push(newVideo);
                    importedCount++;

                    // Generate thumbnail for the imported video
                    if (base64Url.startsWith('data:video/')) {
                        this.generateThumbnailFromBase64(newVideo);
                    } else if (base64Url.startsWith('data:image/')) {
                        newVideo.thumbnail = base64Url;
                    }
                } else {
                    console.log(`Skipped duplicate file: ${filename}`);
                }
            }

            // Save to storage and update UI
            this.saveToStorage();
            this.updateTotalSizeDisplay();
            this.renderGallery();

            this.showMessage(`Imported ${importedCount} media files successfully!`);
        } catch (error) {
            console.error('Error importing media:', error);
            alert('Error importing media: ' + error.message);
        }
    }

    // Helper method to get file extension from MIME type in base64 string
    getFileExtensionFromMimeType(base64String) {
        const mimeType = base64String.split(';')[0].split(':')[1];

        const mimeToExt = {
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'video/ogg': '.ogg',
            'video/mkv': '.mkv',
            'video/avi': '.avi',
            'video/mov': '.mov',
            'video/wmv': '.wmv',
            'video/flv': '.flv',
            'video/mpeg': '.mpeg',
            'video/x-matroska': '.mkv',
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'image/bmp': '.bmp',
            'audio/mp3': '.mp3',
            'audio/wav': '.wav',
            'audio/ogg': '.ogg',
            'audio/mpeg': '.mp3',
            'audio/wave': '.wav',
            'audio/x-wav': '.wav'
        };

        return mimeToExt[mimeType] || '.bin';
    }

    // Helper method to get MIME type from file extension
    getMimeTypeFromFileExtension(ext) {
        const extToMime = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mkv': 'video/x-matroska',
            'avi': 'video/avi',
            'mov': 'video/quicktime',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'm4v': 'video/mp4',
            '3gp': 'video/3gpp',
            '3g2': 'video/3gpp2',
            'mjpeg': 'video/x-mjpeg',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4',
            'flac': 'audio/flac',
            'aac': 'audio/aac'
        };

        return extToMime[ext.toLowerCase()] || 'application/octet-stream';
    }

    // Helper method to sanitize filename
    sanitizeFilename(filename) {
        // Remove invalid characters and replace with underscores
        return filename.replace(/[^a-z0-9.-]/gi, '_');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayerApp = new VideoPlayerApp();
});
