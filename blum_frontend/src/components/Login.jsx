import { useState } from "react";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "123") {
      onLogin("admin", "admin");
    } else if (username === "siane" && password === "123") {
      onLogin("salesperson", "siane");
    } else if (username === "eduardo" && password === "123") {
      onLogin("salesperson", "eduardo");
    } else {
      alert("Usuário ou senha inválidos");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-l from-[#0055aa] via-[#e0f0ff] to-white p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
        <h2 className="text-3xl font-extrabold text-center text-[#0055aa] mb-2 tracking-wide">
          BLUM Curitiba
        </h2>
        <p className="text-center text-gray-600 mb-8 text-sm">
          Acesse seu painel de controle
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055aa] transition duration-200"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055aa] transition duration-200"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#0055aa] text-white font-bold p-3 rounded-lg hover:bg-[#0077cc] transition duration-300 shadow-md"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;