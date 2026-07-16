import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Player from './pages/Player';
import SeriesDetails from './pages/SeriesDetails'; // NOVA IMPORTAÇÃO

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/player" element={<Player />} />
        {/* NOVA ROTA ADICIONADA ABAIXO */}
        <Route path="/series" element={<SeriesDetails />} />
      </Routes>
    </Router>
  );
}