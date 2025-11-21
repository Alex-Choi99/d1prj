const SERVER = 'http://localhost:3001/';

/**
 * Sign-Up Form Handler Class
 */
class SignUpFormHandler extends FormHandler {
    constructor() {
        super();
        this.initializeElements();
        this.attachEventListeners();
        this.setupRealTimeValidation();
    }

    /**
     * Initialize Form Elements
     * @returns 
     */
    initializeElements() {
        this.form = document.getElementById(Constants.ELEMENT_ID_SIGNUP_FORM);
        if (!this.form) return;

        this.inputs = {
            email: document.getElementById(Constants.ELEMENT_ID_EMAIL),
            password: document.getElementById(Constants.ELEMENT_ID_PASSWORD),
            confirmPassword: document.getElementById(Constants.ELEMENT_ID_CONFIRM_PASSWORD)
        };

        this.messages = {
            success: document.getElementById(Constants.ELEMENT_ID_SUCCESS_MESSAGE)
        };
    }

    /**
     * Attach Event Listeners
     * @returns 
     */
    attachEventListeners() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    /**
     * Validate Email Field
     * @returns true if valid, false otherwise
     */
    validateEmailField() {
        if (!this.validateEmail(this.inputs.email.value)) {
            this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email);
            return false;
        }
        return true;
    }

    /**
     * Validate Password
     * @returns true if valid, false otherwise
     */
    validatePassword() {
        if (this.inputs.password.value.length < Constants.MIN_PASSWORD_LENGTH) {
            this.showError(Constants.ERROR_ID_PASSWORD, this.inputs.password);
            return false;
        }
        return true;
    }

    /**
     * Validate Password Confirmation
     * @returns true if valid, false otherwise
     */
    validatePasswordConfirmation() {
        if (this.inputs.password.value !== this.inputs.confirmPassword.value) {
            this.showError(Constants.ERROR_ID_CONFIRM_PASSWORD, this.inputs.confirmPassword);
            return false;
        }
        return true;
    }

    /**
     * Validate Entire Form
     * @returns returns everything that is valid
     */
    validateForm() {
        this.clearErrors();
        
        const validations = [
            this.validateEmailField(),
            this.validatePassword(),
            this.validatePasswordConfirmation()
        ];

        return validations.every(isValid => isValid);
    }

    /**
     * Handle Form Submission
     */
    async handleSubmit() {
        if (this.validateForm()) {
            const payload = {
                email: this.inputs.email.value,
                password: this.inputs.password.value
            };

            try {
                const response = await fetch(SERVER, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (!response.ok) {
                    this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email, result.message || 'Server Error');
                    return;
                }
                // this.saveUserData(result);
                this.showMessage(this.messages.success);
                this.redirectAfterDelay(Constants.PAGE_SIGNIN);
            }
            catch (error){
                this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email, 'Network Error');
                console.error(error);
            }
        }
    }
}
