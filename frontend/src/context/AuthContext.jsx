import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const register = async (email, name, password) => {
    try {
      await api.post("/auth/register", { email, name, password });
      navigate("/login");
    } catch (err) {
      console.log(err);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const accessToken = res.data.accessToken;
      const decoded = jwtDecode(accessToken);
      setToken(accessToken);
      setUser(decoded);
      navigate("/");
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  const refreshAccessToken = async () => {
    try {
      const res = await api.post("/auth/refresh-token");
      const accessToken = res.data.accessToken;
      const decoded = jwtDecode(accessToken);
      setToken(accessToken);
      setUser(decoded);
      return accessToken;
    } catch (err) {
      setToken(null);
      setUser(null);
      navigate("/login");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setToken,
        setUser,
        register,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
