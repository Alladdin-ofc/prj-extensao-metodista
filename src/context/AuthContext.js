import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { subscribeToRole } from '../services/roleService';
import { View, ActivityIndicator } from 'react-native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('member');

  const isMaster = !!user && role === 'master';
  const isAdmin = !!user && (role === 'admin' || role === 'master');

  useEffect(() => {
    let unsubscribeUserData = null;
    let unsubscribeRole = null;
    let profileTimeout = null;
    let generation = 0;

    // Timeout de segurança caso auth demore muito (conexão lenta)
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      const currentGeneration = ++generation;
      if (unsubscribeRole) unsubscribeRole();
      unsubscribeRole = null;
      setRole('member');
      clearTimeout(timeout);
      clearTimeout(profileTimeout);
      if (currentUser) {
        unsubscribeRole = subscribeToRole(currentUser.uid, (nextRole) => {
          if (generation === currentGeneration) setRole(nextRole);
        }, () => {
          if (generation === currentGeneration) setRole('member');
        });
        setUser(currentUser);
        setUserData(null);
        profileTimeout = setTimeout(() => setLoading(false), 10000);
        // Desinscrever o anterior se existir antes de criar novo
        if (unsubscribeUserData) unsubscribeUserData();
        
        unsubscribeUserData = onSnapshot(doc(db, 'users', currentUser.uid), (docSnapshot) => {
          if (generation !== currentGeneration) return;
          clearTimeout(profileTimeout);
          if (docSnapshot.exists()) {
            setUserData(docSnapshot.data());
          } else {
            setUserData(null);
          }
          setLoading(false);
        }, (error) => {
          if (generation !== currentGeneration) return;
          clearTimeout(profileTimeout);
          setLoading(false);
          // Captura erro de permissão (comum no logout) de forma silenciosa
          if (error.code !== 'permission-denied') {
            console.warn("User data listener error:", error);
          }
        });
      } else {
        // Logout detectado: limpar listener IMEDIATAMENTE
        if (unsubscribeUserData) {
          unsubscribeUserData();
          unsubscribeUserData = null;
        }
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      generation += 1;
      clearTimeout(timeout);
      clearTimeout(profileTimeout);
      unsubscribeAuth();
      if (unsubscribeUserData) unsubscribeUserData();
      if (unsubscribeRole) unsubscribeRole();
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, setUser, signOut, isAdmin, isMaster, role }}>
      {children}
    </AuthContext.Provider>
  );
};
