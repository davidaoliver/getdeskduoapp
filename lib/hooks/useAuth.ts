import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createElement } from "react";
import { auth, onAuthStateChanged, type User } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { UserRole } from "../types";

interface AuthContextType {
  user: User | null;
  role: UserRole;
  shopId: string | null;
  hasPhone: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "client",
  shopId: null,
  hasPhone: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("client");
  const [shopId, setShopId] = useState<string | null>(null);
  const [hasPhone, setHasPhone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (firebaseUser) {
        unsubUserDoc = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setRole((data.role as UserRole) || "client");
              setShopId(data.shop_id || null);
              setHasPhone(!!data.phone);
            } else {
              setRole("client");
              setShopId(null);
              setHasPhone(false);
            }
            setLoading(false);
          },
          () => {
            setRole("client");
            setShopId(null);
            setHasPhone(false);
            setLoading(false);
          }
        );
      } else {
        setRole("client");
        setShopId(null);
        setHasPhone(false);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { user, role, shopId, hasPhone, loading } },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
