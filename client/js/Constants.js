/**
 * Constants Class - No Magic Numbers or Strings
 */
class Constants {
    static MIN_NAME_LENGTH = 2;
    static MIN_PASSWORD_LENGTH = 8;
    static MIN_PASSWORD_EMPTY = 0;
    static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    static REDIRECT_DELAY = 2000;

    static STORAGE_KEY_USER = 'user';
    static STORAGE_KEY_REMEMBER_ME = 'rememberMe';

    static STORAGE_VALUE_TRUE = 'true';

    static ELEMENT_ID_SIGNUP_FORM = 'signupForm';
    static ELEMENT_ID_SIGNIN_FORM = 'signinForm';
    static ELEMENT_ID_EMAIL = 'email';
    static ELEMENT_ID_PASSWORD = 'password';
    static ELEMENT_ID_CONFIRM_PASSWORD = 'confirmPassword';
    static ELEMENT_ID_REMEMBER_ME = 'rememberMe';
    static ELEMENT_ID_SUCCESS_MESSAGE = 'successMessage';
    static ELEMENT_ID_GENERAL_ERROR = 'generalError';

    static ERROR_ID_NAME = 'nameError';
    static ERROR_ID_EMAIL = 'emailError';
    static ERROR_ID_PASSWORD = 'passwordError';
    static ERROR_ID_CONFIRM_PASSWORD = 'confirmPasswordError';

    static CSS_CLASS_SHOW = 'show';
    static CSS_CLASS_ERROR = 'error';
    static CSS_SELECTOR_ERROR_MESSAGE = '.error-message';

    static PAGE_SIGNIN = 'signin.html';
    static PAGE_LANDING = 'index.html';

    static USER_FIELD_EMAIL = 'email';
    static USER_FIELD_PASSWORD = 'password';

    static ERROR_SUFFIX = 'Error';
    static SERVER_URL = 'https://d1prj.onrender.com';
}
