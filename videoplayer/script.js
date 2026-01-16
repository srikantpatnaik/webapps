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
        videoModal.addEventListener('mousemove', () => {
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
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.videoUrlInput = document.getElementById('videoUrl');
        this.loadUrlBtn = document.getElementById('loadUrlBtn');
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
    }

    bindEvents() {
        // File upload events
        this.uploadArea.addEventListener('click', (e) => {
            // Only trigger file input if not clicking on another element inside uploadArea
            if (e.target === this.uploadArea || e.target === this.uploadArea.firstElementChild || e.target === this.uploadArea.querySelector('h3') || e.target === this.uploadArea.querySelector('p')) {
                this.fileInput.click();
            }
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });

        // Load video from URL
        this.loadUrlBtn.addEventListener('click', () => {
            const url = this.videoUrlInput.value.trim();
            if (url) {
                this.loadVideoFromUrl(url);
            } else {
                alert('Please enter a video URL');
            }
        });

        // Load M3U playlist
        const loadM3UBtn = document.getElementById('loadM3UBtn');
        const m3uPlaylistUrl = document.getElementById('m3uPlaylistUrl');
        if (loadM3UBtn && m3uPlaylistUrl) {
            loadM3UBtn.addEventListener('click', () => {
                const url = m3uPlaylistUrl.value.trim();
                if (url) {
                    this.loadM3UPlaylist(url);
                } else {
                    alert('Please enter an M3U playlist URL');
                }
            });

            // Allow pressing Enter in the M3U input
            m3uPlaylistUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    loadM3UBtn.click();
                }
            });
        }

        // Allow pressing Enter in the URL input
        this.videoUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadUrlBtn.click();
            }
        });

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.style.borderColor = 'var(--accent)';
            this.uploadArea.style.backgroundColor = 'rgba(187, 134, 252, 0.1)';
        });

        this.uploadArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.style.borderColor = 'var(--accent)';
            this.uploadArea.style.backgroundColor = 'rgba(187, 134, 252, 0.1)';
        });

        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only reset if we're actually leaving the element, not just moving inside it
            if (!this.uploadArea.contains(e.relatedTarget)) {
                this.uploadArea.style.borderColor = 'var(--border)';
                this.uploadArea.style.backgroundColor = 'transparent';
            }
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.style.borderColor = 'var(--border)';
            this.uploadArea.style.backgroundColor = 'transparent';

            this.handleFiles(e.dataTransfer.files);
        });

        // Modal events
        this.closeModal.addEventListener('click', () => {
            this.videoModal.style.display = 'none';
            this.videoPlayer.pause();
            // Show cursor when modal is closed
            this.videoModal.style.cursor = 'default';
            this.isCursorHidden = false;
            // Reset zoom when closing modal
            this.resetZoom();
        });

        this.videoModal.addEventListener('click', (e) => {
            if (e.target === this.videoModal) {
                this.videoModal.style.display = 'none';
                this.videoPlayer.pause();
                // Show cursor when modal is closed
                this.videoModal.style.cursor = 'default';
                this.isCursorHidden = false;
                // Reset zoom when closing modal
                this.resetZoom();
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
    }

    handleFiles(files) {
        if (!files || files.length === 0) {
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type && file.type.startsWith('video/')) {
                this.processVideoFile(file);
            } else {
                // Alert user that non-video files were dropped/selected
                const fileName = file.name || 'Unknown file';
                alert(`Skipping non-video file: ${fileName}. Only video files are supported.`);
            }
        }
    }

    processVideoFile(file) {
        // Show loading message
        if (this.videoInfo) {
            this.videoInfo.textContent = `Processing: ${file.name}...`;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            // Check for duplicate video by comparing the base64 data
            const videoDataStr = e.target.result;
            const isDuplicate = this.videos.some(video => video.src === videoDataStr);

            if (isDuplicate) {
                alert('This video already exists in your collection.');
                this.updateVideoInfoText();
                return;
            }

            // Create a temporary video element to get duration and thumbnail
            const tempVideo = document.createElement('video');
            tempVideo.preload = 'metadata';
            tempVideo.src = videoDataStr;

            tempVideo.onloadedmetadata = () => {
                try {
                    // Generate thumbnail at 1 second
                    const canvas = document.createElement('canvas');
                    // Set dimensions safely, defaulting to 100x100 if video dimensions are invalid
                    canvas.width = tempVideo.videoWidth > 0 ? tempVideo.videoWidth : 100;
                    canvas.height = tempVideo.videoHeight > 0 ? tempVideo.videoHeight : 100;
                    const ctx = canvas.getContext('2d');

                    // Capture frame at 1 second if duration is sufficient, otherwise at 0
                    const seekTime = tempVideo.duration > 1 ? 1 : 0;

                    const captureFrame = () => {
                        try {
                            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                            const thumbnail = canvas.toDataURL('image/jpeg');

                            const videoData = {
                                id: Date.now() + Math.random().toString(36).substr(2, 9),
                                src: videoDataStr,
                                name: file.name,
                                size: file.size,
                                duration: tempVideo.duration,
                                thumbnail: thumbnail,
                                timestamp: new Date().toISOString()
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
                        } catch (drawError) {
                            console.error('Error drawing thumbnail:', drawError);

                            // Create an error video data with a fallback thumbnail
                            const videoData = {
                                id: Date.now() + Math.random().toString(36).substr(2, 9),
                                src: videoDataStr,
                                name: file.name,
                                size: file.size,
                                duration: tempVideo.duration,
                                thumbnail: '', // Will use fallback in gallery
                                timestamp: new Date().toISOString()
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
                }
            };

            tempVideo.onerror = (event) => {
                console.error('Error loading video metadata:', event);
                alert('Error processing video file. The file may be corrupted or incompatible.');
                this.updateVideoInfoText();
            };

            // Set a timeout to handle cases where metadata never loads
            setTimeout(() => {
                if (tempVideo.readyState === 0) {
                    console.error('Timeout waiting for video metadata');
                    alert('Video file took too long to load. May be corrupted or incompatible.');
                    this.updateVideoInfoText();
                }
            }, 10000); // 10 second timeout
        };

        reader.onerror = (event) => {
            console.error('Error reading video file:', event);
            alert('Error reading video file. Please try a different file.');
            this.updateVideoInfoText();
        };

        reader.readAsDataURL(file);
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
            totalSize = this.videos.reduce((sum, video) => sum + (video.size || 0), 0);
        }

        const sizeDisplay = document.getElementById('totalSizeDisplay');
        if (sizeDisplay) {
            if (totalSize >= 1024 * 1024 * 1024) { // 1 GB in bytes
                // Convert to GB if greater than or equal to 1 GB
                const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
                sizeDisplay.textContent = `Total Size: ${sizeInGB} GB`;
            } else {
                // Otherwise display in MB
                const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
                sizeDisplay.textContent = `Total Size: ${sizeInMB} MB`;
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
                            store.add(video);
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
                    this.videos = getAllRequest.result;
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

        this.videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.dataset.id = video.id;

            // Create remove button for local media (not for streams)
            if (!video.isStream) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = `Remove ${video.name}`;
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the video click event
                    this.removeVideo(video.id);
                });
                videoItem.appendChild(removeBtn);
            }

            const thumbnail = document.createElement('img');
            // For M3U streams, use the logo; for videos, use the thumbnail
            if (video.isStream && video.thumbnail) {
                thumbnail.src = video.thumbnail; // This is the logo for streams
            } else {
                thumbnail.src = video.thumbnail;
            }
            thumbnail.alt = `Thumbnail for ${video.name}`;
            thumbnail.className = 'video-thumbnail';
            thumbnail.loading = 'lazy';

            // Add error handling for thumbnail loading
            thumbnail.onerror = () => {
                // For streams, try to use a generic TV icon; for videos, show default video icon
                if (video.isStream) {
                    thumbnail.style.backgroundColor = '#333';
                    thumbnail.style.display = 'flex';
                    thumbnail.style.alignItems = 'center';
                    thumbnail.style.justifyContent = 'center';
                    thumbnail.textContent = '📺';
                    thumbnail.style.fontSize = '2rem';
                } else {
                    // Fallback to a default thumbnail or hide the thumbnail
                    thumbnail.style.backgroundColor = '#333';
                    thumbnail.style.display = 'flex';
                    thumbnail.style.alignItems = 'center';
                    thumbnail.style.justifyContent = 'center';
                    thumbnail.textContent = '📹';
                    thumbnail.style.fontSize = '2rem';
                }
            };

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
        // Find the index of this video in the videos array
        const videoIndex = this.videos.findIndex(v => v.id === video.id);
        if (videoIndex !== -1) {
            this.currentVideoIndex = videoIndex;
        }

        // Set source and handle loading
        // For streams, we might need to handle CORS differently
        if (video.isStream) {
            // For live streams, try the direct URL first
            this.videoPlayer.src = video.src;
            this.videoInfo.textContent = `Playing: ${video.name}`;
        } else {
            this.videoPlayer.src = video.src;
            this.videoInfo.textContent = `Playing: ${video.name} (${this.formatTime(video.duration)})`;
        }

        this.videoPlayer.load(); // Explicitly load the source

        // Wait for metadata to load to update info display and set proper size
        this.videoPlayer.onloadedmetadata = () => {
            // For streams, we don't have duration typically
            if (!video.isStream) {
                this.videoInfo.textContent = `Playing: ${video.name} (${this.formatTime(video.duration)})`;
            }

            this.updateTimeDisplay();

            // Ensure video displays at maximum size while preserving aspect ratio
            setTimeout(() => {
                if (this.videoPlayer && this.videoPlayer.videoWidth && this.videoPlayer.videoHeight) {
                    // The object-fit: contain in CSS should handle aspect ratio
                    // Just make sure everything is visible
                    this.resetZoom();
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

        // Update controls to show live stream indicators if needed
        if (video.isStream) {
            this.timeDisplay.textContent = 'LIVE'; // Change time display for live streams
        }

        this.videoModal.style.display = 'block';

        // Play the video after a short delay to ensure it's ready
        setTimeout(() => {
            // Check if the video is ready to play before attempting to play
            if (this.videoPlayer.readyState >= 2) { // HAVE_CURRENT_DATA
                this.videoPlayer.play()
                    .then(() => {
                        this.playPauseBtn.textContent = '⏸';
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
                e.preventDefault();
                this.videoPlayer.currentTime -= 10; // Seek backward 10 seconds
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
            case 'Escape':
                this.videoModal.style.display = 'none';
                this.videoPlayer.pause();
                break;
            default:
                // Other keys do nothing for video player
                break;
        }
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

    loadVideoFromUrl(url) {
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

        this.videoPlayer.oncanplay = () => {
            // Successfully loaded, continue with playback
            // Since we don't have file info from URL, use the URL basename as filename
            const fileName = url.substring(url.lastIndexOf('/') + 1);
            this.videoInfo.textContent = `Playing: ${fileName}`;

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
                e.preventDefault();
                this.videoPlayer.currentTime -= 10; // Seek backward 10 seconds
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
                this.videoModal.style.display = 'none';
                this.videoPlayer.pause();
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

        let nextIndex = (currentIndex + 1) % this.videos.length;

        // If global loop is enabled and we've reached the end, loop back to start
        if (this.globalLoop && nextIndex === 0 && currentIndex === this.videos.length - 1) {
            // We're looping back to the first video
        }

        // Update internal tracking
        this.currentVideoIndex = nextIndex;

        // Play the next video
        this.playVideo(this.videos[nextIndex]);
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

        let prevIndex = (currentIndex - 1 + this.videos.length) % this.videos.length;

        // Update internal tracking
        this.currentVideoIndex = prevIndex;

        // Play the previous video
        this.playVideo(this.videos[prevIndex]);
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

        if (lines[0] !== '#EXTM3U') {
            console.warn('File may not be a valid M3U playlist');
        }

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const extinfLine = lines[i];
                const streamUrl = lines[i + 1]?.trim(); // Get the next line as the stream URL

                if (streamUrl) {
                    // Extract attributes from EXTINF line
                    const item = this.extractChannelInfo(extinfLine, streamUrl);

                    // Add the parsed item to the list
                    if (item) {
                        playlistItems.push(item);
                    }
                }
            }
        }

        return playlistItems;
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
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayerApp = new VideoPlayerApp();
});