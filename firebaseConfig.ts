// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyADmbgE4Ih24wdEZ6b1zOILgpRwiE1eHkc",
  authDomain: "casamento-ef122.firebaseapp.com",
  projectId: "casamento-ef122",
  storageBucket: "casamento-ef122.firebasestorage.app",
  messagingSenderId: "83104445336",
  appId: "1:83104445336:web:6f132dc1259deffe03f1ed",
  measurementId: "G-DYVEKXFEF1"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o banco de dados e o storage
export const db = getFirestore(app);
export const storage = getStorage(app);