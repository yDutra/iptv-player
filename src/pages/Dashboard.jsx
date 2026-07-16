import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Sun, Moon, Loader2, Tv, Film, Clapperboard } from 'lucide-react';
import Hls from 'hls.js';
import { getCategories, getStreams } from '../services/xtream';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [theme, setTheme] = useState('dark');
  const isDark = theme === 'dark';
  
  const colors = {
    bg: isDark ? '#0f0f0f' : '#f0f2f5',
    sidebar: isDark ? '#1a1a1a' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#1d1d1f',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? '#333333' : '#e5e5e5',
    cardGradient: isDark ? 'linear-gradient(145deg, #2a2a2a, #1f1f1f)' : 'linear-gradient(145deg, #ffffff, #e6e6e6)',
    cardShadow: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.15)',
    heroGradient: isDark ? 'linear-gradient(to bottom, rgba(15,15,15,0.85) 0%, #0f0f0f 100%)' : 'linear-gradient(to bottom, rgba(240,242,245,0.7) 0%, #f0f2f5 100%)',
  };

  const menusPrincipais = [
    { id: 'live', nome: 'TV Ao Vivo', icone: <Tv size={20} /> },
    { id: 'vod', nome: 'Filmes', icone: <Film size={20} /> },
    { id: 'series', nome: 'Séries', icone: <Clapperboard size={20} /> }
  ];

  // ESTADOS GERAIS
  const [credenciais, setCredenciais] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [canais, setCanais] = useState([]);
  const [isCarregando, setIsCarregando] = useState(true);

  // MOTOR DE OTIMIZAÇÃO
  const [cacheMemoria, setCacheMemoria] = useState({}); 
  const [limiteRenderizacao, setLimiteRenderizacao] = useState(60); 

  // ESTADOS DO AUTO-PLAY
  const [mostrarVideoHero, setMostrarVideoHero] = useState(false);
  const videoHeroRef = useRef(null);
  const autoPlayTimerRef = useRef(null);

  const [tipoConteudo, setTipoConteudo] = useState(() => sessionStorage.getItem('tv_tipo') || 'vod');
  const [zonaFocada, setZonaFocada] = useState(() => sessionStorage.getItem('tv_zona') || 'sidebar'); 
  const [indexCategoria, setIndexCategoria] = useState(() => Number(sessionStorage.getItem('tv_cat')) || 3); 
  const [indexCanal, setIndexCanal] = useState(() => Number(sessionStorage.getItem('tv_canal')) || 0);

  const colunasGrade = tipoConteudo === 'live' ? 4 : 6;
  const aspectoCard = tipoConteudo === 'live' ? '16/9' : '2/3';
  const numMenus = menusPrincipais.length;
  const maxSidebarIndex = numMenus + categorias.length; 
  
  const refsCanais = useRef([]);
  const refsCategorias = useRef([]);

  useEffect(() => {
    const carregarCategorias = async () => {
      const userStr = localStorage.getItem('iptv_user');
      if (!userStr) return navigate('/');
      
      const user = JSON.parse(userStr);
      setCredenciais(user);
      setIsCarregando(true);
      setCanais([]); 
      setLimiteRenderizacao(60); 
      
      const catsReais = await getCategories(user.url, user.username, user.password, tipoConteudo);
      
      if (catsReais && catsReais.length > 0) setCategorias(catsReais);
      else setCategorias([{ category_id: '0', category_name: 'Sem Conteúdo' }]);
    };
    carregarCategorias();
  }, [tipoConteudo, navigate]);

  useEffect(() => {
    let timer;
    if (credenciais && categorias.length > 0) {
      const indexRealCategoria = indexCategoria >= numMenus ? indexCategoria - numMenus : 0;
      const categoriaAtual = categorias[Math.min(indexRealCategoria, categorias.length - 1)];
      
      if (!categoriaAtual || !categoriaAtual.category_id) return;

      const chaveCache = `${tipoConteudo}_${categoriaAtual.category_id}`;

      if (cacheMemoria[chaveCache]) {
        setCanais(cacheMemoria[chaveCache]);
        setLimiteRenderizacao(Math.max(60, indexCanal + 60)); 
        setIsCarregando(false);
        return; 
      }

      setIsCarregando(true);
      timer = setTimeout(async () => {
        const filmesReais = await getStreams(credenciais.url, credenciais.username, credenciais.password, tipoConteudo, categoriaAtual.category_id);
        const listaFinal = filmesReais || [];
        
        setCanais(listaFinal);
        setLimiteRenderizacao(Math.max(60, indexCanal + 60));
        
        setCacheMemoria(prev => ({ ...prev, [chaveCache]: listaFinal }));
        setIsCarregando(false);
      }, 400); 
    }
    return () => clearTimeout(timer);
  }, [indexCategoria, categorias, credenciais, numMenus, tipoConteudo, cacheMemoria, indexCanal]);

  useEffect(() => {
    if (indexCanal >= limiteRenderizacao - 15) {
      setLimiteRenderizacao(prev => prev + 60);
    }
  }, [indexCanal, limiteRenderizacao]);

  useEffect(() => {
    sessionStorage.setItem('tv_tipo', tipoConteudo);
    sessionStorage.setItem('tv_zona', zonaFocada);
    sessionStorage.setItem('tv_cat', indexCategoria.toString());
    sessionStorage.setItem('tv_canal', indexCanal.toString());
  }, [tipoConteudo, zonaFocada, indexCategoria, indexCanal]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) e.preventDefault();
      if (categorias.length === 0 && zonaFocada !== 'sidebar') return; 

      if (zonaFocada === 'sidebar') {
        if (e.key === 'ArrowDown') setIndexCategoria(prev => Math.min(prev + 1, maxSidebarIndex));
        else if (e.key === 'ArrowUp') setIndexCategoria(prev => Math.max(prev - 1, 0));
        else if (e.key === 'ArrowRight' && canais.length > 0) {
          setZonaFocada('grid');
        }
        else if (e.key === 'Enter') {
          if (indexCategoria < numMenus) {
            setTipoConteudo(menusPrincipais[indexCategoria].id);
            setIndexCategoria(numMenus); 
            setIndexCanal(0);
          } 
          else if (indexCategoria === maxSidebarIndex) setTheme(prev => prev === 'dark' ? 'light' : 'dark');
          else if (canais.length > 0) {
            setZonaFocada('grid');
          }
        }
      } 
      else if (zonaFocada === 'grid') {
        if (e.key === 'ArrowRight') setIndexCanal(prev => Math.min(prev + 1, canais.length - 1));
        else if (e.key === 'ArrowLeft') {
          if (indexCanal % colunasGrade === 0 || indexCanal === 0) setZonaFocada('sidebar');
          else setIndexCanal(prev => Math.max(prev - 1, 0));
        } 
        else if (e.key === 'ArrowDown') setIndexCanal(prev => Math.min(prev + colunasGrade, canais.length - 1));
        else if (e.key === 'ArrowUp' && indexCanal >= colunasGrade) setIndexCanal(prev => prev - colunasGrade);
        else if (e.key === 'Enter') {
          if (tipoConteudo === 'series') {
            navigate('/series', { state: { serie: canais[indexCanal], credenciais } });
          } else {
            navigate('/player', { state: { stream: canais[indexCanal], credenciais, tipo: tipoConteudo } });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zonaFocada, indexCanal, indexCategoria, maxSidebarIndex, colunasGrade, canais.length, categorias.length, numMenus, menusPrincipais, navigate, tipoConteudo, credenciais]);

  useEffect(() => {
    if (zonaFocada === 'grid' && refsCanais.current[indexCanal]) {
      setTimeout(() => refsCanais.current[indexCanal]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [indexCanal, zonaFocada, canais]); 

  useEffect(() => {
    if (zonaFocada === 'sidebar' && refsCategorias.current[indexCategoria]) {
      setTimeout(() => refsCategorias.current[indexCategoria]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [indexCategoria, zonaFocada, categorias]);

  const isSidebarOpen = zonaFocada === 'sidebar';
  const indexRealCategoria = indexCategoria >= numMenus ? indexCategoria - numMenus : 0;
  const nomeCategoriaAtiva = categorias.length > 0 ? categorias[Math.min(indexRealCategoria, categorias.length - 1)]?.category_name : 'Carregando...';
  const itemFocado = canais.length > 0 ? canais[indexCanal] : null;

  useEffect(() => {
    setMostrarVideoHero(false);
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);

    if (itemFocado && zonaFocada === 'grid' && (tipoConteudo === 'live' || tipoConteudo === 'vod')) {
      autoPlayTimerRef.current = setTimeout(() => {
        setMostrarVideoHero(true);
      }, 1500); 
    }

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [itemFocado, zonaFocada, tipoConteudo]);

  let heroStreamUrl = '';
  if (itemFocado && credenciais) {
    const baseUrl = credenciais.url.replace(/\/$/, "");
    if (tipoConteudo === 'live') {
      heroStreamUrl = `${baseUrl}/live/${credenciais.username}/${credenciais.password}/${itemFocado.stream_id}.m3u8`;
    } else if (tipoConteudo === 'vod') {
      const ext = itemFocado.container_extension || 'mp4';
      heroStreamUrl = `${baseUrl}/movie/${credenciais.username}/${credenciais.password}/${itemFocado.stream_id}.${ext}`;
    }
  }

  useEffect(() => {
    const video = videoHeroRef.current;
    if (!video || !mostrarVideoHero || !heroStreamUrl) return;

    let hls;
    const isHls = heroStreamUrl.includes('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({ debug: false, enableWorker: true });
        hls.loadSource(heroStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log("Auto-play silencioso bloqueado", e));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = heroStreamUrl;
        video.play().catch(e => console.log("Auto-play silencioso bloqueado", e));
      }
    } else {
      video.src = heroStreamUrl;
      video.play().catch(e => console.log("Auto-play silencioso bloqueado", e));
    }

    return () => {
      if (hls) hls.destroy();
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, [mostrarVideoHero, heroStreamUrl]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg, color: colors.textMain, overflow: 'hidden', transition: 'background 0.3s' }}>
      
      {/* BARRA LATERAL */}
      <div 
        style={{ 
          width: isSidebarOpen ? '280px' : '0px',
          background: colors.sidebar, 
          borderRight: isSidebarOpen ? `1px solid ${colors.border}` : '0px solid transparent',
          transition: 'width 0.4s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 50 
        }}
      >
        <div style={{ width: '280px', padding: '20px 15px', display: 'flex', flexDirection: 'column', height: '100%', opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
          <h2 style={{ color: '#E50914', marginBottom: '25px', textAlign: 'center', fontSize: '28px', fontWeight: '900', letterSpacing: '1px' }}>IPTV PRO</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', padding: '5px' }}>
            
            {menusPrincipais.map((menu, index) => {
              const isFocado = isSidebarOpen && indexCategoria === index;
              const isAtivo = tipoConteudo === menu.id; 
              return (
                <div
                  key={menu.id} ref={el => refsCategorias.current[index] = el} 
                  style={{
                    padding: '14px 16px', background: isAtivo ? '#E50914' : 'transparent', color: isAtivo ? 'white' : colors.textMain,
                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: isAtivo ? '900' : '600',
                    border: isFocado ? `3px solid ${isDark ? 'white' : '#1d1d1f'}` : '3px solid transparent', transform: isFocado ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.15s ease', boxShadow: isFocado ? `0 0 15px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` : 'none',
                    marginBottom: index === numMenus - 1 ? '15px' : '0' 
                  }}
                >
                  {menu.icone}
                  <span style={{ fontSize: '15px', textTransform: 'uppercase' }}>{menu.nome}</span>
                </div>
              );
            })}

            <div style={{ height: '1px', background: colors.border, marginBottom: '10px', flexShrink: 0 }} />

            {categorias.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '20px', color: colors.textMuted }}>Carregando dados...</div>
            ) : (
                categorias.map((cat, idx) => {
                  const globalIndex = idx + numMenus; 
                  const isFocado = isSidebarOpen && indexCategoria === globalIndex;
                  const isAtivo = Math.min(indexRealCategoria, categorias.length - 1) === idx; 
                  return (
                      <div
                      key={cat.category_id || idx} ref={el => refsCategorias.current[globalIndex] = el} 
                      style={{
                          padding: '14px 16px', background: 'transparent', color: isAtivo ? '#E50914' : colors.textMain,
                          borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: isAtivo ? '600' : '400',
                          border: isFocado ? `3px solid ${isDark ? 'white' : '#1d1d1f'}` : '3px solid transparent', transform: isFocado ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                      }}
                      >
                      <Folder size={18} />
                      <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.category_name}</span>
                      </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        {/* PAINEL HERO */}
        <div style={{ 
          padding: '40px 40px 20px 40px', 
          minHeight: '260px', 
          flexShrink: 0, 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          background: colors.heroGradient, 
          zIndex: 10, 
          transition: 'transform 0.4s ease, background 0.3s',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(10px)',
          position: 'relative', 
          overflow: 'hidden'
        }}>
          
          {mostrarVideoHero && (tipoConteudo === 'live' || tipoConteudo === 'vod') && (
            <video 
              ref={videoHeroRef}
              muted
              loop
              playsInline
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                zIndex: 1, opacity: 0.65, transition: 'opacity 0.5s ease-in-out', pointerEvents: 'none'
              }}
            />
          )}

          {mostrarVideoHero && (
            <div style={{
              position: 'absolute', inset: 0,
              background: isDark 
                ? 'linear-gradient(to top, #0f0f0f 0%, rgba(15,15,15,0) 50%), linear-gradient(to right, #0f0f0f 20%, rgba(15,15,15,0) 80%)'
                : 'linear-gradient(to top, #f0f2f5 0%, rgba(240,242,245,0) 50%), linear-gradient(to right, #f0f2f5 20%, rgba(240,242,245,0) 80%)',
              zIndex: 2, pointerEvents: 'none'
            }} />
          )}

          <div style={{ position: 'relative', zIndex: 3 }}>
            <h3 style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
              {nomeCategoriaAtiva}
            </h3>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 12px 0', textShadow: isDark ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none', lineHeight: '1.2' }}>
              {itemFocado ? itemFocado.name : 'Carregando...'}
            </h1>
            {itemFocado && tipoConteudo !== 'live' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontSize: '13px', fontWeight: '700' }}>
                <span style={{ color: '#46d369' }}>Rating: {itemFocado.rating || 'N/A'}</span>
                <span style={{ border: `1px solid ${colors.textMuted}`, color: colors.textMuted, padding: '2px 6px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                  {itemFocado.container_extension || 'VOD'}
                </span>
              </div>
            )}
            {tipoConteudo === 'live' && (
              <p style={{ fontSize: '15px', color: '#46d369', fontWeight: 'bold', margin: 0 }}>🟢 TELA AO VIVO</p>
            )}
          </div>
        </div>
        
        {/* ========================================================= */}
        {/* A MÁGICA: CONTÊINER COM MÁSCARA DE ESFUMAÇAMENTO          */}
        {/* ========================================================= */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px 40px 300px 40px', // Padding levemente ajustado para o fade atuar forte nas imagens
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 80px, black calc(100% - 60px), transparent 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0px, black 80px, black calc(100% - 60px), transparent 100%)'
        }}>
          {isCarregando ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: colors.textMuted, gap: '10px' }}>
              <Loader2 className="animate-spin" size={24} /> Carregando catálogo...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunasGrade}, 1fr)`, gap: '20px' }}>
              
              {canais.slice(0, limiteRenderizacao).map((item, index) => {
                const isFocado = zonaFocada === 'grid' && indexCanal === index;

                return (
                  <div 
                    key={item.stream_id || index}
                    ref={el => refsCanais.current[index] = el}
                    style={{ 
                      aspectRatio: aspectoCard, background: colors.cardGradient, borderRadius: '8px', 
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      border: isFocado ? '4px solid #E50914' : '4px solid transparent', transform: isFocado ? 'scale(1.12)' : 'scale(1)', 
                      boxShadow: isFocado ? '0 15px 35px rgba(229, 9, 20, 0.4)' : `0 8px 15px ${colors.cardShadow}`,
                      transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)', zIndex: isFocado ? 10 : 1, overflow: 'hidden', position: 'relative'
                    }}
                  >
                    {(item.stream_icon || item.cover) ? (
                      <img 
                        src={item.stream_icon || item.cover} 
                        alt={item.name} 
                        loading="lazy" 
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: tipoConteudo === 'live' ? 'contain' : 'cover', padding: tipoConteudo === 'live' ? '10px' : '0' }}
                        onError={(e) => { e.target.style.display = 'none'; }} 
                      />
                    ) : null}
                    
                    <div style={{ position: 'absolute', bottom: '10px', padding: '0 10px', textAlign: 'center', width: '100%', textShadow: '1px 1px 3px black' }}>
                      <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}