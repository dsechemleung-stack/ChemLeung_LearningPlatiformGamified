import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoute({ children }) {
  const { currentUser, isVisitor } = useAuth();
  
  return (currentUser || isVisitor) ? children : <Navigate to="/" />;
}