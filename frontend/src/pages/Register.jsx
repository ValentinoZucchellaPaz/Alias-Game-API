import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./css/login.css"; // reutilizamos los mismos estilos

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(email, name, password);
    } catch (error) {
      if (error?.response?.data?.details) {
        setError(
          `in ${error.response.data.details[0].path[0]}. ${error.response.data.details[0].message}`
        );
      } else {
        setError(error.response?.data?.message || error.message);
      }
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Crear cuenta</h2>
      {error && (
        <p style={{ color: "red", textAlign: "center" }}>Error: {error}</p>
      )}

      <form className="login-form" onSubmit={handleSubmit}>
        <input
          name="name"
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
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

        <div className="login-button-group">
          <button type="submit" className="btn btn-primary">
            Registrarse
          </button>

          <a
            href="/login"
            className="btn btn-ghost"
            style={{ textAlign: "center" }}
          >
            Ya tengo cuenta
          </a>
        </div>
      </form>
    </div>
  );
}
