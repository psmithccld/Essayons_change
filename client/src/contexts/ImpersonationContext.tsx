import { createContext, useContext, useEffect, useState } from "react";

interface ImpersonationState {
  isImpersonating: boolean;
  isReadOnlyMode: boolean;
  supportOrgId: string | null;
  supportMode: 'read' | 'write' | null;
}

interface ImpersonationContextType extends ImpersonationState {
  // Methods for checking specific permissions
  canWrite: () => boolean;
  canAccess: (scope: string) => boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    isReadOnlyMode: false,
    supportOrgId: null,
    supportMode: null,
  });

  useEffect(() => {
    const bindImpersonationToSession = async () => {
      // Check URL parameters for secure impersonation token
      const urlParams = new URLSearchParams(window.location.search);
      const impersonationToken = urlParams.get('_impersonation_token');

      const isImpersonating = !!impersonationToken;

      if (isImpersonating) {
        try {
          // CRITICAL SECURITY: Bind impersonation using cryptographic token
          const response = await fetch('/api/support/impersonation/bind', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: impersonationToken,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('❌ Failed to bind secure impersonation:', error);
            // Show user-friendly error and redirect
            alert(`Secure impersonation failed: ${error.details || error.error}`);
            window.location.href = '/'; // Redirect to home without token
            return;
          }

          const result = await response.json();
          console.log('✅ SECURE IMPERSONATION BOUND:', result);

          // Extract mode from result for UI state
          const { organizationId, mode, sessionId } = result.impersonation;
          const isReadOnlyMode = mode === 'read';

          // Remove token from URL after successful binding to prevent reuse
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('_impersonation_token');
          window.history.replaceState({}, '', newUrl.toString());

          // Set state with validated impersonation data
          setState({
            isImpersonating: true,
            isReadOnlyMode,
            supportOrgId: organizationId,
            supportMode: mode,
          });

          console.log('🔒 SECURE IMPERSONATION ACTIVE:', {
            organizationId,
            mode,
            readOnly: isReadOnlyMode,
            sessionId
          });

          return; // Early return to skip normal state setting
        } catch (error) {
          console.error('❌ Error in secure impersonation binding:', error);
          alert('Failed to establish secure impersonation session. Please try again.');
          window.location.href = '/';
          return;
        }
      }

      // No impersonation token found - normal app mode
      setState({
        isImpersonating: false,
        isReadOnlyMode: false,
        supportOrgId: null,
        supportMode: null,
      });
    };

    bindImpersonationToSession();
  }, []);

  const canWrite = () => {
    if (!state.isImpersonating) return true; // Normal mode allows writes
    return state.supportMode === 'write'; // Only write mode during impersonation
  };

  const canAccess = (scope: string) => {
    if (!state.isImpersonating) return true; // Normal mode allows all access
    
    // TODO: Implement access scope checking based on session permissions
    // For now, allow all access during impersonation (will be refined later)
    return true;
  };

  const contextValue: ImpersonationContextType = {
    ...state,
    canWrite,
    canAccess,
  };

  return (
    <ImpersonationContext.Provider value={contextValue}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}

// Convenience hooks for common checks
export function useIsReadOnly() {
  const { isReadOnlyMode } = useImpersonation();
  return isReadOnlyMode;
}

export function useCanWrite() {
  const { canWrite } = useImpersonation();
  return canWrite();
}