import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import useAxiosAuth from "./hooks/useAxiosAuth";
import RoomPage from "./pages/RoomPage";
import AppLayout from "./layout/AppLayout.jsx";

function App() {
  useAxiosAuth(); // activar interceptores de axios (agregan token a todas las req)
  const { token, user } = useAuth();

  return (
    <AppLayout user={user}>
      <Routes>
        <Route
          path="/"
          element={token ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!token ? <Login /> : <Navigate to="/" replace />}
        />
        <Route
          path="/room/:roomCode"
          element={token ? <RoomPage /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </AppLayout>
  );
}

export default App;
