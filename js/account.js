// Sample account
// This is a frontend example. It does not create a secure account or session.
const sampleAccount = {
    email: "customer@example.com",
    password: "Sample1234",
    name: "Sample Customer",
    contact: "09XX-XXX-XXXX"
};

// Account form messages
function showAccountMessage(resultId, message, input) {
    const result = document.getElementById(resultId);
    result.textContent = message;
    result.hidden = false;
    if (input) {
        input.classList.add("input-error");
        input.focus();
    }
}

function clearAccountErrors(form) {
    const inputs = form.querySelectorAll("input");
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].classList.remove("input-error");
    }
}

// Clear an old validation error when its field is edited.
// Keep sample-account information visible when no field has an error.
function watchAccountErrors(form, resultId) {
    form.addEventListener("input", function (event) {
        if (event.target.classList.contains("input-error")) {
            event.target.classList.remove("input-error");
            const result = document.getElementById(resultId);
            result.textContent = "";
            result.hidden = true;
        }
    });
}

// Show and hide password
const passwordButtons = document.querySelectorAll(".password-toggle");
for (let i = 0; i < passwordButtons.length; i++) {
    passwordButtons[i].addEventListener("click", function () {
        const input = this.parentElement.querySelector("input");
        const label = document.querySelector('label[for="' + input.id + '"]');
        const buttonLabel = this.querySelector(".password-label");
        const icon = this.querySelector(".password-eye-icon");
        if (input.type === "password") {
            input.type = "text";
            icon.src = "images/icons/eye-closed.png";
            buttonLabel.textContent = "Hide " + label.textContent.trim().toLowerCase();
        } else {
            input.type = "password";
            icon.src = "images/icons/eye-open.png";
            buttonLabel.textContent = "Show " + label.textContent.trim().toLowerCase();
        }
        this.title = buttonLabel.textContent;
    });
}

// Check sample login
function checkLogin(event) {
    if (event) {
        event.preventDefault();
    }
    const form = document.getElementById("signin-form");
    const email = document.getElementById("signin-email");
    const password = document.getElementById("signin-password");
    clearAccountErrors(form);
    if (email.value.trim() === "") {
        showAccountMessage("signin-result", "Please enter your email address.", email);
    } else if (!email.checkValidity()) {
        showAccountMessage("signin-result", "Please enter a valid email address.", email);
    } else if (password.value === "") {
        showAccountMessage("signin-result", "Please enter your password.", password);
    } else if (email.value.trim() === sampleAccount.email && password.value === sampleAccount.password) {
        let destination = "profile.html";
        if (window.ElvyCart && typeof window.ElvyCart.url === "function") {
            destination = window.ElvyCart.url(destination);
        }
        window.location.href = destination;
    } else {
        showAccountMessage("signin-result", "Incorrect email or password.", password);
    }
    return false;
}

// Validate signup form
// The entered values stay in this form only. No account is created or submitted.
function checkSignup(event) {
    event.preventDefault();
    const form = document.getElementById("signup-form");
    const name = document.getElementById("signup-name");
    const email = document.getElementById("signup-email");
    const contact = document.getElementById("signup-contact");
    const password = document.getElementById("signup-password");
    const confirmPassword = document.getElementById("signup-confirm");
    const terms = document.getElementById("signup-terms");
    const contactDigits = contact.value.replace(/\D/g, "");
    clearAccountErrors(form);
    if (name.value.trim() === "") {
        showAccountMessage("signup-result", "Please enter your full name.", name);
    } else if (email.value.trim() === "") {
        showAccountMessage("signup-result", "Please enter your email address.", email);
    } else if (!email.checkValidity()) {
        showAccountMessage("signup-result", "Please enter a valid email address.", email);
    } else if (contact.value.trim() === "") {
        showAccountMessage("signup-result", "Please enter your contact number.", contact);
    } else if (!/^\+?[0-9][0-9 \-]{6,18}$/.test(contact.value) || contactDigits.length < 7 || contactDigits.length > 15) {
        showAccountMessage("signup-result", "Please enter a valid contact number with 7 to 15 digits.", contact);
    } else if (password.value === "") {
        showAccountMessage("signup-result", "Please enter your password.", password);
    } else if (confirmPassword.value === "") {
        showAccountMessage("signup-result", "Please confirm your password.", confirmPassword);
    } else if (password.value !== confirmPassword.value) {
        showAccountMessage("signup-result", "Your passwords do not match.", confirmPassword);
    } else if (!terms.checked) {
        showAccountMessage("signup-result", "Please check the demo acknowledgment checkbox.", terms);
    } else {
        showAccountMessage("signup-result", "New account registration is currently unavailable. You can use the Sign In page to access the sample account.");
    }
    return false;
}

// Both account forms use the same setup and field-error handling.
function prepareAccountForm(page, handler) {
    const form = document.getElementById(page + "-form");
    if (form) {
        form.addEventListener("submit", handler);
        watchAccountErrors(form, page + "-result");
        const submitButton = document.getElementById(page + "-submit");
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}
prepareAccountForm("signin", checkLogin);
prepareAccountForm("signup", checkSignup);
// Display the sample profile
const profileForm = document.getElementById("profile-form");
if (profileForm) {
    const name = document.getElementById("profile-name");
    const email = document.getElementById("profile-email");
    const contact = document.getElementById("profile-contact");
    const editButton = document.getElementById("edit-profile");
    name.value = sampleAccount.name;
    email.value = sampleAccount.email;
    contact.value = sampleAccount.contact;
    watchAccountErrors(profileForm, "profile-result");
    // Profile editing changes this page only and resets after navigation or reload.
    editButton.addEventListener("click", function () {
        if (name.disabled) {
            name.disabled = false;
            email.disabled = false;
            contact.disabled = false;
            this.textContent = "FINISH EDITING";
            showAccountMessage("profile-result", "You can edit this sample profile temporarily. Changes are not saved.");
            name.focus();
        } else if (name.value.trim() === "") {
            showAccountMessage("profile-result", "Please enter a name for the temporary profile.", name);
        } else if (email.value.trim() === "" || !email.checkValidity()) {
            showAccountMessage("profile-result", "Please enter a valid email for the temporary profile.", email);
        } else if (contact.value.trim() === "") {
            showAccountMessage("profile-result", "Please enter a contact number for the temporary profile.", contact);
        } else {
            name.disabled = true;
            email.disabled = true;
            contact.disabled = true;
            this.textContent = "EDIT PROFILE";
            clearAccountErrors(profileForm);
            showAccountMessage("profile-result", "Temporary profile changes are shown on this page only. Reloading restores the sample information.");
        }
    });
    profileForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!name.disabled) {
            editButton.click();
        }
    });
}

// Sample account menu
const accountButtons = document.querySelectorAll(".account-action");
for (let i = 0; i < accountButtons.length; i++) {
    accountButtons[i].addEventListener("click", function () {
        if (this.value === "address") {
            showAccountMessage("account-menu-message", "The sample account has no saved address.");
        } else if (this.value === "settings") {
            showAccountMessage("account-menu-message", "Account settings are unavailable for the sample account.");
        }
    });
}
