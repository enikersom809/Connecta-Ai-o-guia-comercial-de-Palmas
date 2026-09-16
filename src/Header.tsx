import React, { useState } from 'react';
import { Search, Heart, Store, TreePine, MapPin, Sparkles, X, User as UserIcon, LocateFixed, Moon, Sun } from 'lucide-react';
import { ActiveTab, User } from '../types';
import { captureGPSLocation } from '../lib/location';
// @ts-ignore
import defaultBannerLogo from '../assets/images/logo_connecta_ai_transparent.png';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAdmin: () => void;
  favoritesCount: number;
  totalPlacesCount: number;
  selectedCity: string;
  onCityChange: (city: string) => void;
  currentUser: User | null;
  onOpenLogin: (tab?: 'public' | 'admin') => void;
  onDetectGPS?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onOpenAdmin,
  favoritesCount,
  totalPlacesCount,
  selectedCity,
  onCityChange,
  currentUser,
  onOpenLogin,
  onDetectGPS,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [bannerLogo, setBannerLogo] = useState<string>(() => {
    const saved = localStorage.getItem('guia_header_banner_logo');
    if (!saved || saved.includes('.jpg') || saved.includes('conecta_banner_logo_1789581641583')) {
      return defaultBannerLogo;
    }
    return saved || defaultBannerLogo;
  });

  const handleHeaderGPS = async () => {
    setIsLocating(true);
    if (onDetectGPS) {
      await onDetectGPS();
    } else {
      const loc = await captureGPSLocation();
      if (loc && loc.detectedCity && loc.detectedCity !== 'Cidade Desconhecida') {
        onCityChange(loc.detectedCity);
      }
    }
    setIsLocating(false);
  };

  return (
    <header className="bg-red-600 text-white shadow-md sticky top-0 z-40">
      {/* Top Banner Bar */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div>
          <div className="flex items-center">
            <div>
              <img
                src={bannerLogo}
                alt="Connecta-Aí • O guia comercial de Palmas e Região"
                className="h-11 sm:h-14 md:h-16 w-auto max-w-[220px] sm:max-w-[300px] md:max-w-[340px] object-contain select-none cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                  filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.95)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35))',
                }}
                loading="eager"
                decoding="sync"
                referrerPolicy="no-referrer"
                onDoubleClick={() => {
                  const newUrl = window.prompt(
                    'Cole a URL da imagem da logomarca (link http/https) ou deixe vazio para restaurar o padrão:',
                    bannerLogo
                  );
                  if (newUrl !== null) {
                    const trimmed = newUrl.trim();
                    setBannerLogo(trimmed || defaultBannerLogo);
                    if (trimmed) {
                      localStorage.setItem('guia_header_banner_logo', trimmed);
                    } else {
                      localStorage.removeItem('guia_header_banner_logo');
                    }
                  }
                }}
                title="Clique duplo para alterar a imagem da logomarca se desejar"
              />
              <div className="flex items-center gap-1 text-[11px] text-red-100 font-medium mt-0.5">
                <span>O app que conecta você ao comércio local!</span>
                <span className="hidden sm:inline">•</span>
                <div className="hidden sm:flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-yellow-300 shrink-0" />
                  <input
                    type="text"
                    value={(selectedCity || 'Taquaruçu').replace(/[\"'\\]+/g, '')}
                    onChange={(e) => onCityChange(e.target.value.replace(/[\"'\\]+/g, ''))}
                    placeholder="Sua cidade..."
                    className="bg-transparent border-b border-white/30 text-[11px] font-medium focus:outline-none focus:border-yellow-300 transition text-white w-24 placeholder:text-red-200"
                    title="Clique para editar a cidade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Dark Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl transition bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer flex items-center justify-center shadow-xs"
            title={isDarkMode ? 'Mudar para Modo Claro (Dia)' : 'Mudar para Modo Escuro (Noite)'}
            aria-label={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {isDarkMode ? (
              <Sun className="w-4.5 h-4.5 text-yellow-300 fill-yellow-300" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-yellow-200" />
            )}
          </button>

          {/* User Account / Login Button */}
          <button
            onClick={() => onOpenLogin('public')}
            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 border border-yellow-200 rounded-xl transition flex items-center gap-1.5 shadow-sm text-xs font-bold cursor-pointer"
            title={currentUser ? `Conta: ${currentUser.name} - Clique para ver Tela de Login` : 'Abrir Tela de Login'}
          >
            {currentUser ? (
              <>
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={currentUser.name}
                  className="w-5 h-5 rounded-full object-cover border border-gray-900"
                />
                <span className="max-w-[80px] truncate">{currentUser.name.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <UserIcon className="w-4 h-4 text-gray-900" />
                <span>Entrar</span>
              </>
            )}
          </button>

          {/* Favorites Button */}
          <button
            onClick={() => onTabChange(activeTab === 'favoritos' ? 'todos' : 'favoritos')}
            className={`relative p-2 rounded-xl transition backdrop-blur-xs ${
              activeTab === 'favoritos'
                ? 'bg-yellow-400 text-gray-900 shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
            title="Ver Favoritos Salvos"
            aria-label="Favoritos"
          >
            <Heart className={`w-4.5 h-4.5 ${activeTab === 'favoritos' ? 'fill-current' : ''}`} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-red-600 shadow-xs">
                {favoritesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Category Chips Bar */}
      <div className="max-w-6xl mx-auto px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => onTabChange('todos')}
          className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
            activeTab === 'todos'
              ? 'bg-yellow-400 text-gray-900 font-black shadow-xs'
              : 'bg-white/15 text-red-50 hover:bg-white/25 border border-white/10'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Todos ({totalPlacesCount})
        </button>

        <button
          onClick={() => onTabChange('comercio')}
          className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
            activeTab === 'comercio'
              ? 'bg-yellow-400 text-gray-900 font-black shadow-xs'
              : 'bg-white/15 text-red-50 hover:bg-white/25 border border-white/10'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          Comércio
        </button>

        <button
          onClick={() => onTabChange('praca')}
          className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
            activeTab === 'praca'
              ? 'bg-yellow-400 text-gray-900 font-black shadow-xs'
              : 'bg-white/15 text-red-50 hover:bg-white/25 border border-white/10'
          }`}
        >
          <TreePine className="w-3.5 h-3.5" />
          Praças
        </button>

        <button
          onClick={() => onTabChange('turismo')}
          className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
            activeTab === 'turismo'
              ? 'bg-yellow-400 text-gray-900 font-black shadow-xs'
              : 'bg-white/15 text-red-50 hover:bg-white/25 border border-white/10'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Turismo
        </button>
      </div>
    </header>
  );
};
