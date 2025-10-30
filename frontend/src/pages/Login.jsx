import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./css/login.css";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Iniciar sesión</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

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
      </form>
    </div>
  );
}
