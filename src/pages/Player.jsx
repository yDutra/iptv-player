import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Hls from 'hls.js';
import { ArrowLeft, Play, Pause, RotateCcw, RotateCw, Settings, X, Check } from 'lucide-react';

export default function Player() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null); 
  
  const { stream, credenciais, tipo } = location.state || {};

  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const uiTimeoutRef = useRef(null);

  // Zonas de foco: 'video', 'back', 'settings', 'close_settings', 'audio_X', 'sub_X'
  const [focusedElement, setFocusedElement] = useState('video');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [audioTracks, setAudioTracks] = useState([]);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [activeAudio, setActiveAudio] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState(-1); 

  let streamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  let tituloFilme = stream?.name || stream?.title || 'Reproduzindo Conteúdo...';

  if (stream && credenciais) {
    const baseUrl = credenciais.url.replace(/\/$/, "");
    if (tipo === 'live') {
      streamUrl = `${baseUrl}/live/${credenciais.username}/${credenciais.password}/${stream.stream_id}.m3u8`;
    } else if (tipo === 'vod') {
      const ext = stream.container_extension || 'mp4';
      streamUrl = `${baseUrl}/movie/${credenciais.username}/${credenciais.password}/${stream.stream_id}.${ext}`;
    } else if (tipo === 'series') {
      const ext = stream.container_extension || 'mp4';
      const episodeId = stream.id || stream.stream_id || stream.episode_id;
      streamUrl = `${baseUrl}/series/${credenciais.username}/${credenciais.password}/${episodeId}.${ext}`;
      tituloFilme = `${stream.title} (Ep. ${stream.episode_num})`;
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isHls = streamUrl.includes('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({ debug: false, enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls; 
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (hls.audioTracks && hls.audioTracks.length > 1) {
            setAudioTracks(hls.audioTracks.map((t, i) => ({ id: i, name: t.name || t.lang || `Áudio ${i + 1}` })));
            setActiveAudio(hls.audioTrack);
          }
          if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
            const subs = hls.subtitleTracks.map((t, i) => ({ id: i, name: t.name || t.lang || `Legenda ${i + 1}` }));
            setSubtitleTracks([{ id: -1, name: 'Desativado' }, ...subs]);
            setActiveSubtitle(hls.subtitleTrack);
          } else {
            setSubtitleTracks([{ id: -1, name: 'Desativado' }]);
          }
          video.play().catch(() => setIsPlaying(false));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => video.play().catch(() => setIsPlaying(false)));
      }
    } else {
      video.src = streamUrl;
      video.onloadedmetadata = () => {
        if (video.textTracks && video.textTracks.length > 0) {
          const subs = Array.from(video.textTracks).map((t, i) => ({ id: i, name: t.label || t.language || `Legenda ${i + 1}` }));
          setSubtitleTracks([{ id: -1, name: 'Desativado' }, ...subs]);
        } else {
          setSubtitleTracks([{ id: -1, name: 'Desativado' }]);
        }
        video.play().catch(() => setIsPlaying(false));
      };
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      video.pause();
      video.src = '';
    };
  }, [streamUrl]);

  const changeAudio = (id) => {
    setActiveAudio(id);
    if (hlsRef.current) hlsRef.current.audioTrack = id; 
  };

  const changeSubtitle = (id) => {
    setActiveSubtitle(id);
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = id;
    } else if (videoRef.current && videoRef.current.textTracks) {
      Array.from(videoRef.current.textTracks).forEach((track, index) => {
        track.mode = index === id ? 'showing' : 'hidden';
      });
    }
  };

  const wakeUpUI = () => {
    setIsUiVisible(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    if (videoRef.current && !videoRef.current.paused && !isSettingsOpen) {
      uiTimeoutRef.current = setTimeout(() => {
        setIsUiVisible(false);
        setFocusedElement('video');
      }, 4000);
    }
  };

  useEffect(() => {
    if (isSettingsOpen) {
      setIsUiVisible(true);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    } else {
      wakeUpUI();
    }
  }, [isSettingsOpen]);

  // Sistema de Auto-Scroll para TV
  useEffect(() => {
    if (isSettingsOpen && focusedElement) {
      const element = document.getElementById(`focus-${focusedElement}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedElement, isSettingsOpen]);

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

  // Motor de Teclado Simplificado e Otimizado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape", "Backspace"].includes(e.key)) e.preventDefault();

      if ((e.key === 'Escape' || e.key === 'Backspace') && isSettingsOpen) {
         setIsSettingsOpen(false);
         setFocusedElement('settings'); 
         return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        navigate(-1);
        return;
      }
      if (!isUiVisible && !isSettingsOpen) {
        wakeUpUI();
        setFocusedElement('video');
        return;
      }

      wakeUpUI(); 

      if (isSettingsOpen) {
        if (e.key === 'ArrowDown') {
          if (focusedElement === 'close_settings') {
            setFocusedElement(audioTracks.length > 0 ? 'audio_0' : 'sub_0');
          } 
          else if (focusedElement.startsWith('audio_')) {
            const idx = parseInt(focusedElement.split('_')[1]);
            if (idx < audioTracks.length - 1) setFocusedElement(`audio_${idx + 1}`);
          } 
          else if (focusedElement.startsWith('sub_')) {
            const idx = parseInt(focusedElement.split('_')[1]);
            if (idx < subtitleTracks.length - 1) setFocusedElement(`sub_${idx + 1}`);
          }
        } 
        else if (e.key === 'ArrowUp') {
          if (focusedElement.startsWith('audio_')) {
            const idx = parseInt(focusedElement.split('_')[1]);
            if (idx > 0) setFocusedElement(`audio_${idx - 1}`);
            else setFocusedElement('close_settings');
          } 
          else if (focusedElement.startsWith('sub_')) {
            const idx = parseInt(focusedElement.split('_')[1]);
            if (idx > 0) setFocusedElement(`sub_${idx - 1}`);
            else setFocusedElement('close_settings');
          }
        } 
        else if (e.key === 'ArrowRight') {
          if (focusedElement.startsWith('audio_')) {
            setFocusedElement('sub_0');
          }
        } 
        else if (e.key === 'ArrowLeft') {
          if (focusedElement.startsWith('sub_') && audioTracks.length > 0) {
            setFocusedElement('audio_0');
          }
        } 
        else if (e.key === 'Enter') {
          if (focusedElement === 'close_settings') {
            setIsSettingsOpen(false);
            setFocusedElement('settings');
          } 
          else if (focusedElement.startsWith('audio_')) {
            changeAudio(audioTracks[parseInt(focusedElement.split('_')[1])].id);
          } 
          else if (focusedElement.startsWith('sub_')) {
            changeSubtitle(subtitleTracks[parseInt(focusedElement.split('_')[1])].id);
          }
        }
        return; 
      }

      if (e.key === 'ArrowUp') {
        if (focusedElement === 'video') setFocusedElement('settings');
      } else if (e.key === 'ArrowDown') {
        if (focusedElement === 'back' || focusedElement === 'settings') setFocusedElement('video');
      } else if (e.key === 'ArrowLeft') {
        if (focusedElement === 'settings') setFocusedElement('back');
        else if (focusedElement === 'video') skipTime(-10);
      } else if (e.key === 'ArrowRight') {
        if (focusedElement === 'back') setFocusedElement('settings');
        else if (focusedElement === 'video') skipTime(10);
      } else if (e.key === 'Enter') {
        if (focusedElement === 'back') navigate(-1);
        else if (focusedElement === 'settings') {
          setIsSettingsOpen(true);
          setFocusedElement(audioTracks.length > 0 ? 'audio_0' : 'sub_0');
        }
        else if (focusedElement === 'video') togglePlay();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, isUiVisible, isSettingsOpen, focusedElement, audioTracks, subtitleTracks]); 

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

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

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const date = new Date(timeInSeconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh > 0) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    return `${mm}:${ss}`;
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={() => { wakeUpUI(); if(!isSettingsOpen) setFocusedElement('video'); }} 
      onClick={wakeUpUI} 
      style={{ width: '100vw', height: '100vh', background: 'black', position: 'relative', overflow: 'hidden', cursor: isUiVisible ? 'default' : 'none' }}
    >
      <video 
        ref={videoRef} 
        autoPlay 
        crossOrigin="anonymous" 
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => { setIsPlaying(true); wakeUpUI(); }}
        onPause={() => { setIsPlaying(false); wakeUpUI(); }}
        onClick={() => { if(!isSettingsOpen) togglePlay(); }} 
        style={{ width: '100%', height: '100%', objectFit: 'contain', outline: 'none', backgroundColor: '#000' }} 
      />

      {isSettingsOpen && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '450px',
            background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(10px)',
            zIndex: 50, borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards'
          }}
        >
          <div style={{ padding: '30px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Áudio e Legendas</h2>
            <button 
              id="focus-close_settings"
              onMouseEnter={() => setFocusedElement('close_settings')}
              onClick={() => { setIsSettingsOpen(false); setFocusedElement('settings'); }} 
              style={{ background: focusedElement === 'close_settings' ? 'rgba(229, 9, 20, 0.3)' : 'transparent', border: focusedElement === 'close_settings' ? '2px solid #E50914' : '2px solid transparent', borderRadius: '8px', padding: '4px', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <X size={28} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', gap: '30px', scrollBehavior: 'smooth' }}>
            
            {audioTracks.length > 0 && (
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#888', fontSize: '13px', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' }}>Áudio</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {audioTracks.map((track, idx) => {
                    const isFocused = focusedElement === `audio_${idx}`;
                    return (
                      <button 
                        key={track.id} 
                        id={`focus-audio_${idx}`}
                        onMouseEnter={() => setFocusedElement(`audio_${idx}`)} 
                        onClick={() => changeAudio(track.id)}
                        style={{
                          background: isFocused ? 'rgba(229, 9, 20, 0.2)' : 'transparent', border: isFocused ? '2px solid #E50914' : '2px solid transparent',
                          borderRadius: '6px', color: activeAudio === track.id ? 'white' : '#ccc', fontSize: '15px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: activeAudio === track.id ? 'bold' : 'normal', padding: '8px 10px'
                        }}>
                        {activeAudio === track.id ? <Check size={18} color="#E50914" /> : <div style={{width:'18px'}} />} {track.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ flex: 1, paddingBottom: '20px' }}>
              <h3 style={{ color: '#888', fontSize: '13px', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' }}>Legendas</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {subtitleTracks.map((track, idx) => {
                  const isFocused = focusedElement === `sub_${idx}`;
                  return (
                    <button 
                      key={track.id} 
                      id={`focus-sub_${idx}`}
                      onMouseEnter={() => setFocusedElement(`sub_${idx}`)} 
                      onClick={() => changeSubtitle(track.id)}
                      style={{
                        background: isFocused ? 'rgba(229, 9, 20, 0.2)' : 'transparent', border: isFocused ? '2px solid #E50914' : '2px solid transparent',
                        borderRadius: '6px', color: activeSubtitle === track.id ? 'white' : '#ccc', fontSize: '15px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: activeSubtitle === track.id ? 'bold' : 'normal', padding: '8px 10px'
                      }}>
                      {activeSubtitle === track.id ? <Check size={18} color="#E50914" /> : <div style={{width:'18px'}} />} {track.name}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CAMADA DE INTERFACE PADRÃO */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        opacity: (isUiVisible && !isSettingsOpen) ? 1 : 0, transition: 'opacity 0.4s ease-in-out', pointerEvents: (isUiVisible && !isSettingsOpen) ? 'auto' : 'none'
      }}>
        <div style={{ padding: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onMouseEnter={() => setFocusedElement('back')} onClick={() => navigate(-1)} style={{ padding: '12px 20px', background: focusedElement === 'back' ? 'rgba(229, 9, 20, 0.8)' : 'rgba(0,0,0,0.5)', color: 'white', border: focusedElement === 'back' ? '2px solid #E50914' : '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(5px)', transition: 'all 0.2s ease', transform: focusedElement === 'back' ? 'scale(1.05)' : 'scale(1)' }}>
              <ArrowLeft size={20} /> Voltar
            </button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{tituloFilme}</h2>
          </div>
          <button onMouseEnter={() => setFocusedElement('settings')} onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); setFocusedElement(audioTracks.length > 0 ? 'audio_0' : 'sub_0'); }} style={{ background: focusedElement === 'settings' ? 'rgba(229, 9, 20, 0.4)' : 'rgba(0,0,0,0.5)', border: focusedElement === 'settings' ? '2px solid #E50914' : '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', padding: '15px', color: 'white', cursor: 'pointer', backdropFilter: 'blur(5px)', transition: 'all 0.2s ease', transform: focusedElement === 'settings' ? 'scale(1.1)' : 'scale(1)', boxShadow: focusedElement === 'settings' ? '0 0 15px rgba(229,9,20,0.5)' : 'none' }}>
            <Settings size={28} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '50px' }}>
          <button onClick={(e) => { e.stopPropagation(); skipTime(-10); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, transition: 'transform 0.1s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <RotateCcw size={48} /><span style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>-10s</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid white', borderRadius: '50%', padding: '25px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(4px)', transform: isPlaying ? 'scale(1)' : 'scale(1.1)', boxShadow: isPlaying ? 'none' : '0 0 30px rgba(229, 9, 20, 0.6)' }}>
            {isPlaying ? <Pause size={48} /> : <Play size={48} style={{ marginLeft: '6px' }} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); skipTime(10); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, transition: 'transform 0.1s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <RotateCw size={48} /><span style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>+10s</span>
          </button>
        </div>

        <div style={{ padding: '40px 50px 30px 50px', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textShadow: '1px 1px 2px black' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div onClick={handleSeek} style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer', position: 'relative', transition: 'height 0.2s' }}>
            <div style={{ width: `${(currentTime / (duration || 1)) * 100}%`, height: '100%', background: '#E50914', borderRadius: '4px', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 5px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        ::cue {
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          font-family: Arial, sans-serif;
          font-size: 24px;
          text-shadow: 2px 2px 4px black;
        }
      `}</style>
    </div>
  );
}