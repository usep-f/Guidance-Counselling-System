// firebase.js (CDN + modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyApuCIMaVfFzokFdE7TNE_SzG26rcH4vfc",
  authDomain: "guidancesystem-19b6e.firebaseapp.com",
  projectId: "guidancesystem-19b6e",
  storageBucket: "guidancesystem-19b6e.firebasestorage.app",
  messagingSenderId: "798780228152",
  appId: "1:798780228152:web:b78832dbae5b9d52871ccd"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
