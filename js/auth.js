import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

let checkingLogin = true;


/* =========================================================
   CHECK EXISTING LOGIN
========================================================= */

onAuthStateChanged(auth, async user => {

  if (!checkingLogin) {
    return;
  }

  checkingLogin = false;

  if (!user) {
    return;
  }

  try {

    const profileRef = doc(
      db,
      "users",
      user.uid
    );

    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {

      await signOut(auth);

      showMessage(
        "Your user profile could not be found.",
        false
      );

      return;
    }

    const profile = profileSnap.data();


    /* Active approved user */

    if (profile.active === true) {

      window.location.replace(
        "dashboard.html"
      );

      return;
    }


    /* Pending user */

    if (
      profile.status === "pending" ||
      profile.active === false
    ) {

      await signOut(auth);

      showMessage(
        "Your account is waiting for administrator approval.",
        false
      );

      return;
    }


    await signOut(auth);

    showMessage(
      "Your account is not active.",
      false
    );

  } catch (error) {

    console.error(
      "Existing login check:",
      error
    );

    await signOut(auth);

  }

});


/* =========================================================
   LOGIN
========================================================= */

form?.addEventListener("submit", async event => {

  event.preventDefault();

  const email = document
    .getElementById("email")
    .value
    .trim()
    .toLowerCase();

  const password = document
    .getElementById("password")
    .value;


  if (!email || !password) {

    showMessage(
      "Enter your email and password.",
      false
    );

    return;
  }


  try {

    setLoading(true);

    showMessage(
      "Signing in...",
      true
    );


    /* Firebase Authentication */

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = credential.user;


    /* Get Firestore user profile */

    const profileRef = doc(
      db,
      "users",
      user.uid
    );

    const profileSnap =
      await getDoc(profileRef);


    if (!profileSnap.exists()) {

      await signOut(auth);

      showMessage(
        "Your user profile does not exist. Contact the administrator.",
        false
      );

      return;
    }


    const profile =
      profileSnap.data();


    /* ===============================================
       PENDING ACCOUNT
    =============================================== */

    if (
      profile.active !== true ||
      profile.status === "pending"
    ) {

      await signOut(auth);

      showMessage(
        "Your account is waiting for administrator approval.",
        false
      );

      return;
    }


    /* ===============================================
       APPROVED ACCOUNT
    =============================================== */

    showMessage(
      "Login successful. Opening dashboard...",
      true
    );


    window.location.replace(
      "dashboard.html"
    );

  } catch (error) {

    console.error(
      "Login error:",
      error
    );


    let errorMessage =
      "Unable to login. Check your email and password.";


    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {

      errorMessage =
        "Incorrect email or password.";

    }

    else if (
      error.code === "auth/invalid-email"
    ) {

      errorMessage =
        "Enter a valid email address.";

    }

    else if (
      error.code === "auth/too-many-requests"
    ) {

      errorMessage =
        "Too many login attempts. Please try again later.";

    }

    else if (
      error.code === "auth/network-request-failed"
    ) {

      errorMessage =
        "Network error. Check your internet connection.";

    }

    else if (
      error.code === "permission-denied"
    ) {

      errorMessage =
        "Unable to verify your account permissions.";

    }


    showMessage(
      errorMessage,
      false
    );

  } finally {

    setLoading(false);

  }

});


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text, success) {

  if (!message) {
    return;
  }

  message.textContent = text;

  message.style.color =
    success
      ? "#067647"
      : "#b42318";
}


/* =========================================================
   LOGIN BUTTON STATE
========================================================= */

function setLoading(loading) {

  if (!loginBtn) {
    return;
  }

  loginBtn.disabled = loading;

  loginBtn.textContent =
    loading
      ? "Signing in..."
      : "Login";
}
