import { useNavigate } from 'react-router-dom';

export default function Player() {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', height: '100%', background: 'black', position: 'relative' }}>
      
      {/* Botão de Voltar (Simula o "Back" do controle remoto) */}
      <button 
        onClick={() => navigate(-1)} 
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          zIndex: 999,
          padding: '12px 24px',
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          border: '2px solid white',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(229, 9, 20, 0.8)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.6)'}
      >
        ← Voltar
      </button>

      {/* Motor de Vídeo Nativo HTML5 (Blindado) */}
      <video 
        src="https://www.w3schools.com/html/mov_bbb.mp4"
        autoPlay
        controls
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      
    </div>
  );
}