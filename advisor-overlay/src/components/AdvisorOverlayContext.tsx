import { createContext, useCallback, useContext, useState } from 'react';
import AdvisorOverlay from './AdvisorOverlay';

interface AdvisorOverlayContextValue {
  showAdvisorOverlay: (message: string) => void;
}

const AdvisorOverlayContext = createContext<AdvisorOverlayContextValue>({
  showAdvisorOverlay: () => {},
});

interface AdvisorOverlayProviderProps {
  children: React.ReactNode;
  /** Base path to advisor image folder, with trailing slash. Default: '/images/advisor/' */
  advisorPath?: string;
  /** Label shown above dialogue text. Default: 'Advisor' */
  speakerName?: string;
}

export function AdvisorOverlayProvider({
  children,
  advisorPath,
  speakerName,
}: AdvisorOverlayProviderProps) {
  const [message, setMessage] = useState<string | null>(null);

  const showAdvisorOverlay = useCallback((msg: string) => {
    // Drop new triggers if one is already showing
    setMessage((current) => (current !== null ? current : msg));
  }, []);

  return (
    <AdvisorOverlayContext.Provider value={{ showAdvisorOverlay }}>
      {children}
      {message !== null && (
        <AdvisorOverlay
          message={message}
          onDismiss={() => setMessage(null)}
          advisorPath={advisorPath}
          speakerName={speakerName}
        />
      )}
    </AdvisorOverlayContext.Provider>
  );
}

export function useAdvisorOverlay() {
  return useContext(AdvisorOverlayContext);
}
