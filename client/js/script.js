document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById(Constants.ELEMENT_ID_SIGNUP_FORM)) {
        new SignUpFormHandler();
    }
    
    if (document.getElementById(Constants.ELEMENT_ID_SIGNIN_FORM)) {
        new SignInFormHandler();
    }
});
