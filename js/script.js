// Maine Makers Workshop - Phase 3
// Each section checks that its elements exist, so this file is safe on every page.

// Marks the page so CSS only shows JavaScript-dependent controls when JS is running.
document.documentElement.classList.add("js-enabled");


// =========================
// Mobile Navigation
// =========================
const menuButton = document.querySelector(".menu-toggle");
const mainNavigation = document.querySelector("#main-navigation");

function setMenuState(isOpen) {
    mainNavigation.classList.toggle("open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = isOpen ? "Close" : "Menu";
}

if (menuButton && mainNavigation) {
    menuButton.addEventListener("click", function () {
        setMenuState(!mainNavigation.classList.contains("open"));
    });

    // Escape closes the menu and returns focus to the button.
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && mainNavigation.classList.contains("open")) {
            setMenuState(false);
            menuButton.focus();
        }
    });
}


// =========================
// Form Validation
// =========================
const contactForm = document.querySelector("#contact-form");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(input, message) {
    const errorElement = document.querySelector("#" + input.id + "-error");
    if (errorElement) {
        errorElement.textContent = message;
    }
    input.setAttribute("aria-invalid", "true");
}

function clearError(input) {
    const errorElement = document.querySelector("#" + input.id + "-error");
    if (errorElement) {
        errorElement.textContent = "";
    }
    input.removeAttribute("aria-invalid");
}

// Returns a validator that gives an error message, or "" when the field is valid.
function validateRequired(message) {
    return function (input) {
        if (input.type === "checkbox") {
            return input.checked ? "" : message;
        }
        return input.value.trim() === "" ? message : "";
    };
}

function validateEmail(input) {
    const email = input.value.trim();
    if (email === "") {
        return "Please enter your email address.";
    }
    if (!emailPattern.test(email)) {
        return "Please enter a valid email address, like name@example.com.";
    }
    return "";
}

// Turns whatever was typed or pasted into (207) 555-0108 as the visitor types.
function formatPhone(value) {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 11 && digits.charAt(0) === "1") {
        digits = digits.slice(1); // ignore a leading country code like +1
    }
    digits = digits.slice(0, 10);

    if (digits.length === 0) {
        return "";
    }
    if (digits.length <= 3) {
        return "(" + digits;
    }
    if (digits.length <= 6) {
        return "(" + digits.slice(0, 3) + ") " + digits.slice(3);
    }
    return "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6);
}

function validatePhone(input) {
    const phone = input.value.trim();
    if (phone === "") {
        return "Please enter your phone number.";
    }
    if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(phone)) {
        return "Please enter a 10-digit phone number, like (207) 555-0108.";
    }
    return "";
}

function validateField(input, validator) {
    const message = validator(input);
    if (message === "") {
        clearError(input);
        return true;
    }
    showError(input, message);
    return false;
}

if (contactForm) {
    const nameInput = contactForm.querySelector("#name");
    const emailInput = contactForm.querySelector("#email");
    const phoneInput = contactForm.querySelector("#phone");
    const workshopInput = contactForm.querySelector("#workshop");
    const experienceInput = contactForm.querySelector("#experience");
    const formStatus = document.querySelector("#form-status");

    // Every field listed here is required. Notes (#message) is intentionally left out.
    const fieldRules = [
        { input: nameInput, validator: validateRequired("Please enter your name.") },
        { input: emailInput, validator: validateEmail },
        { input: phoneInput, validator: validatePhone },
        { input: workshopInput, validator: validateRequired("Please choose a workshop.") },
        { input: experienceInput, validator: validateRequired("Please choose your experience level.") }
    ];

    // Auto-format the phone number as the visitor types.
    // This is registered before the re-check listener below so the value is formatted first.
    phoneInput.addEventListener("input", function () {
        phoneInput.value = formatPhone(phoneInput.value);
    });

    // Re-check a field as the visitor fixes it.
    fieldRules.forEach(function (rule) {
        ["input", "change"].forEach(function (eventName) {
            rule.input.addEventListener(eventName, function () {
                if (rule.input.hasAttribute("aria-invalid")) {
                    validateField(rule.input, rule.validator);
                }
            });
        });
    });

    contactForm.addEventListener("submit", function (event) {
        // There is no backend, so the form is never actually submitted.
        event.preventDefault();

        let firstInvalidInput = null;

        fieldRules.forEach(function (rule) {
            const isValid = validateField(rule.input, rule.validator);
            if (!isValid && firstInvalidInput === null) {
                firstInvalidInput = rule.input;
            }
        });

        if (firstInvalidInput !== null) {
            formStatus.textContent = "Please fix the highlighted fields before sending.";
            formStatus.className = "form-status error";
            firstInvalidInput.focus();
            return;
        }

        formStatus.textContent =
            "Thank you, " + nameInput.value.trim() + ". Your form passed validation. " +
            "This is a demonstration of front-end behavior: your message was not actually sent. " +
            "To reach us, please call 207-555-0108 or email julia@mainemakers.example.";
        formStatus.className = "form-status success";
        contactForm.reset();
    });
}


// =========================
// Workshop Category Filter
// =========================
const filterButtons = document.querySelectorAll(".filter-button");
const workshopCards = document.querySelectorAll(".workshop-card");
const filterResult = document.querySelector("#filter-result");

function filterWorkshops(category) {
    let visibleCount = 0;

    workshopCards.forEach(function (card) {
        const matches = category === "all" || card.dataset.category === category;
        card.hidden = !matches;
        if (matches) {
            visibleCount += 1;
        }
    });

    filterButtons.forEach(function (button) {
        const isActive = button.dataset.category === category;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    if (filterResult) {
        filterResult.textContent =
            "Showing " + visibleCount + " of " + workshopCards.length + " workshops.";
    }
}

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        filterWorkshops(button.dataset.category);
    });
});


// =========================
// Workshop Price Sort
// =========================
const sortSelect = document.querySelector("#sort-workshops");
const workshopGrid = document.querySelector(".workshop-grid");
const sortStatus = document.querySelector("#sort-status");

// Reads the price from the "$45" tag on a card. Returns null if a card has no price tag.
function getWorkshopPrice(card) {
    const tags = card.querySelectorAll(".tag");
    for (let i = 0; i < tags.length; i += 1) {
        const match = tags[i].textContent.trim().match(/^\$(\d+(?:\.\d+)?)$/);
        if (match) {
            return parseFloat(match[1]);
        }
    }
    return null;
}

if (sortSelect && workshopGrid) {
    // Remember the page's original order so "Default order" can restore it.
    const originalOrder = Array.from(workshopGrid.querySelectorAll(".workshop-card"));

    const sortMessages = {
        "default": "Showing workshops in default order.",
        "price-asc": "Sorted by price, least expensive to most expensive.",
        "price-desc": "Sorted by price, most expensive to least expensive."
    };

    const sortWorkshops = function (mode) {
        const cards = originalOrder.slice();

        if (mode === "price-asc" || mode === "price-desc") {
            const direction = mode === "price-asc" ? 1 : -1;

            cards.sort(function (a, b) {
                const priceA = getWorkshopPrice(a);
                const priceB = getWorkshopPrice(b);

                // Same price (or both missing): keep the original order.
                if (priceA === priceB) {
                    return originalOrder.indexOf(a) - originalOrder.indexOf(b);
                }
                // Cards without a price always go last.
                if (priceA === null) {
                    return 1;
                }
                if (priceB === null) {
                    return -1;
                }
                return (priceA - priceB) * direction;
            });
        }

        // Re-appending moves each card into its new position. Hidden state is kept.
        cards.forEach(function (card) {
            workshopGrid.appendChild(card);
        });

        if (sortStatus) {
            sortStatus.textContent = sortMessages[mode] || sortMessages["default"];
        }
    };

    sortSelect.addEventListener("change", function () {
        sortWorkshops(sortSelect.value);
    });

    // Apply on load in case the browser restored a previous selection.
    sortWorkshops(sortSelect.value);
}