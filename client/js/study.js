/**
 * Study Page - Flashcard Review System
 */

class StudyPage {
    constructor() {
        this.groups = [];
        this.currentCard = null;
        this.SERVER_URL = Constants.URL_SERVER.replace(/\/+$/, '');
        
        this.elements = {
            loadingMessage: document.getElementById('loadingMessage'),
            errorMessage: document.getElementById('errorMessage'),
            cardGroupsList: document.getElementById('cardGroupsList'),
            noGroupsMessage: document.getElementById('noGroupsMessage'),
            explanationModal: document.getElementById('explanationModal'),
            explanationContent: document.getElementById('explanationContent'),
            difficultySelect: document.getElementById('difficultySelect'),
            regenerateBtn: document.getElementById('regenerateExplanationBtn')
        };

        // Debug: Check if elements are found
        console.log('Elements initialized:', {
            regenerateBtn: this.elements.regenerateBtn,
            difficultySelect: this.elements.difficultySelect,
            explanationModal: this.elements.explanationModal
        });

        this.loadCardGroups();
        this.attachModalListeners();
    }

    /**
     * Load all card groups for the user
     */
    async loadCardGroups() {
        this.elements.loadingMessage.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
        this.elements.cardGroupsList.style.display = 'none';
        this.elements.noGroupsMessage.style.display = 'none';

        try {
            console.log('Loading card groups from:', `${this.SERVER_URL}/card-groups`);
            console.log('Session storage:', {
                isLoggedIn: sessionStorage.getItem('isLoggedIn'),
                userEmail: sessionStorage.getItem('userEmail')
            });

            const response = await fetch(`${this.SERVER_URL}/card-groups`, {
                credentials: 'include' // Important: send cookies
            });
            
            console.log('Response status:', response.status);
            
            const result = await response.json();
            console.log('Response data:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load card groups');
            }

            this.groups = result.groups;
            this.elements.loadingMessage.style.display = 'none';

            if (this.groups.length === 0) {
                this.elements.noGroupsMessage.style.display = 'block';
            } else {
                this.renderCardGroups();
                this.elements.cardGroupsList.style.display = 'block';
            }
        } catch (error) {
            console.error('Load card groups error:', error);
            this.elements.loadingMessage.style.display = 'none';
            this.elements.errorMessage.textContent = 'Failed to load flashcards. Please try again.';
            this.elements.errorMessage.style.display = 'block';
        }
    }

    /**
     * Render all card groups
     */
    renderCardGroups() {
        this.elements.cardGroupsList.innerHTML = '';

        this.groups.forEach(group => {
            const groupElement = this.createGroupElement(group);
            this.elements.cardGroupsList.appendChild(groupElement);
        });
    }

    /**
     * Create a group element with its cards
     */
    createGroupElement(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'card-group';
        groupDiv.dataset.groupId = group.id;

        const header = document.createElement('div');
        header.className = 'group-header';
        header.innerHTML = `
            <div class="group-info">
                <h2>${this.escapeHtml(group.name)}</h2>
                ${group.description ? `<p class="group-description">${this.escapeHtml(group.description)}</p>` : ''}
                <p class="group-meta">${group.cards.length} cards • Created ${new Date(group.created_at).toLocaleDateString()}</p>
            </div>
            <button class="btn-toggle" onclick="studyPage.toggleGroup(${group.id})">
                <span class="toggle-icon">▼</span>
            </button>
        `;

        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'cards-container';
        cardsContainer.id = `group-${group.id}-cards`;

        if (group.cards.length === 0) {
            cardsContainer.innerHTML = '<p class="no-cards">No cards in this group</p>';
        } else {
            group.cards.forEach(card => {
                const cardElement = this.createCardElement(card);
                cardsContainer.appendChild(cardElement);
            });
        }

        groupDiv.appendChild(header);
        groupDiv.appendChild(cardsContainer);

        return groupDiv;
    }

    /**
     * Create a flashcard element
     */
    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'flashcard';
        cardDiv.dataset.cardId = card.id;

        const cardInner = document.createElement('div');
        cardInner.className = 'flashcard-inner';

        // Front side (Question)
        const frontSide = document.createElement('div');
        frontSide.className = 'flashcard-front';
        frontSide.innerHTML = `
            <div class="card-label">Question</div>
            <div class="card-content">${this.escapeHtml(card.question)}</div>
        `;

        // Back side (Answer + Explanation)
        const backSide = document.createElement('div');
        backSide.className = 'flashcard-back';
        
        let explanationHtml = '';
        if (card.explanation_text) {
            explanationHtml = `
                <div class="explanation-section">
                    <div class="explanation-header">
                        <span class="explanation-badge">${card.explanation_difficulty || 'medium'}</span>
                        <span class="explanation-label">AI Explanation</span>
                    </div>
                    <div class="explanation-text">${this.escapeHtml(card.explanation_text)}</div>
                </div>
            `;
        }

        backSide.innerHTML = `
            <div class="card-label">Answer</div>
            <div class="card-content">${this.escapeHtml(card.answer)}</div>
            ${explanationHtml}
            <button class="btn btn-explanation" onclick="studyPage.requestExplanation(${card.id})">
                ${card.explanation_text ? '🔄 Regenerate Explanation' : '💡 Get AI Explanation'}
            </button>
        `;

        cardInner.appendChild(frontSide);
        cardInner.appendChild(backSide);
        cardDiv.appendChild(cardInner);

        // Add click to flip
        cardDiv.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-explanation')) {
                cardDiv.classList.toggle('flipped');
            }
        });

        return cardDiv;
    }

    /**
     * Toggle group expansion
     */
    toggleGroup(groupId) {
        const container = document.getElementById(`group-${groupId}-cards`);
        const groupDiv = document.querySelector(`[data-group-id="${groupId}"]`);
        const icon = groupDiv.querySelector('.toggle-icon');

        if (container.style.display === 'none') {
            container.style.display = 'grid';
            icon.textContent = '▼';
            groupDiv.classList.remove('collapsed');
        } else {
            container.style.display = 'none';
            icon.textContent = '▶';
            groupDiv.classList.add('collapsed');
        }
    }

    /**
     * Request explanation for a card
     */
    async requestExplanation(cardId) {
        console.log('Requesting explanation for card:', cardId);
        this.currentCard = cardId;
        const difficulty = this.elements.difficultySelect.value;
        console.log('Selected difficulty:', difficulty);

        // Show modal
        this.elements.explanationModal.style.display = 'flex';
        this.elements.explanationContent.innerHTML = '<p class="loading">Generating explanation...</p>';

        try {
            const response = await fetch(`${this.SERVER_URL}/generate-explanation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important: include cookies for authentication
                body: JSON.stringify({ cardId, difficulty })
            });

            const result = await response.json();
            console.log('Server response:', result);

            if (!response.ok) {
                console.error('Server error:', response.status, result);
                throw new Error(result.error || 'Failed to generate explanation');
            }

            // Display explanation
            this.elements.explanationContent.innerHTML = `
                <div class="explanation-result">
                    <span class="difficulty-badge difficulty-${difficulty}">${difficulty}</span>
                    <p>${this.escapeHtml(result.explanation)}</p>
                </div>
            `;

            console.log('Explanation generated successfully');
            // Reload the card to show the new explanation
            await this.loadCardGroups();
        } catch (error) {
            console.error('Generate explanation error:', error);
            this.elements.explanationContent.innerHTML = `
                <p class="error-text">Failed to generate explanation: ${error.message}</p>
            `;
        }
    }

    /**
     * Attach modal event listeners
     */
    attachModalListeners() {
        if (this.elements.regenerateBtn) {
            this.elements.regenerateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Regenerate button clicked, currentCard:', this.currentCard);
                
                if (this.currentCard) {
                    this.requestExplanation(this.currentCard);
                } else {
                    console.error('No current card selected for regeneration');
                    alert('Please select a card first');
                }
            });
            console.log('Regenerate button listener attached successfully');
        } else {
            console.error('Regenerate button element not found!');
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Close explanation modal
 */
function closeExplanationModal() {
    document.getElementById('explanationModal').style.display = 'none';
}

/**
 * Test function for regenerate button (can be called from console)
 */
function testRegenerateButton() {
    console.log('Testing regenerate button...');
    if (studyPage && studyPage.currentCard) {
        console.log('Current card:', studyPage.currentCard);
        studyPage.requestExplanation(studyPage.currentCard);
    } else {
        console.log('No study page or current card available');
    }
}

// Initialize on page load
let studyPage;
document.addEventListener('DOMContentLoaded', () => {
    Auth.requireLogin();
    studyPage = new StudyPage();
});
