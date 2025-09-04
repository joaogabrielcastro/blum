import { useState } from "react";

const BLU1M = "/BLU1M.jpg";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "123") {
      onLogin("admin", "admin"); // role, username
    } else if (username === "siane" && password === "123") {
      onLogin("salesperson", "siane");
    } else if (username === "eduardo" && password === "123") {
      onLogin("salesperson", "eduardo");
    } else {
      alert("Usuário ou senha inválidos");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Blum
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Acesse seu painel de controle
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-gray-700 text-sm font-medium mb-2"
              htmlFor="username"
            >
              Usuário
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              required
            />
          </div>
          <div>
            <label
              className="block text-gray-700 text-sm font-medium mb-2"
              htmlFor="password"
            >
              Senha
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
