const API_URL =
  "https://events.vtools.ieee.org/RST/events/api/public/v8/events/list";

const eventsList = document.getElementById("events-list");
const status = document.getElementById("event-status");

async function loadIEEEEvents() {
  status.textContent = "Connecting to IEEE...";

  try {
    const url = new URL(API_URL);

    url.searchParams.set("limit", "100");
    url.searchParams.set("sort", "-start-time");

    console.log("Requesting:", url.toString());

    const response = await fetch(url);

    console.log("HTTP status:", response.status);
    console.log("Response:", response);

    if (!response.ok) {
      throw new Error(`IEEE API returned HTTP ${response.status}`);
    }

    const text = await response.text();

    console.log("Raw IEEE response:", text);

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(
        "IEEE returned something that is not valid JSON."
      );
    }

    console.log("Parsed IEEE data:", data);

    /*
     * IEEE's response structure may differ from the simple
     * data.events assumption.
     */

    let events = [];

    if (Array.isArray(data)) {
      events = data;
    } else if (Array.isArray(data.data)) {
      events = data.data;
    } else if (Array.isArray(data.events)) {
      events = data.events;
    } else if (
      data.data &&
      Array.isArray(data.data.events)
    ) {
      events = data.data.events;
    }

    console.log("Events detected:", events);

    if (events.length === 0) {

      status.textContent =
        "IEEE API responded, but no events were detected.";

      eventsList.innerHTML = `
        <div class="ieee-api-debug">
          <p>
            The IEEE API responded, but the event structure
            was not recognized.
          </p>

          <p>
            Open your browser console and look for:
          </p>

          <code>
            Parsed IEEE data
          </code>
        </div>
      `;

      return;
    }

    renderEvents(events);

    status.textContent =
      `${events.length} events loaded from IEEE`;

  } catch (error) {

    console.error("IEEE API ERROR:", error);

    status.textContent =
      "Unable to load IEEE events.";

    eventsList.innerHTML = `
      <div class="ieee-api-debug">

        <p>
          <strong>IEEE API error</strong>
        </p>

        <p>
          ${escapeHTML(error.message)}
        </p>

        <p>
          Open Chrome DevTools → Console to see
          the detailed API response.
        </p>

      </div>
    `;
  }
}


function renderEvents(events) {

  eventsList.innerHTML = "";

  events.forEach((event) => {

    /*
     * JSON:API responses commonly store fields inside
     * event.attributes.
     */

    const attributes = event.attributes || event;

    const title =
      attributes.title ||
      event.title ||
      "IEEE Event";

    const start =
      attributes["start-time"] ||
      attributes.start_time ||
      attributes.startTime ||
      event["start-time"] ||
      event.start_time ||
      event.startTime;

    const description =
      attributes.description ||
      event.description ||
      "";

    const eventId =
      event.id ||
      attributes.id;

    const eventURL =
      attributes.url ||
      event.url ||
      (
        eventId
          ? `https://events.vtools.ieee.org/m/${eventId}`
          : "#"
      );

    const article =
      document.createElement("article");

    article.className = "ieee-event";

    article.innerHTML = `

      <div class="ieee-event-date">
        ${formatDate(start)}
      </div>

      <div class="ieee-event-content">

        <p class="eyebrow">
          IEEE EVENT
        </p>

        <h2>
          ${escapeHTML(title)}
        </h2>

        ${
          description
            ? `
              <p>
                ${escapeHTML(stripHTML(description))}
              </p>
            `
            : ""
        }

        <a
          href="${eventURL}"
          target="_blank"
          rel="noreferrer"
          class="text-link"
        >
          View IEEE Event ↗
        </a>

      </div>

    `;

    eventsList.appendChild(article);
  });
}


function formatDate(value) {

  if (!value) {
    return "DATE TBD";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
}


function stripHTML(html) {

  const div = document.createElement("div");

  div.innerHTML = html;

  return div.textContent ||
         div.innerText ||
         "";
}


function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


loadIEEEEvents();
