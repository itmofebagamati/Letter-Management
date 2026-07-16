import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  runTransaction, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  type DocumentData,
  QueryDocumentSnapshot,
  deleteDoc,
  writeBatch
} from "firebase/firestore";

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDPyyCn0ydXgTOZrwbdYmOao8fQyIeIl0Y",
  authDomain: "gen-lang-client-0665463681.firebaseapp.com",
  projectId: "gen-lang-client-0665463681",
  storageBucket: "gen-lang-client-0665463681.firebasestorage.app",
  messagingSenderId: "126517610223",
  appId: "1:126517610223:web:909c99c094c9c8258e7d1a",
  firestoreDatabaseId: "ai-studio-nepalgovernmentl-7fd3a55d-1d96-4bf2-abd2-0e82edc5df7b"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore using the designated custom database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

/**
 * Atomic transaction to get and increment the chalani number for a specific section.
 * This guarantees no duplicate numbers even when multiple employees click 'Generate' at the same time.
 * 
 * @param sectionId Unique identifier for the office section (e.g. "admin", "it", "account", "planning")
 * @param startNumber Initial number to start from if no counter exists yet
 */
export async function getNextChalaniNumber(sectionId: string, startNumber: number = 1): Promise<number> {
  const counterRef = doc(db, "counters", sectionId);
  
  // Check if there are any entries in the register
  const logCollection = collection(db, "chalani_register");
  const q = query(logCollection, limit(1));
  const snap = await getDocs(q);
  
  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextValue = startNumber;

    if (snap.empty) {
      nextValue = 1;
    } else if (counterSnap.exists()) {
      const data = counterSnap.data();
      if (typeof data.currentValue === "number") {
        nextValue = data.currentValue + 1;
      }
    }

    transaction.set(counterRef, { currentValue: nextValue }, { merge: true });
    return nextValue;
  });
}

/**
 * Adds a new entry to the centralized dispatch/chalani log
 */
export async function logChalaniEntry(data: {
  chalaniNo: string;
  letterNo: string;
  sectionId: string;
  sectionNameNe: string;
  sectionNameEn: string;
  recipient: string;
  subject: string;
  dateBS: string;
  dateAD: string;
  sender: string;
  letterStateJson: string; // Packed letter configuration to allow loading/re-downloading
}) {
  const logCollection = collection(db, "chalani_register");
  return await addDoc(logCollection, {
    ...data,
    createdAt: serverTimestamp()
  });
}

/**
 * Retreives the latest chalani entries for the register grid
 */
export async function fetchChalaniRegister(limitCount = 100): Promise<DocumentData[]> {
  const logCollection = collection(db, "chalani_register");
  const q = query(logCollection, orderBy("createdAt", "desc"), limit(limitCount));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

/**
 * Sets or updates the custom sequence starting number for a specific section
 */
export async function setSectionCounter(sectionId: string, startValue: number) {
  const counterRef = doc(db, "counters", sectionId);
  return await runTransaction(db, async (transaction) => {
    transaction.set(counterRef, { currentValue: startValue }, { merge: true });
  });
}

/**
 * Deletes a single chalani log entry from Firestore
 */
export async function deleteChalaniEntry(id: string): Promise<void> {
  const docRef = doc(db, "chalani_register", id);
  await deleteDoc(docRef);
}

/**
 * Bulk deletes multiple chalani log entries using Firestore batch writes
 */
export async function bulkDeleteChalaniEntries(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id) => {
    const docRef = doc(db, "chalani_register", id);
    batch.delete(docRef);
  });
  await batch.commit();
}
