import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv, Globe, User, Key, LogIn, Link2, AlertCircle, Hash, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  
  // ====================================================================
  // 1. A URL DO SEU DICIONÁRIO NA NUVEM (GITHUB RAW)
  // Substitua este link pelo link "Raw" do seu Gist ou Repositório
  // ====================================================================
  const GITHUB_DICT_URL = "COLE_AQUI_O_SEU_LINK_RAW_DO_GITHUB_GIST";

  // 🎨 PALETA DE CORES UNIFICADA: Indigo Premium
  const colors = {
    bg: '#09090b',
    glass: 'rgba(9, 9, 11, 0.75)',
    accent: '#6366f1',
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    textMain: '#f8fafc',
    textMuted: '#a1a1aa',
    border: 'rgba(255, 255, 255, 0.08)',
    inputBg: 'rgba(255, 255, 255, 0.03)'
  };

  // 2. ESTADOS DO FORMULÁRIO
  const [modoLogin, setModoLogin] = useState('codigo'); 
  const [codigo, setCodigo] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState('');

  // 3. MOTOR DE NAVEGAÇÃO ESPACIAL (COMANDO DE TV)
  const [focoIndex, setFocoIndex] = useState(0); 
  const inputRefs = useRef([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();

      if (e.key === 'ArrowDown') setFocoIndex(prev => Math.min(prev + 1, 5));
      else if (e.key === 'ArrowUp') setFocoIndex(prev => Math.max(prev - 1, 0));
      else if (e.key === 'ArrowRight' && focoIndex === 0) setFocoIndex(1);
      else if (e.key === 'ArrowLeft' && focoIndex === 1) setFocoIndex(0);
      else if (e.key === 'Enter') {
        if (focoIndex === 0) { setModoLogin('codigo'); setFocoIndex(2); } 
        else if (focoIndex === 1) { setModoLogin('url'); setFocoIndex(2); } 
        else if (focoIndex >= 2 && focoIndex <= 4) inputRefs.current[focoIndex - 2]?.focus();
        else if (focoIndex === 5) handleLogin(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focoIndex, modoLogin, codigo, url, username, password]);

  useEffect(() => {
    if (focoIndex >= 2 && focoIndex <= 4) inputRefs.current[focoIndex - 2]?.focus();
    else inputRefs.current.forEach(ref => ref?.blur());
  }, [focoIndex]);

  // 4. LÓGICA DE AUTENTICAÇÃO COM CONSULTA AO GITHUB
  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setIsLoading(true);

    let urlFinal = '';

    // A. MODO CÓDIGO (Consulta a Nuvem)
    if (modoLogin === 'codigo') {
      try {
        const res = await fetch(GITHUB_DICT_URL);
        if (!res.ok) throw new Error("Falha no download do JSON");
        
        const dicionario = await res.json();
        const codigoDigitado = codigo.trim().toUpperCase();
        
        // Procura a chave no JSON (ignorando maiúsculas e minúsculas)
        const chaveEncontrada = Object.keys(dicionario).find(k => k.toUpperCase() === codigoDigitado);

        if (!chaveEncontrada) {
          setErro("Código de provedor inválido ou não encontrado na nuvem.");
          setIsLoading(false);
          return;
        }
        
        urlFinal = dicionario[chaveEncontrada];
      } catch (error) {
        console.error("Erro ao consultar GitHub:", error);
        setErro("Falha ao conectar com o banco de códigos. Verifique a sua internet.");
        setIsLoading(false);
        return;
      }
    } 
    // B. MODO ESPECIALISTA (URL Direta)
    else {
      if (!url) {
        setErro("Por favor, introduza a URL do servidor.");
        setIsLoading(false);
        return;
      }
      urlFinal = url.startsWith('http') ? url : `http://${url}`;
    }

    if (!username || !password) {
      setErro("Usuário e Senha são obrigatórios.");
      setIsLoading(false);
      return;
    }

    // C. AUTENTICAÇÃO FINAL COM XTREAM CODES
    try {
      const authUrl = `${urlFinal}/player_api.php?username=${username}&password=${password}`;
      const resposta = await fetch(authUrl);
      const dados = await resposta.json();

      if (dados && dados.user_info && dados.user_info.auth === 1) {
        const userSave = {
          url: urlFinal,
          username: username,
          password: password,
          server_info: dados.server_info
        };
        localStorage.setItem('iptv_user', JSON.stringify(userSave));
        navigate('/dashboard');
      } else {
        setErro("Usuário ou Senha incorretos.");
      }
    } catch (error) {
      console.error(error);
      setErro("Falha ao ligar ao servidor IPTV. Verifique se o painel está online.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, color: colors.textMain, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Decorativo - Glow Indigo */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', background: `radial-gradient(circle at 50% 50%, ${colors.accentGlow} 0%, transparent 60%)`, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '480px', zIndex: 10 }}>
        
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ color: colors.accent, fontSize: '46px', fontWeight: '900', letterSpacing: '2px', textShadow: `0 4px 20px ${colors.accentGlow}`, margin: 0 }}>
            IPTV PRO
          </h1>
          <p style={{ color: colors.textMuted, marginTop: '10px', fontSize: '15px', fontWeight: '500' }}>O seu portal de entretenimento universal</p>
        </div>

        {/* CONTAINER DO FORMULÁRIO (Glassmorphism Premium) */}
        <div style={{ 
            background: colors.glass, padding: '40px', borderRadius: '24px', 
            border: `1px solid ${colors.border}`, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', 
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' 
        }}>
          
          {/* SELETOR DE ABAS */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '14px' }}>
            <button 
              onMouseEnter={() => setFocoIndex(0)}
              onClick={() => { setModoLogin('codigo'); setFocoIndex(2); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                background: modoLogin === 'codigo' ? colors.accent : 'transparent',
                color: modoLogin === 'codigo' ? 'white' : colors.textMuted,
                border: focoIndex === 0 ? '2px solid white' : '2px solid transparent',
                boxShadow: modoLogin === 'codigo' ? `0 4px 15px ${colors.accentGlow}` : 'none'
              }}
            >
              <Hash size={18} /> Via Código
            </button>
            <button 
              onMouseEnter={() => setFocoIndex(1)}
              onClick={() => { setModoLogin('url'); setFocoIndex(2); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                background: modoLogin === 'url' ? colors.accent : 'transparent',
                color: modoLogin === 'url' ? 'white' : colors.textMuted,
                border: focoIndex === 1 ? '2px solid white' : '2px solid transparent',
                boxShadow: modoLogin === 'url' ? `0 4px 15px ${colors.accentGlow}` : 'none'
              }}
            >
              <Globe size={18} /> Especialista
            </button>
          </div>

          {/* MENSAGEM DE ERRO */}
          {erro && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '14px', borderRadius: '12px', color: '#f87171', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} flexShrink={0} /> {erro}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* INPUT 1: CÓDIGO OU URL */}
            <div style={{ position: 'relative' }}>
              {modoLogin === 'codigo' ? (
                <>
                  <Hash size={20} style={{ position: 'absolute', left: '18px', top: '18px', color: focoIndex === 2 ? colors.accent : colors.textMuted, transition: 'color 0.2s' }} />
                  <input 
                    ref={el => inputRefs.current[0] = el} onFocus={() => setFocoIndex(2)}
                    type="text" placeholder="Código do Provedor (ex: VIP)" value={codigo} onChange={(e) => setCodigo(e.target.value)}
                    style={{ width: '100%', padding: '18px 18px 18px 50px', background: colors.inputBg, border: focoIndex === 2 ? `2px solid ${colors.accent}` : `2px solid transparent`, borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '500', outline: 'none', transition: 'all 0.2s', boxShadow: focoIndex === 2 ? `0 0 15px ${colors.accentGlow}` : 'none' }}
                  />
                </>
              ) : (
                <>
                  <Link2 size={20} style={{ position: 'absolute', left: '18px', top: '18px', color: focoIndex === 2 ? colors.accent : colors.textMuted, transition: 'color 0.2s' }} />
                  <input 
                    ref={el => inputRefs.current[0] = el} onFocus={() => setFocoIndex(2)}
                    type="text" placeholder="http://servidor-iptv.com:8080" value={url} onChange={(e) => setUrl(e.target.value)}
                    style={{ width: '100%', padding: '18px 18px 18px 50px', background: colors.inputBg, border: focoIndex === 2 ? `2px solid ${colors.accent}` : `2px solid transparent`, borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '500', outline: 'none', transition: 'all 0.2s', boxShadow: focoIndex === 2 ? `0 0 15px ${colors.accentGlow}` : 'none' }}
                  />
                </>
              )}
            </div>

            {/* INPUT 2: USUÁRIO */}
            <div style={{ position: 'relative' }}>
              <User size={20} style={{ position: 'absolute', left: '18px', top: '18px', color: focoIndex === 3 ? colors.accent : colors.textMuted, transition: 'color 0.2s' }} />
              <input 
                ref={el => inputRefs.current[1] = el} onFocus={() => setFocoIndex(3)}
                type="text" placeholder="Utilizador" value={username} onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '18px 18px 18px 50px', background: colors.inputBg, border: focoIndex === 3 ? `2px solid ${colors.accent}` : `2px solid transparent`, borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '500', outline: 'none', transition: 'all 0.2s', boxShadow: focoIndex === 3 ? `0 0 15px ${colors.accentGlow}` : 'none' }}
              />
            </div>

            {/* INPUT 3: SENHA */}
            <div style={{ position: 'relative' }}>
              <Key size={20} style={{ position: 'absolute', left: '18px', top: '18px', color: focoIndex === 4 ? colors.accent : colors.textMuted, transition: 'color 0.2s' }} />
              <input 
                ref={el => inputRefs.current[2] = el} onFocus={() => setFocoIndex(4)}
                type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '18px 18px 18px 50px', background: colors.inputBg, border: focoIndex === 4 ? `2px solid ${colors.accent}` : `2px solid transparent`, borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '500', outline: 'none', transition: 'all 0.2s', boxShadow: focoIndex === 4 ? `0 0 15px ${colors.accentGlow}` : 'none' }}
              />
            </div>

            {/* BOTÃO DE SUBMIT */}
            <button 
              type="submit"
              onMouseEnter={() => setFocoIndex(5)}
              disabled={isLoading}
              style={{
                width: '100%', padding: '18px', marginTop: '15px', borderRadius: '14px', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                background: colors.textMain,
                color: colors.bg,
                border: focoIndex === 5 ? `3px solid ${colors.accent}` : '3px solid transparent',
                transform: focoIndex === 5 ? 'scale(1.03)' : 'scale(1)',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: focoIndex === 5 ? `0 10px 25px ${colors.accentGlow}` : 'none'
              }}
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                <> <LogIn size={22} /> Entrar na Plataforma </>
              )}
            </button>

          </form>

          {/* DICA DE NAVEGAÇÃO PARA TV */}
          <div style={{ textAlign: 'center', marginTop: '25px', color: colors.textMuted, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500' }}>
             <Tv size={16} /> Compatível com navegação por comando (Setas)
          </div>

        </div>
      </div>
    </div>
  );
}