// Shared helpers used by the catalog and cart.
function findProduct(id) {
    for (let i = 0; i < products.length; i++) {
        if (products[i].id === Number(id)) { return products[i]; }
    }
    return null;
}

function formatPrice(price) {
    return "₱" + Number(price).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Use textContent so product names and messages are never interpreted as HTML.
function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function createProductCard(product) {
    const productBox = makeElement("article", "product-card");
    const photoLink = makeElement("a", "product-photo");
    photoLink.href = "product.html?id=" + product.id;
    if (product.image) {
        const productImage = document.createElement("img");
        productImage.src = product.image;
        productImage.alt = product.name;
        productImage.loading = "lazy";
        photoLink.appendChild(productImage);
        productImage.addEventListener("error", function () {
            photoLink.textContent = "";
            photoLink.appendChild(makeElement("div", "image-placeholder", product.name + " — photo needed"));
        });
    } else {
        photoLink.appendChild(makeElement("div", "image-placeholder", product.name + " — photo needed"));
    }
    productBox.appendChild(photoLink);
    productBox.appendChild(makeElement("p", "product-price", formatPrice(product.price)));
    const productName = makeElement("h3", "product-name");
    const productNameLink = makeElement("a", "", product.name);
    productNameLink.href = photoLink.href;
    productName.appendChild(productNameLink);
    productBox.appendChild(productName);
    productBox.appendChild(makeElement("p", "availability", product.availability));
    const addButton = makeElement("button", "button add-to-cart", "ADD TO CART");
    addButton.type = "button";
    addButton.appendChild(makeElement("span", "screen-reader-only control-label", " " + product.name));
    // Add product to cart without leaving the current page.
    addButton.addEventListener("click", function () {
        if (window.ElvyCart.add(product.id, 1)) {
            window.ElvyCart.notify("Added to cart!");
        } else {
            window.ElvyCart.notify("This item cannot be added. Check availability or the quantity limit of 99 per product.");
        }
    });
    productBox.appendChild(addButton);
    return productBox;
}

// Display the featured products and their printable table.
const featuredProducts = document.querySelector("#featured-products");
if (featuredProducts) {
    const printProducts = document.querySelector("#print-products");
    for (let i = 0; i < Math.min(5, products.length); i++) {
        featuredProducts.appendChild(createProductCard(products[i]));
        const row = document.createElement("tr");
        row.appendChild(makeElement("td", "", products[i].name));
        row.appendChild(makeElement("td", "", formatPrice(products[i].price)));
        row.appendChild(makeElement("td", "", products[i].availability));
        printProducts.appendChild(row);
    }
}

// Search, category filtering and sorting keep the existing catalog behavior.
const shopProducts = document.querySelector("#shop-products");
const categoryButtons = document.querySelectorAll(".category-filter");
let selectedCategory = new URLSearchParams(window.location.search).get("category") || "All Products";
function displayShopProducts() {
    if (!shopProducts) { return; }
    const search = document.querySelector("#product-search").value.trim().toLowerCase();
    const sort = document.querySelector("#product-sort").value;
    const matchingProducts = [];
    for (let i = 0; i < products.length; i++) {
        const categoryMatches = selectedCategory === "All Products" || products[i].category === selectedCategory;
        const searchMatches = products[i].name.toLowerCase().indexOf(search) !== -1;
        if (categoryMatches && searchMatches) {
            matchingProducts.push(products[i]);
        }
    }
    if (sort === "price-low") {
        matchingProducts.sort(function (a, b) {
            return a.price - b.price;
        });
    } else if (sort === "price-high") {
        matchingProducts.sort(function (a, b) {
            return b.price - a.price;
        });
    } else if (sort === "name") {
        matchingProducts.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
    }
    shopProducts.textContent = "";
    for (let i = 0; i < matchingProducts.length; i++) {
        shopProducts.appendChild(createProductCard(matchingProducts[i]));
    }
    if (matchingProducts.length === 0) {
        shopProducts.appendChild(makeElement("p", "empty-products", "No products match this category or search. Try All Products."));
    }
    document.querySelector("#shop-title").textContent = selectedCategory.toUpperCase();
    document.querySelector("#shop-results").textContent = matchingProducts.length + " products shown";
    for (let i = 0; i < categoryButtons.length; i++) {
        const active = categoryButtons[i].textContent.trim() === selectedCategory;
        categoryButtons[i].classList.toggle("active", active);
    }
    if (window.ElvyCart) {
        window.ElvyCart.syncLinks();
    }
}

if (shopProducts) {
    for (let i = 0; i < categoryButtons.length; i++) {
        categoryButtons[i].addEventListener("click", function () {
            selectedCategory = categoryButtons[i].textContent.trim();
            displayShopProducts();
        });
    }
    document.querySelector("#product-search").addEventListener("input", displayShopProducts);
    document.querySelector("#product-sort").addEventListener("change", displayShopProducts);
    displayShopProducts();
}

// Open and close the mobile navigation, including keyboard and outside clicks.
const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.querySelector("#main-navigation");
const menuLabel = document.querySelector(".menu-label");
function closeMenu() {
    if (mobileMenu && menuButton) {
        mobileMenu.classList.remove("is-open");
        if (menuLabel) {
            menuLabel.textContent = "Open navigation menu";
        }
    }
}

if (menuButton && mobileMenu) {
    menuButton.addEventListener("click", function () {
        const isOpen = mobileMenu.classList.toggle("is-open");
        if (menuLabel) {
            if (isOpen) {
                menuLabel.textContent = "Close navigation menu";
            } else {
                menuLabel.textContent = "Open navigation menu";
            }
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && mobileMenu.classList.contains("is-open")) {
            closeMenu();
            menuButton.focus();
        }
    });
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".site-header")) {
            closeMenu();
        }
    });
    const links = mobileMenu.querySelectorAll("a");
    for (let i = 0; i < links.length; i++) {
        links[i].addEventListener("click", closeMenu);
    }
    window.addEventListener("resize", function () {
        if (window.innerWidth >= 1024) {
            closeMenu();
        }
    });
}

// Apply the red active indicator to navigation and account/cart icons.
const page = document.body.className.replace("page-", "");
let activePage = page;
if (page === "product") {
    activePage = "shop";
} else if (page === "signup" || page === "signin" || page === "profile" || page === "orders") {
    activePage = "account";
} else if (page === "checkout") {
    activePage = "cart";
}
const navigationLinks = document.querySelectorAll(".main-navigation a");
const activeLink = activePage === "home" ? "index.html" : activePage + ".html";
for (let i = 0; i < navigationLinks.length; i++) {
    navigationLinks[i].classList.toggle("active", navigationLinks[i].getAttribute("href") === activeLink);
}
const headerLinks = document.querySelectorAll(".header-actions a");
for (let i = 0; i < headerLinks.length; i++) {
    const accountLink = headerLinks[i].classList.contains("account-link");
    const cartLink = headerLinks[i].classList.contains("cart-link");
    headerLinks[i].classList.toggle("active", (activePage === "account" && accountLink) || (activePage === "cart" && cartLink));
}

// Validate the contact and repair fields.
function validateForm(form) {
    const fields = form.querySelectorAll("input, select, textarea");
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        field.setCustomValidity("");
        if (field.type === "checkbox" || field.type === "radio" || field.disabled) { continue; }
        field.value = field.value.trim();
        if (field.required && field.value === "") {
            field.setCustomValidity("Please complete this field.");
        } else if (field.value && field.minLength > 0 && field.value.length < field.minLength) {
            field.setCustomValidity("Please enter at least " + field.minLength + " characters.");
        } else if (field.type === "tel" && field.value) {
            const digits = field.value.replace(/[^0-9]/g, "");
            if (!/^\+?[0-9][0-9 -]*$/.test(field.value) || digits.length < 7 || digits.length > 15) {
                field.setCustomValidity("Enter a contact number with 7 to 15 digits. Spaces, hyphens and an initial plus sign are allowed.");
            }
        } else if (field.id === "checkout-postal" && !/^[0-9]{4}$/.test(field.value)) {
            field.setCustomValidity("Enter a 4-digit postal code.");
        }
    }
    return form.reportValidity();
}

// Remove the previous draft link when its form details change.
function clearEmailDraft(message) {
    if (message) {
        message.textContent = "";
        message.hidden = true;
    }
}

// Prepare an email. The visitor must send it in their own email application.
function prepareStoreEmail(subject, body, message) {
    const emailLink = "mailto:elvy.variety@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    message.textContent = "Your email application should open with these details. You must send the email manually. If it does not open, email elvy.variety@gmail.com using the information above. ";
    message.hidden = false;
    const openEmail = makeElement("a", "email-draft-link", "Open email app");
    openEmail.href = emailLink;
    message.appendChild(openEmail);
    window.location.href = emailLink;
}

// Contact and repair inquiries use a mailto draft, not an automatic submission.
const inquiryForms = document.querySelectorAll("#contact-form, #repair-form");
for (let i = 0; i < inquiryForms.length; i++) {
    const form = inquiryForms[i];
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        clearEmailDraft(form.querySelector("[role='status']"));
        if (!validateForm(form)) { return; }
        let message = form.querySelector("[role='status']");
        if (!message) {
            message = makeElement("p", "form-message");
            message.setAttribute("role", "status");
            form.appendChild(message);
        }
        let subject = "Elvy Variety Store — Contact Inquiry";
        let body = "";
        if (form.id === "repair-form") {
            subject = "Elvy Variety Store — Repair Inquiry";
            body = "Full name: " + document.getElementById("repair-name").value + "\n";
            body += "Contact number: " + document.getElementById("repair-phone").value + "\n";
            body += "Equipment / item: " + document.getElementById("repair-equipment").value + "\n\n";
            body += "Problem: " + document.getElementById("repair-problem").value;
        } else {
            body = "Name: " + document.getElementById("contact-name").value;
            body += "\nEmail: " + document.getElementById("contact-email").value + "\n";
            body += "Contact number: " + document.getElementById("contact-phone").value + "\n\n";
            body += "Message: " + document.getElementById("contact-message").value;
        }
        prepareStoreEmail(subject, body, message);
    });
    form.addEventListener("input", function (event) {
        if (event.target.setCustomValidity) {
            event.target.setCustomValidity("");
        }
        clearEmailDraft(form.querySelector("[role='status']"));
    });
    form.addEventListener("change", function () {
        clearEmailDraft(form.querySelector("[role='status']"));
    });
    form.addEventListener("reset", function () {
        clearEmailDraft(form.querySelector("[role='status']"));
        const fields = form.querySelectorAll("input, select, textarea");
        for (let j = 0; j < fields.length; j++) {
            fields[j].setCustomValidity("");
        }
    });
    const submitButton = document.getElementById(form.id.replace("-form", "-submit"));
    if (submitButton) {
        submitButton.disabled = false;
    }
}
