"use strict";

document.documentElement.classList.add("js-enabled");

const DATA_PATHS = {
  workshops: "data/workshops.json",
  memberships: "data/memberships.json"
};

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.json();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function setCurrentPage() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach(link => {
    if (link.getAttribute("href") === current) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function setupNavigation() {
  const button = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");
  if (!button || !nav) return;

  const setOpen = open => {
    nav.classList.toggle("open", open);
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Close" : "Menu";
  };

  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener("click", event => {
    if (!nav.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 680) setOpen(false);
  });
}

function workshopCard(workshop) {
  const date = escapeHTML(workshop.dateLabel || workshop.date || "Date to be confirmed");
  return `
    <article class="workshop-card" data-category="${escapeHTML(workshop.category)}" data-skill="${escapeHTML(workshop.skillLevel)}" data-price="${Number(workshop.price)}" data-name="${escapeHTML(workshop.name)}">
      <div class="card-topline"><span class="pill">${escapeHTML(workshop.category)}</span><span class="pill sample">Sample listing</span></div>
      <h3>${escapeHTML(workshop.name)}</h3>
      <p class="description">${escapeHTML(workshop.description)}</p>
      <dl class="workshop-meta">
        <div><dt>Sample date</dt><dd>${date}</dd></div>
        <div><dt>Duration</dt><dd>${escapeHTML(workshop.duration)}</dd></div>
        <div><dt>Skill level</dt><dd>${escapeHTML(workshop.skillLevel)}</dd></div>
        <div><dt>Sample price</dt><dd>$${Number(workshop.price).toFixed(2)}</dd></div>
        <div><dt>Sample seats</dt><dd>${Number(workshop.availableSeats)} (not live)</dd></div>
        <div><dt>Materials</dt><dd>${escapeHTML(workshop.materialsIncluded || "See details")}</dd></div>
      </dl>
      <details><summary>Full workshop details</summary><p>${escapeHTML(workshop.details)}</p><p><strong>Materials:</strong> ${escapeHTML(workshop.materials)}</p></details>
      <div class="card-actions"><a class="button button-primary" href="contact.html?type=workshop&topic=${encodeURIComponent(workshop.id)}">Ask about this workshop</a></div>
    </article>`;
}

function membershipCard(plan, featured = false) {
  return `
    <article class="membership-card ${featured ? "featured" : ""}">
      <p class="eyebrow">${escapeHTML(plan.accessPeriod)} access</p>
      <h3>${escapeHTML(plan.name)}</h3>
      <p class="price">$${Number(plan.price).toFixed(0)} <small>${escapeHTML(plan.priceUnit)}</small></p>
      <p>${escapeHTML(plan.summary)}</p>
      <h4>Includes</h4><ul>${plan.includes.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      <h4>Important limitations</h4><ul>${plan.limitations.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      <a class="button ${featured ? "button-primary" : "button-outline"}" href="contact.html?type=membership&topic=${encodeURIComponent(plan.id)}">Ask about this plan</a>
    </article>`;
}

async function renderHome() {
  const featured = document.querySelector("#home-featured");
  const memberTarget = document.querySelector("#home-memberships");

  if (featured) {
    try {
      const data = await loadJSON(DATA_PATHS.workshops);
      const picks = ["wooden-storage-crate", "soldering-basics", "first-3d-print"];
      featured.innerHTML = data.workshops.filter(w => picks.includes(w.id)).map(workshopCard).join("");
    } catch {
      featured.innerHTML = '<p class="error-message">Featured workshop information is temporarily unavailable. Visit the Workshops page or try again later.</p>';
    }
  }

  if (memberTarget) {
    try {
      const data = await loadJSON(DATA_PATHS.memberships);
      memberTarget.innerHTML = data.memberships.map((plan, index) => membershipCard(plan, index === 1)).join("");
    } catch {
      memberTarget.innerHTML = '<p class="error-message">Membership information is temporarily unavailable. Please visit the Memberships page later.</p>';
    }
  }
}

async function setupWorkshops() {
  const grid = document.querySelector("#workshop-grid");
  if (!grid) return;

  const error = document.querySelector("#workshop-error");
  const categorySelect = document.querySelector("#category-filter");
  const skillSelect = document.querySelector("#skill-filter");
  const sortSelect = document.querySelector("#sort-workshops");
  const clearButton = document.querySelector("#clear-filters");
  const result = document.querySelector("#filter-result");

  let workshops;
  try {
    const data = await loadJSON(DATA_PATHS.workshops);
    workshops = data.workshops;
  } catch (err) {
    grid.hidden = true;
    error.hidden = false;
    result.textContent = "Workshop information is unavailable.";
    return;
  }

  const params = new URLSearchParams(location.search);
  if (params.has("category") && [...categorySelect.options].some(o => o.value === params.get("category"))) {
    categorySelect.value = params.get("category");
  }

  function update() {
    const category = categorySelect.value;
    const skill = skillSelect.value;
    const sort = sortSelect.value;

    let visible = workshops.filter(w =>
      (category === "all" || w.category === category) &&
      (skill === "all" || w.skillLevel === skill)
    );

    if (sort === "price-asc") visible.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") visible.sort((a, b) => b.price - a.price);
    if (sort === "name") visible.sort((a, b) => a.name.localeCompare(b.name));

    grid.innerHTML = visible.length
      ? visible.map(workshopCard).join("")
      : '<div class="notice"><strong>No workshops match those filters.</strong><p>Try another category or skill level, or clear your choices to see all sample workshops.</p></div>';

    result.textContent = `Showing ${visible.length} of ${workshops.length} sample workshops. Dates and seat counts are not live.`;
  }

  [categorySelect, skillSelect, sortSelect].forEach(control => control.addEventListener("change", update));

  clearButton.addEventListener("click", () => {
    categorySelect.value = "all";
    skillSelect.value = "all";
    sortSelect.value = "default";
    history.replaceState({}, "", location.pathname);
    update();
    categorySelect.focus();
  });

  update();
}

async function setupMemberships() {
  const grid = document.querySelector("#membership-grid");
  if (!grid) return;

  const error = document.querySelector("#membership-error");

  try {
    const data = await loadJSON(DATA_PATHS.memberships);
    grid.innerHTML = data.memberships.map((plan, index) => membershipCard(plan, index === 1)).join("");
  } catch {
    grid.hidden = true;
    error.hidden = false;
  }
}

async function setupInquiryForm() {
  const form = document.querySelector("#inquiry-form");
  if (!form) return;

  const typeSelect = document.querySelector("#inquiry-type");
  const topicSelect = document.querySelector("#inquiry-topic");
  const status = document.querySelector("#form-status");
  const preview = document.querySelector("#inquiry-preview");
  const previewContent = document.querySelector("#preview-content");

  let workshopData = [];
  let membershipData = [];

  try {
    const [wData, mData] = await Promise.all([
      loadJSON(DATA_PATHS.workshops),
      loadJSON(DATA_PATHS.memberships)
    ]);
    workshopData = wData.workshops;
    membershipData = mData.memberships;
  } catch {
    status.textContent = "Some inquiry choices could not load. You can still prepare a general question.";
  }

  function populateTopics() {
    const type = typeSelect.value;
    const current = topicSelect.value;
    let options = [];

    if (type === "workshop") options = workshopData.map(item => ({value: item.id, label: item.name}));
    if (type === "membership") options = membershipData.map(item => ({value: item.id, label: item.name}));

    topicSelect.innerHTML = '<option value="">Choose an option</option>' +
      options.map(item => `<option value="${escapeHTML(item.value)}">${escapeHTML(item.label)}</option>`).join("");

    if (options.some(item => item.value === current)) topicSelect.value = current;
    topicSelect.disabled = type === "general" || type === "";

    if (type === "general") topicSelect.innerHTML = '<option value="">Not applicable</option>';
  }

  typeSelect.addEventListener("change", populateTopics);

  const params = new URLSearchParams(location.search);
  if (["workshop", "membership", "general"].includes(params.get("type"))) {
    typeSelect.value = params.get("type");
    populateTopics();
    if (params.has("topic")) topicSelect.value = params.get("topic");
  } else {
    populateTopics();
  }

  function setFieldError(id, message) {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}-error`);
    if (error) error.textContent = message;
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.querySelector("#inquiry-name").value.trim();
    const email = document.querySelector("#inquiry-email").value.trim();
    const type = typeSelect.value;
    let valid = true;

    setFieldError("inquiry-name", "");
    setFieldError("inquiry-email", "");
    setFieldError("inquiry-type", "");

    if (!type) {
      setFieldError("inquiry-type", "Choose an inquiry type.");
      valid = false;
    }
    if (!name) {
      setFieldError("inquiry-name", "Enter your name.");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("inquiry-email", "Enter a valid email address.");
      valid = false;
    }

    if (!valid) {
      status.textContent = "Please review the highlighted fields.";
      form.querySelector('[aria-invalid="true"]')?.focus();
      preview.hidden = true;
      return;
    }

    const topicText = topicSelect.selectedOptions[0]?.textContent || "Not specified";
    const values = [
      ["Inquiry type", typeSelect.selectedOptions[0].textContent],
      ["Workshop or membership", topicText],
      ["Name", name],
      ["Email", email],
      ["Experience", document.querySelector("#inquiry-experience").value || "Not specified"],
      ["Question", document.querySelector("#inquiry-message").value.trim() || "No additional question provided"]
    ];

    previewContent.innerHTML = values.map(([label, value]) =>
      `<dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd>`
    ).join("");

    preview.hidden = false;
    status.textContent = "Your inquiry preview is ready. Nothing has been sent or saved.";
    preview.scrollIntoView({behavior: "smooth", block: "nearest"});
  });

  document.querySelector("#edit-inquiry").addEventListener("click", () => {
    preview.hidden = true;
    status.textContent = "You can edit your information and preview it again.";
    document.querySelector("#inquiry-name").focus();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentPage();
  setupNavigation();
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  renderHome();
  setupWorkshops();
  setupMemberships();
  setupInquiryForm();
});