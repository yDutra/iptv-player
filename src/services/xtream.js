// src/services/xtream.js

export const authenticate = async (url, username, password) => {
  // Remove a barra do final da URL, se o usuário digitar sem querer
  const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  
  // Rota padrão universal de painéis Xtream Codes
  const apiUrl = `${cleanUrl}/player_api.php?username=${username}&password=${password}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // O servidor responde com auth: 1 se a senha estiver certa
    if (data.user_info && data.user_info.auth === 1) {
      return { success: true, data: data };
    } else {
      return { success: false, message: 'Usuário, senha ou conta expirada.' };
    }
  } catch (error) {
    return { success: false, message: 'Erro de conexão. Verifique a URL ou sua internet.' };
  }
};