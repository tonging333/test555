import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

/**
 * FIREBASE CONFIGURATION
 * 
 * Replace the placeholder values below with your actual Firebase project configuration.
 * You can find this in the Firebase Console: 
 * Project Settings -> General -> Your apps -> Firebase SDK snippet -> Config
 */
const firebaseConfig = {
  apiKey: "AIzaSyBbxIZlZPnwkTAobhMcYjhFasbqcn23_w0",
  authDomain: "dnp-budgeting.firebaseapp.com",
  projectId: "dnp-budgeting",
  storageBucket: "dnp-budgeting.firebasestorage.app",
  messagingSenderId: "715397332350",
  appId: "1:715397332350:web:76d0099544d50b5b63472f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * ENABLE OFFLINE PERSISTENCE
 * 
 * This allows the app to function even when the device is offline.
 * It caches data locally and synchronizes with the server when connectivity is restored.
 */
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore persistence failed: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence failed: Browser not supported.');
    }
});