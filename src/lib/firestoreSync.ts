import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Place, JobOffer, User, UserRole } from '../types';

export function subscribePlaces(onUpdate: (places: Place[]) => void) {
  const colRef = collection(db, 'places');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
      } else {
        const placesList: Place[] = [];
        snapshot.forEach((docSnap) => {
          placesList.push({ id: docSnap.id, ...docSnap.data() } as Place);
        });
        onUpdate(placesList);
      }
    },
    () => {
      // Falha silenciosa de listener
    }
  );
}

export function subscribeJobs(onUpdate: (jobs: JobOffer[]) => void) {
  const colRef = collection(db, 'jobs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
      } else {
        const jobsList: JobOffer[] = [];
        snapshot.forEach((docSnap) => {
          jobsList.push({ id: docSnap.id, ...docSnap.data() } as JobOffer);
        });
        onUpdate(jobsList);
      }
    },
    () => {
      // Falha silenciosa de listener
    }
  );
}

export async function savePlaceToFirestore(place: Place) {
  try {
    const docRef = doc(db, 'places', place.id);
    const cleanPlace = JSON.parse(JSON.stringify(place));
    await setDoc(docRef, cleanPlace, { merge: true });
  } catch (err) {
    console.error('Error saving place to Firestore:', err);
  }
}

export async function deletePlaceFromFirestore(id: string) {
  try {
    const docRef = doc(db, 'places', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting place from Firestore:', err);
  }
}

export async function seedInitialPlacesInFirestore(places: Place[]) {
  try {
    const batch = writeBatch(db);
    places.forEach((p) => {
      const docRef = doc(db, 'places', p.id);
      const cleanPlace = JSON.parse(JSON.stringify(p));
      batch.set(docRef, cleanPlace, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error seeding places in Firestore:', err);
  }
}

export async function saveJobToFirestore(job: JobOffer) {
  try {
    const docRef = doc(db, 'jobs', job.id);
    const cleanJob = JSON.parse(JSON.stringify(job));
    await setDoc(docRef, cleanJob, { merge: true });
  } catch (err) {
    console.error('Error saving job to Firestore:', err);
  }
}

export async function deleteJobFromFirestore(id: string) {
  try {
    const docRef = doc(db, 'jobs', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting job from Firestore:', err);
  }
}

export async function seedInitialJobsInFirestore(jobs: JobOffer[]) {
  try {
    const batch = writeBatch(db);
    jobs.forEach((j) => {
      const docRef = doc(db, 'jobs', j.id);
      const cleanJob = JSON.parse(JSON.stringify(j));
      batch.set(docRef, cleanJob, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error seeding jobs in Firestore:', err);
  }
}

// --- USER AUTHENTICATION & FIRESTORE SYNC ---

export async function saveUserToFirestore(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.id);
    const cleanUser = JSON.parse(JSON.stringify(user));
    await setDoc(userRef, cleanUser, { merge: true });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }
}

export async function getUserFromFirestore(id: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', id);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as User;
    }
  } catch (err) {
    console.error('Error getting user from Firestore:', err);
  }
  return null;
}

export async function loginWithGoogleFirebase(selectedCity?: string): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const fbUser = result.user;

  const existingUser = await getUserFromFirestore(fbUser.uid);

  let userRole: UserRole = 'public';
  if (fbUser.email?.toLowerCase().includes('admin')) {
    userRole = 'admin';
  }

  const appUser: User = {
    id: fbUser.uid,
    name: fbUser.displayName || existingUser?.name || 'Usuário Google',
    email: fbUser.email || existingUser?.email || '',
    role: existingUser?.role || userRole,
    avatar: fbUser.photoURL || existingUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
    provider: 'google',
    city: selectedCity || existingUser?.city || 'Taquaruçu',
    createdAt: existingUser?.createdAt || new Date().toISOString(),
  };

  await saveUserToFirestore(appUser);
  return appUser;
}

export async function registerWithEmailFirebase(
  email: string,
  pass: string,
  name: string,
  city?: string,
  role: UserRole = 'public'
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = userCredential.user;

  try {
    await updateProfile(fbUser, { displayName: name });
  } catch (e) {
    console.warn('Could not update Firebase user profile name:', e);
  }

  const newUser: User = {
    id: fbUser.uid,
    name: name || fbUser.displayName || email.split('@')[0],
    email: fbUser.email || email,
    role: role,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
    provider: 'email',
    city: city || 'Taquaruçu',
    createdAt: new Date().toISOString(),
  };

  await saveUserToFirestore(newUser);
  return newUser;
}

export async function loginWithEmailFirebase(email: string, pass: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const fbUser = userCredential.user;

  let existingUser = await getUserFromFirestore(fbUser.uid);
  if (!existingUser) {
    let role: UserRole = 'public';
    if (email.toLowerCase().includes('admin')) role = 'admin';

    existingUser = {
      id: fbUser.uid,
      name: fbUser.displayName || email.split('@')[0],
      email: fbUser.email || email,
      role,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    await saveUserToFirestore(existingUser);
  }

  return existingUser;
}

export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Error signing out of Firebase Auth:', err);
  }
}

export function subscribeAuthState(onUserChanged: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const dbUser = await getUserFromFirestore(fbUser.uid);
      if (dbUser) {
        onUserChanged(dbUser);
      } else {
        const fallbackUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
          email: fbUser.email || '',
          role: fbUser.email?.toLowerCase().includes('admin') ? 'admin' : 'public',
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
          provider: fbUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
          createdAt: new Date().toISOString(),
        };
        await saveUserToFirestore(fallbackUser);
        onUserChanged(fallbackUser);
      }
    } else {
      onUserChanged(null);
    }
  });
}
