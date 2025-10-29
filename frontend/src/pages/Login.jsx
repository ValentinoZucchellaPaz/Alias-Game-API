import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-md w-80"
      >
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Iniciar sesión
        </h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="w-full mb-3 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Entrar
        </button>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              login("user1@email.com", "123456");
            }}
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            Entrar con user1
          </button>
          <button
            type="button"
            onClick={() => {
              login("user2@email.com", "123456");
            }}
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            Entrar con user2
          </button>
        </div>
      </form>
    </div>
  );
}
