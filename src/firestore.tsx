import * as admin from 'firebase-admin';
// import process from 'process';

const firebaseCredsJsonContent = Buffer.from(process.env.ARCAS_FIREBASE_CREDS, 'base64').toString('utf8');


const serviceAccount = JSON.parse(
  firebaseCredsJsonContent as string
);

console.log('serviceAccount: ', serviceAccount);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firestore = admin.firestore();
export { firestore };