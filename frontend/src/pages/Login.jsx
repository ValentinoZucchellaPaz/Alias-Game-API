import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./css/login.css";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error) {
      if (error?.response?.data?.details) {
        setError(
          `in ${error.response.data.details[0].path[0]}. ${error.response.data.details[0].message}`
        );
      } else if (error.response?.status == 401) {
        setError("Datos invalidos");
      } else {
        setError(error.response?.data?.message || error.message);
      }
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Iniciar sesión</h2>
      {error && (
        <p style={{ color: "red", textAlign: "center" }}>Error: {error}</p>
      )}
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="password-wrapper">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Button group */}
        <div className="login-button-group">
          <button type="submit" className="btn btn-primary">
            Entrar
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              login("user1@email.com", "123456");
            }}
          >
            Entrar con user1
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              login("user2@email.com", "123456");
            }}
          >
            Entrar con user2
          </button>
        </div>
        <p className="register-link">
          ¿No tienes una cuenta? <a href="/register">Regístrate aquí</a>
        </p>
      </form>
    </div>
  );
}
