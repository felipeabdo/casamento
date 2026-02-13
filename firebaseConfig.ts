// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Aqui usamos variáveis de ambiente para segurança.
// Se estiver rodando localmente e não funcionar, você pode colar as strings diretas aqui,
// mas lembre-se de não publicar no GitHub com as senhas expostas se o repo for público.
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

// Exporta o banco de dados para usarmos no store
export const db = getFirestore(app);