"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export function useAuthUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged's error callback matters here: without it, a
    // Firebase config problem (invalid API key, auth provider not yet
    // enabled in the console) throws uncaught and takes down the whole
    // page instead of just leaving the user signed out.
    try {
      const unsubscribe = onAuthStateChanged(
        getFirebaseAuth(),
        (u) => {
          setUser(u);
          setLoading(false);
        },
        (error) => {
          console.error("Auth state error:", error);
          setUser(null);
          setLoading(false);
        },
      );
      return unsubscribe;
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      setUser(null);
      setLoading(false);
    }
  }, []);

  return { user, loading };
}
