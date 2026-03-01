import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { initializeUserTokens } from '../services/tokenService';

const AuthContext = createContext({
  currentUser: null,
  userProfile: null,
  profileError: null,
  signup: async () => {
    throw new Error('AuthProvider not mounted');
  },
  login: async () => {
    throw new Error('AuthProvider not mounted');
  },
  logout: async () => {},
  loadUserProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext) || { currentUser: null, userProfile: null, profileError: null };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time listener cleanup ref
  const profileUnsubscribeRef = useRef(null);

  // Register new user
  async function signup(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    });

    // Create user profile in Firestore with token initialization
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email,
      displayName: displayName,
      gender: 'boy',
      createdAt: new Date().toISOString(),
      totalAttempts: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      tokens: 100,        // Initial token balance
      inventory: [],      // Owned items
      equipped: {}        // Currently equipped items
    });

    // Initialize token system (creates welcome bonus entry)
    await initializeUserTokens(userCredential.user.uid, 100);

    return userCredential;
  }

  // Login user
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout user
  function logout() {
    // Clean up real-time listener
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }
    return signOut(auth);
  }

  // Load user profile with REAL-TIME synchronization
  function setupProfileListener(uid) {
    // Clean up existing listener
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
    }

    const disableListeners = String(import.meta.env?.VITE_DISABLE_FIRESTORE_LISTENERS ?? '')
      .trim() === '1';

    const docRef = doc(db, 'users', uid);

    const ensureUserProfileDoc = async () => {
      try {
        const u = auth.currentUser;
        if (!u?.uid) return;
        await setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || '',
          gender: 'boy',
          level: 'S4',
          createdAt: new Date().toISOString(),
          totalAttempts: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          tokens: 100,
          inventory: [],
          equipped: {},
        }, { merge: true });
      } catch (e) {
        setProfileError(e);
      }
    };
    
    if (disableListeners) {
      let timer = null;
      const poll = async () => {
        try {
          const docSnap = await getDoc(docRef);
          setProfileError(null);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          setProfileError(error);
        }
      };
      poll();
      timer = window.setInterval(poll, 15000);
      const unsubscribe = () => {
        if (timer) window.clearInterval(timer);
      };
      profileUnsubscribeRef.current = unsubscribe;
      return unsubscribe;
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        setProfileError(null);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📊 Profile updated:', {
            tokens: data.tokens,
            inventory: data.inventory?.length || 0,
          });
          setUserProfile(data);
        } else {
          if (!docSnap.metadata?.fromCache) {
            ensureUserProfileDoc();
          }
          setUserProfile((prev) => (prev && prev.uid === uid ? prev : null));
        }
      },
      (error) => {
        console.error('❌ Profile listener error:', error);
        setProfileError(error);
      },
    );

    profileUnsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }

  // Legacy: Load profile once (for backwards compatibility)
  async function loadUserProfile(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfileError(null);
        setUserProfile(docSnap.data());
      } else {
        await setDoc(doc(db, 'users', uid), {
          uid,
          email: auth.currentUser?.email || '',
          displayName: auth.currentUser?.displayName || '',
          gender: 'boy',
          level: 'S4',
          createdAt: new Date().toISOString(),
          totalAttempts: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          tokens: 100,
          inventory: [],
          equipped: {},
        }, { merge: true });
      }
    } catch (error) {
      setProfileError(error);
      console.error('Error loading profile:', error);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Set up real-time profile listener
        setupProfileListener(user.uid);
      } else {
        setUserProfile(null);
        setProfileError(null);
        // Clean up listener
        if (profileUnsubscribeRef.current) {
          profileUnsubscribeRef.current();
          profileUnsubscribeRef.current = null;
        }
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // Clean up listener on unmount
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
      }
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    profileError,
    signup,
    login,
    logout,
    loadUserProfile  // Keep for backwards compatibility
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}