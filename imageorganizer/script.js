// Image Organizer JavaScript functionality

class ImageOrganizer {
    constructor() {
        this.images = JSON.parse(localStorage.getItem('organizedImages')) || [];
        this.currentImages = [...this.images];
        this.wheelTimeout = null; // For handling wheel event timeout
        this.currentImageIndex = 0; // Track the currently displayed image
        this.initElements();
        this.bindEvents();
        this.renderGallery();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.searchInput = document.getElementById('searchInput');
        this.imageGallery = document.getElementById('imageGallery');
        this.imageModal = document.getElementById('imageModal');
        this.modalImage = document.getElementById('modalImage');
        this.modalTags = document.getElementById('modalTags');
        this.closeModal = document.getElementById('closeModal');
    }

    bindEvents() {
        // Set up paste listener on the entire document for full page paste
        this.setupPasteListener();

        // Make search dynamic - update results as user types
        this.searchInput.addEventListener('input', () => {
            this.searchImages();
        });

        // Allow typing anywhere on the page to filter by tags
        document.addEventListener('keydown', (e) => {
            // Only focus search input if user is not already typing in an input field
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                // Focus the search input on any keypress (except for a few special keys)
                if (!['Control', 'Shift', 'Alt', 'Meta', 'Escape', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    this.searchInput.focus();
                }
            }
        });

        // Modal events
        this.closeModal.addEventListener('click', () => {
            this.imageModal.style.display = 'none';
        });

        this.imageModal.addEventListener('click', (e) => {
            if (e.target === this.imageModal) {
                this.imageModal.style.display = 'none';
            }
        });

    }

    handleFiles(files) {
        // Process files without tags since we're not using tag inputs
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                this.processImageFile(file, []);
            }
        }
    }

    showPasteInstructions() {
        // Show instructions for paste functionality
        alert('Press Ctrl+V (or Cmd+V on Mac) anywhere on the page to paste an image from clipboard');
    }

    // Call this method to set up paste listeners when needed
    setupPasteListener() {
        // Remove any previous paste listeners to prevent duplicates
        document.removeEventListener('paste', this.pasteHandler);

        // Create a paste handler function
        this.pasteHandler = (e) => {
            if (!e.clipboardData || !e.clipboardData.items) {
                console.error('Clipboard data not available');
                return;
            }

            const items = e.clipboardData.items;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        // Process the image file without tags initially
                        this.processImageFile(blob, []);
                        break;
                    }
                }
            }
        };

        // Listen for paste event on the entire document
        document.addEventListener('paste', this.pasteHandler);
    }

    removePasteListener() {
        if (this.pasteHandler) {
            document.removeEventListener('paste', this.pasteHandler);
        }
    }

    processImageFile(file, tags = []) {
        const reader = new FileReader();

        reader.onload = (e) => {
            // Check for duplicate image by comparing the base64 data
            const imageDataStr = e.target.result;
            const isDuplicate = this.images.some(img => img.src === imageDataStr);

            if (isDuplicate) {
                alert('This image already exists in your collection.');
                return;
            }

            const imageData = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                src: imageDataStr,
                tags: tags,
                timestamp: new Date().toISOString()
            };

            this.images.push(imageData);
            this.saveToLocalStorage();

            // Reload the page to show the new image
            location.reload();
        };

        reader.readAsDataURL(file);
    }



    searchImages() {
        const searchTerm = this.searchInput.value.trim().toLowerCase();

        if (searchTerm === '') {
            this.currentImages = [...this.images];
        } else {
            this.currentImages = this.images.filter(image =>
                image.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        this.renderGallery();
    }

    clearSearch() {
        this.searchInput.value = '';
        this.currentImages = [...this.images];
        this.renderGallery();
    }

    saveToLocalStorage() {
        localStorage.setItem('organizedImages', JSON.stringify(this.images));
    }

    renderGallery() {
        this.imageGallery.innerHTML = '';

        if (this.currentImages.length === 0) {
            this.imageGallery.innerHTML = '<p class="no-images">No images to display. Upload some images to get started.</p>';
            return;
        }

        this.currentImages.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.dataset.id = image.id;

            const img = document.createElement('img');
            img.src = image.src;
            img.alt = 'Organized Image';
            img.loading = 'lazy';

            // Create overlay for edit and delete buttons
            const overlay = document.createElement('div');
            overlay.className = 'image-overlay';
            overlay.innerHTML = `
                <button class="edit-tags-btn" title="Edit tags">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="delete-btn" title="Delete image">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;

            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'tags';

            image.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });

            // If no tags, show a placeholder
            if (image.tags.length === 0) {
                const placeholder = document.createElement('span');
                placeholder.className = 'tag';
                placeholder.textContent = 'untagged';
                placeholder.style.opacity = '0.7';
                tagsContainer.appendChild(placeholder);
            }

            galleryItem.appendChild(img);
            galleryItem.appendChild(overlay);
            galleryItem.appendChild(tagsContainer);

            // Add click event to edit tags button
            const editBtn = overlay.querySelector('.edit-tags-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the image click
                this.editImageTags(image.id);
            });

            // Add click event to delete button
            const deleteBtn = overlay.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the image click
                if (confirm('Are you sure you want to delete this image?')) {
                    this.deleteImage(image.id);
                }
            });

            galleryItem.addEventListener('click', () => {
                this.showFullImage(image);
            });

            this.imageGallery.appendChild(galleryItem);
        });
    }

    showFullImage(image) {
        this.modalImage.src = image.src;
        this.modalImage.alt = 'Full resolution image';

        // Clear previous tags
        this.modalTags.innerHTML = '';

        // Add tags to modal
        image.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'modal-tag';
            tagElement.textContent = tag;
            this.modalTags.appendChild(tagElement);
        });

        this.imageModal.style.display = 'block';

        // Add zoom functionality
        this.addZoomFunctionality();
    }

    addZoomFunctionality() {
        let currentZoom = 1; // Start at 1x zoom
        const minZoom = 1;
        const maxZoom = 2;
        const zoomStep = 0.1; // Smooth zoom in 0.1 increments

        // Toggle zoom on click
        this.modalImage.onclick = (e) => {
            e.stopPropagation(); // Don't close modal when clicking image
            if (currentZoom > 1) {
                // If zoomed in, reset to 1x
                currentZoom = 1;
            } else {
                // If at 1x, zoom to 2x
                currentZoom = 2;
            }
            this.applyZoom(currentZoom);
        };

        // Add pinch/zoom support for trackpad/mouse wheel
        this.modalImage.addEventListener('wheel', (e) => {
            e.preventDefault();

            if (e.ctrlKey || e.deltaY < 0) {
                // Zoom in with Ctrl+scroll or scroll up
                if (e.deltaY < 0) {
                    // Zoom in
                    currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
                } else {
                    // Zoom out
                    currentZoom = Math.max(minZoom, currentZoom - zoomStep);
                }
                this.applyZoom(currentZoom);
            }
        });

        // Add keyboard shortcuts for the modal
        document.addEventListener('keydown', (e) => {
            if (this.imageModal.style.display === 'block') {
                if (e.key === 'Escape') {
                    this.imageModal.style.display = 'none';
                } else if (e.key === 'ArrowLeft') {
                    this.showPreviousImage();
                } else if (e.key === 'ArrowRight') {
                    this.showNextImage();
                }
            }
        });
    }

    applyZoom(zoomLevel) {
        this.modalImage.style.transform = `translate(-50%, -50%) scale(${zoomLevel})`;
    }

    // Show the previous image in the gallery
    showPreviousImage() {
        // Find the currently displayed image in currentImages
        const currentSrc = this.modalImage.src;
        const currentIndex = this.currentImages.findIndex(img => img.src === currentSrc || img.src === currentSrc.split('?')[0]);

        if (currentIndex > 0) {
            const prevImage = this.currentImages[currentIndex - 1];
            this.showFullImage(prevImage);
        }
    }

    // Show the next image in the gallery
    showNextImage() {
        // Find the currently displayed image in currentImages
        const currentSrc = this.modalImage.src;
        const currentIndex = this.currentImages.findIndex(img => img.src === currentSrc || img.src === currentSrc.split('?')[0]);

        if (currentIndex < this.currentImages.length - 1) {
            const nextImage = this.currentImages[currentIndex + 1];
            this.showFullImage(nextImage);
        }
    }

    handlePasteFromInput(event) {
        // Only prevent default behavior if we find an image to paste
        // Check if there are any image items in clipboard
        let hasImage = false;

        if (event.clipboardData && event.clipboardData.items) {
            for (let i = 0; i < event.clipboardData.items.length; i++) {
                if (event.clipboardData.items[i].type.indexOf('image') !== -1) {
                    hasImage = true;
                    break;
                }
            }
        }

        // Only prevent default behavior if we have an image to process
        if (hasImage) {
            event.preventDefault(); // Prevent default paste behavior for images

            const items = event.clipboardData.items;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        // Process the image file with current tags
                        const tags = this.tagInput.value.trim()
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(tag => tag !== '');

                        this.processImageFile(blob, tags);
                        break;
                    }
                }
            }
        }
        // If no image found, don't prevent default - allow text to be pasted normally
    }

    deleteImage(id) {
        // Remove image from the images array
        this.images = this.images.filter(image => image.id !== id);

        // Also remove from currentImages (which might be filtered)
        this.currentImages = this.currentImages.filter(image => image.id !== id);

        this.saveToLocalStorage();
        this.renderGallery();
    }

    editImageTags(id) {
        const image = this.images.find(img => img.id === id);
        if (!image) return;

        // Create a prompt or modal for editing tags
        const currentTags = image.tags.join(', ');
        const newTagsInput = prompt('Edit tags (comma separated):', currentTags);

        if (newTagsInput !== null) { // User didn't cancel
            const newTags = newTagsInput.trim()
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag !== '');

            // Update the image tags
            image.tags = [...new Set(newTags)]; // Remove duplicates

            this.saveToLocalStorage();
            this.renderGallery();
        }
    }
}

// Initialize the app when the DOM is loaded
let imageOrganizer;
document.addEventListener('DOMContentLoaded', () => {
    imageOrganizer = new ImageOrganizer();
});

// Clean up paste listener when page unloads
window.addEventListener('beforeunload', () => {
    if (imageOrganizer) {
        imageOrganizer.removePasteListener();
    }
});

