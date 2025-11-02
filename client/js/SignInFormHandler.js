/**
 * Sign-In Form Handler Class
 */
class SignInFormHandler extends FormHandler {
    constructor() {
        super();
        this.initializeElements();
        this.attachEventListeners();
        this.loadRememberedUser();
        this.setupRealTimeValidation();
    }

    /**
     * Initialize Form Elements
     */
    initializeElements() {
        this.form = document.getElementById(Constants.ELEMENT_ID_SIGNIN_FORM);
        if (!this.form) return;

        this.inputs = {
            email: document.getElementById(Constants.ELEMENT_ID_EMAIL),
            password: document.getElementById(Constants.ELEMENT_ID_PASSWORD),
            rememberMe: document.getElementById(Constants.ELEMENT_ID_REMEMBER_ME)
        };

        this.messages = {
            success: document.getElementById(Constants.ELEMENT_ID_SUCCESS_MESSAGE),
            error: document.getElementById(Constants.ELEMENT_ID_GENERAL_ERROR)
        };
    }

    /**
     * Attach Event Listeners
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
     * Validate Password Field
     * @returns true if valid, false otherwise
     */
    validatePasswordField() {
        if (this.inputs.password.value.length === Constants.MIN_PASSWORD_EMPTY) {
            this.showError(Constants.ERROR_ID_PASSWORD, this.inputs.password);
            return false;
        }
        return true;
    }

    /**
     * Validate Entire Form
     * @returns true if valid, false otherwise
     */
    validateForm() {
        this.clearErrors();
        this.hideMessage(this.messages.error);
        
        return this.validateEmailField() && this.validatePasswordField();
    }

    /**
     * Retrieve Stored User from Local Storage
     * @returns stored user object or null
     */
    // getStoredUser() {
    //     const userData = localStorage.getItem(Constants.STORAGE_KEY_USER);
    //     return userData ? JSON.parse(userData) : null;
    // }

    // /**
    //  * Verify Credentials
    //  * @param {*} storedUser | stored user object
    //  * @returns true if credentials match, false otherwise
    //  */
    // verifyCredentials(storedUser) {
    //     return storedUser &&
    //            storedUser[Constants.USER_FIELD_EMAIL] === this.inputs.email.value &&
    //            storedUser[Constants.USER_FIELD_PASSWORD] === this.inputs.password.value;
    // }

    /**
     * Handle Remember Me Functionality
     */
    // handleRememberMe() {
    //     if (this.inputs.rememberMe.checked) {
    //         localStorage.setItem(Constants.STORAGE_KEY_REMEMBER_ME, Constants.STORAGE_VALUE_TRUE);
    //     }
    // }

    /**
     * Handle Successful Login
     */
    handleSuccessfulLogin() {
        this.handleRememberMe();
        this.showMessage(this.messages.success);
        this.redirectAfterDelay(Constants.PAGE_LANDING);
    }

    /**
     * Handle Failed Login
     */
    handleFailedLogin(errorMessage) {
        if (this.messages.error) {
            const errorText = this.messages.error.querySelector('p') || this.messages.error;
            errorText.textContent = errorMessage || 'Invalid email or password';
        }
        this.showMessage(this.messages.error);
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
                const response = await fetch('https://d1prj.onrender.com/signin.html', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if(!response.ok){
                    this.handleFailedLogin(result.error || 'Sign in Error');
                    return;
                }

                this.handleSuccessfulLogin({email: result.email});
            }
            catch (error) {
                console.error('Sign in error:', error);
                this.handleFailedLogin('Network Error. Please try again.');
            }
        }
    }

    /**
     * Load Remembered User Email
     */
    loadRememberedUser() {
        if (localStorage.getItem(Constants.STORAGE_KEY_REMEMBER_ME) === Constants.STORAGE_VALUE_TRUE) {
            const storedUser = this.getStoredUser();
            if (storedUser) {
                this.inputs.email.value = storedUser[Constants.USER_FIELD_EMAIL];
                this.inputs.rememberMe.checked = true;
            }
        }
    }
}
