import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Tv, Film, Clapperboard, Trophy, Baby, Globe, Newspaper, Sun, Moon } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // MOTOR DE TEMAS
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
    heroGradient: isDark ? 'linear-gradient(to bottom, rgba(15,15,15,0.85) 0%, rgba(15,15,15,1) 100%)' : 'linear-gradient(to bottom, rgba(240,242,245,0.7) 0%, rgba(240,242,245,1) 100%)',
  };

  const categoriasData = [
    { nome: 'Favoritos', icone: <Star size={20} /> },
    { nome: 'TV Aberta', icone: <Tv size={20} /> },
    { nome: 'Filmes', icone: <Film size={20} /> },
    { nome: 'Séries', icone: <Clapperboard size={20} /> },
    { nome: 'Esportes', icone: <Trophy size={20} /> },
    { nome: 'Infantil', icone: <Baby size={20} /> },
    { nome: 'Documentários', icone: <Globe size={20} /> },
    { nome: 'Notícias', icone: <Newspaper size={20} /> },
  ];
  
  const canais = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    titulo: `Filme Épico ${i + 1}: A Jornada`,
    descricao: `Esta é a sinopse oficial do Filme ${i + 1}. Uma aventura incrível que testa os limites da coragem. Direção impecável e efeitos visuais deslumbrantes que vão prender você no sofá do início ao fim com muita ação.`,
    ano: 2026 - (i % 4),
    relevancia: 90 + (i % 10),
    classificacao: i % 2 === 0 ? '16' : 'L'
  }));

  const [zonaFocada, setZonaFocada] = useState('sidebar'); 
  const [indexCategoria, setIndexCategoria] = useState(0);
  const [indexCanal, setIndexCanal] = useState(0);

  const colunasGrade = 6;
  const maxSidebarIndex = categoriasData.length; 
  
  const refsCanais = useRef([]);
  const refsCategorias = useRef([]);

  // Motor de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) e.preventDefault();

      if (zonaFocada === 'sidebar') {
        if (e.key === 'ArrowDown') setIndexCategoria(prev => Math.min(prev + 1, maxSidebarIndex));
        else if (e.key === 'ArrowUp') setIndexCategoria(prev => Math.max(prev - 1, 0));
        else if (e.key === 'ArrowRight') {
          setZonaFocada('grid');
          setIndexCanal(0);
        }
        else if (e.key === 'Enter') {
          if (indexCategoria === maxSidebarIndex) setTheme(prev => prev === 'dark' ? 'light' : 'dark');
          else {
            setZonaFocada('grid');
            setIndexCanal(0);
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
        else if (e.key === 'Enter') navigate('/player');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zonaFocada, indexCanal, indexCategoria, maxSidebarIndex, colunasGrade, canais.length, navigate]);

  // Efeitos de Câmera (Auto-Scroll)
  useEffect(() => {
    if (zonaFocada === 'grid' && refsCanais.current[indexCanal]) {
      refsCanais.current[indexCanal].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [indexCanal, zonaFocada]);

  useEffect(() => {
    if (zonaFocada === 'sidebar' && refsCategorias.current[indexCategoria]) {
      refsCategorias.current[indexCategoria].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [indexCategoria, zonaFocada]);

  const isSidebarOpen = zonaFocada === 'sidebar';
  const itemFocado = canais[indexCanal];
  const nomeCategoriaAtiva = categoriasData[Math.min(indexCategoria, categoriasData.length - 1)].nome;

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg, color: colors.textMain, overflow: 'hidden', transition: 'background 0.3s' }}>
      
      {/* BARRA LATERAL */}
      <div 
        style={{ 
          width: isSidebarOpen ? '250px' : '0px',
          background: colors.sidebar, 
          borderRight: isSidebarOpen ? `1px solid ${colors.border}` : '0px solid transparent',
          transition: 'width 0.4s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 50 
        }}
      >
        <div style={{ width: '250px', padding: '20px 15px', display: 'flex', flexDirection: 'column', height: '100%', opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
          <h2 style={{ color: '#E50914', marginBottom: '25px', textAlign: 'center', fontSize: '28px', fontWeight: '900', letterSpacing: '1px' }}>IPTV PRO</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', padding: '5px' }}>
            {categoriasData.map((cat, index) => {
              const isFocado = isSidebarOpen && indexCategoria === index;
              const isAtivo = Math.min(indexCategoria, categoriasData.length - 1) === index; 

              return (
                <div
                  key={index}
                  ref={el => refsCategorias.current[index] = el} 
                  style={{
                    padding: '14px 16px',
                    background: isAtivo ? '#E50914' : 'transparent',
                    color: isAtivo ? 'white' : colors.textMain,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: isAtivo ? '600' : '400',
                    border: isFocado ? `3px solid ${isDark ? 'white' : '#1d1d1f'}` : '3px solid transparent',
                    transform: isFocado ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    boxShadow: isFocado ? `0 0 15px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` : 'none'
                  }}
                >
                  {cat.icone}
                  <span style={{ fontSize: '15px' }}>{cat.nome}</span>
                </div>
              );
            })}

            <div style={{ height: '1px', background: colors.border, margin: '10px 0' }} />

            <div
              ref={el => refsCategorias.current[maxSidebarIndex] = el}
              style={{
                padding: '14px 16px',
                background: 'transparent',
                color: colors.textMain,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: (isSidebarOpen && indexCategoria === maxSidebarIndex) ? `3px solid ${isDark ? 'white' : '#1d1d1f'}` : '3px solid transparent',
                transform: (isSidebarOpen && indexCategoria === maxSidebarIndex) ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
              <span style={{ fontSize: '15px' }}>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </div>

          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        {/* PAINEL HERO */}
        <div style={{ 
          padding: '40px 40px 20px 40px',
          minHeight: '220px', 
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: colors.heroGradient,
          zIndex: 10,
          transition: 'transform 0.4s ease, background 0.3s',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(10px)'
        }}>
          <h3 style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
            {nomeCategoriaAtiva}
          </h3>

          <h1 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 12px 0', textShadow: isDark ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none', lineHeight: '1.2' }}>
            {itemFocado.titulo}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontSize: '13px', fontWeight: '700' }}>
            <span style={{ color: '#46d369' }}>{itemFocado.relevancia}% Relevante</span>
            <span>{itemFocado.ano}</span>
            <span style={{ border: `1px solid ${colors.textMuted}`, color: colors.textMuted, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
              {itemFocado.classificacao}
            </span>
            <span style={{ border: `1px solid ${colors.textMuted}`, color: colors.textMuted, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>HD</span>
          </div>

          <p style={{ 
            fontSize: '14px', 
            color: colors.textMuted, 
            maxWidth: '750px', 
            margin: 0,
            display: '-webkit-box', 
            WebkitLineClamp: 3, 
            WebkitBoxOrient: 'vertical', 
            overflow: 'hidden',
            lineHeight: '1.5' 
          }}>
            {itemFocado.descricao}
          </p>
        </div>
        
        {/* GRADE VOD */}
        {/* A SOLUÇÃO: paddingTop ajustado para 30px (teto falso para o zoom) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 40px 300px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunasGrade}, 1fr)`, gap: '20px' }}>
            {canais.map((item, index) => {
              const isFocado = zonaFocada === 'grid' && indexCanal === index;

              return (
                <div 
                  key={index}
                  ref={el => refsCanais.current[index] = el}
                  style={{ 
                    aspectRatio: '2/3', 
                    background: colors.cardGradient, 
                    borderRadius: '8px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    border: isFocado ? '4px solid #E50914' : '4px solid transparent',
                    transform: isFocado ? 'scale(1.12)' : 'scale(1)', 
                    boxShadow: isFocado ? '0 15px 35px rgba(229, 9, 20, 0.4)' : `0 8px 15px ${colors.cardShadow}`,
                    transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    zIndex: isFocado ? 10 : 1 
                  }}
                >
                  <span style={{ fontSize: '14px', color: colors.textMuted, textAlign: 'center', fontWeight: '600' }}>Poster<br/>{item.id + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}