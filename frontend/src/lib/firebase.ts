import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-6vEdmFgwdB1ZkbreYthfenSf8GhgfRw",
  authDomain: "personal-22894.firebaseapp.com",
  projectId: "personal-22894",
  storageBucket: "personal-22894.firebasestorage.app",
  messagingSenderId: "642489601049",
  appId: "1:642489601049:web:c577b2216bbc6ef31aae88",
  measurementId: "G-CFKH38CC1V"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
