import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

// Load config
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Fetching guests from database...");
  const snap = await getDocs(collection(db, "guests"));
  const guests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`Found ${guests.length} guests in database.`);
  console.log(JSON.stringify(guests, null, 2));
}

run().catch(console.error);
