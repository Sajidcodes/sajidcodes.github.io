const IEEE_API =
  "https://events.vtools.ieee.org/RST/events/api/public/v8/events/list";


async function loadIEEEEvents() {

  const container =
    document.getElementById("ieee-events");

  try {

    /*
     * Build API request
     *
     * limit=1000
     *     Get up to 1,000 events
     *
     * sort=-start-time
     *     Newest events first
     */

    const url = new URL(IEEE_API);

    url.searchParams.set("limit", "1000");
    url.searchParams.set("sort", "-start-time");


    console.log(
      "Loading IEEE events from:",
      url.toString()
    );


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        `IEEE API returned HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    console.log(
      "IEEE API response:",
      data
    );


    /*
     * IEEE uses a JSON:API-style response.
     *
     * Normally the events are inside:
     *
     * data.data
     */

    const events =
      Array.isArray(data.data)
        ? data.data
        : [];


    if (events.length === 0) {

      container.innerHTML = `
        <p class="form-status">
          No IEEE events were returned.
        </p>
      `;

      return;
    }


    /*
     * Render events
     */

    container.innerHTML = "";


    events.forEach(event => {

      const attributes =
        event.attributes || {};


      const title =
        attributes.title ||
        "IEEE Event";


      const startTime =
        attributes["start-time"] ||
        attributes.start_time ||
        "";


      const endTime =
        attributes["end-time"] ||
        attributes.end_time ||
        "";


      const eventId =
        event.id;


      const eventURL =
        `https://events.vtools.ieee.org/m/${eventId}`;


      const description =
        attributes.description ||
        "";


      const location =
        attributes.location ||
        attributes.city ||
        "";


      const article =
        document.createElement("article");


      article.className =
        "project ieee-event";


      article.innerHTML = `

        <p class="project-meta">
          ${formatDate(startTime)}
        </p>


        <h3>
          ${escapeHTML(title)}
        </h3>


        ${
          location
            ? `
              <p class="eyebrow">
                ${escapeHTML(location)}
              </p>
            `
            : ""
        }


        ${
          description
            ? `
              <p class="project-lead">
                ${escapeHTML(
                  stripHTML(description)
                )}
              </p>
            `
            : ""
        }


        <a
          class="text-link"
          href="${eventURL}"
          target="_blank"
          rel="noreferrer"
        >
          View IEEE Event →
        </a>

      `;


      container.appendChild(article);

    });


    /*
     * Show number of events
     */

    const count =
      document.createElement("p");

    count.className =
      "form-status";

    count.textContent =
      `${events.length} IEEE events loaded`;

    container.prepend(count);


  } catch (error) {

    console.error(
      "IEEE API error:",
      error
    );


    container.innerHTML = `

      <div class="ieee-api-debug">

        <p>
          <strong>
            Unable to load IEEE events.
          </strong>
        </p>

        <p>
          ${escapeHTML(error.message)}
        </p>

      </div>

    `;

  }

}


/* ---------------------------------
   Helpers
---------------------------------- */


function formatDate(value) {

  if (!value) {
    return "DATE TBD";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

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

  const div =
    document.createElement("div");

  div.innerHTML =
    html;

  return (
    div.textContent ||
    div.innerText ||
    ""
  );

}


function escapeHTML(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* ---------------------------------
   Start
---------------------------------- */

loadIEEEEvents();
