import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
// Firebase API keys are used to identify your project, not for authorization
  apiKey: "AIzaSyB0pDhgw4wEOJnb-4A0YMjv4NMMprWPdac",
  authDomain: "habit-tracker-b2f6a.firebaseapp.com",
  projectId: "habit-tracker-b2f6a",
  storageBucket: "habit-tracker-b2f6a.firebasestorage.app",
  messagingSenderId: "105337221560",
  appId: "1:105337221560:web:45d9ac64409d9b97505f4d",
  measurementId: "G-NNRZ4GDJNY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };