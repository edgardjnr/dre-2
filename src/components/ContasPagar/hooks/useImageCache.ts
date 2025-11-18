import { useState, useEffect, useRef, useCallback } from 'react';

interface CachedImage {
  url: string;
  element: HTMLImageElement;
  loaded: boolean;
  error: boolean;
  timestamp: number;
}

interface UseImageCacheOptions {
  maxCacheSize?: number;
  preloadAdjacent?: boolean;
  cacheTimeout?: number; // em milissegundos
}

export function useImageCache(options: UseImageCacheOptions = {}) {
  const {
    maxCacheSize = 20,
    preloadAdjacent = true,
    cacheTimeout = 5 * 60 * 1000 // 5 minutos
  } = options;

  const [cache, setCache] = useState<Map<string, CachedImage>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  // Limpar cache periodicamente
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setCache(prevCache => {
        const newCache = new Map(prevCache);
        for (const [url, cachedImage] of newCache) {
          if (now - cachedImage.timestamp > cacheTimeout) {
            // Revogar URL do objeto se necessário
            if (cachedImage.element.src.startsWith('blob:')) {
              URL.revokeObjectURL(cachedImage.element.src);
            }
            newCache.delete(url);
          }
        }
        return newCache;
      });
    };

    cleanupTimeoutRef.current = setInterval(cleanup, cacheTimeout / 2);
    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, [cacheTimeout]);

  // Função para carregar uma imagem
  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // Verificar se já está no cache
      const cached = cache.get(url);
      if (cached && cached.loaded && !cached.error) {
        resolve(cached.element);
        return;
      }

      // Verificar se já está carregando
      if (loadingImages.has(url)) {
        // Aguardar o carregamento atual
        const checkLoading = () => {
          const cachedAfterWait = cache.get(url);
          if (cachedAfterWait && cachedAfterWait.loaded) {
            if (cachedAfterWait.error) {
              reject(new Error(`Falha ao carregar imagem: ${url}`));
            } else {
              resolve(cachedAfterWait.element);
            }
          } else if (loadingImages.has(url)) {
            setTimeout(checkLoading, 100);
          } else {
            reject(new Error(`Timeout ao carregar imagem: ${url}`));
          }
        };
        checkLoading();
        return;
      }

      // Marcar como carregando
      setLoadingImages(prev => new Set(prev).add(url));

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const cachedImage: CachedImage = {
          url,
          element: img,
          loaded: true,
          error: false,
          timestamp: Date.now()
        };

        setCache(prevCache => {
          const newCache = new Map(prevCache);
          
          // Limitar tamanho do cache
          if (newCache.size >= maxCacheSize) {
            // Remover a imagem mais antiga
            let oldestUrl = '';
            let oldestTime = Date.now();
            for (const [cacheUrl, cacheImg] of newCache) {
              if (cacheImg.timestamp < oldestTime) {
                oldestTime = cacheImg.timestamp;
                oldestUrl = cacheUrl;
              }
            }
            if (oldestUrl) {
              const oldImg = newCache.get(oldestUrl);
              if (oldImg && oldImg.element.src.startsWith('blob:')) {
                URL.revokeObjectURL(oldImg.element.src);
              }
              newCache.delete(oldestUrl);
            }
          }
          
          newCache.set(url, cachedImage);
          return newCache;
        });

        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });

        resolve(img);
      };

      img.onerror = () => {
        const cachedImage: CachedImage = {
          url,
          element: img,
          loaded: true,
          error: true,
          timestamp: Date.now()
        };

        setCache(prevCache => new Map(prevCache).set(url, cachedImage));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });

        reject(new Error(`Falha ao carregar imagem: ${url}`));
      };

      img.src = url;
    });
  }, [cache, loadingImages, maxCacheSize]);

  // Função para preload de imagens adjacentes
  const preloadAdjacentImages = useCallback((urls: string[], currentIndex: number) => {
    if (urls.length <= 1) return;

    const toPreload: string[] = [];
    
    // Preload da próxima imagem
    if (currentIndex < urls.length - 1) {
      toPreload.push(urls[currentIndex + 1]);
    }
    
    // Preload da imagem anterior
    if (currentIndex > 0) {
      toPreload.push(urls[currentIndex - 1]);
    }

    // Preload das imagens seguintes (até 2)
    for (let i = 1; i <= 2 && currentIndex + i < urls.length; i++) {
      if (!toPreload.includes(urls[currentIndex + i])) {
        toPreload.push(urls[currentIndex + i]);
      }
    }

    // Executar preload em background
    toPreload.forEach(url => {
      if (!cache.has(url) && !loadingImages.has(url)) {
        loadImage(url).catch(() => {
          // Ignorar erros de preload silenciosamente
        });
      }
    });
  }, [cache, loadingImages, loadImage]);

  // Função para verificar se uma imagem está carregada
  const isImageLoaded = useCallback((url: string): boolean => {
    const cached = cache.get(url);
    return cached ? cached.loaded && !cached.error : false;
  }, [cache]);

  // Função para verificar se uma imagem está carregando
  const isImageLoading = useCallback((url: string): boolean => {
    return loadingImages.has(url);
  }, [loadingImages]);

  // Função para obter imagem do cache
  const getCachedImage = useCallback((url: string): HTMLImageElement | null => {
    const cached = cache.get(url);
    return cached && cached.loaded && !cached.error ? cached.element : null;
  }, [cache]);

  // Função para limpar cache manualmente
  const clearCache = useCallback(() => {
    cache.forEach(cachedImage => {
      if (cachedImage.element.src.startsWith('blob:')) {
        URL.revokeObjectURL(cachedImage.element.src);
      }
    });
    setCache(new Map());
    setLoadingImages(new Set());
  }, [cache]);

  return {
    loadImage,
    preloadAdjacent: preloadAdjacentImages,
    isImageLoaded,
    isImageLoading,
    getCachedImage,
    clearCache,
    cacheSize: cache.size,
    loadingCount: loadingImages.size
  };
}

export default useImageCache;