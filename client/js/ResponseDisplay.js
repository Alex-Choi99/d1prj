/**
 * Handles displaying API responses
 */
class ResponseDisplay {

    /**
     * Display the AI response on the page
     * @param {Object} response - The API response object
     */
    static displayResponse(response) {
        const responseContainer = document.getElementById('responseContainer');
        const responseContent = document.getElementById('responseContent');

        if (!response || !response.choices || response.choices.length === 0) {
            this.showError('No response received from AI');
            return;
        }

        // Extract the assistant's message
        const message = response.choices[0].message.content;

        // Clear previous content
        responseContent.innerHTML = '';

        // Create response elements
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message';
        messageDiv.textContent = message;

        // Add metadata
        const metaDiv = document.createElement('div');
        metaDiv.className = 'response-meta';
        metaDiv.innerHTML = `
            <small>
                Model: ${response.model} | 
                Tokens used: ${response.usage.total_tokens} 
                (${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion)
            </small>
        `;

        responseContent.appendChild(messageDiv);
        responseContent.appendChild(metaDiv);

        // Show the container
        responseContainer.style.display = 'block';

        // Scroll to response
        responseContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    static showError(message) {
        const responseContainer = document.getElementById('responseContainer');
        const responseContent = document.getElementById('responseContent');

        responseContent.innerHTML = `
            <div class="error-message show">
                ${message}
            </div>
        `;

        responseContainer.style.display = 'block';
    }

    /**
     * Hide the response container
     */
    static hideResponse() {
        const responseContainer = document.getElementById('responseContainer');
        responseContainer.style.display = 'none';
    }
}
