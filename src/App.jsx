import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Player from './pages/Player'; // Importamos a tela nova

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/player" element={<Player />} /> {/* Registramos a rota */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;