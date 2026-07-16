import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import { getSeriesInfo } from '../services/xtream';
// Importamos a nossa nova ponte TMDb
import { searchOnTMDb, getSeasonDetails } from '../services/tmdb';

export default function SeriesDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serie, credenciais } = location.state || {};

  const [info, setInfo] = useState(null);
  const [episodesObj, setEpisodesObj] = useState({});
  const [seasons, setSeasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Enriquecimento TMDb
  const [tmdbShowId, setTmdbShowId] = useState(null);
  const [tmdbEpisodesMap, setTmdbEpisodesMap] = useState({});

  // Zonas de Navegação
  const [zonaFocada, setZonaFocada] = useState('seasons'); 
  const [indexSeason, setIndexSeason] = useState(0);
  const [indexEpisode, setIndexEpisode] = useState(0);

  const refsSeasons = useRef([]);
  const refsEpisodes = useRef([]);

  // A. Carrega os dados básicos do seu provedor de IPTV
  useEffect(() => {
    if (!serie || !credenciais) return navigate('/dashboard');
    
    const carregarInfo = async () => {
      const targetId = serie.series_id || serie.stream_id || serie.id;
      const data = await getSeriesInfo(credenciais.url, credenciais.username, credenciais.password, targetId);
      
      if (data && data.episodes) {
        setInfo(data.info);
        setEpisodesObj(data.episodes);
        setSeasons(Object.keys(data.episodes));

        // MÁGICA: Assim que os dados chegam, procuramos a série correspondente no TMDb
        const tmdbResult = await searchOnTMDb(data.info?.name || serie.name, true);
        if (tmdbResult) {
          setTmdbShowId(tmdbResult.id);
        }
      }
      setIsLoading(false);
    };
    carregarInfo();
  }, [serie, credenciais, navigate]);

  // B. Sempre que o utilizador trocar de temporada, buscamos os episódios no TMDb (Lazy Loading)
  const currentSeasonKey = seasons[indexSeason];
  const currentEpisodes = episodesObj[currentSeasonKey] || [];

  useEffect(() => {
    if (!tmdbShowId || !currentSeasonKey) return;

    const carregarEpisodiosTMDb = async () => {
      const data = await getSeasonDetails(tmdbShowId, currentSeasonKey);
      if (data && data.episodes) {
        // Cria um dicionário indexado pelo número do episódio para busca ultra rápida (O(1))
        const map = {};
        data.episodes.forEach(ep => {
          map[ep.episode_number] = ep;
        });
        setTmdbEpisodesMap(map);
      } else {
        setTmdbEpisodesMap({});
      }
    };
    carregarEpisodiosTMDb();
  }, [tmdbShowId, currentSeasonKey]);

  // Motor de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape", "Backspace"].includes(e.key)) e.preventDefault();

      if (e.key === 'Escape' || e.key === 'Backspace') {
         navigate(-1);
         return;
      }

      if (isLoading) return;

      if (zonaFocada === 'seasons') {
        if (e.key === 'ArrowDown') setIndexSeason(prev => Math.min(prev + 1, seasons.length - 1));
        else if (e.key === 'ArrowUp') setIndexSeason(prev => Math.max(prev - 1, 0));
        else if (e.key === 'ArrowRight' && currentEpisodes.length > 0) {
          setZonaFocada('episodes'); 
          setIndexEpisode(0);
        }
      } 
      else if (zonaFocada === 'episodes') {
        if (e.key === 'ArrowDown') setIndexEpisode(prev => Math.min(prev + 1, currentEpisodes.length - 1));
        else if (e.key === 'ArrowUp') setIndexEpisode(prev => Math.max(prev - 1, 0));
        else if (e.key === 'ArrowLeft') {
          setZonaFocada('seasons'); 
        }
        else if (e.key === 'Enter') {
          const ep = currentEpisodes[indexEpisode];
          navigate('/player', { 
            state: { stream: ep, credenciais, tipo: 'series' } 
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zonaFocada, indexSeason, indexEpisode, seasons, currentEpisodes, navigate, credenciais, isLoading]);

  // Auto-Scroll
  useEffect(() => {
    if (zonaFocada === 'seasons' && refsSeasons.current[indexSeason]) {
      refsSeasons.current[indexSeason].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [indexSeason, zonaFocada]);

  useEffect(() => {
    if (zonaFocada === 'episodes' && refsEpisodes.current[indexEpisode]) {
      refsEpisodes.current[indexEpisode].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [indexEpisode, zonaFocada]);

  if (isLoading) return <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f0f0f', color: 'white'}}><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f0f', color: 'white', overflow: 'hidden' }}>
       
       {/* CABEÇALHO HERO */}
       <div style={{ display: 'flex', gap: '30px', padding: '40px', background: 'linear-gradient(to bottom, #1a1a1a, #0f0f0f)', borderBottom: '1px solid #333' }}>
          <img 
            src={info?.cover || serie.cover || serie.stream_icon} 
            alt="Capa" 
            style={{ width: '150px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', objectFit: 'cover' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <h1 style={{ fontSize: '36px', marginBottom: '10px', fontWeight: '900' }}>{info?.name || serie.name}</h1>
             <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', color: '#46d369', fontWeight: 'bold', fontSize: '14px' }}>
                <span>{info?.rating ? `Rating: ${info.rating}` : 'Rating: N/A'}</span>
                <span style={{ color: '#88 ' }}>|</span>
                <span style={{ color: '#ccc' }}>Lançamento: {info?.releaseDate || 'N/A'}</span>
             </div>
             <p style={{ color: '#aaa', fontSize: '15px', maxWidth: '800px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {info?.plot || 'Sem descrição disponível.'}
             </p>
             <div style={{ marginTop: '15px', color: '#88', fontSize: '14px' }}>
                <span style={{ color: 'white' }}>Direção:</span> {info?.director || 'N/A'} <br/>
                <span style={{ color: 'white' }}>Elenco:</span> {info?.cast || 'N/A'}
             </div>
          </div>
       </div>

       {/* DIVISÃO DE TELA: TEMPORADAS vs EPISÓDIOS */}
       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* COLUNA ESQUERDA: Temporadas */}
          <div style={{ width: '320px', background: '#111', padding: '20px', overflowY: 'auto', borderRight: '1px solid #222' }}>
             <h3 style={{ color: '#666', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px' }}>Temporadas</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '50px' }}>
                {seasons.map((season, i) => {
                   const isFocado = zonaFocada === 'seasons' && indexSeason === i;
                   const isAtivo = indexSeason === i;
                   return (
                      <div key={season} ref={el => refsSeasons.current[i] = el}
                         style={{
                            padding: '18px 20px', background: isAtivo ? '#E50914' : '#222', borderRadius: '8px',
                            border: isFocado ? '3px solid white' : '3px solid transparent',
                            transform: isFocado ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s ease',
                            fontWeight: isAtivo ? '900' : '600', fontSize: '16px',
                            boxShadow: isFocado ? '0 0 15px rgba(255,255,255,0.2)' : 'none'
                         }}
                      >
                         Temporada {season}
                      </div>
                   )
                })}
             </div>
          </div>

          {/* COLUNA DIREITA: Episódios (COM MESCLAGEM INTELIGENTE TMDB) */}
          <div style={{ flex: 1, padding: '20px 50px', overflowY: 'auto' }}>
             <h3 style={{ color: '#666', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px' }}>
                Episódios (Temp. {currentSeasonKey})
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '100px' }}>
                {currentEpisodes.map((ep, i) => {
                   const isFocado = zonaFocada === 'episodes' && indexEpisode === i;
                   
                   // SISTEMA DE MESCLAGEM INTELIGENTE
                   // 1. Procuramos se temos esse episódio correspondente no TMDb
                   const tmdbEp = tmdbEpisodesMap[ep.episode_num];
                   
                   // 2. Se o IPTV não tiver imagem, pegamos do TMDb
                   const imagePath = ep.info?.movie_image || (tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w500${tmdbEp.still_path}` : null);
                   
                   // 3. Se o IPTV não tiver sinopse, pegamos do TMDb
                   const sinopse = ep.info?.plot || tmdbEp?.overview || 'Nenhuma sinopse fornecida para este episódio.';

                   return (
                      <div key={ep.id} ref={el => refsEpisodes.current[i] = el}
                         style={{
                            display: 'flex', alignItems: 'center', gap: '20px', padding: '15px',
                            background: '#1a1a1a', borderRadius: '8px',
                            border: isFocado ? '3px solid #E50914' : '3px solid transparent',
                            transform: isFocado ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s ease',
                            boxShadow: isFocado ? '0 5px 20px rgba(229,9,20,0.4)' : 'none'
                         }}
                      >
                         {/* Número do Episódio */}
                         <div style={{ width: '50px', textAlign: 'center', fontSize: '24px', fontWeight: '900', color: isFocado ? 'white' : '#555' }}>
                            {ep.episode_num}
                         </div>
                         
                         {/* Thumbnail Enriquecido */}
                         {imagePath ? (
                            <img 
                              src={imagePath} 
                              alt={ep.title} 
                              loading="lazy"
                              style={{ width: '160px', borderRadius: '4px', objectFit: 'cover', aspectRatio: '16/9' }} 
                              onError={e => e.target.style.display='none'}
                            />
                         ) : (
                            <div style={{ width: '160px', height: '90px', background: '#2a2a2a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <Play size={24} color={isFocado ? "white" : "#555"}/>
                            </div>
                         )}
                         
                         {/* Textos */}
                         <div style={{ flex: 1, paddingRight: '20px' }}>
                            <h4 style={{ fontSize: '18px', margin: '0 0 8px 0', color: isFocado ? 'white' : '#ddd' }}>
                              {ep.title}
                            </h4>
                            <p style={{ fontSize: '14px', color: '#888', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                               {sinopse}
                            </p>
                         </div>
                         
                         {/* Duração */}
                         <div style={{ color: '#46d369', fontSize: '14px', fontWeight: 'bold' }}>
                            {ep.info?.duration ? ep.info.duration : (tmdbEp?.runtime ? `${tmdbEp.runtime}m` : '')}
                         </div>
                      </div>
                   )
                })}
             </div>
          </div>

       </div>
    </div>
  );
}