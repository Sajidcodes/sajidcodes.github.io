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


    // Parse IEEE's date format:
    // "31 Jul 2026 05:00 PM EDT"

    const parseIEEEDate = (dateString) => {

      const match = String(dateString).match(
        /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+(EST|EDT)$/i
      );


      if (!match) {
        return 0;
      }


      const [
        ,
        day,
        monthName,
        year,
        hour,
        minute,
        ampm,
        timezone
      ] = match;


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


      let h = Number(hour);


      if (
        ampm.toUpperCase() === "PM" &&
        h !== 12
      ) {
        h += 12;
      }


      if (
        ampm.toUpperCase() === "AM" &&
        h === 12
      ) {
        h = 0;
      }


      const offset =
        timezone.toUpperCase() === "EDT"
          ? "-04:00"
          : "-05:00";


      const month =
        months[monthName.substring(0, 3)];


      return new Date(
        `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(h).padStart(2, "0")}:${minute}:00${offset}`
      ).getTime();

    };


    // Sort newest → oldest

    const events =
      [...result.events].sort((a, b) => {

        return (
          parseIEEEDate(b.date) -
          parseIEEEDate(a.date)
        );

      });


    // Render events

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


    // Event count

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
