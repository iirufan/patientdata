import {
  auth,
  db
} from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


let currentUser = null;


onAuthStateChanged(
  auth,
  user => {

    if (!user) {

      window.location.href =
        "index.html";

      return;

    }

    currentUser = user;

  }
);


const form =
  document.getElementById(
    "patientForm"
  );


form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!currentUser)
      return;


    const message =
      document.getElementById(
        "message"
      );


    message.textContent =
      "Registering patient...";


    const fullName =
      document
        .getElementById("fullName")
        .value
        .trim();


    const idNumber =
      document
        .getElementById("idNumber")
        .value
        .trim();


    try {


      const patientData = {

        fullName,

        fullNameLower:
          fullName.toLowerCase(),

        idNumber,

        idNumberLower:
          idNumber.toLowerCase(),

        dob:
          document
            .getElementById("dob")
            .value,

        sex:
          document
            .getElementById("sex")
            .value,

        country:
          document
            .getElementById("country")
            .value
            .trim(),

        contact:
          document
            .getElementById("contact")
            .value
            .trim(),

        email:
          document
            .getElementById("email")
            .value
            .trim(),

        bloodGroup:
          document
            .getElementById("bloodGroup")
            .value,

        emergencyContact:
          document
            .getElementById("emergencyContact")
            .value
            .trim(),

        address:
          document
            .getElementById("address")
            .value
            .trim(),

        allergies:
          document
            .getElementById("allergies")
            .value
            .trim(),

        currentMedications:
          document
            .getElementById("medications")
            .value
            .trim(),

        conditions:
          document
            .getElementById("conditions")
            .value
            .trim(),

        pastHistory:
          document
            .getElementById("pastHistory")
            .value
            .trim(),

        status: "active",

        createdBy:
          currentUser.uid,

        createdByEmail:
          currentUser.email,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      };


      const patientRef =
        await addDoc(
          collection(
            db,
            "patients"
          ),
          patientData
        );


      message.style.color =
        "#067647";

      message.textContent =
        "Patient registered successfully.";


      setTimeout(() => {

        window.location.href =
          "patient.html?id=" +
          encodeURIComponent(
            patientRef.id
          );

      },700);


    }

    catch(error) {

      console.error(error);

      message.style.color =
        "#b42318";

      message.textContent =
        error.message;

    }

  }
);