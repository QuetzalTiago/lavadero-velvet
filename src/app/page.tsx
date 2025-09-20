"use client";
// Laundry queue app main page
// All code/comments in English, UI text in Spanish via localization
import { useEffect, useState } from "react";
import { db, auth, googleProvider } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  QueryDocumentSnapshot,
  Timestamp,
  QuerySnapshot,
} from "firebase/firestore";
import { t } from "../locales/t";
import { User } from "firebase/auth";

// Firestore queue entry type
type QueueEntry = {
  id?: string;
  apartment: string;
  duration: number;
  type: string;
  joinedAt: Timestamp;
  startedAt?: Timestamp;
  userId: string;
  userName: string;
  userPhotoUrl: string;
};

export default function Home() {
  // State for queue, form, loading, error, and auth
  const [lavarropasQueue, setLavarropasQueue] = useState<QueueEntry[]>([]);
  const [secadoraQueue, setSecadoraQueue] = useState<QueueEntry[]>([]);
  const [apartment, setApartment] = useState("");
  const [duration, setDuration] = useState<number>(45);
  const [type, setType] = useState<string>("Lavarropas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    try {
      const { signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("No se pudo iniciar sesión con Google.");
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    await auth.signOut();
  };

  // Delete an entry from a queue (only if user owns it)
  const handleDelete = async (
    queueType: "lavarropas" | "secadora",
    entry: QueueEntry
  ) => {
    if (!user || entry.userId !== user.uid) {
      setError("No puedes borrar entradas de otros usuarios.");
      return;
    }
    const confirmed = window.confirm(
      "¿Estás seguro que quieres eliminar esta entrada?"
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, queueType, entry.id!));
    } catch {
      setError("No se pudo borrar la entrada.");
    }
  };

  // Real-time listeners for both queues
  useEffect(() => {
    let updatingLavarropas = false;
    const unsubLavarropas = onSnapshot(
      collection(db, "lavarropas"),
      async (snapshot: QuerySnapshot) => {
        const entries: QueueEntry[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const data = docSnap.data();
          entries.push({
            id: docSnap.id,
            apartment: data.apartment,
            duration: data.duration,
            type: data.type,
            joinedAt: data.joinedAt,
            startedAt: data.startedAt,
            userId: data.userId,
            userName: data.userName,
            userPhotoUrl: data.userPhotoUrl || "",
          });
        });
        entries.sort(
          (a, b) => (a.joinedAt?.seconds ?? 0) - (b.joinedAt?.seconds ?? 0)
        );
        if (
          entries.length > 0 &&
          entries.every((e) => !e.startedAt) &&
          typeof entries[0].id === "string" &&
          !updatingLavarropas
        ) {
          updatingLavarropas = true;
          const firstDocRef = doc(db, "lavarropas", entries[0].id);
          try {
            await updateDoc(firstDocRef, { startedAt: serverTimestamp() });
          } catch {}
          updatingLavarropas = false;
        }
        setLavarropasQueue(entries);
      }
    );
    let updatingSecadora = false;
    const unsubSecadora = onSnapshot(
      collection(db, "secadora"),
      async (snapshot: QuerySnapshot) => {
        const entries: QueueEntry[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const data = docSnap.data();
          entries.push({
            id: docSnap.id,
            apartment: data.apartment,
            duration: data.duration,
            type: data.type,
            joinedAt: data.joinedAt,
            startedAt: data.startedAt,
            userId: data.userId,
            userName: data.userName,
            userPhotoUrl: data.userPhotoUrl || "",
          });
        });
        entries.sort(
          (a, b) => (a.joinedAt?.seconds ?? 0) - (b.joinedAt?.seconds ?? 0)
        );
        if (
          entries.length > 0 &&
          entries.every((e) => !e.startedAt) &&
          typeof entries[0].id === "string" &&
          !updatingSecadora
        ) {
          updatingSecadora = true;
          const firstDocRef = doc(db, "secadora", entries[0].id);
          try {
            await updateDoc(firstDocRef, { startedAt: serverTimestamp() });
          } catch {}
          updatingSecadora = false;
        }
        setSecadoraQueue(entries);
      }
    );
    return () => {
      unsubLavarropas();
      unsubSecadora();
    };
  }, []);

  // Form validation
  const validate = (): string | null => {
    if (!apartment || apartment.length < 1 || apartment.length > 10) {
      return t("validation_apartment");
    }
    if (!duration || duration < 10 || duration > 120) {
      return t("validation_duration");
    }
    if (!type || (type !== "Lavarropas" && type !== "Secadora")) {
      return "Tipo inválido";
    }
    return null;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) {
      setError("Debes iniciar sesión con Google.");
      return;
    }
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    try {
      const queueType = type === "Lavarropas" ? "lavarropas" : "secadora";
      await addDoc(collection(db, queueType), {
        apartment,
        duration,
        type,
        joinedAt: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || "Anonimo",
        userPhotoUrl: user.photoURL || "",
      });
      setApartment("");
      setDuration(45);
      setType("Lavarropas");
    } catch {
      setError(t("error"));
    }
    setLoading(false);
  };

  // If not logged in, show Google sign-in button
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md mx-auto bg-gray-900 rounded-xl shadow-lg p-6 flex flex-col gap-6 items-center">
          <h1 className="text-2xl font-bold text-center mb-2">
            Lavadero Velvet
          </h1>
          <h2 className="text-base font-medium text-center text-gray-300 mb-4">
            Debes iniciar sesión con Google.
          </h2>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
            onClick={handleGoogleSignIn}
          >
            Iniciar sesión con Google
          </button>
          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        </div>
        <footer className="w-full text-center text-gray-400 text-sm mt-8">
          Hecho por Tiago Romero (Apto 415) — por consultas o sugerencias
          escribir en el grupo de Whatsapp
        </footer>
      </div>
    );
  }

  // Main app UI for authenticated users
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto bg-gray-900 rounded-xl shadow-lg p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Lavadero Velvet</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">{user.displayName}</span>
            <button
              className="bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs"
              onClick={handleSignOut}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <h2 className="text-base font-medium text-center text-gray-300 mb-4">
          Recuerda eliminar tu entrada una vez terminado el lavado/secado.
        </h2>
        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-medium">{t("apartment")}</span>
              <input
                type="text"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                maxLength={10}
                className="bg-gray-800 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-medium">Tipo</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-gray-800 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Lavarropas">Lavarropas</option>
                <option value="Secadora">Secadora</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-medium">{t("duration")}</span>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={10}
                max={120}
                className="bg-gray-800 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition disabled:opacity-50 w-full"
            disabled={loading}
          >
            {loading ? t("submitting") : t("joinQueue")}
          </button>
        </form>
        <div className="flex flex-col sm:flex-row gap-6 w-full">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">
              {t("lavarropasQueue")}
            </h2>
            {lavarropasQueue.length === 0 ? (
              <div className="text-gray-400 text-center py-4">
                {t("queueEmpty")}
              </div>
            ) : (
              <ol className="list-decimal list-inside flex flex-col gap-2">
                {lavarropasQueue.map((entry, idx) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1 bg-gray-800 rounded px-3 py-2 relative"
                  >
                    {idx === 0 ? (
                      <span className="text-green-500 font-bold">
                        {t("inProgress")}
                      </span>
                    ) : (
                      <span>
                        {t("position")}:{" "}
                        <span className="font-bold">{idx + 1}</span>
                      </span>
                    )}
                    <span>
                      {t("apartment")}:{" "}
                      <span className="font-bold">{entry.apartment}</span>
                    </span>
                    <span>
                      {t("duration")}:{" "}
                      <span className="font-bold">{entry.duration}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      Usuario:{" "}
                      <span className="font-bold">{entry.userName}</span>
                      {entry.userPhotoUrl && (
                        <img
                          src={entry.userPhotoUrl}
                          alt={entry.userName}
                          className="w-6 h-6 rounded-full border border-gray-700"
                        />
                      )}
                    </span>
                    {entry.startedAt && (
                      <span>
                        {t("endTime")}:{" "}
                        <span className="font-bold">
                          {(() => {
                            const startDate = entry.startedAt.toDate();
                            const endDate = new Date(
                              startDate.getTime() + entry.duration * 60000
                            );
                            return endDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          })()}
                        </span>
                      </span>
                    )}
                    {entry.userId === user.uid && (
                      <button
                        className="absolute top-2 right-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1"
                        onClick={() => handleDelete("lavarropas", entry)}
                        title="Eliminar"
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">{t("secadoraQueue")}</h2>
            {secadoraQueue.length === 0 ? (
              <div className="text-gray-400 text-center py-4">
                {t("queueEmpty")}
              </div>
            ) : (
              <ol className="list-decimal list-inside flex flex-col gap-2">
                {secadoraQueue.map((entry, idx) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1 bg-gray-800 rounded px-3 py-2 relative"
                  >
                    {idx === 0 ? (
                      <span className="text-green-500 font-bold">
                        {t("inProgress")}
                      </span>
                    ) : (
                      <span>
                        {t("position")}:{" "}
                        <span className="font-bold">{idx + 1}</span>
                      </span>
                    )}
                    <span>
                      {t("apartment")}:{" "}
                      <span className="font-bold">{entry.apartment}</span>
                    </span>
                    <span>
                      {t("duration")}:{" "}
                      <span className="font-bold">{entry.duration}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      Usuario:{" "}
                      <span className="font-bold">{entry.userName}</span>
                      {entry.userPhotoUrl && (
                        <img
                          src={entry.userPhotoUrl}
                          alt={entry.userName}
                          className="w-6 h-6 rounded-full border border-gray-700"
                        />
                      )}
                    </span>
                    {entry.startedAt && (
                      <span>
                        {t("endTime")}:{" "}
                        <span className="font-bold">
                          {(() => {
                            const startDate = entry.startedAt.toDate();
                            const endDate = new Date(
                              startDate.getTime() + entry.duration * 60000
                            );
                            return endDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          })()}
                        </span>
                      </span>
                    )}
                    {entry.userId === user.uid && (
                      <button
                        className="absolute top-2 right-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1"
                        onClick={() => handleDelete("secadora", entry)}
                        title="Eliminar"
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
      <footer className="w-full text-center text-gray-400 text-sm mt-8">
        Hecho por Tiago Romero (Apto 415) — por consultas o sugerencias escribir
        en el grupo de Whatsapp
      </footer>
    </div>
  );
}
