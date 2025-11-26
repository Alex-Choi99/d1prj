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

        // Try to parse flashcards
        try {
            const jsonMatch = message.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                const flashcards = JSON.parse(jsonMatch[0]);
                if (Array.isArray(flashcards) && flashcards.length > 0) {
                    this.displayFlashcards(flashcards, responseContent);
                    
                    // Add metadata
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'response-meta';
                    metaDiv.innerHTML = `
                        <small>
                            Generated ${flashcards.length} flashcards | 
                            Model: ${response.model} | 
                            Tokens: ${response.usage.total_tokens}
                        </small>
                    `;
                    responseContent.appendChild(metaDiv);
                    
                    responseContainer.style.display = 'block';
                    responseContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    return;
                }
            }
        } catch (e) {
            console.log('Not flashcard format, displaying as text');
        }

        // Fallback: display as plain text
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
     * Display flashcards in a user-friendly format
     * @param {Array} flashcards - Array of flashcard objects
     * @param {HTMLElement} container - Container element to append to
     */
    static displayFlashcards(flashcards, container) {
        const flashcardsTitle = document.createElement('h3');
        flashcardsTitle.textContent = 'Generated Flashcards';
        flashcardsTitle.style.marginBottom = '15px';
        container.appendChild(flashcardsTitle);

        flashcards.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'flashcard-preview';
            cardDiv.style.cssText = `
                background: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 15px;
                margin-bottom: 15px;
                border-radius: 5px;
            `;

            const questionDiv = document.createElement('div');
            questionDiv.style.cssText = 'font-weight: bold; color: #333; margin-bottom: 8px;';
            questionDiv.innerHTML = `<strong>Q${index + 1}:</strong> ${card.question}`;

            const answerDiv = document.createElement('div');
            answerDiv.style.cssText = 'color: #666; padding-left: 20px;';
            answerDiv.innerHTML = `<strong>A:</strong> ${card.answer}`;

            cardDiv.appendChild(questionDiv);
            cardDiv.appendChild(answerDiv);
            container.appendChild(cardDiv);
        });
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
