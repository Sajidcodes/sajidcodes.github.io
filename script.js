document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", async (event) => {
  if (form.action.includes("YOUR_FORM_ID")) {
    event.preventDefault();
    status.className = "form-status error";
    status.textContent = "Contact form is almost ready — add your Formspree form ID to index.html first.";
    return;
  }

  event.preventDefault();
  status.className = "form-status";
  status.textContent = "Sending...";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { "Accept": "application/json" }
    });

    if (response.ok) {
      form.reset();
      status.className = "form-status success";
      status.textContent = "Thanks — your message has been sent.";
    } else {
      status.className = "form-status error";
      status.textContent = "Something went wrong. Please try again.";
    }
  } catch {
    status.className = "form-status error";
    status.textContent = "Unable to send right now. Please try again.";
  }
});
