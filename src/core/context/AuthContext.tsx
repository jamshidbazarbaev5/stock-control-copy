  import React, { createContext, useContext, useState, useEffect } from "react";
  import api from "../api/api";
  import { getAccessToken } from "../api/auth";
  import type { CurrentUser } from "../hooks/useCurrentUser";

  interface AuthContextType {
    currentUser: CurrentUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
  }

  // Create a context
  const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                          children,
                                                                        }) => {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Function to fetch current user data
    const fetchCurrentUser = async (): Promise<CurrentUser | null> => {
      console.log("[AuthContext] Fetching current user");
      try {
        const token = getAccessToken();
        if (!token) {
          console.log("[AuthContext] No token found, user is not authenticated");
          return null;
        }

        const response = await api.get("users/me");
        console.log("[AuthContext] User data fetched successfully");
        return response.data;
      } catch (error) {
        console.error("[AuthContext] Error fetching user data:", error);

        // If we get a 401 or any auth error, clear tokens to prevent loops
        const token = getAccessToken();
        if (token) {
          console.log("[AuthContext] Clearing invalid tokens");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }

        return null;
      }
    };

    // Function to refresh user data
    const refreshUser = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const userData = await fetchCurrentUser();
        setCurrentUser(userData);
      } catch (error) {
        console.error("[AuthContext] Error refreshing user:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize auth state
    useEffect(() => {
      console.log("[AuthContext] Initializing auth state");
      let isMounted = true;

      const initializeAuth = async () => {
        setIsLoading(true);
        try {
          const userData = await fetchCurrentUser();
          if (isMounted) {
            setCurrentUser(userData);
            console.log(
                "[AuthContext] Auth initialized with user:",
                userData?.name,
            );
          }
        } catch (error) {
          console.error("[AuthContext] Error during auth initialization:", error);
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
        }
      };

      initializeAuth();

      return () => {
        isMounted = false;
      };
    }, []);

    // Login function - set token and fetch user
    const login = (token: string): void => {
      console.log("[AuthContext] Login called, setting token and fetching user");
      localStorage.setItem("access_token", token);
      refreshUser();
    };

    // Logout function - clear token and user
    const logout = (): void => {
      console.log("[AuthContext] Logout called, clearing auth data");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setCurrentUser(null);
    };

    // Calculate authentication status
    const isAuthenticated = !!currentUser;

    // Provide auth context value
    const value = {
      currentUser,
      isLoading,
      isAuthenticated,
      login,
      logout,
      refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
          {isInitialized ? children : <div>Initializing application...</div>}
        </AuthContext.Provider>
    );
  };

  // Custom hook to use auth context
  export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
  };
