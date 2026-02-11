// Simple test to check Firestore connection
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBKk_TsWIVQCXfIwPQXnFOXvSNQNDgyvFg",
  authDomain: "chemleung-hkdse-mcq-platform.firebaseapp.com",
  projectId: "chemleung-hkdse-mcq-platform",
  storageBucket: "chemleung-hkdse-mcq-platform.firebasestorage.app",
  messagingSenderId: "811594644247",
  appId: "1:811594644247:web:5282c3c73f1d3566955552"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testFirestore() {
  try {
    console.log('Testing Firestore connection...');
    
    // Test 1: Try to read from attempts collection
    console.log('Test 1: Reading attempts...');
    const attemptsQuery = query(collection(db, 'attempts'));
    const attemptsSnapshot = await getDocs(attemptsQuery);
    console.log(`✅ Found ${attemptsSnapshot.size} attempts`);
    
    // Test 2: Try to write to attempts collection
    console.log('Test 2: Writing test attempt...');
    const testDoc = await addDoc(collection(db, 'attempts'), {
      userId: 'test-user',
      timestamp: new Date().toISOString(),
      score: 50,
      totalQuestions: 10,
      correctAnswers: 5,
      percentage: 50
    });
    console.log(`✅ Test document written: ${testDoc.id}`);
    
    console.log('✅ Firestore is working!');
  } catch (error) {
    console.error('❌ Firestore error:', error);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
  }
}

testFirestore();
