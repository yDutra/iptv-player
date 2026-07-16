import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Tv, Film, Clapperboard, Search, Star, Play, ArrowLeft, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import { getCategories, getStreams } from '../services/xtream';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [theme, setTheme] = useState('dark');
  const isDark = theme === 'dark';
  
  // 🎨 PALETA DE CORES: Indigo Premium
  const colors = {
    bg: isDark ? '#09090b' : '#f4f4f5',
    sidebar: isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    textMain: isDark ? '#f8fafc' : '#18181b',
    textMuted: isDark ? '#a1a1aa' : '#71717a',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    cardGradient: isDark ? 'linear-gradient(145deg, #18181b, #09090b)' : 'linear-gradient(145deg, #ffffff, #f4f4f5)',
    cardShadow: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.10)',
    heroGradient: isDark ? 'linear-gradient(to bottom, rgba(9,9,11,0.4) 0%, #09090b 100%)' : 'linear-gradient(to bottom, rgba(244,244,245,0.6) 0%, #f4f4f5 100%)',
    accent: '#6366f1', 
    accentGlow: 'rgba(99, 102, 241, 0.4)'
  };

  const menusPrincipais = [
    { id: 'live', nome: 'TV Ao Vivo', icone: <Tv size={20} /> },
    { id: 'vod', nome: 'Filmes', icone: <Film size={20} /> },
    { id: 'series', nome: 'Séries', icone: <Clapperboard size={20} /> }
  ];

  const [credenciais, setCredenciais] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [canais, setCanais] = useState([]);
  const [isCarregando, setIsCarregando] = useState(true);

  const [cacheMemoria, setCacheMemoria] = useState({});
  const [limiteRenderizacao, setLimiteRenderizacao] = useState(60);

  const [mostrarVideoHero, setMostrarVideoHero] = useState(false);
  const videoHeroRef = useRef(null);
  const autoPlayTimerRef = useRef(null);

  const [termoBusca, setTermoBusca] = useState('');
  const inputBuscaRef = useRef(null);

  // PROTEÇÃO 1: Cofre de favoritos blindado contra corrupção de memória
  const [favoritos, setFavoritos] = useState(() => {
    try {
      const salvos = localStorage.getItem('iptv_favoritos');
      const parsed = salvos ? JSON.parse(salvos) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedModalBtn, setFocusedModalBtn] = useState(0); 

  const [tipoConteudo, setTipoConteudo] = useState(() => sessionStorage.getItem('tv_tipo') || 'vod');
  const [zonaFocada, setZonaFocada] = useState(() => sessionStorage.getItem('tv_zona') || 'sidebar');
  const [indexCategoria, setIndexCategoria] = useState(() => Number(sessionStorage.getItem('tv_cat')) || 3);
  const [indexCanal, setIndexCanal] = useState(() => Number(sessionStorage.getItem('tv_canal')) || 0);

  const colunasGrade = tipoConteudo === 'live' ? 4 : 6;
  const aspectoCard = tipoConteudo === 'live' ? '16/9' : '2/3';
  const numMenus = menusPrincipais.length;
  const maxSidebarIndex = numMenus + categorias.length;
  
  const getIdUnico = (item) => item?.stream_id || item?.series_id || item?.id;

  // PROTEÇÃO 2: Corrige índice sem bloquear os menus superiores
  useEffect(() => {
    if (categorias.length > 0) {
      const maxIndex = numMenus + categorias.length - 1;
      if (indexCategoria > maxIndex) {
        setIndexCategoria(numMenus);
      }
    }
  }, [categorias, numMenus, indexCategoria]);

  useEffect(() => {
    localStorage.setItem('iptv_favoritos', JSON.stringify(favoritos));
  }, [favoritos]);

  useEffect(() => {
    setTermoBusca('');
  }, [indexCategoria, tipoConteudo]);

  useEffect(() => {
    if (zonaFocada === 'search_input') inputBuscaRef.current?.focus();
    else inputBuscaRef.current?.blur();
  }, [zonaFocada]);

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
      const catFavoritos = { category_id: 'favs', category_name: '⭐ Minha Lista' };
      
      if (catsReais && catsReais.length > 0) setCategorias([catFavoritos, ...catsReais]);
      else setCategorias([catFavoritos, { category_id: '0', category_name: 'Sem Conteúdo' }]);
    };
    carregarCategorias();
  }, [tipoConteudo, navigate]);

  useEffect(() => {
    let timer;
    if (credenciais && categorias.length > 0) {
      const indexRealCategoria = indexCategoria >= numMenus ? indexCategoria - numMenus : 0;
      const categoriaAtual = categorias[Math.min(indexRealCategoria, categorias.length - 1)];
      
      if (!categoriaAtual || !categoriaAtual.category_id) return;

      if (categoriaAtual.category_id === 'favs') {
        const favsDaAba = favoritos.filter(f => f.tipoConteudo === tipoConteudo);
        setCanais(favsDaAba);
        setLimiteRenderizacao(Math.max(60, indexCanal + 60));
        setIsCarregando(false);
        return;
      }

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
  }, [indexCategoria, categorias, credenciais, numMenus, tipoConteudo, cacheMemoria, indexCanal, favoritos]);

  // PROTEÇÃO 3: Filtro Blindado (Impede ecrã preto se o provedor enviar filme sem nome)
  const canaisFiltrados = canais.filter(item => {
    const nomeSeguro = item?.name || item?.title || "";
    return nomeSeguro.toLowerCase().includes(termoBusca.toLowerCase());
  });

  const totalCanais = canaisFiltrados.length;
  
  useEffect(() => {
    if (canaisFiltrados.length > 0 && indexCanal >= canaisFiltrados.length) {
      setIndexCanal(0);
    }
  }, [canaisFiltrados, indexCanal]);

  const itemFocado = totalCanais > 0 ? canaisFiltrados[indexCanal] : null;
  const isItemFavorito = itemFocado && favoritos.some(f => f.idUnico === getIdUnico(itemFocado));

  const handleToggleFavorito = () => {
    if (!itemFocado) return;
    const idUnico = getIdUnico(itemFocado);
    if (isItemFavorito) setFavoritos(prev => prev.filter(f => f.idUnico !== idUnico));
    else setFavoritos(prev => [...prev, { ...itemFocado, idUnico, tipoConteudo }]);
  };

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
      if (isModalOpen) {
        if (e.key === 'ArrowDown') setFocusedModalBtn(prev => Math.min(prev + 1, 2));
        else if (e.key === 'ArrowUp') setFocusedModalBtn(prev => Math.max(prev - 1, 0));
        else if (e.key === 'Enter') {
          if (focusedModalBtn === 0) { 
            if (tipoConteudo === 'series') navigate('/series', { state: { serie: itemFocado, credenciais } });
            else navigate('/player', { state: { stream: itemFocado, credenciais, tipo: tipoConteudo } });
          } else if (focusedModalBtn === 1) handleToggleFavorito();
          else { setIsModalOpen(false); setZonaFocada('grid'); }
        }
        else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'ArrowLeft') { setIsModalOpen(false); setZonaFocada('grid'); }
        return;
      }
      
      if (zonaFocada === 'search_input') {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (totalCanais > 0) { setZonaFocada('grid'); setIndexCanal(0); } }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); setZonaFocada('sidebar'); }
          return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) e.preventDefault();
      if (categorias.length === 0 && zonaFocada !== 'sidebar') return; 

      if (zonaFocada === 'sidebar') {
        if (e.key === 'ArrowDown') setIndexCategoria(prev => Math.min(prev + 1, (numMenus + categorias.length - 1)));
        else if (e.key === 'ArrowUp') setIndexCategoria(prev => Math.max(prev - 1, 0));
        else if (e.key === 'ArrowRight' && totalCanais > 0) setZonaFocada('search_input');
        else if (e.key === 'Enter') {
            if (indexCategoria < numMenus) { setTipoConteudo(menusPrincipais[indexCategoria].id); setIndexCategoria(numMenus); setIndexCanal(0); }
        }
      } else if (zonaFocada === 'grid') {
        if (e.key === 'ArrowRight') setIndexCanal(prev => Math.min(prev + 1, totalCanais - 1));
        else if (e.key === 'ArrowLeft') {
            if (indexCanal % colunasGrade === 0) setZonaFocada('sidebar');
            else setIndexCanal(prev => Math.max(prev - 1, 0));
        }
        else if (e.key === 'ArrowDown') setIndexCanal(prev => Math.min(prev + colunasGrade, totalCanais - 1));
        else if (e.key === 'ArrowUp') {
            if (indexCanal < colunasGrade) setZonaFocada('search_input');
            else setIndexCanal(prev => prev - colunasGrade);
        }
        else if (e.key === 'Enter') { setIsModalOpen(true); setZonaFocada('modal'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, zonaFocada, indexCanal, indexCategoria, numMenus, categorias.length, colunasGrade, totalCanais, tipoConteudo, navigate, itemFocado, credenciais, focusedModalBtn, isItemFavorito, favoritos]);

  useEffect(() => {
    if (zonaFocada === 'grid' && totalCanais > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`grid-item-${indexCanal}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [indexCanal, zonaFocada, canaisFiltrados, totalCanais]);

  useEffect(() => {
    if (zonaFocada === 'sidebar') {
      const timer = setTimeout(() => {
        const el = document.getElementById(`sidebar-item-${indexCategoria}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [indexCategoria, zonaFocada, categorias]);

  const isSidebarOpen = zonaFocada === 'sidebar';
  const indexRealCategoria = indexCategoria >= numMenus ? indexCategoria - numMenus : 0;
  const nomeCategoriaAtiva = categorias.length > 0 ? categorias[Math.min(indexRealCategoria, categorias.length - 1)]?.category_name : 'Carregando...';

  useEffect(() => {
    setMostrarVideoHero(false);
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    if (itemFocado && zonaFocada === 'grid' && (tipoConteudo === 'live' || tipoConteudo === 'vod') && !isModalOpen) {
      autoPlayTimerRef.current = setTimeout(() => setMostrarVideoHero(true), 1500); 
    }
    return () => clearTimeout(autoPlayTimerRef.current);
  }, [itemFocado, zonaFocada, tipoConteudo, isModalOpen]);

  let heroStreamUrl = '';
  if (itemFocado && credenciais && tipoConteudo !== 'series') {
    const baseUrl = credenciais.url.replace(/\/$/, "");
    if (tipoConteudo === 'live') heroStreamUrl = `${baseUrl}/live/${credenciais.username}/${credenciais.password}/${itemFocado.stream_id}.m3u8`;
    else if (tipoConteudo === 'vod') heroStreamUrl = `${baseUrl}/movie/${credenciais.username}/${credenciais.password}/${itemFocado.stream_id}.${itemFocado.container_extension || 'mp4'}`;
  }

  useEffect(() => {
    const video = videoHeroRef.current;
    if (!video || !mostrarVideoHero || !heroStreamUrl) return;
    let hls;
    if (heroStreamUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
            hls = new Hls({ debug: false, enableWorker: true });
            hls.loadSource(heroStreamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        }
    } else {
        video.src = heroStreamUrl;
        video.play().catch(() => {});
    }
    return () => { if(hls) hls.destroy(); video.pause(); video.src=''; };
  }, [mostrarVideoHero, heroStreamUrl]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg, color: colors.textMain, overflow: 'hidden' }}>
      
      {/* MODAL DE AÇÃO */}
      {isModalOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#09090b', padding: '40px', borderRadius: '24px', width: '450px', border: `1px solid ${colors.border}`, boxShadow: `0 25px 50px rgba(0,0,0,0.9)`, textAlign: 'center' }}>
             <h2 style={{ color: 'white', marginBottom: '10px', fontSize: '24px', fontWeight: '800' }}>{itemFocado?.name}</h2>
             <p style={{ color: colors.textMuted, marginBottom: '30px', fontSize: '15px' }}>O que deseja fazer?</p>
             
             <button onClick={() => { if(tipoConteudo === 'series') navigate('/series', {state: {serie: itemFocado, credenciais}}); else navigate('/player', {state: {stream: itemFocado, credenciais, tipo: tipoConteudo}}); }} 
                style={{ width: '100%', padding: '16px', marginBottom: '12px', background: focusedModalBtn === 0 ? colors.accent : 'rgba(255,255,255,0.05)', border: focusedModalBtn === 0 ? 'none' : `1px solid ${colors.border}`, borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s', transform: focusedModalBtn === 0 ? 'scale(1.03)' : 'scale(1)', boxShadow: focusedModalBtn === 0 ? `0 10px 20px ${colors.accentGlow}` : 'none' }}>
                <Play size={20} fill="currentColor" /> Assistir
             </button>
             
             <button onClick={handleToggleFavorito} 
                style={{ width: '100%', padding: '16px', marginBottom: '12px', background: focusedModalBtn === 1 ? 'rgba(255,255,255,0.1)' : 'transparent', border: focusedModalBtn === 1 ? '2px solid white' : `1px solid ${colors.border}`, borderRadius: '12px', color: isItemFavorito ? colors.accent : 'white', fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s', transform: focusedModalBtn === 1 ? 'scale(1.03)' : 'scale(1)' }}>
                <Star size={20} fill={isItemFavorito ? colors.accent : 'transparent'} color={isItemFavorito ? colors.accent : 'currentColor'} /> 
                {isItemFavorito ? 'Remover' : 'Minha Lista'}
             </button>
             
             <button onClick={() => { setIsModalOpen(false); setZonaFocada('grid'); }} 
                style={{ width: '100%', padding: '16px', background: 'transparent', border: focusedModalBtn === 2 ? '2px solid white' : '1px solid transparent', borderRadius: '12px', color: colors.textMuted, fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s', transform: focusedModalBtn === 2 ? 'scale(1.03)' : 'scale(1)' }}>
                <ArrowLeft size={20} /> Voltar
             </button>
          </div>
        </div>
      )}

      {/* BARRA LATERAL */}
      <div style={{ width: isSidebarOpen ? '320px' : '0px', background: colors.sidebar, borderRight: `1px solid ${colors.border}`, transition: 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '320px', padding: '30px 20px', display: 'flex', flexDirection: 'column', height: '100%', opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
          <h2 style={{ color: colors.accent, marginBottom: '40px', textAlign: 'center', fontSize: '28px', fontWeight: '900', letterSpacing: '1px' }}>IPTV PRO</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
            {menusPrincipais.map((menu, index) => {
              const isFocado = isSidebarOpen && indexCategoria === index;
              const isAtivo = tipoConteudo === menu.id;
              return (
                <div key={menu.id} id={`sidebar-item-${index}`}
                  style={{
                    padding: '16px 20px', background: isAtivo ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: isAtivo ? colors.accent : colors.textMuted,
                    borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', fontWeight: isAtivo ? '700' : '500',
                    borderLeft: isFocado ? `4px solid ${colors.accent}` : (isAtivo ? `4px solid ${colors.accent}` : '4px solid transparent'),
                    borderRight: '4px solid transparent', borderTop: 'none', borderBottom: 'none',
                    transform: isFocado ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s ease', boxShadow: isFocado ? `inset 20px 0 20px -20px ${colors.accent}` : 'none',
                    marginBottom: index === numMenus - 1 ? '20px' : '0'
                  }}>
                  {menu.icone} <span style={{ fontSize: '15px', letterSpacing: '0.5px' }}>{menu.nome}</span>
                </div>
              );
            })}

            <div style={{ height: '1px', background: colors.border, margin: '10px 0' }} />

            {categorias.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '20px', color: colors.textMuted }}><Loader2 className="animate-spin" size={24} style={{margin:'0 auto'}}/></div>
            ) : (
                categorias.map((cat, idx) => {
                  const globalIndex = idx + numMenus;
                  const isFocado = isSidebarOpen && indexCategoria === globalIndex;
                  const isAtivo = Math.min(indexRealCategoria, categorias.length - 1) === idx;
                  const isFavoritosCategory = cat.category_id === 'favs';

                  return (
                      <div key={cat.category_id || idx} id={`sidebar-item-${globalIndex}`}
                        style={{
                            padding: '14px 20px', background: 'transparent',
                            color: isAtivo ? colors.accent : (isFavoritosCategory ? '#eab308' : colors.textMain),
                            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', fontWeight: isAtivo ? '700' : '400',
                            borderLeft: isFocado ? `4px solid ${isFavoritosCategory ? '#eab308' : colors.accent}` : '4px solid transparent',
                            borderRight: '4px solid transparent', borderTop: 'none', borderBottom: 'none',
                            transform: isFocado ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s ease',
                            boxShadow: isFocado ? `inset 20px 0 20px -20px ${isFavoritosCategory ? '#eab308' : colors.accent}` : 'none',
                        }}>
                      {isFavoritosCategory ? <Star size={18} fill={isAtivo ? "#eab308" : "transparent"} /> : <Folder size={18} opacity={0.6} />}
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
          padding: '60px 50px 30px 50px', minHeight: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', background: colors.heroGradient, zIndex: 10, transition: 'all 0.4s ease',
          position: 'relative', overflow: 'hidden'
        }}>
          {mostrarVideoHero && (tipoConteudo === 'live' || tipoConteudo === 'vod') && (
            <video ref={videoHeroRef} muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, opacity: 0.4, pointerEvents: 'none' }} />
          )}
          {mostrarVideoHero && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: `linear-gradient(to top, ${colors.bg} 0%, rgba(9,9,11,0) 70%), linear-gradient(to right, ${colors.bg} 10%, rgba(9,9,11,0) 80%)` }} />
          )}

          <div style={{ position: 'relative', zIndex: 3 }}>
            <h3 style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '800' }}>
              {nomeCategoriaAtiva} {isItemFavorito && <span style={{ color: colors.accent, marginLeft: '10px' }}>⭐ NA SUA LISTA</span>}
            </h3>
            <h1 style={{ fontSize: '44px', fontWeight: '900', margin: '0 0 15px 0', textShadow: '0 4px 15px rgba(0,0,0,0.9)', lineHeight: '1.1', maxWidth: '800px' }}>
              {itemFocado ? itemFocado.name : 'Carregando...'}
            </h1>
            {itemFocado && tipoConteudo !== 'live' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '14px', fontWeight: '600' }}>
                <span style={{ color: '#46d369' }}>{itemFocado.rating ? `⭐ ${itemFocado.rating}` : 'Novo'}</span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {itemFocado.container_extension || 'VOD'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* GRID PRINCIPAL */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 50px 300px 50px', display: 'flex', flexDirection: 'column',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 60px, black calc(100% - 60px), transparent 100%)'
        }}>
          {!isCarregando && canais.length > 0 && (
            <div style={{ marginBottom: '30px', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 4px', flexShrink: 0 }}>
              <input
                ref={inputBuscaRef} type="text" placeholder={`Explorar em ${nomeCategoriaAtiva}...`} value={termoBusca}
                onChange={(e) => { setTermoBusca(e.target.value); setIndexCanal(0); }}
                style={{
                  width: '100%', padding: '18px 20px 18px 55px', background: 'rgba(255,255,255,0.03)',
                  border: zonaFocada === 'search_input' ? `2px solid ${colors.accent}` : `2px solid transparent`, 
                  borderRadius: '16px', color: colors.textMain, fontSize: '16px', fontWeight: '500', outline: 'none', 
                  transition: 'all 0.2s ease', boxShadow: zonaFocada === 'search_input' ? `0 0 20px ${colors.accentGlow}` : 'none'
                }}
              />
              <Search size={22} style={{ position: 'absolute', left: '22px', color: zonaFocada === 'search_input' ? colors.accent : colors.textMuted, transition: 'all 0.2s ease' }} />
            </div>
          )}

          {isCarregando ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: colors.textMuted }}><Loader2 className="animate-spin" size={32} /></div>
          ) : totalCanais === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: colors.textMuted, fontSize: '18px' }}>Nenhum conteúdo encontrado.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunasGrade}, 1fr)`, gap: '24px' }}>
              {canaisFiltrados.slice(0, limiteRenderizacao).map((item, index) => {
                const isFocado = zonaFocada === 'grid' && indexCanal === index;
                const ehFav = favoritos.some(f => f.idUnico === getIdUnico(item));

                return (
                  <div key={item.stream_id || item.series_id || index} id={`grid-item-${index}`}
                    style={{
                      aspectRatio: aspectoCard, background: colors.cardGradient, borderRadius: '16px',
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      border: isFocado ? `4px solid ${colors.accent}` : '4px solid transparent', 
                      transform: isFocado ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: isFocado ? `0 20px 40px ${colors.accentGlow}` : colors.cardShadow,
                      transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', zIndex: isFocado ? 10 : 1, overflow: 'hidden', position: 'relative'
                    }}>
                    {(item.stream_icon || item.cover) && (
                      <img src={item.stream_icon || item.cover} alt={item.name} loading="lazy" decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: tipoConteudo === 'live' ? 'contain' : 'cover', padding: tipoConteudo === 'live' ? '15px' : '0' }}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    {ehFav && <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '6px', backdropFilter: 'blur(5px)' }}><Star size={16} fill={colors.accent} color={colors.accent} /></div>}
                    <div style={{ position: 'absolute', bottom: '0', padding: '30px 10px 15px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)', textAlign: 'center', width: '100%' }}>
                      <span style={{ fontSize: '14px', color: 'white', fontWeight: '700', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{item.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}