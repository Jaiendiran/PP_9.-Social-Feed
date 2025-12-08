// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";



const firebaseConfig = {
    apiKey: "AIzaSyCBwWFyYTxCVmoKPSyg6zP1IkDs-EZcKfU",
    authDomain: "react-blog-8f572.firebaseapp.com",
    projectId: "react-blog-8f572",
    storageBucket: "react-blog-8f572.firebasestorage.app",
    messagingSenderId: "592773890892",
    appId: "1:592773890892:web:f57e88dca3bb7d2b6f85e9",
    measurementId: "G-DTEFR2MM0M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);