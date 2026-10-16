// Cart items travel in the URL. No personal information or browser storage is used.
var elvyCartItems = [];
var elvyCartQuantityLimit = 99;
var elvyCartNoticeTimer;

// Create one small confirmation for all Add to Cart buttons on this page.
function elvyCartInitConfirmation() {
    var message = document.getElementById("cart-notification");
    if (!message) {
        message = makeElement("div", "cart-notification");
        message.id = "cart-notification";
        document.body.appendChild(message);
    }
    return message;
}

// Keep the confirmation visible for three seconds after the last click.
function elvyCartShowConfirmation(text) {
    var message = elvyCartInitConfirmation();
    window.clearTimeout(elvyCartNoticeTimer);
    message.textContent = text;
    message.classList.add("is-visible");
    elvyCartNoticeTimer = window.setTimeout(function () {
        message.classList.remove("is-visible");
        message.textContent = "";
    }, 3000);
}

// Accept only products that are still in the owner's product list.
function elvyCartProduct(id) {
    var product = findProduct(Number(id));
    if (!product || !isFinite(Number(product.price)) || Number(product.price) < 0) { return null; }
    return product;
}

// Check a whole-number quantity before changing the cart.
function elvyCartValidQuantity(value) {
    var quantity = Number(value);
    return Math.floor(quantity) === quantity && quantity >= 1 && quantity <= elvyCartQuantityLimit;
}

// Find an item already in the cart.
function elvyCartFindItem(id) {
    for (var i = 0; i < elvyCartItems.length; i++) {
        if (elvyCartItems[i].id === Number(id)) { return elvyCartItems[i]; }
    }
    return null;
}

// Read known product IDs, quantities, and selections from the current URL.
function elvyCartReadUrl() {
    var value = new URLSearchParams(window.location.search).get("cart") || "";
    if (!value || value.length > 4000) { return; }
    var entries = value.split(",");
    for (var i = 0; i < entries.length; i++) {
        if (!/^[1-9][0-9]*:[1-9][0-9]*:[01]$/.test(entries[i])) { continue; }
        var parts = entries[i].split(":");
        var id = Number(parts[0]);
        var quantity = Number(parts[1]);
        var selected = parts[2] === "1";
        if (!elvyCartProduct(id) || !elvyCartValidQuantity(quantity)) { continue; }
        var existing = elvyCartFindItem(id);
        if (existing) {
            existing.quantity = Math.min(elvyCartQuantityLimit, existing.quantity + quantity);
            existing.selected = existing.selected || selected;
        } else {
            elvyCartItems.push({ id: id, quantity: quantity, selected: selected });
        }
    }
}

// Return copies so other page controls cannot change cart items accidentally.
function elvyCartGetItems() {
    var result = [];
    for (var i = 0; i < elvyCartItems.length; i++) {
        var item = elvyCartItems[i];
        result.push({ id: item.id, quantity: item.quantity, selected: item.selected });
    }
    return result;
}

// Encode only product ID, quantity, and selection for page navigation.
function elvyCartValue() {
    var entries = [];
    for (var i = 0; i < elvyCartItems.length; i++) {
        var item = elvyCartItems[i];
        entries.push(item.id + ":" + item.quantity + ":" + (item.selected ? "1" : "0"));
    }
    return entries.join(",");
}

// Add the current cart to a local HTML link without changing its other parameters.
function elvyCartWithCartUrl(href) {
    var url;
    try {
        url = new URL(href, window.location.href);
    } catch (error) {
        return href;
    }
    if (url.origin !== window.location.origin || url.protocol !== window.location.protocol || !/\.html$/i.test(url.pathname)) {
        return href;
    }
    return elvyCartWriteUrl(url);
}

// Write only product metadata while preserving the other query parameters and hash.
function elvyCartWriteUrl(url) {
    var value = elvyCartValue();
    if (value) {
        url.searchParams.set("cart", value);
    } else {
        url.searchParams.delete("cart");
    }
    return url.href;
}

// Update local page links whenever items change.
function elvyCartSyncLinks() {
    var links = document.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href");
        if (href && href.charAt(0) !== "#") {
            links[i].href = elvyCartWithCartUrl(href);
        }
    }
}

// Update cart badge and its accessible label.
function elvyCartRenderBadge() {
    var quantity = elvyCartCalculateTotal(false).quantity;
    var badges = document.querySelectorAll(".cart-count");
    var labels = document.querySelectorAll(".cart-label");
    for (var i = 0; i < badges.length; i++) {
        badges[i].textContent = quantity;
        badges[i].hidden = quantity === 0;
    }
    for (var j = 0; j < labels.length; j++) {
        labels[j].textContent = "Cart, " + quantity + (quantity === 1 ? " item" : " items");
    }
}

// Use one calculation for all units or only the selected order items.
function elvyCartCalculateTotal(selectedOnly) {
    var result = { quantity: 0, subtotal: 0 };
    for (var i = 0; i < elvyCartItems.length; i++) {
        var item = elvyCartItems[i];
        var product = elvyCartProduct(item.id);
        if (!selectedOnly || (item.selected && product)) {
            result.quantity += item.quantity;
            if (product) {
                result.subtotal += Number(product.price) * item.quantity;
            }
        }
    }
    return result;
}

// Check the catalog's availability label. The store must confirm current stock.
function elvyCartCanAdd(product) {
    var availability = String(product.availability || "").toLowerCase();
    return product.available !== false && availability.indexOf("out of stock") === -1 && availability.indexOf("unavailable") === -1;
}

// Refresh the page URL, links, badge, and visible cart summaries.
function elvyCartChanged() {
    var url = elvyCartWriteUrl(new URL(window.location.href));
    // Some local-file browsers restrict history; website links still carry the cart.
    try {
        window.history.replaceState(null, "", url);
    } catch (error) {
        var note = document.getElementById("cart-navigation-note");
        if (note) {
            note.textContent = "Keep using the website links to carry your cart. Reloading this page may restore the previous quantities in this browser.";
        }
    }
    elvyCartSyncLinks();
    elvyCartRenderBadge();
    elvyCartRenderCart();
    elvyCartRenderCheckout();
}

// Add product to cart or increase the quantity of an existing product.
function elvyCartAdd(id, quantity) {
    var product = elvyCartProduct(id);
    if (quantity === undefined) {
        quantity = 1;
    }
    quantity = Number(quantity);
    if (!product || !elvyCartCanAdd(product) || !elvyCartValidQuantity(quantity)) { return false; }
    var existing = elvyCartFindItem(product.id);
    if (existing) {
        if (existing.quantity + quantity > elvyCartQuantityLimit) { return false; }
        existing.quantity += quantity;
        existing.selected = true;
    } else {
        elvyCartItems.push({ id: product.id, quantity: quantity, selected: true });
    }
    elvyCartChanged();
    return true;
}

// Change one product's quantity without changing the other items.
function elvyCartSetQuantity(id, quantity) {
    var item = elvyCartFindItem(id);
    quantity = Number(quantity);
    if (!item || !elvyCartValidQuantity(quantity)) { return false; }
    item.quantity = quantity;
    elvyCartChanged();
    return true;
}

// Remove only the requested product.
function elvyCartRemove(id) {
    var item = elvyCartFindItem(id);
    if (item) {
        elvyCartItems.splice(elvyCartItems.indexOf(item), 1);
    }
    elvyCartChanged();
    return item !== null;
}

// Select or deselect a product for checkout.
function elvyCartSetSelected(id, selected) {
    var item = elvyCartFindItem(id);
    if (!item || typeof selected !== "boolean") { return false; }
    item.selected = selected;
    elvyCartChanged();
    return true;
}

// Use the real image path or a labeled replacement when a photo is missing.
function elvyCartPhoto(container, product) {
    container.textContent = "";
    function showPlaceholder() {
        container.textContent = "";
        var placeholder = elvyCartAppend(container, "div", "image-placeholder");
        elvyCartAppend(placeholder, "span", "", product.name);
        elvyCartAppend(placeholder, "small", "", "Product photo needed");
    }
    if (product.image) {
        var image = elvyCartAppend(container, "img", "");
        image.src = product.image;
        image.alt = product.name;
        image.addEventListener("error", showPlaceholder);
    } else {
        showPlaceholder();
    }
}

// These small helpers build ordinary elements, labels, prices and buttons.
function elvyCartAppend(parent, tag, className, text) {
    var element = makeElement(tag, className, text);
    parent.appendChild(element);
    return element;
}

function elvyCartPrice(parent, className, label, value) {
    var price = elvyCartAppend(parent, "p", className);
    elvyCartAppend(price, "span", "screen-reader-only", label);
    elvyCartAppend(price, "strong", "", formatPrice(value));
}

function elvyCartButton(parent, item, action, text, label) {
    var button = elvyCartAppend(parent, "button", "cart-action", text);
    button.type = "button";
    button.id = "cart-" + action + "-" + item.id;
    button.name = action;
    elvyCartAppend(button, "span", "screen-reader-only", " " + label);
    return button;
}

// Build one cart row using the existing responsive card styles.
function elvyCartCreateRow(item) {
    var product = elvyCartProduct(item.id);
    var row = makeElement("article", "cart-item");
    var group = elvyCartAppend(row, "div", "cart-product-group");
    var selected = elvyCartAppend(group, "input", "cart-selected form-choice cart-action");
    selected.type = "checkbox";
    selected.id = "cart-selected-" + item.id;
    selected.checked = item.selected;
    selected.name = "select";
    var selectionLabel = elvyCartAppend(group, "label", "screen-reader-only", "Select " + product.name + " for checkout");
    selectionLabel.setAttribute("for", selected.id);
    var photo = elvyCartAppend(group, "div", "cart-product-image commerce-product-image");
    elvyCartPhoto(photo, product);
    var copy = elvyCartAppend(group, "div", "cart-product-copy");
    var title = elvyCartAppend(copy, "h2", "");
    title.id = "cart-product-name-" + item.id;
    var link = elvyCartAppend(title, "a", "", product.name);
    link.href = elvyCartWithCartUrl("product.html?id=" + item.id);
    elvyCartAppend(copy, "p", "commerce-stock", product.availability || "Contact the store for availability");
    elvyCartPrice(copy, "cart-mobile-price", "Unit price: ", product.price);
    elvyCartPrice(row, "cart-item-price", "Unit price: ", product.price);
    var quantity = elvyCartAppend(row, "div", "quantity-control cart-quantity");
    var decrease = elvyCartButton(quantity, item, "decrease", "−", "Decrease quantity of " + product.name);
    decrease.disabled = item.quantity === 1;
    var input = elvyCartAppend(quantity, "input", "form-input quantity-input cart-action");
    input.type = "number";
    input.id = "cart-quantity-" + item.id;
    input.min = 1;
    input.max = elvyCartQuantityLimit;
    input.step = 1;
    input.value = item.quantity;
    input.name = "quantity";
    var quantityLabel = elvyCartAppend(quantity, "label", "screen-reader-only", "Quantity of " + product.name);
    quantityLabel.setAttribute("for", input.id);
    var increase = elvyCartButton(quantity, item, "increase", "+", "Increase quantity of " + product.name);
    increase.disabled = item.quantity === elvyCartQuantityLimit;
    elvyCartPrice(row, "cart-item-subtotal", "Item subtotal: ", Number(product.price) * item.quantity);
    var remove = elvyCartButton(row, item, "remove", "Remove", product.name + " from cart");
    remove.className = "cart-remove cart-action";
    return row;
}

// Display every cart item and calculate the selected order summary.
function elvyCartRenderCart() {
    var container = document.getElementById("cart-items");
    if (!container) { return; }
    container.textContent = "";
    for (var i = 0; i < elvyCartItems.length; i++) {
        container.appendChild(elvyCartCreateRow(elvyCartItems[i]));
    }
    var empty = elvyCartItems.length === 0;
    document.getElementById("cart-empty").hidden = !empty;
    document.getElementById("cart-column-labels").hidden = empty;
    var summary = elvyCartCalculateTotal(true);
    document.getElementById("cart-selected-count").textContent = summary.quantity;
    document.getElementById("cart-summary-subtotal").textContent = formatPrice(summary.subtotal);
    document.getElementById("cart-total").textContent = formatPrice(summary.subtotal);
    var checkout = document.getElementById("cart-checkout");
    checkout.textContent = "CHECKOUT (" + summary.quantity + ")";
    checkout.disabled = summary.quantity === 0;
}

// Report errors in the cart without claiming an order was sent.
function elvyCartMessage(text) {
    var message = document.getElementById("cart-message");
    if (message) {
        message.textContent = text;
        message.hidden = false;
    }
}

// Connect row controls once; newly rendered rows use the same listeners.
function elvyCartInitCart() {
    var container = document.getElementById("cart-items");
    if (!container || container.cartReady) { return; }
    container.cartReady = true;
    container.addEventListener("click", elvyCartRowAction);
    container.addEventListener("change", elvyCartRowAction);
    document.getElementById("cart-checkout").addEventListener("click", function () {
        if (elvyCartCalculateTotal(true).quantity > 0) {
            window.location.href = elvyCartWithCartUrl("checkout.html");
        }
    });
    elvyCartRenderCart();
}

// One row handler also works for the replacement rows after a quantity changes.
function elvyCartRowAction(event) {
    var container = document.getElementById("cart-items");
    var control = event.target.closest(".cart-action");
    if (!control || !container.contains(control)) { return; }
    var parts = control.id.split("-");
    var id = Number(parts[parts.length - 1]);
    var item = elvyCartFindItem(id);
    if (!item) { return; }
    var action = control.name;
    var keepFocus = event.type === "click" || document.activeElement === control;
    var changed = false;
    if (event.type === "click" && action === "remove") {
        var name = elvyCartProduct(id).name;
        elvyCartRemove(id);
        elvyCartMessage(name + " removed from your cart.");
        var nextLink = container.querySelector("a") || document.querySelector("#cart-empty a");
        if (nextLink) {
            nextLink.focus();
        }
        return;
    } else if (event.type === "click" && (action === "increase" || action === "decrease")) {
        changed = elvyCartSetQuantity(id, item.quantity + (action === "increase" ? 1 : -1));
    } else if (event.type === "change" && action === "select") {
        changed = elvyCartSetSelected(id, control.checked);
    } else if (event.type === "change" && action === "quantity") {
        changed = elvyCartSetQuantity(id, control.value);
        if (!changed) {
            control.value = item.quantity;
            elvyCartMessage("Use a whole-number quantity from 1 to " + elvyCartQuantityLimit + ".");
        }
    }
    if (changed) {
        var message = document.getElementById("cart-message");
        message.textContent = "";
        message.hidden = true;
    }
    // Keep keyboard focus after rendering, but do not steal it when someone tabs away.
    if (changed && keepFocus) {
        var replacement = document.getElementById(control.id);
        if (replacement && replacement.disabled) {
            replacement = document.getElementById("cart-quantity-" + id);
        }
        if (replacement) {
            replacement.focus();
        }
    }
}

// Show every selected product in the checkout summary.
function elvyCartRenderCheckout() {
    var container = document.getElementById("checkout-products");
    if (!container) { return; }
    container.textContent = "";
    for (var i = 0; i < elvyCartItems.length; i++) {
        var item = elvyCartItems[i];
        var product = elvyCartProduct(item.id);
        if (item.selected && product) {
            var row = elvyCartAppend(container, "div", "checkout-product");
            var photo = elvyCartAppend(row, "div", "checkout-product-image commerce-product-image");
            elvyCartPhoto(photo, product);
            var copy = elvyCartAppend(row, "div", "");
            elvyCartAppend(copy, "h3", "", product.name);
            elvyCartAppend(copy, "p", "", "Qty: " + item.quantity);
            elvyCartAppend(copy, "p", "", "Unit price: " + formatPrice(product.price));
            elvyCartAppend(copy, "strong", "", formatPrice(Number(product.price) * item.quantity));
        }
    }
    var summary = elvyCartCalculateTotal(true);
    document.getElementById("checkout-empty").hidden = summary.quantity > 0;
    document.getElementById("checkout-subtotal").textContent = formatPrice(summary.subtotal);
    document.getElementById("checkout-total").textContent = formatPrice(summary.subtotal);
    document.getElementById("checkout-submit").disabled = summary.quantity === 0;
    document.getElementById("checkout-back").href = elvyCartWithCartUrl("cart.html");
}


// Clear a field's previous custom error when the visitor corrects its value.
function elvyCartClearError(event) {
    if (event.target.setCustomValidity) {
        event.target.setCustomValidity("");
    }
}

// Validate checkout and prepare an order request for the visitor to email manually.
function elvyCartInitCheckout() {
    var form = document.getElementById("checkout-form");
    if (!form || form.cartReady) { return; }
    form.cartReady = true;
    function clearDraft(event) {
        elvyCartClearError(event);
        clearEmailDraft(document.getElementById("checkout-message"));
    }
    form.addEventListener("input", clearDraft);
    form.addEventListener("change", clearDraft);
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var message = document.getElementById("checkout-message");
        clearEmailDraft(message);
        if (!validateForm(form)) { return; }
        message.hidden = false;
        var summary = elvyCartCalculateTotal(true);
        if (summary.quantity === 0) {
            message.textContent = "Select at least one product in your cart before checking out.";
            return;
        }
        var selectedProducts = "";
        for (var i = 0; i < elvyCartItems.length; i++) {
            var item = elvyCartItems[i];
            var product = elvyCartProduct(item.id);
            if (item.selected && product) {
                if (!elvyCartCanAdd(product)) {
                    message.textContent = product.name + " is currently unavailable. Remove it from the selected items before continuing.";
                    return;
                }
                selectedProducts += product.name + "\n";
                selectedProducts += "Unit price: " + formatPrice(product.price) + "\n";
                selectedProducts += "Quantity: " + item.quantity + "\n";
                selectedProducts += "Item subtotal: " + formatPrice(Number(product.price) * item.quantity) + "\n\n";
            }
        }
        if (!document.getElementById("payment-cash").checked) {
            message.textContent = "Choose Cash on Delivery. Online payment is unavailable.";
            return;
        }
        var body = "ORDER REQUEST\n\n";
        body += "Please confirm product availability, delivery, shipping, and the final amount before accepting this request.\n\n";
        body += "CUSTOMER INFORMATION\n";
        body += "Full name: " + document.getElementById("checkout-name").value.trim() + "\n";
        body += "Contact number: " + document.getElementById("checkout-contact").value.trim() + "\n";
        body += "Email: " + document.getElementById("checkout-email").value.trim() + "\n\n";
        body += "DELIVERY ADDRESS\n";
        body += document.getElementById("checkout-address").value.trim() + "\n";
        body += "City / Municipality: " + document.getElementById("checkout-city").value.trim() + "\n";
        body += "Province: " + document.getElementById("checkout-province").value.trim() + "\n";
        body += "Postal code: " + document.getElementById("checkout-postal").value.trim() + "\n\n";
        body += "Payment requested: Cash on Delivery\n\n";
        body += "SELECTED PRODUCTS\n" + selectedProducts;
        body += "Subtotal: " + formatPrice(summary.subtotal) + "\n";
        body += "Shipping fee: To be confirmed\n";
        body += "Total excluding shipping: " + formatPrice(summary.subtotal) + "\n\n";
        body += "This is an order request. It is not a confirmed order.";
        prepareStoreEmail("Elvy Variety Store - Order Request", body, message);
        message.appendChild(makeElement("span", "", " The store must confirm this request before an order is placed."));
    });
    elvyCartRenderCheckout();
}

// Quantity buttons on the product page keep the selected amount within the limit.
function elvyCartProductQuantity() {
    var input = document.getElementById("product-quantity");
    var decrease = document.getElementById("product-decrease");
    var increase = document.getElementById("product-increase");
    function refresh() {
        var valid = elvyCartValidQuantity(input.value);
        decrease.disabled = !valid || Number(input.value) === 1;
        increase.disabled = !valid || Number(input.value) === elvyCartQuantityLimit;
    }
    decrease.addEventListener("click", function () {
        input.value = Number(input.value) - 1;
        refresh();
    });
    increase.addEventListener("click", function () {
        input.value = Number(input.value) + 1;
        refresh();
    });
    input.addEventListener("input", refresh);
    input.addEventListener("change", refresh);
    refresh();
}

// Display the selected product without invented ratings or testimonials.
function elvyCartInitProduct() {
    var content = document.getElementById("product-content");
    if (!content || content.cartReady) { return; }
    content.cartReady = true;
    var id = Number(new URLSearchParams(window.location.search).get("id") || 1);
    var product = elvyCartProduct(id);
    if (!product) {
        content.hidden = true;
        document.getElementById("product-information").hidden = true;
        document.getElementById("product-reviews").hidden = true;
        document.getElementById("product-not-found").hidden = false;
        return;
    }
    document.title = product.name + " | Elvy Variety Store";
    document.getElementById("product-title").textContent = product.name;
    document.getElementById("product-breadcrumb-name").textContent = product.name;
    document.getElementById("product-price").textContent = formatPrice(product.price);
    document.getElementById("product-description").textContent = product.description || product.name;
    document.getElementById("product-long-description").textContent = product.details || "Ask the store which product suits your intended task.";
    document.getElementById("product-availability").textContent = product.availability || "Contact the store";
    document.getElementById("product-detail-name").textContent = product.name;
    document.getElementById("product-detail-category").textContent = product.category;
    document.getElementById("product-detail-label").textContent = product.catalogLabel || "Ask the store";
    document.getElementById("product-detail-availability").textContent = product.availability || "Contact the store";
    var inquirySubject = "Product inquiry: " + product.name;
    var inquiryBody = "Hello Elvy Variety Store,\n\nI would like to ask about " + product.name + ".\nPlease confirm current stock, price, exact model and specifications, included accessories, and warranty terms.\n\nMy intended use is: ";
    document.getElementById("product-ask").href = "mailto:elvy.variety@gmail.com?subject=" + encodeURIComponent(inquirySubject) + "&body=" + encodeURIComponent(inquiryBody);
    document.getElementById("product-image-caption").textContent = product.name;
    elvyCartPhoto(document.getElementById("product-image"), product);
    elvyCartProductQuantity();
    var add = document.getElementById("product-add-cart");
    add.disabled = !elvyCartCanAdd(product);
    add.addEventListener("click", function () {
        var quantity = Number(document.getElementById("product-quantity").value);
        if (!elvyCartAdd(product.id, quantity)) {
            elvyCartShowConfirmation("This item cannot be added. Use a whole-number quantity from 1 to " + elvyCartQuantityLimit + " and check availability.");
            return;
        }
        elvyCartShowConfirmation("Added to cart!");
    });
    // This static website cannot save or publish customer reviews.
    var form = document.getElementById("review-form");
    var reviewToggle = document.getElementById("review-demo-toggle");
    if (reviewToggle) {
        reviewToggle.hidden = false;
        reviewToggle.addEventListener("click", function () {
            form.hidden = !form.hidden;
            reviewToggle.textContent = form.hidden ? "TRY RATING DEMO" : "HIDE RATING DEMO";
        });
    }
    var ratings = form.querySelectorAll(".review-rating-stars input");
    var stars = form.querySelectorAll(".review-rating-stars img");
    var labels = form.querySelectorAll(".review-rating-stars label");
    var halfStar = document.getElementById("review-half-star");
    var ratingValue = document.getElementById("review-rating-value");
    var reviewMessage = document.getElementById("review-message");
    var selectedRating = 0;
    function clearReviewMessage() {
        reviewMessage.textContent = "";
        reviewMessage.hidden = true;
    }
    function selectRating(value) {
        selectedRating = value;
        for (var i = 0; i < ratings.length; i++) {
            var number = i + 1;
            ratings[i].checked = number === Math.ceil(value);
            ratings[i].value = String(ratings[i].checked ? value : number);
            var image = value >= number ? "star.png" : value >= number - 0.5 ? "star-half.png" : "star-outline.png";
            stars[i].src = "images/products/" + image;
            var labelValue = ratings[i].checked ? value : number;
            labels[i].querySelector("span").textContent = labelValue + (labelValue === 1 ? " star" : " stars");
        }
        halfStar.disabled = value === 0;
        halfStar.checked = value % 1 !== 0;
        ratingValue.textContent = value ? value + " / 5" : "No rating selected";
        clearReviewMessage();
    }
    function prepareStar(index) {
        function chooseWholeStar() { selectRating(index + 1); }
        ratings[index].addEventListener("click", chooseWholeStar);
        ratings[index].addEventListener("change", chooseWholeStar);
        labels[index].addEventListener("dblclick", function (event) {
            event.preventDefault();
            selectRating(index + 0.5);
        });
    }
    for (var i = 0; i < ratings.length; i++) { prepareStar(i); }
    halfStar.addEventListener("change", function () {
        if (selectedRating) { selectRating(Math.ceil(selectedRating) - (halfStar.checked ? 0.5 : 0)); }
    });
    form.addEventListener("reset", function () { selectRating(0); });
    form.addEventListener("input", function (event) {
        elvyCartClearError(event);
        clearReviewMessage();
    });
    selectRating(0);
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validateForm(form)) { return; }
        var message = document.getElementById("review-message");
        message.textContent = "Reviews cannot be saved on this static website. Your review has not been published.";
        message.hidden = false;
    });
    var submitButton = document.getElementById("review-submit");
    if (submitButton) {
        submitButton.disabled = false;
    }
}

// Public cart functions used by shop cards and page navigation.
window.ElvyCart = {
    getItems: elvyCartGetItems,
    add: elvyCartAdd,
    setQuantity: elvyCartSetQuantity,
    remove: elvyCartRemove,
    setSelected: elvyCartSetSelected,
    totalQuantity: function () {
        return elvyCartCalculateTotal(false).quantity;
    },
    selectedTotal: function () {
        return elvyCartCalculateTotal(true);
    },
    syncLinks: elvyCartSyncLinks,
    renderBadge: elvyCartRenderBadge,
    notify: elvyCartShowConfirmation,
    withCartUrl: elvyCartWithCartUrl,
    url: elvyCartWithCartUrl,
    initProduct: elvyCartInitProduct,
    initCart: elvyCartInitCart,
    initCheckout: elvyCartInitCheckout
};

// Read the cart once, then start the controls present on this page.
elvyCartReadUrl();
if (document.getElementById("shop-products") || document.getElementById("featured-products") || document.getElementById("product-add-cart")) {
    elvyCartInitConfirmation();
}
elvyCartInitProduct();
elvyCartInitCart();
elvyCartInitCheckout();
elvyCartSyncLinks();
elvyCartRenderBadge();

// Carry the latest state on dynamically created links and keyboard navigation too.
function elvyCartPrepareLink(event) {
    var link = event.target.closest("a");
    var href = link && link.getAttribute("href");
    if (href && href.charAt(0) !== "#") {
        link.href = elvyCartWithCartUrl(link.href);
    }
}
document.addEventListener("click", elvyCartPrepareLink);
document.addEventListener("auxclick", elvyCartPrepareLink);
document.addEventListener("contextmenu", elvyCartPrepareLink);
document.addEventListener("focusin", elvyCartPrepareLink);
