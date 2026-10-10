   import { initializeApp } from "firebase/app";
   import { getFirestore } from "firebase/firestore";

   // We will fill this in during Step 4!
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };

   const app = initializeApp(firebaseConfig);
   export const db = getFirestore(app);
