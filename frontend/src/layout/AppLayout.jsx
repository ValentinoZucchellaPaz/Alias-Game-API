import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./layout.css";

export default function AppLayout({ children }) {
  const location = useLocation();
  const isRoomPage = location.pathname.startsWith("/room");
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-logo">⚔️ Alias Game 🔎</h1>

        <div className="app-user-container">
          {user ? (
            <>
              <span className="app-user-text">player: {user.name}</span>
              <button
                type="button"
                className="app-logout-button"
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </header>

      <main className="app-main">
        <div className={`app-content ${isRoomPage ? "room-page-content" : ""}`}>
          {children}
        </div>
      </main>

      <footer className="app-footer">
        © {new Date().getFullYear()} Alias Game. All rights reserved.
      </footer>
    </div>
  );
}
