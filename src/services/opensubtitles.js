// src/services/opensubtitles.js

const API_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY;
const BASE_URL = 'https://api.opensubtitles.com/api/v1';

/**
 * 1. Pesquisa legendas baseadas no nome (Com Inteligência de Séries e Diversidade de Idiomas)
 */
export const searchSubtitles = async (rawQuery) => {
  if (!API_KEY) {
    console.warn("Chave do OpenSubtitles ausente no .env.local");
    return [];
  }

  try {
    let cleanQuery = rawQuery;
    let season = null;
    let episode = null;

    // A. DETETOR DE SÉRIES
    const seMatch = rawQuery.match(/S(\d{1,2})[EX](\d{1,2})/i) || rawQuery.match(/(?:^|\s)(\d{1,2})x(\d{1,2})/i);

    if (seMatch) {
      season = parseInt(seMatch[1], 10);
      episode = parseInt(seMatch[2], 10);
      cleanQuery = rawQuery.split(seMatch[0])[0].replace(/[-_.:]+$/, '').trim();
    } else {
      // B. MODO FILME
      cleanQuery = rawQuery
        .replace(/\s\(\d{4}\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\{.*?\}/g, "")
        .trim();
    }

    // C. CONSTRUÇÃO DA PESQUISA
    let url = `${BASE_URL}/subtitles?query=${encodeURIComponent(cleanQuery)}&languages=pt-br,es,en`;
    
    if (season && episode) {
      url += `&season_number=${season}&episode_number=${episode}`;
    }

    const response = await fetch(url, {
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    const rawResults = data.data || [];

    // =========================================================
    // D. FILTRO DE DIVERSIDADE (Evita monopólio de um só idioma)
    // =========================================================
    const groupedResults = {};
    
    rawResults.forEach(sub => {
      const lang = sub.attributes.language || 'unknown';
      // Cria a categoria do idioma se não existir
      if (!groupedResults[lang]) {
        groupedResults[lang] = [];
      }
      // Limita a um MÁXIMO de 2 legendas por idioma
      if (groupedResults[lang].length < 2) {
        groupedResults[lang].push(sub);
      }
    });

    // Achata os grupos de volta para uma lista única
    let results = [];
    Object.values(groupedResults).forEach(subs => results.push(...subs));

    // =========================================================
    // E. ALGORITMO DE PRIORIDADE DE EXIBIÇÃO (BR > ES > EN)
    // =========================================================
    results.sort((a, b) => {
      const langA = a.attributes.language || '';
      const langB = b.attributes.language || '';
      
      const getScore = (lang) => {
        if (lang === 'pt-br' || lang === 'pt') return 3; // Prioridade Máxima
        if (lang === 'es') return 2;                     // Prioridade Alta
        if (lang === 'en') return 1;                     // Prioridade Média
        return 0;
      };
      
      return getScore(langB) - getScore(langA);
    });

    return results;
  } catch (error) {
    console.error("Erro na busca de legendas:", error);
    return [];
  }
};

/**
 * 2. Baixa e Converte a Legenda (SRT -> VTT -> Blob)
 */
export const downloadSubtitle = async (fileId) => {
  try {
    const resLink = await fetch(`${BASE_URL}/download`, {
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ file_id: fileId })
    });
    const dataLink = await resLink.json();

    if (!dataLink.link) throw new Error("Link de download não encontrado");

    const srtRes = await fetch(dataLink.link);
    const srtText = await srtRes.text();

    let vtt = "WEBVTT\n\n";
    vtt += srtText
        .replace(/\r\n|\r/g, '\n') 
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') 
        .replace(/^[ \t]+|[ \t]+$/gm, ''); 

    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Erro ao injetar a legenda externa:", error);
    return null;
  }
};