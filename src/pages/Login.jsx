import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticate } from '../services/xtream';

export default function Login() {
  const navigate = useNavigate();
  
  // Memória local da tela (Estados)
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Chama o serviço que criamos
    const result = await authenticate(url, username, password);

    if (result.success) {
      // Salva os dados no aparelho do usuário para ele não precisar logar de novo amanhã
      localStorage.setItem('iptv_user', JSON.stringify({ url, username, password }));
      
      // Validação de segurança caso server_info não exista
      if (result.data && result.data.server_info) {
        localStorage.setItem('iptv_server_data', JSON.stringify(result.data.server_info));
      }
      
      // Vai para a tela de canais
      navigate('/dashboard');
    } else {
      // Mostra a mensagem de erro na tela
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{ background: '#000000', height: '100vh', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px', background: '#1a1a1a', padding: '50px', borderRadius: '12px' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', fontSize: '28px' }}>Login IPTV</h2>
        
        {/* Mostra mensagem de erro se existir */}
        {error && <div style={{ background: '#ff3333', color: 'white', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>{error}</div>}

        <input 
          type="text" 
          placeholder="URL do Servidor (ex: http://...)" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ padding: '18px', fontSize: '18px', borderRadius: '6px', border: 'none', background: '#333', color: 'white' }} 
          required 
        />
        <input 
          type="text" 
          placeholder="Usuário" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: '18px', fontSize: '18px', borderRadius: '6px', border: 'none', background: '#333', color: 'white' }} 
          required 
        />
        <input 
          type="password" 
          placeholder="Senha" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '18px', fontSize: '18px', borderRadius: '6px', border: 'none', background: '#333', color: 'white' }} 
          required 
        />
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ padding: '20px', marginTop: '10px', fontSize: '18px', background: isLoading ? '#555' : '#E50914', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          {isLoading ? 'CONECTANDO...' : 'ACESSAR CANAIS'}
        </button>

        {/* Botão temporário para pular o bloqueio do navegador durante a criação do app */}
        <button 
          type="button" 
          onClick={() => navigate('/dashboard')}
          style={{ padding: '15px', marginTop: '5px', fontSize: '14px', background: 'transparent', color: '#aaa', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer' }}
        >
          PULAR LOGIN (MODO DEV)
        </button>
      </form>
    </div>
  );
}