'use client';

import { createContext, useContext } from "react";

// Create the Auth Context
export const AuthContext = createContext(undefined);

// Custom hook to use the Auth Context
export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
