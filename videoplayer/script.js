// Video Player JavaScript functionality

class VideoPlayerApp {
    constructor() {
        this.videos = JSON.parse(localStorage.getItem('storedVideos')) || [];
        this.currentVideos = [...this.videos];
        this.currentVideoIndex = -1; // Track current video index
        this.globalLoop = false; // Global loop setting
        this.initElements();
        this.bindEvents();
        this.initializeVideoPlayer();
        this.initializeVideoPlayerControls();
        this.renderGallery();
    }

    initializeVideoPlayer() {
        // Set initial values for video player
        this.videoPlayer.volume = 1;
        this.videoPlayer.playbackRate = 1;
        this.videoPlayer.loop = false;
        this.videoPlayer.controls = false; // Hide native controls

        // Initialize panning variables
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.panX = 0;
        this.panY = 0;
    }

    initializeVideoPlayerControls() {
        // Set up touchpad zoom and other control-specific functionality
        this.setupTouchpadZoom();

        // Set up video panning functionality
        this.setupVideoPanning();

        // Initialize video modal controls visibility
        this.setupControlsVisibility();
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
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
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

        // Allow pressing Enter in the URL input
        this.videoUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadUrlBtn.click();
            }
        });

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = 'var(--accent)';
            this.uploadArea.style.backgroundColor = 'rgba(187, 134, 252, 0.1)';
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.style.borderColor = 'var(--border)';
            this.uploadArea.style.backgroundColor = 'transparent';
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = 'var(--border)';
            this.uploadArea.style.backgroundColor = 'transparent';

            this.handleFiles(e.dataTransfer.files);
        });

        // Modal events
        this.closeModal.addEventListener('click', () => {
            this.videoModal.style.display = 'none';
            this.videoPlayer.pause();
        });

        this.videoModal.addEventListener('click', (e) => {
            if (e.target === this.videoModal) {
                this.videoModal.style.display = 'none';
                this.videoPlayer.pause();
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
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('video/')) {
                this.processVideoFile(file);
            }
        }
    }

    processVideoFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            // Check for duplicate video by comparing the base64 data
            const videoDataStr = e.target.result;
            const isDuplicate = this.videos.some(video => video.src === videoDataStr);

            if (isDuplicate) {
                alert('This video already exists in your collection.');
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
                    canvas.width = tempVideo.videoWidth;
                    canvas.height = tempVideo.videoHeight;
                    const ctx = canvas.getContext('2d');

                    // Capture frame at 1 second
                    tempVideo.currentTime = 1;
                    tempVideo.addEventListener('seeked', () => {
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
                            this.saveToLocalStorage();

                            // Instead of reloading the page, just refresh the gallery
                            this.renderGallery();

                            // Show message that video was added
                            if (this.videoInfo && this.videoInfo.parentElement) {
                                this.videoInfo.textContent = `Added: ${file.name} to your collection`;

                                // Reset the text after a few seconds
                                setTimeout(() => {
                                    if (this.videoInfo.textContent.includes('Added:')) {
                                        this.videoInfo.textContent = 'No video loaded';
                                    }
                                }, 3000);
                            }
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
                            this.saveToLocalStorage();
                            this.renderGallery();
                        }
                    }, { once: true }); // Use once to avoid multiple triggers
                } catch (error) {
                    console.error('Error processing video metadata:', error);
                    alert('Error processing video file metadata.');
                }
            };

            tempVideo.onerror = () => {
                console.error('Error loading video metadata');
                alert('Error processing video file. The file may be corrupted or incompatible.');
            };
        };

        reader.onerror = () => {
            console.error('Error reading video file');
            alert('Error reading video file. Please try a different file.');
        };

        reader.readAsDataURL(file);
    }

    saveToLocalStorage() {
        localStorage.setItem('storedVideos', JSON.stringify(this.videos));
    }

    renderGallery() {
        this.videoGallery.innerHTML = '';

        if (this.videos.length === 0) {
            this.videoGallery.innerHTML = '<p class="no-videos">No videos to display. Upload some videos to get started.</p>';
            return;
        }

        this.videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.dataset.id = video.id;

            const thumbnail = document.createElement('img');
            thumbnail.src = video.thumbnail;
            thumbnail.alt = `Thumbnail for ${video.name}`;
            thumbnail.className = 'video-thumbnail';
            thumbnail.loading = 'lazy';

            // Add error handling for thumbnail loading
            thumbnail.onerror = () => {
                // Fallback to a default thumbnail or hide the thumbnail
                thumbnail.style.backgroundColor = '#333';
                thumbnail.style.display = 'flex';
                thumbnail.style.alignItems = 'center';
                thumbnail.style.justifyContent = 'center';
                thumbnail.textContent = '📹';
                thumbnail.style.fontSize = '2rem';
            };

            const videoInfo = document.createElement('div');
            videoInfo.className = 'video-info';

            const title = document.createElement('div');
            title.className = 'video-title';
            title.textContent = video.name;

            const meta = document.createElement('div');
            meta.className = 'video-meta';
            const duration = this.formatTime(video.duration);
            const size = this.formatFileSize(video.size);
            meta.textContent = `${duration} • ${size}`;

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

        this.videoPlayer.src = video.src;

        // Wait for metadata to load to update info display
        this.videoPlayer.onloadedmetadata = () => {
            this.videoInfo.textContent = `Playing: ${video.name} (${this.formatTime(video.duration)})`;
            this.updateTimeDisplay();
        };

        // Handle error loading video
        this.videoPlayer.onerror = (e) => {
            console.error('Error loading video:', e);
            alert('Failed to load the video. The file may be corrupted or incompatible.');
        };

        this.videoModal.style.display = 'block';

        // Play the video after a short delay to ensure it's ready
        setTimeout(() => {
            this.videoPlayer.play();
            this.playPauseBtn.textContent = '⏸';
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
        this.loopBtn.textContent = this.videoPlayer.loop ? '🔄' : '🔁';
        this.loopBtn.title = this.videoPlayer.loop ? 'Disable Loop' : 'Enable Loop';
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
                currentZoom = parseFloat(currentTransform.match(/scale\(([^)]+)\)/)[1]) || 1;
            } catch(e) {
                currentZoom = 1;
                // If parsing fails, start with default zoom
            }
        }

        // Define zoom levels
        const zoomLevels = [1, 1.25, 1.5, 2];
        const currentIndex = zoomLevels.indexOf(currentZoom);
        const nextIndex = (currentIndex + 1) % zoomLevels.length;
        const newZoom = zoomLevels[nextIndex];

        // Apply zoom with center origin, keeping panning if any
        container.style.transform = `scale(${newZoom}) translate(${this.panX}px, ${this.panY}px)`;
        container.style.transformOrigin = 'center center';

        // Update the zoom indicator in the UI
        this.updateZoomIndicator(newZoom);
    }

    zoomOut() {
        const container = this.videoPlayer.parentElement;
        const currentTransform = container.style.transform;
        let currentZoom = 1;

        // Extract current zoom value
        if (currentTransform && currentTransform.includes('scale(')) {
            try {
                currentZoom = parseFloat(currentTransform.match(/scale\(([^)]+)\)/)[1]) || 1;
            } catch(e) {
                currentZoom = 1;
            }
        }

        // Define zoom levels
        const zoomLevels = [1, 1.25, 1.5, 2];
        const currentIndex = zoomLevels.indexOf(currentZoom);

        // If currently at 1x, go to 1x (no change), else go to previous level
        let newZoom = currentZoom;
        if (currentIndex > 0) {
            newZoom = zoomLevels[currentIndex - 1];
        } else {
            // If at lowest level (1x), go to 1x anyway - this could be a no-op or we might want to go lower
            newZoom = 0.75; // Go slightly below 1x to show zoom out effect
        }

        // Clamp to minimum zoom of 0.5
        newZoom = Math.max(0.5, newZoom);

        // Apply zoom with center origin, keeping panning if any
        container.style.transform = `scale(${newZoom}) translate(${this.panX}px, ${this.panY}px)`;
        container.style.transformOrigin = 'center center';

        // Update the zoom indicator in the UI
        this.updateZoomIndicator(newZoom);
    }

    resetZoom() {
        const container = this.videoPlayer.parentElement;

        // Reset zoom and panning
        container.style.transform = 'scale(1) translate(0px, 0px)';
        container.style.transformOrigin = 'center center';

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
            globalLoopBtn.title = this.globalLoop ? 'Disable Global Loop' : 'Enable Global Loop';
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

        // Listen for wheel events with Ctrl key (touchpad pinch gesture)
        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();

                const currentTransform = container.style.transform;
                let currentZoom = 1;

                // Extract current zoom value
                if (currentTransform && currentTransform.includes('scale(')) {
                    try {
                        currentZoom = parseFloat(currentTransform.match(/scale\(([^)]+)\)/)[1]) || 1;
                    } catch(e) {
                        currentZoom = 1;
                    }
                }

                // Adjust zoom based on scroll direction
                const delta = e.deltaY > 0 ? -0.25 : 0.25;
                const newZoom = Math.max(0.5, Math.min(3, currentZoom + delta)); // Limit between 0.5x and 3x

                // Apply zoom with center origin
                container.style.transform = `scale(${newZoom})`;
                container.style.transformOrigin = 'center center';

                this.updateZoomIndicator(newZoom);
            }
        }, { passive: false });
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayerApp = new VideoPlayerApp();
});