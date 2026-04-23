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
  /**
   * null = still loading the shop doc
   * true = address + operating_hours filled in
   * false = shop exists but setup is incomplete
   */
  shopComplete: boolean | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "client",
  shopId: null,
  hasPhone: false,
  shopComplete: null,
  loading: true,
});

function computeShopComplete(shop: any | undefined): boolean {
  if (!shop) return false;
  const hasAddress = typeof shop.address === "string" && shop.address.trim().length > 0;
  const hasHours =
    shop.operating_hours &&
    typeof shop.operating_hours === "object" &&
    Object.keys(shop.operating_hours).length > 0;
  return hasAddress && hasHours;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("client");
  const [shopId, setShopId] = useState<string | null>(null);
  const [hasPhone, setHasPhone] = useState(false);
  const [shopComplete, setShopComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubShopDoc: (() => void) | null = null;

    const cleanupShop = () => {
      if (unsubShopDoc) {
        unsubShopDoc();
        unsubShopDoc = null;
      }
    };

    const subscribeShop = (nextShopId: string | null) => {
      cleanupShop();
      if (!nextShopId) {
        setShopComplete(null);
        return;
      }
      unsubShopDoc = onSnapshot(
        doc(db, "shops", nextShopId),
        (snap) => {
          setShopComplete(snap.exists() ? computeShopComplete(snap.data()) : false);
        },
        () => setShopComplete(false)
      );
    };

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      cleanupShop();

      if (firebaseUser) {
        unsubUserDoc = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const nextShopId = data.shop_id || null;
              setRole((data.role as UserRole) || "client");
              setShopId(nextShopId);
              setHasPhone(!!data.phone);
              subscribeShop(nextShopId);
            } else {
              setRole("client");
              setShopId(null);
              setHasPhone(false);
              subscribeShop(null);
            }
            setLoading(false);
          },
          () => {
            setRole("client");
            setShopId(null);
            setHasPhone(false);
            subscribeShop(null);
            setLoading(false);
          }
        );
      } else {
        setRole("client");
        setShopId(null);
        setHasPhone(false);
        subscribeShop(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
      cleanupShop();
    };
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { user, role, shopId, hasPhone, shopComplete, loading } },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
