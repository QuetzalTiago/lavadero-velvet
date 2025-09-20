// Firebase client initialization for Next.js
// All config values are loaded from environment variables
// Comments and code in English, UI text in Spanish via localization

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, Timestamp } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APPID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENTID,
};

// Avoid re-initializing Firebase in Next.js hot reload
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// TypeScript type for queue entries in Firestore
export type QueueEntryDB = {
  apartment: string;
  duration: number;
  type: string;
  joinedAt: Timestamp;
  userId: string;
  userName: string;
  userPhotoUrl: string;
};

export { db, auth, googleProvider };
