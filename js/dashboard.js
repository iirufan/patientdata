/* =========================================================
   PATIENT HISTORY SYSTEM
   dashboard.js
========================================================= */


import {
  auth,
  db
} from "./firebase-config.js";


import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";



/* =========================================================
   PAGE ELEMENTS
========================================================= */

const searchInput =
  document.getElementById(
    "patientSearch"
  );


const fromDateInput =
  document.getElementById(
    "fromDate"
  );


const toDateInput =
  document.getElementById(
    "toDate"
  );


const resultsContainer =
  document.getElementById(
    "patientResults"
  );


const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


const userManagementBtn =
  document.getElementById(
    "userManagementBtn"
  );


const totalPatientsElement =
  document.getElementById(
    "totalPatients"
  );


const visiblePatientsElement =
  document.getElementById(
    "visiblePatients"
  );


const resultsDescription =
  document.getElementById(
    "resultsDescription"
  );



/* =========================================================
   APPLICATION STATE
========================================================= */

let currentUser = null;

let currentUserProfile = null;

let patients = [];

let unsubscribePatients = null;



/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
  auth,

  async user => {

    /*
     * User is not logged in.
     */

    if (!user) {

      window.location.replace(
        "index.html"
      );

      return;

    }


    currentUser = user;


    /*
     * Load user's Firestore profile.
     *
     * users/{Firebase Auth UID}
     */

    try {

      await loadCurrentUserProfile();

    }

    catch(error) {

      console.error(
        "Unable to load user profile:",
        error
      );


      showError(
        "Unable to verify your user account."
      );


      return;

    }


    /*
     * User must be active.
     */

    if (
      !currentUserProfile ||
      currentUserProfile.active !== true
    ) {

      showError(
        "Your account is not active. Contact the system administrator."
      );

      return;

    }


    /*
     * Configure UI according to role.
     */

    configureRoleAccess();


    /*
     * Load patients.
     */

    loadPatients();

  }
);



/* =========================================================
   LOAD CURRENT USER PROFILE
========================================================= */

async function loadCurrentUserProfile() {

  if (!currentUser) {

    throw new Error(
      "User is not authenticated."
    );

  }


  const userRef =
    doc(
      db,
      "users",
      currentUser.uid
    );


  const userSnap =
    await getDoc(
      userRef
    );


  if (!userSnap.exists()) {

    throw new Error(
      "User profile does not exist."
    );

  }


  currentUserProfile = {

    id:
      userSnap.id,

    ...userSnap.data()

  };

}



/* =========================================================
   ROLE-BASED UI
========================================================= */

function configureRoleAccess() {

  const role =
    String(
      currentUserProfile?.role || ""
    )
      .trim()
      .toLowerCase();


  /*
   * Only administrators should see
   * User Management.
   */

  if (userManagementBtn) {

    if (role === "admin") {

      userManagementBtn.style.display =
        "";

    }

    else {

      userManagementBtn.style.display =
        "none";

    }

  }

}



/* =========================================================
   LOGOUT
========================================================= */

logoutBtn?.addEventListener(
  "click",

  async () => {

    try {

      /*
       * Stop realtime Firestore listener.
       */

      if (unsubscribePatients) {

        unsubscribePatients();

        unsubscribePatients =
          null;

      }


      await signOut(
        auth
      );


      window.location.replace(
        "index.html"
      );

    }

    catch(error) {

      console.error(
        "Logout error:",
        error
      );


      alert(
        "Unable to logout. Please try again."
      );

    }

  }
);



/* =========================================================
   LOAD PATIENTS
========================================================= */

function loadPatients() {

  if (!currentUser) {

    return;

  }


  showLoading();


  try {

    const patientsRef =
      collection(
        db,
        "patients"
      );


    /*
     * Newest registered patient first.
     */

    const patientsQuery =
      query(
        patientsRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );


    /*
     * Realtime listener.
     */

    unsubscribePatients =
      onSnapshot(

        patientsQuery,


        /* SUCCESS */

        snapshot => {

          patients = [];


          snapshot.forEach(
            docSnap => {

              patients.push({

                id:
                  docSnap.id,

                ...docSnap.data()

              });

            }
          );


          /*
           * Update total counter.
           */

          updateTotalPatients();


          /*
           * Apply current search/filter.
           */

          filterPatients();

        },


        /* ERROR */

        error => {

          console.error(
            "Error loading patients:",
            error
          );


          if (
            error.code ===
            "permission-denied"
          ) {

            showError(
              "Unable to load patients. Your account does not have permission to access patient records."
            );

          }

          else {

            showError(
              "Unable to load patients. " +
              error.message
            );

          }

        }

      );

  }

  catch(error) {

    console.error(
      "Patient query error:",
      error
    );


    showError(
      "Unable to load patient records."
    );

  }

}



/* =========================================================
   TOTAL PATIENT COUNTER
========================================================= */

function updateTotalPatients() {

  if (
    totalPatientsElement
  ) {

    totalPatientsElement.textContent =
      patients.length;

  }

}



/* =========================================================
   SEARCH EVENTS
========================================================= */

searchInput?.addEventListener(
  "input",
  filterPatients
);


fromDateInput?.addEventListener(
  "change",
  filterPatients
);


toDateInput?.addEventListener(
  "change",
  filterPatients
);



/* =========================================================
   FILTER PATIENTS
========================================================= */

function filterPatients() {

  /*
   * Search text.
   */

  const search =
    (
      searchInput?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  /*
   * Registration date filters.
   */

  const fromDate =
    fromDateInput?.value ||
    "";


  const toDate =
    toDateInput?.value ||
    "";


  /*
   * Perform filtering.
   */

  const filtered =
    patients.filter(
      patient => {


        /* =============================================
           TEXT SEARCH
        ============================================= */

        const searchableText = [

          patient.fullName,

          patient.fullNameLower,

          patient.idNumber,

          patient.idNumberLower,

          patient.contact,

          patient.email,

          patient.country,

          patient.address,

          patient.bloodGroup,

          patient.sex

        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        if (
          search &&
          !searchableText.includes(
            search
          )
        ) {

          return false;

        }



        /* =============================================
           REGISTRATION DATE
        ============================================= */

        const createdDate =
          timestampToDate(
            patient.createdAt
          );


        /*
         * FROM
         */

        if (
          fromDate &&
          createdDate
        ) {

          const from =
            new Date(
              fromDate +
              "T00:00:00"
            );


          if (
            createdDate < from
          ) {

            return false;

          }

        }


        /*
         * TO
         */

        if (
          toDate &&
          createdDate
        ) {

          const to =
            new Date(
              toDate +
              "T23:59:59"
            );


          if (
            createdDate > to
          ) {

            return false;

          }

        }


        return true;

      }
    );


  /*
   * Update result counters.
   */

  updateResultCounters(
    filtered.length
  );


  /*
   * Render results.
   */

  renderPatients(
    filtered
  );

}



/* =========================================================
   RESULT COUNTERS
========================================================= */

function updateResultCounters(
  filteredCount
) {

  /*
   * Visible patient count.
   */

  if (
    visiblePatientsElement
  ) {

    visiblePatientsElement.textContent =
      filteredCount;

  }


  /*
   * Description underneath Patients.
   */

  if (
    resultsDescription
  ) {

    if (
      patients.length === 0
    ) {

      resultsDescription.textContent =
        "No patients registered.";

      return;

    }


    if (
      filteredCount ===
      patients.length
    ) {

      resultsDescription.textContent =
        `${patients.length} registered patient${
          patients.length === 1
            ? ""
            : "s"
        }`;

    }

    else {

      resultsDescription.textContent =
        `${filteredCount} of ${patients.length} patients`;

    }

  }

}



/* =========================================================
   RENDER PATIENTS
========================================================= */

function renderPatients(
  list
) {

  if (
    !resultsContainer
  ) {

    return;

  }


  /*
   * No results.
   */

  if (
    !list.length
  ) {

    resultsContainer.innerHTML = `

      <div class="card">

        <div style="
          text-align:center;
          padding:40px 15px;
          color:#667085;
        ">

          <div style="
            font-size:35px;
            margin-bottom:10px;
          ">
            🔎
          </div>


          <div style="
            font-size:16px;
            font-weight:700;
            color:#344054;
          ">

            No patients found

          </div>


          <div style="
            margin-top:6px;
            font-size:13px;
          ">

            Try another search or
            register a new patient.

          </div>


          <button
            type="button"
            class="primary-btn"
            style="
              width:auto;
              margin-top:18px;
            "
            onclick="
              location.href='register-patient.html'
            "
          >

            + Register Patient

          </button>

        </div>

      </div>

    `;


    return;

  }



  /*
   * Patient cards.
   */

  let html = `

    <div class="patient-list">

  `;



  list.forEach(
    patient => {


      /* =============================================
         BASIC INFORMATION
      ============================================= */

      const name =
        escapeHTML(
          patient.fullName ||
          "Unnamed Patient"
        );


      const idNumber =
        escapeHTML(
          patient.idNumber ||
          "-"
        );


      const contact =
        escapeHTML(
          patient.contact ||
          "-"
        );


      const country =
        escapeHTML(
          patient.country ||
          "-"
        );


      const sex =
        escapeHTML(
          patient.sex ||
          "-"
        );


      const bloodGroup =
        escapeHTML(
          patient.bloodGroup ||
          "-"
        );


      const email =
        escapeHTML(
          patient.email ||
          "-"
        );


      const dob =
        formatDateString(
          patient.dob
        );


      const registered =
        formatTimestamp(
          patient.createdAt
        );


      const patientId =
        escapeHTML(
          patient.id
        );



      /* =============================================
         CARD
      ============================================= */

      html += `

        <div
          class="patient-card"
          data-id="${patientId}"
          tabindex="0"
          role="button"
          aria-label="Open ${name}"
        >


          <!-- TOP -->

          <div class="patient-card-top">


            <div>

              <div class="patient-name">

                ${name}

              </div>


              <div class="patient-id">

                ID / PP:
                ${idNumber}

              </div>

            </div>



            <div class="open-patient">

              View Patient →

            </div>


          </div>



          <!-- INFORMATION -->

          <div class="patient-info-grid">


            <!-- DOB -->

            <div>

              <span class="info-label">

                Date of Birth

              </span>

              <span>

                ${dob}

              </span>

            </div>



            <!-- SEX -->

            <div>

              <span class="info-label">

                Sex

              </span>

              <span>

                ${sex}

              </span>

            </div>



            <!-- BLOOD -->

            <div>

              <span class="info-label">

                Blood Group

              </span>

              <span>

                ${bloodGroup}

              </span>

            </div>



            <!-- CONTACT -->

            <div>

              <span class="info-label">

                Contact

              </span>

              <span>

                ${contact}

              </span>

            </div>



            <!-- COUNTRY -->

            <div>

              <span class="info-label">

                Country

              </span>

              <span>

                ${country}

              </span>

            </div>



            <!-- REGISTERED -->

            <div>

              <span class="info-label">

                Registered

              </span>

              <span>

                ${registered}

              </span>

            </div>


          </div>



          <!-- SECONDARY INFO -->

          <div
            style="
              margin-top:12px;
              padding-top:10px;
              border-top:1px solid #f2f4f7;
              font-size:12px;
              color:#667085;
            "
          >

            Email:
            ${email}

          </div>


        </div>

      `;

    }
  );


  html += `

    </div>

  `;


  /*
   * Insert HTML.
   */

  resultsContainer.innerHTML =
    html;


  /*
   * Attach click events.
   */

  attachPatientEvents();

}



/* =========================================================
   PATIENT CARD EVENTS
========================================================= */

function attachPatientEvents() {

  const cards =
    document.querySelectorAll(
      ".patient-card"
    );


  cards.forEach(
    card => {


      /*
       * Mouse click.
       */

      card.addEventListener(
        "click",

        () => {

          openPatient(
            card.dataset.id
          );

        }
      );


      /*
       * Keyboard accessibility.
       */

      card.addEventListener(
        "keydown",

        event => {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();


            openPatient(
              card.dataset.id
            );

          }

        }

      );

    }
  );

}



/* =========================================================
   OPEN PATIENT
========================================================= */

function openPatient(
  patientId
) {

  if (!patientId) {

    return;

  }


  /*
   * Pass Firestore patient document ID.
   */

  window.location.href =
    "patient.html?id=" +
    encodeURIComponent(
      patientId
    );

}



/* =========================================================
   LOADING DISPLAY
========================================================= */

function showLoading() {

  /*
   * Counters.
   */

  if (
    totalPatientsElement
  ) {

    totalPatientsElement.textContent =
      "—";

  }


  if (
    visiblePatientsElement
  ) {

    visiblePatientsElement.textContent =
      "—";

  }


  if (
    resultsDescription
  ) {

    resultsDescription.textContent =
      "Loading patient records...";

  }


  /*
   * Main result area.
   */

  if (
    resultsContainer
  ) {

    resultsContainer.innerHTML = `

      <div class="card">

        <div class="dashboard-loading">

          <div
            class="loading-spinner"
          ></div>


          <div>

            Loading patients...

          </div>

        </div>

      </div>

    `;

  }

}



/* =========================================================
   ERROR DISPLAY
========================================================= */

function showError(
  message
) {

  if (
    resultsDescription
  ) {

    resultsDescription.textContent =
      "Unable to load patient records.";

  }


  if (
    resultsContainer
  ) {

    resultsContainer.innerHTML = `

      <div class="card">

        <div
          style="
            padding:18px;
            color:#b42318;
            background:#fef3f2;
            border:1px solid #fecdca;
            border-radius:9px;
          "
        >

          <strong>

            Patient records unavailable

          </strong>


          <div
            style="
              margin-top:6px;
              font-size:13px;
            "
          >

            ${escapeHTML(
              message
            )}

          </div>

        </div>

      </div>

    `;

  }

}



/* =========================================================
   FIRESTORE TIMESTAMP → JAVASCRIPT DATE
========================================================= */

function timestampToDate(
  value
) {

  if (!value) {

    return null;

  }


  try {


    /*
     * Firestore Timestamp.
     */

    if (
      typeof value.toDate ===
      "function"
    ) {

      return value.toDate();

    }


    /*
     * Serialized timestamp.
     */

    if (
      typeof value.seconds ===
      "number"
    ) {

      return new Date(
        value.seconds * 1000
      );

    }


    /*
     * Normal date/string.
     */

    const date =
      new Date(
        value
      );


    if (
      !isNaN(
        date.getTime()
      )
    ) {

      return date;

    }

  }

  catch(error) {

    console.error(
      "Date conversion error:",
      error
    );

  }


  return null;

}



/* =========================================================
   FORMAT FIRESTORE TIMESTAMP
========================================================= */

function formatTimestamp(
  value
) {

  const date =
    timestampToDate(
      value
    );


  if (!date) {

    return "-";

  }


  return date
    .toLocaleDateString(
      "en-GB",
      {

        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric"

      }
    );

}



/* =========================================================
   FORMAT HTML DATE
========================================================= */

function formatDateString(
  value
) {

  if (!value) {

    return "-";

  }


  try {

    /*
     * Stored as YYYY-MM-DD.
     *
     * T00 prevents timezone from
     * changing the displayed day.
     */

    const date =
      new Date(
        value +
        "T00:00:00"
      );


    if (
      isNaN(
        date.getTime()
      )
    ) {

      return escapeHTML(
        value
      );

    }


    return date
      .toLocaleDateString(
        "en-GB",
        {

          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric"

        }
      );

  }

  catch(error) {

    return escapeHTML(
      value
    );

  }

}



/* =========================================================
   HTML SECURITY
========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}



/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",

  () => {

    if (
      unsubscribePatients
    ) {

      unsubscribePatients();

    }

  }
);