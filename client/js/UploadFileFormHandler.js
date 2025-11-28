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

    /**
     * Parse AI response and extract flashcards
     * @param {Object} aiResponse - The AI API response
     * @returns {Array} Array of flashcard objects
     */
    function extractFlashcards(aiResponse) {
        try {
            if (!aiResponse || !aiResponse.choices || aiResponse.choices.length === 0) {
                throw new Error('Invalid AI response structure');
            }

            let content = aiResponse.choices[0].message.content;
            console.log('Raw AI content:', content);

            // Clean up the content - remove markdown code blocks if present
            content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            content = content.trim();

            // Try multiple strategies to extract JSON
            let flashcards = null;

            // Strategy 1: Try direct JSON parse
            try {
                flashcards = JSON.parse(content);
            } catch (e) {
                console.log('Direct parse failed, trying regex extraction...');
            }

            // Strategy 2: Extract JSON array using regex
            if (!flashcards) {
                const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    try {
                        flashcards = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.log('Regex extracted JSON parse failed:', e);
                    }
                }
            }

            // Strategy 3: Try to find array brackets and extract content between them
            if (!flashcards) {
                const firstBracket = content.indexOf('[');
                const lastBracket = content.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    try {
                        const jsonStr = content.substring(firstBracket, lastBracket + 1);
                        flashcards = JSON.parse(jsonStr);
                    } catch (e) {
                        console.log('Bracket extraction parse failed:', e);
                    }
                }
            }

            if (!flashcards) {
                console.error('All parsing strategies failed. Content:', content);
                throw new Error('Could not extract JSON from AI response');
            }

            // Validate flashcard structure
            if (!Array.isArray(flashcards)) {
                throw new Error('Parsed data is not an array');
            }

            // Filter and validate cards
            const validCards = flashcards.filter(card => {
                if (!card || typeof card !== 'object') return false;
                if (!card.question || !card.answer) return false;
                if (typeof card.question !== 'string' || typeof card.answer !== 'string') return false;
                return card.question.trim() !== '' && card.answer.trim() !== '';
            });

            if (validCards.length === 0) {
                throw new Error('No valid flashcards found in the response');
            }

            console.log(`Successfully extracted ${validCards.length} valid flashcards`);
            return validCards;

        } catch (error) {
            console.error('Error extracting flashcards:', error);
            console.error('Full error details:', error.stack);
            throw new Error('Failed to parse flashcards from AI response: ' + error.message);
        }
    }

    /**
     * Save flashcards to database
     * @param {Object} aiResponse - The AI response containing flashcards
     * @param {string} fileName - Name of the uploaded file
     */
    async function parseAndSaveFlashcards(aiResponse, fileName) {
        try {
            // Extract flashcards from AI response
            const flashcards = extractFlashcards(aiResponse);

            if (flashcards.length === 0) {
                throw new Error('No valid flashcards found');
            }

            // Show preview of generated cards
            console.log('Generated flashcards:', flashcards);

            // Create card group name from file name
            const groupName = fileName.replace(/\.[^/.]+$/, '') + ' - Flashcards';
            const timestamp = new Date().toLocaleDateString();

            // Prepare data for server
            const cardGroupData = {
                name: groupName,
                description: `Generated from ${fileName} on ${timestamp}`,
                cards: flashcards
            };

            console.log('Saving card group:', cardGroupData);

            // Check if user is logged in
            const isLoggedIn = sessionStorage.getItem('isLoggedIn');
            console.log('Is logged in:', isLoggedIn);
            
            if (!isLoggedIn || isLoggedIn !== 'true') {
                throw new Error('You must be logged in to save flashcards. Please sign in and try again.');
            }

            // Send to server using Constants URL
            const serverUrl = Constants.URL_SERVER.replace(/\/+$/, '');
            console.log('Sending to:', `${serverUrl}/create-card-group`);
            
            const response = await fetch(`${serverUrl}/create-card-group`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Send cookies for authentication
                body: JSON.stringify(cardGroupData)
            });

            const result = await response.json();
            console.log('Server response:', response.status, result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save flashcards');
            }

            console.log('Flashcards saved successfully:', result);
            showSuccess(`Success! ${result.cardsCreated} flashcards saved. Go to Study page to review them!`);

        } catch (error) {
            console.error('Error saving flashcards:', error);
            
            // More detailed error message
            let errorMsg = 'Failed to save: ' + error.message;
            if (error.message.includes('parse')) {
                errorMsg = 'The AI response format was unexpected. Please try again.';
            } else if (error.message.includes('authenticated') || error.message.includes('logged in')) {
                errorMsg = error.message;
            }
            
            showError(errorMsg);
            
            // Still show the flashcards in ResponseDisplay even if save failed
            // so user can see what was generated
        }
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
        submitBtn.textContent = 'Uploading & Generating...';
        hideMessages();

        try {
            // Step 1: Upload and generate cards
            const response = await fetch("https://d1prj-model.onrender.com/upload", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to generate flashcards from AI');
            }

            const result = await response.json();
            console.log('AI Response received:', result);

            // Step 2: Parse and save flashcards
            submitBtn.textContent = 'Saving cards...';
            await parseAndSaveFlashcards(result, file.name);

            // Step 3: Display the cards
            ResponseDisplay.displayResponse(result);

        } catch (error) {
            console.error('Upload error:', error);
            showError(`Error: ${error.message}. Please try again.`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Generate Cards';
        }
    });
});
