// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// TODO: Replace with your own Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBKk_TsWIVQCXfIwPQXnFOXvSNQNDgyvFg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chemleung-hkdse-mcq-platform.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chemleung-hkdse-mcq-platform",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chemleung-hkdse-mcq-platform.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "811594644247",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:811594644247:web:5282c3c73f1d3566955552",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-85R118KESK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
const forceLongPolling = String(import.meta.env.VITE_FIRESTORE_FORCE_LONG_POLLING ?? '').trim() === '1';
const disableListeners = String(import.meta.env.VITE_DISABLE_FIRESTORE_LISTENERS ?? '').trim() === '1';
if (disableListeners) {
  // Keep console usable in environments where Listen/channel is blocked (e.g. Safari/network CORS).
  setLogLevel('error');
}
export const db = initializeFirestore(app, {
  ...(forceLongPolling
    ? {
        experimentalForceLongPolling: true,
        useFetchStreams: false,
      }
    : {
        experimentalAutoDetectLongPolling: true,
      }),
});
export const storage = getStorage(app);

export default app;