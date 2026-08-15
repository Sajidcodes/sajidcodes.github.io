const IEEE_PROXY =
  "https://sajid-ieee-events.response-sajidhussain.workers.dev";


async function loadIEEEEvents() {

  const container =
    document.getElementById("ieee-events");

  if (!container) {
    return;
  }

  try {

    const response =
      await fetch(IEEE_PROXY);

    if (!response.ok) {
      throw new Error(
        `Server returned HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    console.log("IEEE events:", result);

    if (!result.events || result.events.length === 0) {

      container.innerHTML = `
        <p class="form-status">
          No IEEE NJ Coast Young Professionals events found.
        </p>
      `;

      return;
    }

    container.innerHTML = "";

const events = [...result.events].sort((a, b) => {
  return new Date(b.date) - new Date(a.date);
});

events.forEach(event => {

      const article =
        document.createElement("article");

      article.className =
        "project";

      article.innerHTML = `

        <p class="project-meta">
          ${escapeHTML(event.date)}
          · IEEE NJ COAST YP
        </p>

        <h3>
          ${escapeHTML(event.title)}
        </h3>

        ${
          event.description
            ? `
              <p class="project-lead">
                ${escapeHTML(event.description)}
              </p>
            `
            : ""
        }

        <a
          class="text-link"
          href="${escapeHTML(event.url)}"
          target="_blank"
          rel="noreferrer"
        >
          View IEEE Event →
        </a>

      `;

      container.appendChild(article);

    });


    const count =
      document.createElement("p");

    count.className =
      "form-status";

    count.textContent =
      `${result.events.length} IEEE NJ Coast YP events`;

    container.prepend(count);


  } catch (error) {

    console.error(
      "IEEE loading error:",
      error
    );

    container.innerHTML = `

      <p class="form-status">
        Unable to load IEEE events.
      </p>

    `;

  }

}


function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


loadIEEEEvents();
