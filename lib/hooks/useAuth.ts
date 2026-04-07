import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createElement } from "react";
import { auth, onAuthStateChanged, type User } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { UserRole } from "../types";

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "client",
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("client");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setRole((userDoc.data().role as UserRole) || "client");
          } else {
            setRole("client");
          }
        } catch {
          setRole("client");
        }
      } else {
        setRole("client");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { user, role, loading } },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
