import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Hls from 'hls.js';
import { ArrowLeft, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

export default function Player() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const { stream, credenciais, tipo } = location.state || {};

  // =========================================================
  // ESTADOS DO PLAYER (Netflix UI)
  // =========================================================
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const uiTimeoutRef = useRef(null);

  // CONSTRUTOR DE URL
  let streamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  let tituloFilme = stream?.name || stream?.title || 'Reproduzindo Conteúdo...';

  if (stream && credenciais) {
    const baseUrl = credenciais.url.replace(/\/$/, "");
    if (tipo === 'live') {
      streamUrl = `${baseUrl}/live/${credenciais.username}/${credenciais.password}/${stream.stream_id}.m3u8`;
    } 
    else if (tipo === 'vod') {
      const ext = stream.container_extension || 'mp4';
      streamUrl = `${baseUrl}/movie/${credenciais.username}/${credenciais.password}/${stream.stream_id}.${ext}`;
    }
    else if (tipo === 'series') {
      const ext = stream.container_extension || 'mp4';
      const episodeId = stream.id || stream.stream_id || stream.episode_id;
      streamUrl = `${baseUrl}/series/${credenciais.username}/${credenciais.password}/${episodeId}.${ext}`;
      tituloFilme = `${stream.title} (Ep. ${stream.episode_num})`;
    }
  }

  // =========================================================
  // MOTOR DE VÍDEO INTELIGENTE (HLS vs Nativo)
  // =========================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls;
    const isHls = streamUrl.includes('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({ debug: false, enableWorker: true, lowLatencyMode: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => setIsPlaying(false)));
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => video.play().catch(() => setIsPlaying(false)));
      }
    } else {
      video.src = streamUrl;
      video.play().catch(() => setIsPlaying(false));
    }

    return () => {
      if (hls) hls.destroy();
      video.pause();
      video.src = '';
    };
  }, [streamUrl]);

  // =========================================================
  // LÓGICA DA INTERFACE (Wake Up, Auto-Hide, Progresso)
  // =========================================================
  
  // Acorda a interface. Se estiver tocando, agenda pra esconder em 4s. Se estiver pausado, mantém na tela.
  const wakeUpUI = () => {
    setIsUiVisible(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    
    // O pulo do gato: Só esconde sozinho se o vídeo estiver rolando
    if (videoRef.current && !videoRef.current.paused) {
      uiTimeoutRef.current = setTimeout(() => {
        setIsUiVisible(false);
      }, 4000);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      wakeUpUI();
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
      wakeUpUI();
    }
  };

  // Motor de Teclado (Controle Remoto TV)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape", "Backspace"].includes(e.key)) {
        e.preventDefault();
      }

      // Voltar sempre funciona
      if (e.key === 'Escape' || e.key === 'Backspace') {
        navigate(-1);
        return;
      }

      // A MÁGICA DO ANTI-GHOST CLICK:
      // Se a tela estiver limpa, apertar qualquer botão apenas acorda a UI e não faz mais nada.
      if (!isUiVisible) {
        wakeUpUI();
        return;
      }

      // Se a UI já estiver visível, os botões executam as ações
      wakeUpUI(); // Reseta o cronômetro para a UI não sumir enquanto o usuário mexe

      if (e.key === 'Enter') {
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        skipTime(10);
      } else if (e.key === 'ArrowLeft') {
        skipTime(-10);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, isUiVisible]); // isUiVisible precisa estar aqui para o Anti-Ghost Click funcionar

  // Sincroniza o tempo do vídeo com a nossa barra de progresso
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  // Permite pular o vídeo clicando na barra de progresso (Mouse)
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
    wakeUpUI();
  };

  // Converte os segundos para o formato 00:00:00
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const date = new Date(timeInSeconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh > 0) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    return `${mm}:${ss}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={wakeUpUI} // Acorda a UI se o usuário mexer o mouse
      onClick={wakeUpUI} // Acorda a UI se o usuário clicar na tela
      style={{ width: '100vw', height: '100vh', background: 'black', position: 'relative', overflow: 'hidden', cursor: isUiVisible ? 'default' : 'none' }}
    >
      
      {/* O VÍDEO PURO (Sem os controles feios do navegador) */}
      <video 
        ref={videoRef} 
        autoPlay 
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => { setIsPlaying(true); wakeUpUI(); }}
        onPause={() => { setIsPlaying(false); wakeUpUI(); }}
        onClick={togglePlay} // Clicar direto no vídeo também pausa/despausa
        style={{ width: '100%', height: '100%', objectFit: 'contain', outline: 'none', backgroundColor: '#000' }} 
      />

      {/* ========================================================= */}
      {/* CAMADA DE INTERFACE CUSTOMIZADA (Netflix Style)           */}
      {/* ========================================================= */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        opacity: isUiVisible ? 1 : 0, transition: 'opacity 0.4s ease-in-out', pointerEvents: isUiVisible ? 'auto' : 'none'
      }}>
        
        {/* TOPO: Gradiente, Botão Voltar e Título */}
        <div style={{ 
          padding: '30px', display: 'flex', alignItems: 'center', gap: '20px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' 
        }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 20px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 'bold',
              cursor: 'pointer', backdropFilter: 'blur(5px)', transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229, 9, 20, 0.8)'; e.currentTarget.style.border = '1px solid rgba(229, 9, 20, 1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)'; }}
          >
            <ArrowLeft size={20} /> Voltar
          </button>
          <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            {tituloFilme}
          </h2>
        </div>

        {/* CENTRO: Botões de Controle (Pular e Pause) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '50px' }}>
          
          <button onClick={() => skipTime(-10)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, transition: 'transform 0.1s', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.8)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
            <RotateCcw size={48} />
            <span style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>-10s</span>
          </button>

          <button onClick={togglePlay} style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid white', borderRadius: '50%', padding: '25px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(4px)', transform: isPlaying ? 'scale(1)' : 'scale(1.1)', boxShadow: isPlaying ? 'none' : '0 0 30px rgba(229, 9, 20, 0.6)' }}>
            {isPlaying ? <Pause size={48} /> : <Play size={48} style={{ marginLeft: '6px' }} />}
          </button>

          <button onClick={() => skipTime(10)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, transition: 'transform 0.1s', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.8)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
            <RotateCw size={48} />
            <span style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>+10s</span>
          </button>

        </div>

        {/* BASE: Barra de Progresso e Tempo */}
        <div style={{ 
          padding: '40px 50px 30px 50px', 
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)' 
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textShadow: '1px 1px 2px black' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* BARRA CLICÁVEL */}
          <div 
            onClick={handleSeek}
            style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer', position: 'relative', transition: 'height 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.height = '12px'}
            onMouseLeave={e => e.currentTarget.style.height = '8px'}
          >
            <div style={{ width: `${progressPercentage}%`, height: '100%', background: '#E50914', borderRadius: '4px', position: 'relative' }}>
              {/* "Bolinha" da ponta da barra */}
              <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 5px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}