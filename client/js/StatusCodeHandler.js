/**
 * Enhanced HTTP Status Code Handler
 * Provides consistent error handling across the application
 */
class StatusCodeHandler {
    
    /**
     * Handle HTTP response and return user-friendly messages
     * @param {Response} response - Fetch API response object
     * @param {Object} data - Parsed JSON response data
     * @returns {Object} - {success: boolean, message: string, data: any}
     */
    static async handleResponse(response, data = null) {
        // Parse JSON if not already parsed
        if (!data) {
            try {
                data = await response.json();
            } catch (e) {
                data = {};
            }
        }

        const result = {
            success: response.ok,
            status: response.status,
            message: '',
            data: data
        };

        // Handle different status codes
        switch (response.status) {
            case 200:
            case 201:
                result.message = data.message || 'Operation successful';
                break;
                
            case 400:
                result.message = this.getBadRequestMessage(data);
                break;
                
            case 401:
                result.message = 'Authentication failed. Please check your credentials.';
                break;
                
            case 403:
                result.message = 'Access denied. You don\'t have permission for this action.';
                break;
                
            case 404:
                result.message = 'Requested resource not found.';
                break;
                
            case 409:
                result.message = data.message || 'Conflict: Resource already exists.';
                break;
                
            case 422:
                result.message = 'Invalid input data. Please check your information.';
                break;
                
            case 429:
                result.message = 'Too many requests. Please try again later.';
                break;
                
            case 500:
                result.message = 'Server error. Please try again later.';
                break;
                
            case 502:
                result.message = 'Service temporarily unavailable. Please try again.';
                break;
                
            case 503:
                result.message = 'Service maintenance in progress. Please try again later.';
                break;
                
            default:
                if (response.status >= 400) {
                    result.message = data.error || data.message || 'An error occurred. Please try again.';
                } else {
                    result.message = data.message || 'Operation completed';
                }
        }

        return result;
    }

    /**
     * Get specific bad request message based on error content
     * @param {Object} data - Response data
     * @returns {string} - User-friendly error message
     */
    static getBadRequestMessage(data) {
        const error = data.error || data.message || '';
        
        if (error.includes('email')) {
            return 'Please enter a valid email address.';
        }
        if (error.includes('password')) {
            return 'Password is required and must meet security requirements.';
        }
        if (error.includes('insertion failed')) {
            return 'Failed to save data. Please try again.';
        }
        
        return data.message || 'Invalid request. Please check your input.';
    }

    /**
     * Display error message to user
     * @param {string} message - Error message to display
     * @param {HTMLElement} container - Container element for the message
     */
    static displayError(message, container = null) {
        if (container) {
            container.textContent = message;
            container.style.display = 'block';
            container.classList.add('error-message');
        } else {
            // Fallback to alert if no container provided
            console.error('Error:', message);
            alert(message);
        }
    }

    /**
     * Display success message to user
     * @param {string} message - Success message to display
     * @param {HTMLElement} container - Container element for the message
     */
    static displaySuccess(message, container = null) {
        if (container) {
            container.textContent = message;
            container.style.display = 'block';
            container.classList.add('success-message');
        } else {
            console.log('Success:', message);
        }
    }

    /**
     * Make an HTTP request with proper error handling
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} - Handled response object
     */
    static async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                credentials: 'include', // Always include cookies
                ...options
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Network error:', error);
            return {
                success: false,
                status: 0,
                message: 'Network error. Please check your connection and try again.',
                data: null
            };
        }
    }
}