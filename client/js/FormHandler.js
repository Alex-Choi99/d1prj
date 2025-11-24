/**
 * Abstract Form Handler Class
 */
class FormHandler {
    constructor() {
        this.form = null;
        this.inputs = {};
        this.messages = {};
    }

    /**
     * Validate Email Format
     * @param {*} email | email string to validate
     * @returns true if email is valid, false otherwise
     */
    validateEmail(email) {
        return Constants.EMAIL_REGEX.test(email);
    }

    /**
     * Show Error Message and Highlight Input
     * @param {*} errorId | ID of the error message element
     * @param {*} inputElement | input element to highlight
     * @param {*} customMessage | optional custom error message
     */
    showError(errorId, inputElement, customMessage = null) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            if (customMessage) {
                errorElement.textContent = customMessage;
            }
            errorElement.classList.add(Constants.CSS_CLASS_SHOW);
        }
        if (inputElement) {
            inputElement.classList.add(Constants.CSS_CLASS_ERROR);
        }
    }

    /**
     * Clear All Error Messages and Input Highlights
     */
    clearErrors() {
        const errorMessages = document.querySelectorAll(Constants.CSS_SELECTOR_ERROR_MESSAGE);
        const inputs = document.querySelectorAll('input');

        errorMessages.forEach(error => error.classList.remove(Constants.CSS_CLASS_SHOW));
        inputs.forEach(input => input.classList.remove(Constants.CSS_CLASS_ERROR));
    }

    /**
     * Hide Message Element
     * @param {*} messageElement | message element to hide
     */
    hideMessage(messageElement) {
        if (messageElement) {
            messageElement.classList.remove(Constants.CSS_CLASS_SHOW);
        }
    }

    /**
     * Show Message Element
     * @param {*} messageElement | message element to show
     */
    showMessage(messageElement) {
        if (messageElement) {
            messageElement.classList.add(Constants.CSS_CLASS_SHOW);
        }
    }

    /**
     * Redirect After Delay
     * @param {*} url | URL to redirect to
     */
    redirectAfterDelay(url) {
        setTimeout(() => {
            window.location.href = url;
        }, Constants.REDIRECT_DELAY);
    }

    /**
     * Setup Real-Time Validation on Input Fields
     */
    setupRealTimeValidation() {
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                if (input.classList.contains(Constants.CSS_CLASS_ERROR)) {
                    input.classList.remove(Constants.CSS_CLASS_ERROR);
                    const errorId = input.id + Constants.ERROR_SUFFIX;
                    const errorElement = document.getElementById(errorId);
                    if (errorElement) {
                        errorElement.classList.remove(Constants.CSS_CLASS_SHOW);
                    }
                }
            });
        });
    }
}
