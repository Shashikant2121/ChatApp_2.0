import { createContext, useContext, useEffect, useState } from "react";

import { getCurrentUser, logoutUser } from "../services/authService";

import socket from "../services/socket";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // ==========================================
  // CHECK AUTH
  // ==========================================

  const checkAuth = async () => {
    try {
      const data = await getCurrentUser();

      console.log("Auth Me Response:", data);

      setUser(data.user);
    } catch (error) {
      console.log("User is not logged in");

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    try {
      // Disconnect socket first
      if (socket.connected) {
        socket.disconnect();
      }

      // Logout API
      await logoutUser();

      // Clear frontend user state
      setUser(null);

      console.log("Logout successful");
    } catch (error) {
      console.error("Logout Error:", error);

      // Even if API fails,
      // clear local user state
      setUser(null);

      if (socket.connected) {
        socket.disconnect();
      }
    }
  };

  // ==========================================
  // CHECK AUTH ON APP LOAD
  // ==========================================

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// USE AUTH
// ==========================================

export const useAuth = () => {
  return useContext(AuthContext);
};
