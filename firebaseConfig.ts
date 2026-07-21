// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o banco de dados, storage e auth
// Usando initializeFirestore com configurações de long-polling para garantir conexões estáveis em ambientes de sandbox/iframe
const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, dbId);
export const storage = getStorage(app);
export const auth = getAuth(app);
