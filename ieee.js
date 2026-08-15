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


    /*
     * Convert IEEE date strings into a sortable number.
     *
     * Example:
     * "31 Jul 2026 05:00 PM EDT"
     */

    function parseIEEEDate(dateString) {

      const match = String(dateString).match(
        /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+(EST|EDT)$/i
      );


      if (!match) {
        console.warn(
          "Could not parse IEEE date:",
          dateString
        );

        return 0;
      }


      const day =
        Number(match[1]);

      const month =
        match[2].substring(0, 3);

      const year =
        Number(match[3]);

      let hour =
        Number(match[4]);

      const minute =
        Number(match[5]);

      const ampm =
        match[6].toUpperCase();


      const months = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11
      };


      if (ampm === "PM" && hour !== 12) {
        hour += 12;
      }

      if (ampm === "AM" && hour === 12) {
        hour = 0;
      }


      /*
       * We only need the date/time for sorting.
       * Use UTC consistently so browser timezone
       * does not affect the ordering.
       */

      return Date.UTC(
        year,
        months[month],
        day,
        hour,
        minute
      );

    }


    /*
     * IMPORTANT:
     *
     * Create a NEW array and sort it.
     * This guarantees the original API data
     * isn't being rendered accidentally.
     */

    const events =
      [...result.events].sort(
        (a, b) => {

          const dateA =
            parseIEEEDate(a.date);

          const dateB =
            parseIEEEDate(b.date);

          return dateB - dateA;

        }
      );


    console.log(
      "Sorted IEEE events:",
      events.map(event => event.date)
    );


    /*
     * Clear loading message.
     */

    container.innerHTML = "";


    /*
     * Render newest → oldest.
     */

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


    /*
     * Event count.
     */

    const count =
      document.createElement("p");


    count.className =
      "form-status";


    count.textContent =
      `${events.length} IEEE NJ Coast YP events`;


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
