
"use client";
// Laundry queue app main page
// All code/comments in English, UI text in Spanish via localization
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  doc,
  QueryDocumentSnapshot,
  Timestamp,
  QuerySnapshot,
} from "firebase/firestore";
import { t } from "../locales/t";
// ...existing code...

// Firestore queue entry type
type QueueEntry = {
  id?: string;
  apartment: string;
  duration: number;
  type: string;
  joinedAt: Timestamp;
};

export default function Home() {
  // State for queue, form, loading, error
  // Delete an entry from a queue
  const handleDelete = async (queueType: "lavarropas" | "secadora", id: string) => {
  const confirmed = window.confirm("¿Estás seguro que quieres eliminar esta entrada? Porfavor ser respetuoso y no borrar entradas ajenas.");
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, queueType, id));
    } catch {
      setError("No se pudo borrar la entrada.");
    }
  };
  const [lavarropasQueue, setLavarropasQueue] = useState<QueueEntry[]>([]);
  const [secadoraQueue, setSecadoraQueue] = useState<QueueEntry[]>([]);
  const [apartment, setApartment] = useState("");
  const [duration, setDuration] = useState<number>(45);
  const [type, setType] = useState<string>("Lavarropas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // Real-time listeners for both queues
  useEffect(() => {
    const unsubLavarropas = onSnapshot(collection(db, "lavarropas"), (snapshot: QuerySnapshot) => {
      const entries: QueueEntry[] = [];
      snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
        const data = docSnap.data() as QueueEntry;
        entries.push({
          id: docSnap.id,
          apartment: data.apartment,
          duration: data.duration,
          type: data.type,
          joinedAt: data.joinedAt,
        });
      });
      entries.sort((a, b) => (a.joinedAt?.seconds ?? 0) - (b.joinedAt?.seconds ?? 0));
      setLavarropasQueue(entries);
    });
    const unsubSecadora = onSnapshot(collection(db, "secadora"), (snapshot: QuerySnapshot) => {
      const entries: QueueEntry[] = [];
      snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
        const data = docSnap.data() as QueueEntry;
        entries.push({
          id: docSnap.id,
          apartment: data.apartment,
          duration: data.duration,
          type: data.type,
          joinedAt: data.joinedAt,
        });
      });
      entries.sort((a, b) => (a.joinedAt?.seconds ?? 0) - (b.joinedAt?.seconds ?? 0));
      setSecadoraQueue(entries);
    });
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
      });
      setApartment("");
      setDuration(30);
      setType("Lavarropas");
    } catch {
      setError(t("error"));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto bg-gray-900 rounded-xl shadow-lg p-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center mb-2">Lavadero Velvet - Cola</h1>
        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-medium">{t("apartment")}</span>
              <input
                type="text"
                value={apartment}
                onChange={e => setApartment(e.target.value)}
                maxLength={10}
                className="bg-gray-800 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-medium">Tipo</span>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
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
                onChange={e => setDuration(Number(e.target.value))}
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
            <h2 className="text-lg font-semibold mb-2">{t("lavarropasQueue")}</h2>
            {lavarropasQueue.length === 0 ? (
              <div className="text-gray-400 text-center py-4">{t("queueEmpty")}</div>
            ) : (
              <ol className="list-decimal list-inside flex flex-col gap-2">
                {lavarropasQueue.map((entry, idx) => (
                  <li key={entry.id} className="flex flex-col gap-1 bg-gray-800 rounded px-3 py-2 relative">
                    <span>{t("position")}: <span className="font-bold">{idx + 1}</span></span>
                    <span>{t("apartment")}: <span className="font-bold">{entry.apartment}</span></span>
                    <span>{t("duration")}: <span className="font-bold">{entry.duration}</span></span>
                    <button
                      className="absolute top-2 right-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1"
                      onClick={() => handleDelete("lavarropas", entry.id!)}
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">{t("secadoraQueue")}</h2>
            {secadoraQueue.length === 0 ? (
              <div className="text-gray-400 text-center py-4">{t("queueEmpty")}</div>
            ) : (
              <ol className="list-decimal list-inside flex flex-col gap-2">
                {secadoraQueue.map((entry, idx) => (
                  <li key={entry.id} className="flex flex-col gap-1 bg-gray-800 rounded px-3 py-2 relative">
                    <span>{t("position")}: <span className="font-bold">{idx + 1}</span></span>
                    <span>{t("apartment")}: <span className="font-bold">{entry.apartment}</span></span>
                    <span>{t("duration")}: <span className="font-bold">{entry.duration}</span></span>
                    <button
                      className="absolute top-2 right-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1"
                      onClick={() => handleDelete("secadora", entry.id!)}
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
      <footer className="w-full text-center text-gray-400 text-sm mt-8">
        Hecho por Tiago Romero (Apto 415) — por consultas o sugerencias escribir en el grupo de Whatsapp
      </footer>
    </div>
  );
}
