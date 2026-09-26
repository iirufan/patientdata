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
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const userForm =
  document.getElementById("userForm");

const formMessage =
  document.getElementById("formMessage");

const registerBtn =
  document.getElementById("registerBtn");

const usersList =
  document.getElementById("usersList");

const userSearch =
  document.getElementById("userSearch");

const logoutBtn =
  document.getElementById("logoutBtn");


let currentUser = null;

let allUsers = [];


/* ======================================================
   AUTHENTICATION / ADMIN CHECK
====================================================== */

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      window.location.replace("index.html");
      return;

    }

    currentUser = user;


    try {

      const profileRef =
        doc(
          db,
          "users",
          user.uid
        );


      const profileSnap =
        await getDoc(profileRef);


      if (!profileSnap.exists()) {

        alert(
          "Your user profile does not exist."
        );

        await signOut(auth);

        window.location.replace(
          "index.html"
        );

        return;

      }


      const profile =
        profileSnap.data();


      if (
        profile.active !== true ||
        profile.role !== "admin"
      ) {

        alert(
          "Administrator access required."
        );

        window.location.replace(
          "dashboard.html"
        );

        return;

      }


      loadUsers();

    }

    catch(error) {

      console.error(error);

      alert(
        "Unable to verify administrator account."
      );

    }

  }
);


/* ======================================================
   LOGOUT
====================================================== */

logoutBtn?.addEventListener(
  "click",
  async () => {

    await signOut(auth);

    window.location.replace(
      "index.html"
    );

  }
);


/* ======================================================
   REGISTER USER
====================================================== */

userForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (!currentUser)
      return;


    const fullName =
      document
        .getElementById("fullName")
        .value
        .trim();


    const email =
      document
        .getElementById("email")
        .value
        .trim()
        .toLowerCase();


    const contact =
      document
        .getElementById("contact")
        .value
        .trim();


    const licenseNo =
      document
        .getElementById("licenseNo")
        .value
        .trim();


    const specialty =
      document
        .getElementById("specialty")
        .value
        .trim();


    const role =
      document
        .getElementById("role")
        .value;


    const password =
      document
        .getElementById("password")
        .value;


    const confirmPassword =
      document
        .getElementById("confirmPassword")
        .value;


    if (!fullName) {

      showMessage(
        "Enter the user's full name.",
        false
      );

      return;

    }


    if (!email) {

      showMessage(
        "Enter an email address.",
        false
      );

      return;

    }


    if (password.length < 8) {

      showMessage(
        "Password must contain at least 8 characters.",
        false
      );

      return;

    }


    if (
      password !== confirmPassword
    ) {

      showMessage(
        "Passwords do not match.",
        false
      );

      return;

    }


    try {

      registerBtn.disabled = true;

      registerBtn.textContent =
        "Registering...";


      showMessage(
        "Creating account...",
        true
      );


      /*
       * Get the Firebase ID token.
       *
       * Vercel API verifies this token.
       */

      const idToken =
        await currentUser.getIdToken(
          true
        );


      const response =
        await fetch(
          "/api/create-user",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${idToken}`

            },

            body:
              JSON.stringify({

                fullName,
                email,
                contact,
                licenseNo,
                specialty,
                role,
                password

              })

          }
        );


      let result = {};


      try {

        result =
          await response.json();

      } catch {

        throw new Error(
          "Server returned an invalid response."
        );

      }


      if (!response.ok) {

        throw new Error(
          result.error ||
          "Unable to create user."
        );

      }


      showMessage(
        `${fullName} registered successfully.`,
        true
      );


      userForm.reset();


      document
        .getElementById("role")
        .value =
        "doctor";

    }

    catch(error) {

      console.error(
        "Registration error:",
        error
      );


      showMessage(
        error.message ||
        "Unable to register user.",
        false
      );

    }

    finally {

      registerBtn.disabled =
        false;

      registerBtn.textContent =
        "Register User";

    }

  }
);


/* ======================================================
   LOAD USERS
====================================================== */

function loadUsers() {

  const usersQuery =
    query(
      collection(
        db,
        "users"
      ),
      orderBy(
        "createdAt",
        "desc"
      )
    );


  onSnapshot(

    usersQuery,

    snapshot => {

      allUsers = [];


      snapshot.forEach(
        docSnap => {

          allUsers.push({

            id:
              docSnap.id,

            ...docSnap.data()

          });

        }
      );


      renderUsers(
        allUsers
      );

    },

    error => {

      console.error(
        "Users loading error:",
        error
      );


      usersList.innerHTML = `

        <div class="error-box">

          Unable to load users.

          ${escapeHTML(
            error.message
          )}

        </div>

      `;

    }

  );

}


/* ======================================================
   SEARCH USERS
====================================================== */

userSearch?.addEventListener(
  "input",
  () => {

    const search =
      userSearch
        .value
        .trim()
        .toLowerCase();


    if (!search) {

      renderUsers(
        allUsers
      );

      return;

    }


    const filtered =
      allUsers.filter(
        user => {

          const text = [

            user.fullName,
            user.email,
            user.contact,
            user.licenseNo,
            user.specialty,
            user.role

          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


          return text.includes(
            search
          );

        }
      );


    renderUsers(
      filtered
    );

  }
);


/* ======================================================
   RENDER USERS
====================================================== */

function renderUsers(users) {

  if (!users.length) {

    usersList.innerHTML = `

      <div class="empty-users">

        No users found.

      </div>

    `;

    return;

  }


  let html = `

    <div class="registered-users">

  `;


  users.forEach(user => {

    const role =
      String(
        user.role || ""
      ).toLowerCase();


    html += `

      <div class="registered-user">

        <div class="user-avatar">

          ${getInitials(
            user.fullName
          )}

        </div>


        <div class="user-details">

          <div class="user-name">

            ${escapeHTML(
              user.fullName ||
              "Unnamed User"
            )}

          </div>


          <div class="user-email">

            ${escapeHTML(
              user.email || ""
            )}

          </div>


          <div class="user-extra">

            ${
              user.specialty
              ?
              `<span>
                 ${escapeHTML(
                   user.specialty
                 )}
               </span>`
              :
              ""
            }


            ${
              user.licenseNo
              ?
              `<span>
                 License:
                 ${escapeHTML(
                   user.licenseNo
                 )}
               </span>`
              :
              ""
            }

          </div>

        </div>


        <div class="user-role-area">

          <span
            class="role-badge role-${escapeHTML(role)}"
          >

            ${escapeHTML(
              formatRole(role)
            )}

          </span>


          <span class="
            account-status
            ${
              user.active === true
              ? "active"
              : "inactive"
            }
          ">

            ${
              user.active === true
              ? "Active"
              : "Inactive"
            }

          </span>

        </div>

      </div>

    `;

  });


  html += `</div>`;


  usersList.innerHTML =
    html;

}


/* ======================================================
   MESSAGE
====================================================== */

function showMessage(
  text,
  success
) {

  formMessage.textContent =
    text;


  formMessage.style.color =
    success
      ? "#067647"
      : "#b42318";

}


/* ======================================================
   INITIALS
====================================================== */

function getInitials(name) {

  if (!name)
    return "?";


  return name
    .trim()
    .split(/\s+/)
    .slice(0,2)
    .map(word =>
      word.charAt(0)
    )
    .join("")
    .toUpperCase();

}


/* ======================================================
   ROLE
====================================================== */

function formatRole(role) {

  const roles = {

    admin:
      "Administrator",

    doctor:
      "Doctor",

    nurse:
      "Nurse",

    reception:
      "Reception"

  };


  return roles[role] ||
    role ||
    "User";

}


/* ======================================================
   ESCAPE HTML
====================================================== */

function escapeHTML(value) {

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