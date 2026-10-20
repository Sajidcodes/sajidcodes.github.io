const IEEE_PROXY =
  "https://sajid-ieee-events.sajidcodes.workers.dev";


/*
 * Convert an IEEE date string into a sortable number (ms since epoch).
 *
 * Handles:
 *   "31 Jul 2026 05:00 PM EDT"   (time zone optional / any abbreviation)
 *   "31 July 2026 17:00"
 *   "31 Jul 2026"
 *   "2026-07-31T17:00:00Z"       (ISO)
 *   "Jul 31, 2026"
 *
 * Unparseable dates return 0, so they sink to the bottom.
 */

function parseIEEEDate(dateString) {

  const str = String(dateString || "").trim();

  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // 1) "31 Jul 2026 05:00 PM EDT" style (time and zone optional)
  const match = str.match(
    /(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i
  );

  if (match) {

    const month = months[match[2].toLowerCase()];

    if (month !== undefined) {

      let hour = Number(match[4] || 0);
      const minute = Number(match[5] || 0);
      const ampm = (match[6] || "").toUpperCase();

      if (ampm === "PM" && hour !== 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;

      // UTC keeps ordering independent of the visitor's time zone
      return Date.UTC(
        Number(match[3]),
        month,
        Number(match[1]),
        hour,
        minute
      );
    }
  }

  // 2) ISO or "Jul 31, 2026" style
  const parsed = Date.parse(str);

  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  console.warn("Could not parse IEEE date:", dateString);
  return 0;
}


/*
 * Pick the best date field the Worker provides.
 * Prefers a machine-readable start time if one exists.
 */

function eventSortKey(event) {
  return parseIEEEDate(
    event.start ||
    event.startTime ||
    event["start-time"] ||
    event.date
  );
}


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
     * Newest → oldest. Copy first so the API data isn't mutated.
     */

    const events =
      [...result.events].sort(
        (a, b) => eventSortKey(b) - eventSortKey(a)
      );


    console.log(
      "Sorted IEEE events (newest first):",
      events.map(event => event.date)
    );


    container.innerHTML = "";


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

// const IEEE_PROXY =
//   "https://sajid-ieee-events.sajidcodes.workers.dev";

// async function loadIEEEEvents() {

//   const container =
//     document.getElementById("ieee-events");

//   if (!container) {
//     return;
//   }

//   try {

//     const response =
//       await fetch(IEEE_PROXY);

//     if (!response.ok) {
//       throw new Error(
//         `Server returned HTTP ${response.status}`
//       );
//     }

//     const result =
//       await response.json();

//     console.log("IEEE events:", result);


//     if (!result.events || result.events.length === 0) {

//       container.innerHTML = `
//         <p class="form-status">
//           No IEEE NJ Coast Young Professionals events found.
//         </p>
//       `;

//       return;
//     }


//     /*
//      * Convert IEEE date strings into a sortable number.
//      *
//      * Example:
//      * "31 Jul 2026 05:00 PM EDT"
//      */

//     function parseIEEEDate(dateString) {

//       const match = String(dateString).match(
//         /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+(EST|EDT)$/i
//       );


//       if (!match) {
//         console.warn(
//           "Could not parse IEEE date:",
//           dateString
//         );

//         return 0;
//       }


//       const day =
//         Number(match[1]);

//       const month =
//         match[2].substring(0, 3);

//       const year =
//         Number(match[3]);

//       let hour =
//         Number(match[4]);

//       const minute =
//         Number(match[5]);

//       const ampm =
//         match[6].toUpperCase();


//       const months = {
//         Jan: 0,
//         Feb: 1,
//         Mar: 2,
//         Apr: 3,
//         May: 4,
//         Jun: 5,
//         Jul: 6,
//         Aug: 7,
//         Sep: 8,
//         Oct: 9,
//         Nov: 10,
//         Dec: 11
//       };


//       if (ampm === "PM" && hour !== 12) {
//         hour += 12;
//       }

//       if (ampm === "AM" && hour === 12) {
//         hour = 0;
//       }


//       /*
//        * We only need the date/time for sorting.
//        * Use UTC consistently so browser timezone
//        * does not affect the ordering.
//        */

//       return Date.UTC(
//         year,
//         months[month],
//         day,
//         hour,
//         minute
//       );

//     }


//     /*
//      * IMPORTANT:
//      *
//      * Create a NEW array and sort it.
//      * This guarantees the original API data
//      * isn't being rendered accidentally.
//      */

//     const events =
//       [...result.events].sort(
//         (a, b) => {

//           const dateA =
//             parseIEEEDate(a.date);

//           const dateB =
//             parseIEEEDate(b.date);

//           return dateB - dateA;

//         }
//       );


//     console.log(
//       "Sorted IEEE events:",
//       events.map(event => event.date)
//     );


//     /*
//      * Clear loading message.
//      */

//     container.innerHTML = "";


//     /*
//      * Render newest → oldest.
//      */

//     events.forEach(event => {

//       const article =
//         document.createElement("article");


//       article.className =
//         "project";


//       article.innerHTML = `

//         <p class="project-meta">
//           ${escapeHTML(event.date)}
//           · IEEE NJ COAST YP
//         </p>

//         <h3>
//           ${escapeHTML(event.title)}
//         </h3>

//         ${
//           event.description
//             ? `
//               <p class="project-lead">
//                 ${escapeHTML(event.description)}
//               </p>
//             `
//             : ""
//         }

//         <a
//           class="text-link"
//           href="${escapeHTML(event.url)}"
//           target="_blank"
//           rel="noreferrer"
//         >
//           View IEEE Event →
//         </a>

//       `;


//       container.appendChild(article);

//     });


//     /*
//      * Event count.
//      */

//     const count =
//       document.createElement("p");


//     count.className =
//       "form-status";


//     count.textContent =
//       `${events.length} IEEE NJ Coast YP events`;


//     container.prepend(count);


//   } catch (error) {

//     console.error(
//       "IEEE loading error:",
//       error
//     );


//     container.innerHTML = `

//       <p class="form-status">
//         Unable to load IEEE events.
//       </p>

//     `;

//   }

// }


// function escapeHTML(value) {

//   return String(value || "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#039;");

// }


// loadIEEEEvents();
