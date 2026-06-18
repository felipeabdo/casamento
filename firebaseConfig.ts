// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o banco de dados, storage e auth
// Respect the named database if firestoreDatabaseId is provided in the config
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
export const storage = getStorage(app);
export const auth = getAuth(app);
