const API_URL =
  "https://events.vtools.ieee.org/RST/events/api/public/v8/events/list";

const eventsList = document.getElementById("events-list");
const status = document.getElementById("event-status");


async function loadIEEEEvents() {

  try {

    const url = new URL(API_URL);

    url.searchParams.set("limit", "100");
    url.searchParams.set("sort", "-start-time");
    url.searchParams.set("published", "true");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`IEEE API returned ${response.status}`);
    }

    const data = await response.json();

    console.log("IEEE API response:", data);

    const events = data.events || data.data || [];

    if (!events.length) {

      status.textContent = "No events found.";

      return;
    }

    /*
     * TEMPORARY:
     * Display all returned IEEE events.
     *
     * Once we identify the NJ Coast YP organizational
     * unit/feed, we will filter this list specifically
     * to your events.
     */

    renderEvents(events);

    status.textContent =
      `${events.length} events`;

  } catch (error) {

    console.error("IEEE API error:", error);

    status.textContent =
      "Unable to load IEEE events.";

  }
}


function renderEvents(events) {

  eventsList.innerHTML = "";

  events.forEach(event => {

    const title =
      event.title ||
      event.attributes?.title ||
      "IEEE Event";


    const start =
      event["start-time"] ||
      event.attributes?.["start-time"] ||
      event.start_time;


    const description =
      event.description ||
      event.attributes?.description ||
      "";


    const eventId =
      event.id ||
      event.attributes?.id;


    const eventURL =
      event.url ||
      event.attributes?.url ||
      (
        eventId
          ? `https://events.vtools.ieee.org/m/${eventId}`
          : "#"
      );


    const card = document.createElement("article");

    card.className = "ieee-event";


    card.innerHTML = `

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
            ? `<p>${escapeHTML(stripHTML(description))}</p>`
            : ""
        }

        <a
          href="${eventURL}"
          target="_blank"
          rel="noreferrer"
          class="text-link"
        >
          View IEEE event ↗
        </a>

      </div>

    `;


    eventsList.appendChild(card);

  });

}


function formatDate(dateString) {

  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
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

  return div.textContent || div.innerText || "";

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
