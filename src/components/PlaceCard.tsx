import React, { useState, useEffect, useMemo } from 'react';
import { Star, MapPin, MessageCircle, Navigation, Heart, ChevronLeft, ChevronRight, Clock, Store, TreePine, Eye, Images, Utensils } from 'lucide-react';
import { Place } from '../types';
import { dicionarioCategorias } from '../App';

interface PlaceCardProps {
  place: Place;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectPlace: (place: Place) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  isFavorite,
  onToggleFavorite,
  onSelectPlace,
}) => {
  // Fallback image generator based on place category
  const getFallbackImage = () => {
    switch (place.tipo) {
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

  // Compile all available photos for auto-carousel
  const images = useMemo(() => {
    const list: string[] = [];
    if (place.imagem && typeof place.imagem === 'string' && place.imagem.trim()) {
      list.push(place.imagem.trim());
    }
    if (place.galeria && Array.isArray(place.galeria)) {
      place.galeria.forEach((img) => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    return list.length > 0 ? list : [getFallbackImage()];
  }, [place.imagem, place.galeria, place.tipo]);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Automatic Carousel effect (changes photo every 3.2s)
  useEffect(() => {
    if (images.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    }, 3200);

    return () => clearInterval(timer);
  }, [images.length, isHovered]);

  const getCategoryBadge = () => {
    if (place.tipo === 'turismo') {
      return (
        <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200 shadow-xs">
          <MapPin className="w-3 h-3 text-amber-600" /> Ponto Turístico
        </span>
      );
    }

    if (place.tipo === 'praca') {
      return (
        <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-teal-200 shadow-xs">
          <TreePine className="w-3 h-3 text-teal-600" /> Praça & Lazer
        </span>
      );
    }

    if (place.tipo === 'pizzaria') {
      return (
        <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200 shadow-xs">
          <Utensils className="w-3 h-3 text-red-600" /> Pizzaria & Massas
        </span>
      );
    }

    // Default for all other commercial business categories
    const categoryLabel = dicionarioCategorias[place.tipo] || 'Comércio Local';
    return (
      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 shadow-xs">
        <Store className="w-3 h-3 text-emerald-600" /> {categoryLabel}
      </span>
    );
  };

  const isTurismo = place.tipo === 'turismo';
  const isWhatsAppLink = !isTurismo && place.link && (place.link.includes('wa.me') || place.link.includes('whatsapp') || place.link.startsWith('55'));
  const isPremiumOrFeatured = Boolean(place.premium || place.featured || place.permanente);

  const isComercioGroup = place.tipo === 'comercio' || place.tipo === 'pizzaria' || place.tipo === 'lanchonetes' || place.tipo === 'gastronomia';

  const cardContent = (
    <div className={`w-full h-full bg-white overflow-hidden flex flex-col justify-between ${
      isPremiumOrFeatured 
        ? 'rounded-[calc(1rem-2.5px)]' 
        : isComercioGroup 
        ? 'rounded-[calc(1rem-2px)]' 
        : 'rounded-2xl border border-gray-100'
    }`}>
      {/* Image Container with Automatic Carousel */}
      <div
        className="relative h-36 sm:h-44 w-full bg-gray-900 overflow-hidden cursor-pointer group/cardimg select-none"
        onClick={() => onSelectPlace(place)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Carousel Images Stack */}
        {images.map((imgUrl, idx) => (
          <img
            key={idx}
            src={imgUrl}
            alt={`${place.nome} - Foto ${idx + 1}`}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getFallbackImage();
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out group-hover/cardimg:scale-105 ${
              idx === currentImgIndex ? 'opacity-100 z-0' : 'opacity-0 z-0 pointer-events-none'
            }`}
            loading={idx === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-10" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center z-20">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getCategoryBadge()}
            {isPremiumOrFeatured && (
              <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider border border-yellow-300">
                <Star className="w-3 h-3 text-gray-950 fill-gray-950" /> Premium
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Multi-photo Counter Badge */}
            {images.length > 1 && (
              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/20 shadow-xs">
                <Images className="w-3 h-3 text-yellow-300" />
                {currentImgIndex + 1}/{images.length}
              </span>
            )}

            {/* Favorite Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(place.id);
              }}
              className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-md backdrop-blur-sm transition active:scale-90"
              title={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              aria-label="Favoritar"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Manual Navigation Arrows (if > 1 photo) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
              }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition opacity-0 group-hover/cardimg:opacity-100 z-20 active:scale-90 shadow-md"
              title="Foto anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImgIndex((prev) => (prev + 1) % images.length);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition opacity-0 group-hover/cardimg:opacity-100 z-20 active:scale-90 shadow-md"
              title="Próxima foto"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Carousel Pagination Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImgIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentImgIndex ? 'bg-yellow-400 w-4' : 'bg-white/60 w-1.5 hover:bg-white'
                }`}
                aria-label={`Foto ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Bottom Overlay Info (Title & Rating) */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white z-20 pointer-events-none">
          <div className="flex justify-between items-end gap-1.5">
            <h3 className="text-sm sm:text-base font-bold drop-shadow-md leading-snug line-clamp-1">{place.nome}</h3>
            {place.avaliacao && (
              <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg flex items-center gap-1 border border-white/20 shrink-0">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] sm:text-xs font-bold">{place.avaliacao.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-3 sm:p-4 space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Description */}
          <p className="text-gray-600 text-[11px] sm:text-xs leading-relaxed line-clamp-2">{place.descricao}</p>

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {place.tags.slice(0, 2).map((tag, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-600 text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                  #{tag}
                </span>
              ))}
              {place.tags.length > 2 && (
                <span className="text-gray-400 text-[9px] font-medium self-center">
                  +{place.tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Location, Hours & Views Counter */}
          <div className="text-[11px] sm:text-xs text-gray-500 space-y-1 pt-1.5 border-t border-gray-100">
            <div className="flex items-center justify-between gap-1">
              {(place.endereco || place.bairro) ? (
                <div className="flex items-center gap-1 text-gray-600 truncate">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="truncate">{place.endereco || place.bairro}</span>
                </div>
              ) : <div />}

              {/* View Counter Badge */}
              <div
                className="flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md font-bold text-[10px] shrink-0"
                title={`${place.views || 0} visualizações acumuladas`}
              >
                <Eye className="w-3 h-3 text-blue-600 shrink-0" />
                <span>{place.views || 0}</span>
              </div>
            </div>

            {place.horario && (
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{place.horario}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
          {/* Category-driven Direct Action */}
          {!isTurismo && (place.tipo === 'comercio' || place.link?.includes('wa.me')) ? (
            <a
              href={
                isWhatsAppLink
                  ? place.link
                  : `https://wa.me/5511999990000?text=Ol%C3%A1!%20Vim%20pelo%20GuiaCidade%20e%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20${encodeURIComponent(place.nome)}.`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 text-[11px] sm:text-xs shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </a>
          ) : (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.nome} ${place.endereco || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 text-[11px] sm:text-xs shadow-sm"
            >
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">GPS / Mapa</span>
            </a>
          )}

          {/* Details Button */}
          <button
            onClick={() => onSelectPlace(place)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 text-[11px] sm:text-xs border border-gray-200"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span>Detalhes</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isPremiumOrFeatured) {
    return (
      <div className="relative p-[2.5px] rounded-2xl overflow-hidden group flex flex-col justify-between h-full shadow-lg hover:shadow-2xl transition-all duration-300">
        {/* Camada 1: Aura Neon Dourada Desfocada (Glowing Aura) */}
        <div
          className="absolute -inset-[200%] animate-spin-medium blur-md opacity-85 pointer-events-none z-0"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, #f59e0b 0deg, #fbbf24 80deg, transparent 170deg, #fef08a 270deg, #f59e0b 360deg)',
          }}
        />
        {/* Camada 2: Borda Neon Dourada Giratória Nítida (Gradient Loop) */}
        <div
          className="absolute -inset-[200%] animate-spin-medium opacity-100 pointer-events-none z-0"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, #f59e0b 0deg, #fbbf24 80deg, transparent 170deg, #f59e0b 270deg, #f59e0b 360deg)',
          }}
        />
        <div className="relative z-10 w-full h-full flex flex-col justify-between">
          {cardContent}
        </div>
      </div>
    );
  }

  if (isComercioGroup) {
    return (
      <div className="relative p-[2px] rounded-2xl overflow-hidden group flex flex-col justify-between h-full shadow-md hover:shadow-xl transition-all duration-300">
        {/* Camada 1: Aura Neon Vermelha Desfocada (Glowing Aura) */}
        <div
          className="absolute -inset-[200%] animate-spin-slow blur-md opacity-75 pointer-events-none z-0"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, #dc2626 0deg, #ef4444 80deg, transparent 170deg, #f87171 270deg, #dc2626 360deg)',
          }}
        />
        {/* Camada 2: Borda Neon Vermelha Giratória Nítida (Gradient Loop) */}
        <div
          className="absolute -inset-[200%] animate-spin-slow opacity-95 pointer-events-none z-0"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, #dc2626 0deg, #f87171 80deg, transparent 170deg, #ef4444 270deg, #dc2626 360deg)',
          }}
        />
        <div className="relative z-10 w-full h-full flex flex-col justify-between">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xs hover:shadow-md border border-gray-100 overflow-hidden transition-all duration-300 group flex flex-col justify-between h-full relative z-0">
      {cardContent}
    </div>
  );
};
