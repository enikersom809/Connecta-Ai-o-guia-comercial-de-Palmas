import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

const configAny = firebaseConfig as Record<string, string | undefined>;

export const db = configAny.firestoreDatabaseId
  ? getFirestore(app, configAny.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
