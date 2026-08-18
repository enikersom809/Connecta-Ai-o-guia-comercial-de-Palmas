import React, { useState, useEffect } from 'react';
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
  // Garantir que INITIAL_PLACES seja usado se places vier vazio do Firestore/LocalStorage
  const allPlaces = places && places.length > 0 ? places : INITIAL_PLACES;

  // Filtra locais premium, permanentes, em destaque ou apenasBanner; valida com base na data de hoje
  const hoje = new Date().toISOString().split('T')[0];
  const filteredFeatured = allPlaces.filter((place) => {
    const isDestaqueOuPermanente = Boolean(
      place.premium || place.permanente || place.featured || place.apenasBanner
    );
    if (!isDestaqueOuPermanente) return false;

    // Se possui data de expiração, verifica se ainda é válida
    if (place.expiraEm) {
      return place.expiraEm >= hoje;
    }
    return true;
  });

  const premiumPlaces = filteredFeatured.length > 0 ? filteredFeatured : allPlaces.slice(0, 5);

  // Total real slides = Promo Banner (1) + Premium Places
  const totalReal = 1 + premiumPlaces.length;

  // Real slide 1 começa no índice 1 (pois o índice 0 é o clone do último slide)
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isWithTransition, setIsWithTransition] = useState(true);
  const [carrosselEmTransicao, setCarrosselEmTransicao] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Hook de inicialização limpa que zera o índice do carrossel para o primeiro slide ativo
  // e escuta os eventos 'pageshow' e 'focus' sempre que a tela ganha foco ou ao voltar à página.
  useEffect(() => {
    const resetarCarrosselLimpo = () => {
      setIsWithTransition(false);
      setCarrosselEmTransicao(false);
      setCurrentIndex(1);
    };

    window.addEventListener('pageshow', resetarCarrosselLimpo);
    window.addEventListener('focus', resetarCarrosselLimpo);

    return () => {
      window.removeEventListener('pageshow', resetarCarrosselLimpo);
      window.removeEventListener('focus', resetarCarrosselLimpo);
    };
  }, []);

  // Garante que se totalReal mudar, o índice continua em limites válidos
  useEffect(() => {
    if (currentIndex > totalReal) {
      setCurrentIndex(1);
    }
  }, [totalReal]);

  // Helper para resolver URL da imagem com fallback
  const getSlideImageUrl = (item: Place) => {
    if (item.imagem && typeof item.imagem === 'string' && item.imagem.trim()) {
      return item.imagem.trim();
    }
    if (item.galeria && Array.isArray(item.galeria) && item.galeria.length > 0 && item.galeria[0]?.trim()) {
      return item.galeria[0].trim();
    }
    switch (item.tipo) {
      case 'pizzaria':
        return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80';
      case 'comercio':
        return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
      case 'praca':
        return 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80';
      case 'turismo':
      default:
        return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
    }
  };

  // Autoplay effect
  useEffect(() => {
    if (totalReal <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCarrosselEmTransicao(true);
      setIsWithTransition(true);
      setCurrentIndex((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(timer);
  }, [totalReal, isHovered]);

  const handleTransitionEnd = () => {
    setCarrosselEmTransicao(false);
    if (currentIndex === totalReal + 1) {
      setIsWithTransition(false);
      setCurrentIndex(1);
    } else if (currentIndex === 0) {
      setIsWithTransition(false);
      setCurrentIndex(totalReal);
    }
  };

  const mudarSlideManual = (direcao: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (carrosselEmTransicao) return;

    setCarrosselEmTransicao(true);
    setIsWithTransition(true);
    setCurrentIndex((prev) => prev + direcao);
  };

  const goToSlide = (realIndex: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (carrosselEmTransicao) return;

    setCarrosselEmTransicao(true);
    setIsWithTransition(true);
    setCurrentIndex(realIndex + 1);
  };

  // Render Promo Slide Component
  const renderPromoSlide = (key: string) => (
    <div
      key={key}
      className="min-w-full h-full relative bg-gradient-to-r from-red-600 via-red-700 to-red-800 flex items-center p-6 md:p-12 text-white shrink-0 select-none"
    >
      <div className="space-y-2 max-w-lg z-10">
        <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-xs border border-yellow-400/40 px-2.5 py-1 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          <span className="text-yellow-300 font-extrabold text-[10px] md:text-xs tracking-wider uppercase">
            CONECTA.AÍ • O futuro da conexão
          </span>
        </div>
        <h4 className="font-black text-2xl md:text-5xl uppercase tracking-tight leading-none drop-shadow-md">
          SUA EMPRESA <br />
          <span className="text-yellow-300">AQUI!</span>
        </h4>
        <p className="text-xs md:text-sm text-red-100 font-light max-w-sm">
          Apareça no topo do nosso guia comercial por 6 meses e aumente suas vendas.
        </p>
        <a
          href="https://wa.me/5563992245179?text=Olá!%20Gostaria%20de%20anunciar%20minha%20empresa%20no%20CONECTA.AÍ"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black text-xs px-4 py-2 rounded-full shadow-md transition mt-2 active:scale-95"
        >
          <Megaphone className="w-4 h-4 text-gray-900" />
          <span>CLIQUE AQUI E FALE CONOSCO: (63) 99224-5179</span>
        </a>
      </div>
      <div className="absolute right-6 bottom-4 opacity-20 md:opacity-30 pointer-events-none">
        <MapPin className="w-32 h-32 md:w-56 md:h-56 text-white" />
      </div>
    </div>
  );

  // Render Place Slide Component
  const renderPlaceSlide = (item: Place, key: string) => {
    const imgSrc = getSlideImageUrl(item);
    return (
      <div
        key={key}
        onClick={() => onSelectPlace && onSelectPlace(item)}
        className="min-w-full h-full relative block cursor-pointer group/slide shrink-0 select-none bg-gradient-to-r from-red-700 to-red-800"
      >
        <img
          src={imgSrc}
          alt={item.nome}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80') {
              target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
            }
          }}
          className="w-full h-full object-cover object-center group-hover/slide:scale-105 transition duration-700 brightness-90 relative z-10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 md:p-10 z-20">
          <span className="tag-destaque">
            DESTAQUE • {dicionarioCategorias[item.tipo] || item.tipo}
          </span>
          <h2 className="titulo-ponto">
            {item.nome}
          </h2>
          <p className="descricao-ponto line-clamp-2">
            {item.descricao}
          </p>
        </div>
      </div>
    );
  };

  // Calcular índice do ponto indicador ativo
  const indexDot = (currentIndex - 1 + totalReal) % totalReal;

  return (
    <div className="relative w-full mb-6">
      {/* Container Principal do Banner com Efeito de Borda Neon Giratória */}
      <div className="banner-container group relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] min-h-[260px] max-h-[420px] rounded-3xl overflow-hidden shadow-2xl z-10">
        {/* Linha de luz neon que corre no topo */}
        <div className="vane-light-line" />

        {/* Efeito de luz giratória VaneMotion (Conic Gradient 360 loop) */}
        <div className="vane-glow" />

        {/* Conteúdo principal do CONECTA.AÍ em Tela Cheia (Sobre o feixe de luz) */}
        <section
          id="secao-banner"
          className="banner-content select-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Imagem de fundo reserva caso a imagem demore para carregar */}
          <div className="absolute inset-0 bg-red-800 flex items-center justify-center text-white/10 pointer-events-none z-0">
            <ImageIcon className="w-20 h-20" />
          </div>

          {/* Container de Carrossel Deslizante */}
          <div
            id="carousel-container"
            className={`w-full h-full flex z-10 relative ${
              isWithTransition ? 'transition-transform duration-500 ease-in-out' : ''
            }`}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            onTransitionEnd={handleTransitionEnd}
          >
            {/* CLONE DO ÚLTIMO SLIDE NO INÍCIO */}
            {premiumPlaces.length > 0
              ? renderPlaceSlide(premiumPlaces[premiumPlaces.length - 1], 'clone-last')
              : renderPromoSlide('clone-last')}

            {/* SLIDE 1 REAL: PROMOÇÃO */}
            {renderPromoSlide('real-promo')}

            {/* DEMAIS SLIDES REAIS: LUGARES PREMIUM / DESTAQUE */}
            {premiumPlaces.map((item) => renderPlaceSlide(item, `real-${item.id}`))}

            {/* CLONE DO PRIMEIRO SLIDE NO FINAL */}
            {renderPromoSlide('clone-first')}
          </div>

          {/* Botões de Navegação Manual (Anterior / Próximo) */}
          {totalReal > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => mudarSlideManual(-1, e)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2.5 rounded-full hover:bg-red-600/80 transition-all opacity-0 group-hover:opacity-100 z-30 active:scale-95 cursor-pointer border border-white/20 shadow-lg"
                aria-label="Slide anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => mudarSlideManual(1, e)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2.5 rounded-full hover:bg-red-600/80 transition-all opacity-0 group-hover:opacity-100 z-30 active:scale-95 cursor-pointer border border-white/20 shadow-lg"
                aria-label="Próximo slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Indicadores Visuais (Bolinhas) */}
          {totalReal > 1 && (
            <div id="carousel-dots" className="carousel-dots absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
              {Array.from({ length: totalReal }).map((_, idx) => (
                <button
                  key={idx}
                  id={`carousel-dot-${idx}`}
                  type="button"
                  onClick={(e) => goToSlide(idx, e)}
                  className={`dot ${idx === indexDot ? 'active' : ''}`}
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
