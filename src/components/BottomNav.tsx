import React from 'react';
import { Store, TreePine, MapPin, Heart, Briefcase, LayoutGrid, User as UserIcon } from 'lucide-react';
import { ActiveTab, ActiveSection } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab | string;
  onTabChange: (tab: any) => void;
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  onOpenAdmin: () => void;
  onOpenLogin?: () => void;
  favoritesCount: number;
  jobsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  activeSection,
  onSectionChange,
  onOpenAdmin,
  onOpenLogin,
  favoritesCount,
  jobsCount = 4,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-40">
      <div className="max-w-md mx-auto flex justify-around p-1.5">
        {/* Guia Comercial Main Section Button */}
        <button
          onClick={() => onSectionChange('guia')}
          id="nav-btn-guia"
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${
            activeSection === 'guia'
              ? 'text-red-600 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <LayoutGrid className={`w-5 h-5 mb-0.5 ${activeSection === 'guia' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px]">Guia Comercial</span>
        </button>

        {/* Vagas de Emprego Section Button */}
        <button
          onClick={() => onSectionChange('empregos')}
          id="nav-btn-empregos"
          className={`flex flex-col items-center p-2 rounded-xl transition-all relative ${
            activeSection === 'empregos'
              ? 'text-red-600 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Briefcase className={`w-5 h-5 mb-0.5 ${activeSection === 'empregos' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px]">Vagas de Emprego</span>
          {jobsCount > 0 && (
            <span className="absolute top-1 right-3 bg-red-500 w-2 h-2 rounded-full animate-pulse" />
          )}
        </button>

        {/* Favoritos Button */}
        <button
          onClick={() => {
            onSectionChange('guia');
            onTabChange('favoritos');
          }}
          id="tab-favoritos"
          className={`flex flex-col items-center p-2 rounded-xl transition-all relative ${
            activeSection === 'guia' && activeTab === 'favoritos'
              ? 'text-rose-600 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Heart className={`w-5 h-5 mb-0.5 ${activeTab === 'favoritos' ? 'fill-current stroke-[2]' : ''}`} />
          <span className="text-[11px]">Favoritos</span>
          {favoritesCount > 0 && (
            <span className="absolute top-1 right-2 bg-rose-500 text-white font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {favoritesCount}
            </span>
          )}
        </button>

        {/* Login Button */}
        {onOpenLogin && (
          <button
            onClick={onOpenLogin}
            className="flex flex-col items-center p-2 rounded-xl text-red-600 font-bold hover:text-red-700 transition-all"
            title="Tela de Login"
          >
            <UserIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">Entrar</span>
          </button>
        )}
      </div>
    </nav>
  );
};
