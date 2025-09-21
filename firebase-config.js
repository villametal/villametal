import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDYToHqDE7kC4Onprf5U7aW7RLXBOLpJx8",
  authDomain: "villa-metal.firebaseapp.com",
  projectId: "villa-metal",
  storageBucket: "villa-metal.firebasestorage.app",
  messagingSenderId: "622030637005",
  appId: "1:622030637005:web:5d2e5203a64f4cc35ba684",
  measurementId: "G-Y6DGNKV79V"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
