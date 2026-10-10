 // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDuxcG1POu8jyaAdlc88atjfD0QNyGmTeY",
  authDomain: "for-you-chinese.firebaseapp.com",
  projectId: "for-you-chinese",
  storageBucket: "for-you-chinese.firebasestorage.app",
  messagingSenderId: "382904738343",
  appId: "1:382904738343:web:851a595619b702f641e402",
  measurementId: "G-TBJVK0V0HN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
