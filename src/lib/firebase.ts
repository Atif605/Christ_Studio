import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  collection,
  CollectionReference,
  DocumentData,
  Firestore
} from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from "firebase/analytics";
import type { 
  MediaItem, 
  UserProfile, 
  PrayerRequest, 
  Devotional, 
  Movie, 
  LiveChannel, 
  SpotlightSlide 
} from "../types";

// 1. Firebase Configuration (With Vite env variables & production fallbacks)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCtXHKg9yBRzMhvsXJB6ieUbBfGMw2is-8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "christ-studio-57698.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "christ-studio-57698",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "christ-studio-57698.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "150165240930",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:150165240930:web:23a4db5403cd05bafc253b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-E3G3EZ01B7"
};

// 2. Safe App Initialization (Vite HMR & Fast-Refresh Safe)
export const app: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

// 3. Ultra Spark-Optimized Firestore Initialization
// Local IndexedDB persistence reduces Document Reads to 0 for returning users
let firestoreDb: Firestore;

try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  // Graceful fallback for Safari Incognito, duplicate HMR reloads, or older Android WebViews
  firestoreDb = getFirestore(app);
}

export const db: Firestore = firestoreDb;
export const auth: Auth = getAuth(app);

// 4. Safe Analytics Initialization (Cross-Platform / Capacitor Friendly)
export let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore failures in restricted webviews or Capacitor background processes
      analytics = null;
    });
}

// 5. Generic Strongly-Typed Collection Reference Helper
const createCollection = <T = DocumentData>(collectionName: string) => {
  return collection(db, collectionName) as CollectionReference<T>;
};

// 6. Exported Global Collections
export const collections = {
  users: createCollection<UserProfile>("users"),
  media: createCollection<MediaItem>("media"),
  prayers: createCollection<PrayerRequest>("prayers"),
  devotionals: createCollection<Devotional>("devotionals"),
  movies: createCollection<Movie>("movies"),
  liveChannels: createCollection<LiveChannel>("live_channels"),
  spotlights: createCollection<SpotlightSlide>("spotlights"),
  triviaScores: createCollection<DocumentData>("trivia_scores"),
  triviaStages: createCollection<DocumentData>("trivia_stages")
};