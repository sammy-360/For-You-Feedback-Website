import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace this with your actual Firebase config from the Firebase Console
const firebaseConfig = {

  apiKey: "AIzaSyDuxcG1POu8jyaAdlc88atjfD0QNyGmTeY",

  authDomain: "for-you-chinese.firebaseapp.com",

  projectId: "for-you-chinese",

  storageBucket: "for-you-chinese.firebasestorage.app",

  messagingSenderId: "382904738343",

  appId: "1:382904738343:web:851a595619b702f641e402",

  measurementId: "G-TBJVK0V0HN"

};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
