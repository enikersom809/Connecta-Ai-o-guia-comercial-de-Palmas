import React, { useState, useEffect, useMemo } from 'react';
import { X, Star, MapPin, Phone, Clock, MessageCircle, Navigation, Share2, Instagram, Send, Heart, Check, ChevronLeft, ChevronRight, Images, Utensils, Eye, Store, TreePine } from 'lucide-react';
import { Place } from '../types';
import { dicionarioCategorias } from '../App';

interface PlaceDetailModalProps {
  place: Place | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

interface UserReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  if (!place) return null;

  const isTurismo = place.tipo === 'turismo';
  const [copiedLink, setCopiedLink] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [reviewsList, setReviewsList] = useState<UserReview[]>([
    {
      id: 'rev-1',
      author: 'Mariana Souza',
      rating: 5,
      comment: 'Atendimento incrível e lugar maravilhoso! Recomendo muito a todos que visitam a cidade.',
      date: 'Há 2 dias',
    },
    {
      id: 'rev-2',
      author: 'Lucas Oliveira',
      rating: 5,
      comment: 'Lugar super agradável, bem localizado e fácil acesso. Ótima dica do GuiaCidade!',
      date: 'Há 1 semana',
    }
  ]);

  // Compile photos for detail modal hero & gallery
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
    return list.length > 0 ? list : ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'];
  }, [place]);

  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Auto carousel effect in detail modal (4.5s)
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [images.length]);

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newRev: UserReview = {
      id: Date.now().toString(),
      author: authorName.trim() || 'Visitante GuiaCidade',
      rating: userRating,
      comment: commentText.trim(),
      date: 'Agora mesmo',
    };

    setReviewsList([newRev, ...reviewsList]);
    setCommentText('');
    setAuthorName('');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: place.nome,
        text: `Confira ${place.nome} no GuiaCidade!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.nome} ${place.endereco || ''}`)}`;
  const whatsappUrl = place.link.startsWith('http')
    ? place.link
    : `https://wa.me/55${place.link.replace(/\D/g, '')}?text=Ol%C3%A1!%20Vim%20pelo%20GuiaCidade.`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Modal Hero Header with Image Carousel */}
        <div className="relative h-60 sm:h-64 w-full bg-gray-900 shrink-0 overflow-hidden group/modalimg select-none">
          {images.map((imgUrl, idx) => (
            <img
              key={idx}
              src={imgUrl}
              alt={`${place.nome} - Foto ${idx + 1}`}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
                idx === activeImgIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
          ))}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />

          {/* Header Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
            {place.tipo === 'turismo' ? (
              <span className="bg-amber-500 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Ponto Turístico
              </span>
            ) : place.tipo === 'praca' ? (
              <span className="bg-teal-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                <TreePine className="w-3.5 h-3.5" /> Praça & Lazer
              </span>
            ) : place.tipo === 'pizzaria' ? (
              <span className="bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5" /> Pizzaria
              </span>
            ) : (
              <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                <Store className="w-3.5 h-3.5" /> {dicionarioCategorias[place.tipo] || 'Comércio Local'}
              </span>
            )}

            <div className="flex items-center gap-2">
              {images.length > 1 && (
                <span className="bg-black/60 backdrop-blur-md text-white font-bold text-xs px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1 shadow-md">
                  <Images className="w-3.5 h-3.5 text-yellow-300" />
                  {activeImgIndex + 1}/{images.length}
                </span>
              )}

              <button
                onClick={() => onToggleFavorite(place.id)}
                className="p-2 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-lg backdrop-blur-md transition"
                title="Favoritar"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'text-rose-500 fill-rose-500' : ''}`} />
              </button>

              <button
                onClick={onClose}
                className="p-2 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-lg backdrop-blur-md transition"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Manual Arrows in Detail Modal Header */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setActiveImgIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/75 text-white rounded-full transition z-20 active:scale-95"
                title="Foto anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveImgIndex((prev) => (prev + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/75 text-white rounded-full transition z-20 active:scale-95"
                title="Próxima foto"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Title and Rating Overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white z-10 pointer-events-none">
            <h2 className="text-2xl font-bold leading-tight drop-shadow-md">{place.nome}</h2>
            {place.avaliacao && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(place.avaliacao || 5) ? 'fill-yellow-400' : 'text-gray-400'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold">{place.avaliacao.toFixed(1)}</span>
                <span className="text-xs text-gray-300">({place.reviewsCount || 42} avaliações)</span>
                <span className="text-xs text-blue-200 bg-black/40 px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1 font-semibold ml-auto">
                  <Eye className="w-3 h-3 text-cyan-300" />
                  {place.views || 0} visualizações
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 flex-1">
          {/* Action Button Grid */}
          <div className={`grid ${isTurismo ? 'grid-cols-3' : 'grid-cols-4'} gap-2 text-center border-b pb-4 border-gray-100`}>
            {/* WhatsApp */}
            {!isTurismo && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-2xl transition"
              >
                <MessageCircle className="w-6 h-6 mb-1 text-emerald-600" />
                <span className="text-[11px] font-bold">WhatsApp</span>
              </a>
            )}

            {/* Como Chegar */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-2xl transition"
            >
              <Navigation className="w-6 h-6 mb-1 text-blue-600" />
              <span className="text-[11px] font-bold">GPS Mapa</span>
            </a>

            {/* Ligar */}
            {place.telefone ? (
              <a
                href={`tel:${place.telefone.replace(/\D/g, '')}`}
                className="flex flex-col items-center justify-center p-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-2xl transition"
              >
                <Phone className="w-6 h-6 mb-1 text-purple-600" />
                <span className="text-[11px] font-bold">Ligar</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center p-2.5 bg-gray-50 text-gray-400 rounded-2xl opacity-60">
                <Phone className="w-6 h-6 mb-1" />
                <span className="text-[11px] font-bold">Sem Fone</span>
              </div>
            )}

            {/* Compartilhar */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center p-2.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-2xl transition"
            >
              {copiedLink ? <Check className="w-6 h-6 mb-1 text-emerald-600" /> : <Share2 className="w-6 h-6 mb-1 text-amber-600" />}
              <span className="text-[11px] font-bold">{copiedLink ? 'Copiado!' : 'Partilhar'}</span>
            </button>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Sobre o Local</h3>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{place.descricao}</p>
          </div>

          {/* Photo Gallery Thumbnails (if multiple images exist) */}
          {images.length > 1 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Images className="w-3.5 h-3.5 text-blue-600" />
                Galeria de Fotos ({images.length})
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                      idx === activeImgIndex ? 'border-red-500 scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details list */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs border border-gray-100">
            {place.endereco && (
              <div className="flex items-start gap-2.5 text-gray-700">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-gray-900">Endereço:</span>
                  <span>{place.endereco}</span>
                </div>
              </div>
            )}

            {place.horario && (
              <div className="flex items-start gap-2.5 text-gray-700">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-gray-900">Horário de Funcionamento:</span>
                  <span>{place.horario}</span>
                </div>
              </div>
            )}

            {place.instagram && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <Instagram className="w-4 h-4 text-pink-600 shrink-0" />
                <span className="font-medium text-pink-700">{place.instagram}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Destaques & Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {place.tags.map((tag, idx) => (
                  <span key={idx} className="bg-blue-50 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-100">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Community Reviews Section */}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
              <span>Avaliações dos Visitantes</span>
              <span className="text-xs font-normal text-gray-500">{reviewsList.length} comentários</span>
            </h3>

            {/* List of Reviews */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">{rev.author}</span>
                    <span className="text-[10px] text-gray-400">{rev.date}</span>
                  </div>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-gray-600">{rev.comment}</p>
                </div>
              ))}
            </div>

            {/* Add Review Form */}
            <form onSubmit={handleAddReview} className="bg-blue-50/60 p-3 rounded-2xl space-y-2 border border-blue-100">
              <span className="text-xs font-bold text-blue-900 block">Deixe sua avaliação:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className="p-0.5 text-yellow-400 hover:scale-110 transition"
                  >
                    <Star className={`w-5 h-5 ${star <= userRating ? 'fill-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Seu nome (opcional)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Escreva sua opinião..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 p-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg text-xs transition flex items-center justify-center shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
