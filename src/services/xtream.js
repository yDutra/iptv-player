// src/services/xtream.js

export const authenticate = async (url, username, password) => {
  try {
    const cleanUrl = url.replace(/\/$/, ""); 
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}`);
    if (!response.ok) throw new Error('Falha na comunicação');
    const data = await response.json();

    if (data.user_info && data.user_info.auth === 1) {
      return { success: true, data: data };
    } else {
      return { success: false, message: 'Usuário ou senha inválidos.' };
    }
  } catch (error) {
    console.error("Erro no Xtream API:", error);
    return { success: false, message: 'Erro de rede. Verifique a URL.' };
  }
};

export const getCategories = async (url, username, password, type = 'vod') => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_${type}_categories`);
    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar categorias (${type}):`, error);
    return [];
  }
};

export const getStreams = async (url, username, password, type = 'vod', categoryId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    // Correção: A API de Séries tem um nome de comando diferente da de Filmes e TV
    const action = type === 'series' ? 'get_series' : `get_${type}_streams`;
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=${action}&category_id=${categoryId}`);
    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar streams (${type}, cat: ${categoryId}):`, error);
    return [];
  }
};

// Adicione no final do arquivo src/services/xtream.js

// 4. Função para buscar as Temporadas e Episódios de uma Série
export const getSeriesInfo = async (url, username, password, seriesId) => {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${seriesId}`);
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar informações da série:", error);
    return null;
  }
};