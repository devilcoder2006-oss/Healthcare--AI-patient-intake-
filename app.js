const modalBackdrop = document.querySelector("#modal-backdrop");
const modalContent = document.querySelector("#modal-content");
const modalClose = document.querySelector(".modal-close");
const toast = document.querySelector("#toast");
let previouslyFocused = null;
let toastTimeout;

const templates = {
  "symptom-modal": `
    <span class="modal-eyebrow">A GOOD PLACE TO START</span>
    <h2 id="modal-title">Let’s talk about how you feel.</h2>
    <p>Share what’s on your mind and Hedi will help you think through a next step. This isn’t a diagnosis or a substitute for medical care.</p>
    <form id="symptom-form">
      <label class="form-field">What would you like help with?
        <textarea name="symptoms" required minlength="3" placeholder="For example: I’ve had a headache since yesterday…"></textarea>
      </label>
      <label class="form-field">How long have you been feeling this way?
        <select name="duration" required>
          <option value="">Choose an option</option><option>Just started</option><option>A few days</option><option>A week or more</option><option>It comes and goes</option>
        </select>
      </label>
      <button class="button modal-submit" type="submit">Get guidance <span aria-hidden="true">→</span></button>
    </form>
    <div class="modal-note"><strong>Need urgent help?</strong> If this may be an emergency, contact your local emergency services now.</div>`,
  "appointment-modal": `
    <span class="modal-eyebrow">PERSONALIZED CARE</span>
    <h2 id="modal-title">Find a time for care.</h2>
    <p>Tell us what works for you and we’ll show available options.</p>
    <form id="appointment-form">
      <label class="form-field">Type of visit
        <select name="visit" required><option value="">Choose a visit</option><option>Primary care</option><option>Wellness check-in</option><option>Talk to a nurse</option><option>Video consultation</option></select>
      </label>
      <label class="form-field">Preferred day
        <input name="day" type="date" required />
      </label>
      <button class="button modal-submit" type="submit">See available times <span aria-hidden="true">→</span></button>
    </form>
    <div class="modal-note">Appointments shown here are a demo. A care team member can help confirm your visit.</div>`,
  "services-modal": `
    <span class="modal-eyebrow">YOUR CARE, IN ONE PLACE</span>
    <h2 id="modal-title">Explore our services.</h2>
    <p>Thoughtful support to help you take the next step in your health journey.</p>
    <div class="service-list">
      <div class="service-list-item"><strong>AI symptom guidance</strong><span>Understand possible next steps with a guided check-in.</span></div>
      <div class="service-list-item"><strong>Appointments</strong><span>Connect with a care professional, in person or online.</span></div>
      <div class="service-list-item"><strong>Wellbeing check-ins</strong><span>Pause and reflect on how you’re feeling.</span></div>
      <div class="service-list-item"><strong>Health insights</strong><span>Explore clear, approachable information for your wellbeing.</span></div>
    </div>
    <div class="modal-note">For personalized medical advice, please speak with a qualified healthcare professional.</div>`
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function openModal(name) {
  const template = templates[name];
  if (!template) return;
  previouslyFocused = document.activeElement;
  modalContent.innerHTML = template;
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalClose.focus();
  bindModalForms();
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
}

function bindModalForms() {
  const symptomForm = document.querySelector("#symptom-form");
  if (symptomForm) {
    symptomForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const symptoms = new FormData(symptomForm).get("symptoms").toString().trim();
      modalContent.innerHTML = `
        <span class="modal-eyebrow">A GENTLE NEXT STEP</span>
        <h2 id="modal-title">Thanks for sharing.</h2>
        <p>Based on what you’ve described, here are some safe next steps to consider. Hedi can’t diagnose conditions, but a clinician can provide personalized advice.</p>
        <div class="result-panel">
          <h3>Consider speaking with a care professional</h3>
          <p>If your symptoms are new, persistent, or worrying you, a care professional can help you decide what to do next.</p>
          <ul><li>Keep track of when symptoms started and what changes them.</li><li>Rest and stay hydrated if that feels appropriate for you.</li><li>Seek urgent help if symptoms become severe or rapidly worsen.</li></ul>
        </div>
        <button class="button modal-submit" id="result-appointment" type="button">Explore appointments <span aria-hidden="true">→</span></button>
        <div class="modal-note">Your note (“${escapeHtml(symptoms.slice(0, 90))}${symptoms.length > 90 ? "…" : ""}”) stays in this demo session and is not sent anywhere.</div>`;
      document.querySelector("#result-appointment").addEventListener("click", () => openModal("appointment-modal"));
    });
  }

  const appointmentForm = document.querySelector("#appointment-form");
  if (appointmentForm) {
    const dayInput = appointmentForm.querySelector('input[name="day"]');
    dayInput.min = new Date().toISOString().split("T")[0];
    appointmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const visit = new FormData(appointmentForm).get("visit");
      modalContent.innerHTML = `
        <span class="modal-eyebrow">NEXT STEP</span>
        <h2 id="modal-title">Let’s get you connected.</h2>
        <p>We’ve noted your interest in <strong>${escapeHtml(visit.toString().toLowerCase())}</strong>. In a live kiosk, the care team would help confirm the available times.</p>
        <div class="result-panel"><h3>Need help booking?</h3><p>Ask a care team member at the front desk and they’ll be happy to assist.</p></div>
        <button class="button modal-submit" id="done-button" type="button">Done</button>`;
      document.querySelector("#done-button").addEventListener("click", closeModal);
    });
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.open));
});
modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdrop.hidden) closeModal();
});

document.querySelectorAll(".mood-option").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mood-option").forEach((option) => {
      option.classList.toggle("is-selected", option === button);
      option.setAttribute("aria-pressed", option === button ? "true" : "false");
    });
    document.querySelector("#mood-feedback").textContent = `Thanks for checking in — you’re feeling ${button.dataset.mood.toLowerCase()}.`;
  });
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("is-active"));
    link.classList.add("is-active");
    document.querySelector("#page-label").textContent = link.querySelector("span").textContent;
    const target = document.querySelector(link.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelector(".help-button").addEventListener("click", () => showToast("Please ask a care team member at the front desk for assistance."));
document.querySelector(".notification-button").addEventListener("click", () => showToast("You’re all caught up."));
document.querySelector(".language-button").addEventListener("click", () => showToast("Language options will be available here."));
document.querySelector(".profile-button").addEventListener("click", () => showToast("This is a guest session. No personal health information is saved."));
document.querySelector("#current-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
