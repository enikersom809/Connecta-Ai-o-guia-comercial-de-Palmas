import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, MapPin, Image as ImageIcon } from 'lucide-react';
import { Place } from '../types';
import { dicionarioCategorias } from '../App';
import { INITIAL_PLACES } from '../data/initialPlaces';

interface FeaturedCarouselProps {
  places: Place[];
  onSelectPlace?: (place: Place) => void;
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  places,
  onSelectPlace,
}) => {
  // Garantir que INITIAL_PLACES seja usado se places vier vazio
  const allPlaces = places && places.length > 0 ? places : INITIAL_PLACES;

  // Filtra locais premium, permanentes, em destaque ou apenasBanner
  const hoje = new Date().toISOString().split('T')[0];
  const featuredPlaces = allPlaces.filter((place) => {
    const isDestaque = Boolean(
      place.premium || place.permanente || place.featured || place.apenasBanner
    );
    if (!isDestaque) return false;
    if (place.expiraEm && place.expiraEm < hoje) return false;
    return true;
  });

  const activePlaces = featuredPlaces.length > 0 ? featuredPlaces : allPlaces.slice(0, 6);

  // Helper para resolver URL da imagem com fallback
  const getSlideImageUrl = (item: Place) => {
    if (item.imagem && typeof item.imagem === 'string' && item.imagem.trim().length > 5) {
      return item.imagem.trim();
    }
    if (item.galeria && Array.isArray(item.galeria) && item.galeria.length > 0 && item.galeria[0]?.trim()) {
      return item.galeria[0].trim();
    }
    switch (item.tipo) {
      case 'pizzaria':
        return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80';
      case 'comercio':
        return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80';
      case 'praca':
        return 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1200&q=80';
      case 'turismo':
      default:
        return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';
    }
  };

  // Construir lista de slides: Lugares em Destaque COM FOTOS REAIS + Slide Promocional CONECTA.AÍ
  type SlideItem =
    | {
        id: string;
        isPromo: false;
        place: Place;
        title: string;
        subtitle: string;
        description: string;
        image: string;
      }
    | {
        id: string;
        isPromo: true;
        title: string;
        subtitle: string;
        description: string;
        image: string;
        phone: string;
      };

  const slides: SlideItem[] = [
    ...activePlaces.map((place) => ({
      id: `place-${place.id}`,
      isPromo: false as const,
      place,
      title: place.nome,
      subtitle: `DESTAQUE • ${dicionarioCategorias[place.tipo] || place.tipo}`,
      description: place.descricao,
      image: getSlideImageUrl(place),
    })),
    {
      id: 'promo-conecta-ai',
      isPromo: true as const,
      title: 'SUA EMPRESA AQUI!',
      subtitle: 'CONECTA.AÍ • O futuro da conexão',
      description: 'Apareça no topo do nosso guia comercial e aumente suas vendas na cidade.',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
      phone: '(63) 99224-5179',
    },
  ];

  const totalSlides = slides.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Navegação
  const nextSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(idx);
  };

  // Suporte a gesto de arrastar/deslizar com o dedo (Touch Swipe) no celular
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
    setIsHovered(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsHovered(false);
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const distance = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 35;
      if (distance > minSwipeDistance) {
        // Deslizou para a esquerda -> Próximo slide
        nextSlide();
      } else if (distance < -minSwipeDistance) {
        // Deslizou para a direita -> Slide anterior
        prevSlide();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Autoplay Effect (Alterna automaticamente os slides a cada 4.5 segundos)
  useEffect(() => {
    if (totalSlides <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 4500);

    return () => clearInterval(timer);
  }, [totalSlides, isHovered]);

  return (
    <div className="relative w-full mb-6">
      {/* Container Principal do Banner com Efeito de Borda Neon Giratória */}
      <div className="banner-container group relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] min-h-[180px] sm:min-h-[230px] md:min-h-[280px] max-h-[420px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl z-10">
        {/* Linha de luz neon que corre no topo */}
        <div className="vane-light-line" />

        {/* Efeito de luz giratória VaneMotion (Conic Gradient 360 loop) */}
        <div className="vane-glow" />

        {/* Conteúdo principal do CONECTA.AÍ em Tela Cheia (Sobre o feixe de luz) */}
        <section
          id="secao-banner"
          className="banner-content select-none touch-pan-y relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Imagem de fundo reserva caso a imagem demore para carregar */}
          <div className="absolute inset-0 bg-red-950 flex items-center justify-center text-white/10 pointer-events-none z-0">
            <ImageIcon className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>

          {/* Container de Carrossel com Transição Suave */}
          <div
            id="carousel-container"
            className="w-full h-full flex z-10 relative transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {slides.map((slide) => {
              if (slide.isPromo) {
                return (
                  <div
                    key={slide.id}
                    className="min-w-full w-full h-full relative flex-shrink-0 shrink-0 select-none overflow-hidden"
                  >
                    {/* Imagem de Fundo do Slide Promocional */}
                    <img
                      src={slide.image}
                      alt={slide.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover object-center brightness-75 scale-100 group-hover:scale-105 transition-transform duration-700 z-0"
                    />

                    {/* Gradiente vermelho e escuro para legibilidade perfeita do texto */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 via-red-800/80 to-black/75 z-10 flex items-center p-3.5 sm:p-6 md:p-12 text-white" />

                    <div className="relative z-20 space-y-1 sm:space-y-2 max-w-lg p-3.5 sm:p-6 md:p-12 text-white flex flex-col justify-center h-full">
                      <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-xs border border-yellow-400/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-xs w-fit">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-400 animate-ping shrink-0" />
                        <span className="text-yellow-300 font-extrabold text-[9px] sm:text-[10px] md:text-xs tracking-wider uppercase">
                          {slide.subtitle}
                        </span>
                      </div>
                      <h4 className="font-black text-lg sm:text-3xl md:text-5xl uppercase tracking-tight leading-tight sm:leading-none drop-shadow-md">
                        SUA EMPRESA <br className="hidden sm:inline" />
                        <span className="text-yellow-300"> AQUI!</span>
                      </h4>
                      <p className="text-[10px] sm:text-xs md:text-sm text-red-100 font-light max-w-sm line-clamp-1 sm:line-clamp-2">
                        {slide.description}
                      </p>
                      <a
                        href="https://wa.me/5563992245179?text=Olá!%20Gostaria%20de%20anunciar%20minha%20empresa%20no%20CONECTA.AÍ"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 sm:gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black text-[10px] sm:text-xs px-3 sm:px-4 py-1 sm:py-2 rounded-full shadow-md transition mt-1 sm:mt-2 active:scale-95 cursor-pointer shrink-0 w-fit"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-gray-900 shrink-0" />
                        <span>FALE CONOSCO: {slide.phone}</span>
                      </a>
                    </div>

                    <div className="absolute right-2 sm:right-6 bottom-2 sm:bottom-4 opacity-20 sm:opacity-30 pointer-events-none z-10">
                      <MapPin className="w-20 h-20 sm:w-36 sm:h-36 md:w-56 md:h-56 text-white" />
                    </div>
                  </div>
                );
              }

              // Slide de Local em Destaque (Com foto real)
              const placeObj = 'place' in slide ? slide.place : null;
              return (
                <div
                  key={slide.id}
                  onClick={() => onSelectPlace && placeObj && onSelectPlace(placeObj)}
                  className="min-w-full w-full h-full relative flex-shrink-0 shrink-0 select-none overflow-hidden cursor-pointer group/slide bg-gray-900"
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80') {
                        target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80';
                      }
                    }}
                    className="w-full h-full object-cover object-center group-hover/slide:scale-105 transition-transform duration-700 brightness-90 relative z-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3.5 sm:p-6 md:p-10 z-10">
                    <span className="tag-destaque text-[9px] sm:text-xs">
                      {slide.subtitle}
                    </span>
                    <h2 className="titulo-ponto text-sm sm:text-xl md:text-3xl line-clamp-1">
                      {slide.title}
                    </h2>
                    <p className="descricao-ponto text-[11px] sm:text-xs md:text-sm line-clamp-1 sm:line-clamp-2">
                      {slide.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botões de Navegação Manual (Anterior / Próximo) */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-red-600 text-white p-2 sm:p-2.5 rounded-full transition-all z-30 active:scale-95 cursor-pointer border border-white/20 shadow-lg"
                aria-label="Slide anterior"
                title="Slide anterior"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-red-600 text-white p-2 sm:p-2.5 rounded-full transition-all z-30 active:scale-95 cursor-pointer border border-white/20 shadow-lg"
                aria-label="Próximo slide"
                title="Próximo slide"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          {/* Indicadores Visuais (Bolinhas) */}
          {totalSlides > 1 && (
            <div id="carousel-dots" className="carousel-dots absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  id={`carousel-dot-${idx}`}
                  type="button"
                  onClick={(e) => goToSlide(idx, e)}
                  className={`dot ${idx === currentIndex ? 'active' : ''}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
