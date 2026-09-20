import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, leaving: false }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 400);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toasts.map((t) => (
        <div key={t.id} className="labobo-toast"
             style={{ opacity: t.leaving ? 0 : 1, transition: 'opacity 0.4s' }}>
          {t.msg}
        </div>
      ))}
    </ToastContext.Provider>
  );
}
