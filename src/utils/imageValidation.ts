export async function validateImageUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  if (!url) return { valid: true }; // Permite URLs vazias se opcional

  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
    
    if (response.status === 404) {
      return { valid: false, error: 'Imagem não encontrada (404)' };
    }
    
    if (!response.ok) {
      return { valid: false, error: `Erro ao acessar imagem (Status: ${response.status})` };
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.startsWith('image/')) {
      return { valid: false, error: 'O link não aponta para uma imagem válida' };
    }

    return { valid: true };
  } catch (err: any) {
    // Provavelmente erro de CORS se for URL externa
    console.warn('CORS restricted or network error during image validation:', err);
    // Em caso de CORS, não podemos ter certeza absoluta via HEAD, 
    // mas podemos tentar um carregamento simples em background se necessário.
    // Por enquanto, vamos assumir que se falhou o fetch HEAD por CORS, 
    // o navegador ainda pode conseguir carregar a imagem via tag <img>.
    return { valid: true }; 
  }
}
