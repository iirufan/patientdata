import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {

  // REPLACE THESE WITH YOUR FIREBASE VALUES

  apiKey: "AIzaSyD6_tJpSN2ca8L12Rm9ulaosTJfG2SKUK8",

  authDomain: "kpsyst-a5377.firebaseapp.com",

  projectId: "kpsyst-a5377",

  storageBucket: "kpsyst-a5377.firebasestorage.app",

  messagingSenderId: "738297113997",

  appId: "1:738297113997:web:1dd012a94ad77c981461c4",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export {
  app,
  auth,
  db
};