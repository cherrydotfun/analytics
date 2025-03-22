import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue, Filter } from 'firebase-admin/firestore'

const firebaseCredsJsonContent = Buffer.from(process.env.CHERRY_FIREBASE_CREDS, 'base64').toString('utf8');

const serviceAccount = JSON.parse(
    firebaseCredsJsonContent as string
);

initializeApp({
  credential: cert(serviceAccount)
});

const firestore = getFirestore();

export { firestore }
