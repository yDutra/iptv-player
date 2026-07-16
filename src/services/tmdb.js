// src/services/tmdb.js

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

/**
 * Procura o ID de uma série ou filme no TMDb usando o nome
 */
export const searchOnTMDb = async (name, isTv = false) => {
  if (!API_KEY) {
    console.warn("Chave do TMDb não encontrada no .env.local");
    return null;
  }

  try {
    const type = isTv ? 'tv' : 'movie';
    
    // Limpeza inteligente do nome para melhorar a taxa de acerto na busca
    const cleanName = name
      .replace(/\s\(\d{4}\)/g, "") // Remove o ano ex: " (2025)"
      .replace(/\[.*?\]/g, "")     // Remove colchetes ex: "[Dublado]"
      .replace(/S\d+E\d+/gi, "")   // Remove marcações de temporada se houver
      .trim();

    const response = await fetch(
      `${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(cleanName)}&language=pt-BR`
    );
    const data = await response.json();
    return data.results && data.results.length > 0 ? data.results[0] : null;
  } catch (error) {
    console.error("Erro ao procurar no TMDb:", error);
    return null;
  }
};

/**
 * Puxa os detalhes completos de uma temporada (com imagens e sinopses de cada episódio)
 */
export const getSeasonDetails = async (tvId, seasonNumber) => {
  if (!API_KEY) return null;
  try {
    const response = await fetch(
      `${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}&language=pt-BR`
    );
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar temporada no TMDb:", error);
    return null;
  }
};