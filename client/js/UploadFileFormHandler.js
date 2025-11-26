document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const fileDropZone = document.getElementById('fileDropZone');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const submitBtn = document.getElementById('submitBtn');
    const uploadForm = document.getElementById('uploadForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    const allowedExtensions = ['pdf', 'txt', 'docx', 'xlsx', 'pptx'];
    const maxFileSize = 10 * 1024 * 1024;

    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop handlers
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragleave', () => {
        fileDropZone.classList.remove('drag-over');
    });

    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect();
        }
    });

    /**
     * Handle File Selection
     */
    function handleFileSelect() {
        const file = fileInput.files[0];

        if (!file) {
            hideMessages();
            fileInfo.classList.remove('show');
            submitBtn.disabled = true;
            return;
        }

        // Validate file extension
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            showError(`Invalid file type. Please upload: ${allowedExtensions.join(', ').toUpperCase()}`);
            fileInput.value = '';
            return;
        }

        // Validate file size
        if (file.size > maxFileSize) {
            showError('File size exceeds 10MB limit');
            fileInput.value = '';
            return;
        }

        // Display file info
        hideMessages();
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.add('show');
        submitBtn.disabled = false;
    }

    /**
     * Format File Size
     * @param {*} bytes | size in bytes 
     * @returns formatted size string
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Show Error Message
     * @param {*} message | error message to display 
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        successMessage.classList.remove('show');
        fileInfo.classList.remove('show');
        submitBtn.disabled = true;
    }

    /**
     * Show Success Message
     * @param {*} message | success message to display
     */
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.add('show');
        errorMessage.classList.remove('show');
    }

    /**
     * Hide Messages
     */
    function hideMessages() {
        errorMessage.classList.remove('show');
        successMessage.classList.remove('show');
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) {
            showError('Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        try {
            const response = await fetch("{URL_MODEL}", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                showSuccess('File uploaded successfully!');
                console.log(result);

                ResponseDisplay.displayResponse(result);

            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            showError('Upload failed. Please try again.');
            console.error('Upload error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Generate Cards';

        }
    });
});
