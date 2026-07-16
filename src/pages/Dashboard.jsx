import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Dados falsos (Mock) apenas para montarmos o visual antes de plugar a API
  const categorias = ['Favoritos', 'TV Aberta', 'Filmes', 'Séries', 'Esportes', 'Infantil'];
  const canais = ['Canal 1', 'Canal 2', 'Canal 3', 'Canal 4', 'Canal 5', 'Canal 6', 'Canal 7', 'Canal 8', 'Canal 9', 'Canal 10'];

  const [categoriaAtiva, setCategoriaAtiva] = useState(0);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: 'white' }}>
      
      {/* BARRA LATERAL (CATEGORIAS) */}
      <div style={{ width: '280px', background: '#1a1a1a', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#E50914', marginBottom: '30px', textAlign: 'center', fontSize: '32px', fontWeight: '900', letterSpacing: '2px' }}>IPTV PRO</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
          {categorias.map((cat, index) => (
            <button
              key={index}
              onClick={() => setCategoriaAtiva(index)}
              style={{
                padding: '18px 20px',
                textAlign: 'left',
                background: categoriaAtiva === index ? '#E50914' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                cursor: 'pointer',
                fontWeight: categoriaAtiva === index ? 'bold' : 'normal',
                transition: 'background 0.2s, transform 0.1s',
                transform: categoriaAtiva === index ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => navigate('/')} 
          style={{ marginTop: '20px', padding: '15px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          Desconectar
        </button>
      </div>

      {/* ÁREA PRINCIPAL (GRADE DE CANAIS) */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '30px', fontWeight: 'bold', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          {categorias[categoriaAtiva]}
        </h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
          {canais.map((canal, index) => (
            <div 
              key={index} 
              onClick={() => navigate('/player')} /* <--- ROTEAMENTO ADICIONADO AQUI */
              style={{ 
                background: 'linear-gradient(145deg, #2a2a2a, #1f1f1f)', 
                height: '140px', 
                borderRadius: '12px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                cursor: 'pointer',
                boxShadow: '0 8px 15px rgba(0,0,0,0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.border = '2px solid #E50914';
              }}
              onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.border = 'none';
              }}
            >
              <span style={{ fontSize: '22px', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{canal}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}