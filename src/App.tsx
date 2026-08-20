import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Place, ActiveTab, ViewMode, User, ActiveSection, JobOffer } from './types';
import { INITIAL_PLACES } from './data/initialPlaces';
import { INITIAL_JOBS } from './data/initialJobs';
import {
  subscribePlaces,
  subscribeJobs,
  savePlaceToFirestore,
  deletePlaceFromFirestore,
  seedInitialPlacesInFirestore,
  saveJobToFirestore,
  deleteJobFromFirestore,
  seedInitialJobsInFirestore,
  subscribeAuthState,
  logoutFirebase,
  saveUserToFirestore,
} from './lib/firestoreSync';
import { captureGPSLocation } from './lib/location';
import { initPushNotifications, escutarNotificacoesPush, PushNotificationItem } from './lib/pushNotifications';
import { Header } from './components/Header';
import { PlaceCard } from './components/PlaceCard';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import { AdminPanel } from './components/AdminPanel';
import { LoginModal } from './components/LoginModal';
import { FeaturedCarousel } from './components/FeaturedCarousel';
import { BottomNav } from './components/BottomNav';
import { JobModal } from './components/JobModal';
import { SearchX, Sparkles, Store, TreePine, MapPin, Heart, PlusCircle, Search, Briefcase, Building2, DollarSign, Ticket, Rocket, Droplet, Mail, MessageCircle } from 'lucide-react';

export const dicionarioCategorias: Record<string, string> = {
  todos: 'Todos os Anúncios & Locais',
  supermercados: 'Supermercados & Mercados',
  distribuidoras: 'Distribuidoras & Bebidas',
  lanchonetes: 'Lanchonetes & Fast Food',
  pizzaria: 'Pizzarias & Massas',
  gastronomia: 'Restaurantes & Gastronomia',
  padarias: 'Padarias & Confeiteiras',
  açougues: 'Açougues & Casas de Carnes',
  farmacias: 'Farmácias & Drogarias',
  roupas: 'Lojas de Roupas & Moda',
  calcados: 'Calçados & Acessórios',
  eletronicos: 'Eletrônicos & Celulares',
  mecanica: 'Oficinas Mecânicas & Auto',
  petshop: 'Pet Shops & Veterinárias',
  academias: 'Academias & Fitness',
  clinicas: 'Clínicas & Saúde',
  dentistas: 'Odontologia & Dentistas',
  salao: 'Salão de Beleza & Estética',
  barbearia: 'Barbearias',
  lavajato: 'Lava Jatos & Estética Automotiva',
  construcao: 'Materiais de Construção',
  agropecuaria: 'Agropecuária & Campo',
  utilidades: 'Utilidades Domésticas',
  moveis: 'Móveis & Decoração',
  artesanato: 'Artesanato & Presentes',
  imoveis: 'Imobiliárias & Corretores',
  autoescola: 'Autoescolas & Despachantes',
  papelaria: 'Papelarias & Gráficas',
  contabilidade: 'Contabilidade & Advocacia',
  educacao: 'Escolas, Cursos & Aulas',
  hotelaria: 'Hotéis & Pousadas',
  eventos: 'Festas, Eventos & Buffets',
  praca: 'Praças, Parques & Lazer',
  turismo: 'Pontos Turísticos & Passeios',
  servicos: 'Prestadores de Serviços',
  comercio: 'Comércio Local Geral',
  favoritos: 'Meus Favoritos',
};

export default function App() {
  // Persistence Keys
  const STORAGE_KEY_PLACES = 'guiacidade_locais_v1';
  const STORAGE_KEY_FAVS = 'guiacidade_favoritos_v1';
  const STORAGE_KEY_CITY = 'guiacidade_cidade_v1';
  const STORAGE_KEY_USER = 'guiacidade_usuario_v1';
  const STORAGE_KEY_JOBS = 'guiacidade_vagas_v1';
  const STORAGE_KEY_DARK = 'guiacidade_dark_mode_v1';

  // Dark Mode State (inicia como falso e alterna dinamicamente)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DARK);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Efeito para adicionar ou remover a classe 'dark' direto na tag document.documentElement toda vez que o estado mudar
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_DARK, JSON.stringify(isDarkMode));
    } catch (e) {}
  }, [isDarkMode]);

  // Auth & User State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  // Always open login screen by default on initial app load so the user sees the login interface
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [loginInitialTab, setLoginInitialTab] = useState<'public' | 'admin'>('public');

  // Places State
  const [places, setPlaces] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLACES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_PLACES;
  });

  // Jobs State
  const [jobs, setJobs] = useState<JobOffer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_JOBS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_JOBS;
  });

  // Sync Jobs to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
    } catch (e) {}
  }, [jobs]);

  // Sync User to LocalStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {}
  }, [currentUser]);

  const handleOpenLogin = (tab: 'public' | 'admin' = 'public') => {
    setLoginInitialTab(tab);
    setIsLoginOpen(true);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('todos');
    setSearchQuery('');
    if (user.role === 'admin') {
      setIsAdminOpen(true);
      setViewMode('admin');
    }
  };

  const handleLogout = () => {
    logoutFirebase();
    setCurrentUser(null);
    setIsAdminOpen(false);
    setViewMode('public');
    setIsLoginOpen(true);
  };

  // Listen to Firebase Authentication state changes
  useEffect(() => {
    const unsub = subscribeAuthState((firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        if (firebaseUser.role === 'admin') {
          setIsAdminOpen(true);
          setViewMode('admin');
        }
      }
    });
    return () => unsub();
  }, []);

  const handleOpenAdminWithAuth = () => {
    if (currentUser?.role === 'admin') {
      setIsAdminOpen(true);
    } else {
      handleOpenLogin('admin');
    }
  };

  // Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAVS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['1', '5'];
  });

  // Helper to sanitize city string (strips backslashes, quotes, and escaped characters)
  const sanitizeCityName = (cityStr: string | null | undefined): string => {
    if (!cityStr) return 'Taquaruçu';
    let cleaned = cityStr.replace(/[\"'\\]+/g, '').trim();
    return cleaned || 'Taquaruçu';
  };

  // City Name State
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CITY);
      if (saved) return sanitizeCityName(saved);
    } catch (e) {}
    return 'Taquaruçu';
  });

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity.replace(/[\"'\\]+/g, ''));
  };

  const handleDetectGPSInApp = async () => {
    const loc = await captureGPSLocation();
    if (loc) {
      if (loc.detectedCity && loc.detectedCity !== 'Cidade Desconhecida') {
        setSelectedCity(loc.detectedCity);
      }
      if (currentUser) {
        const updatedUser: User = {
          ...currentUser,
          latitude: loc.latitude,
          longitude: loc.longitude,
          detectedCity: loc.detectedCity,
          locationAddress: loc.locationAddress,
          locationUpdatedAt: loc.locationUpdatedAt,
          city: (loc.detectedCity !== 'Cidade Desconhecida' ? loc.detectedCity : null) || currentUser.city || selectedCity,
        };
        setCurrentUser(updatedUser);
        await saveUserToFirestore(updatedUser);
      }
    }
  };

  // Search & Navigation State
  const [activeSection, setActiveSection] = useState<ActiveSection>('guia');
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchJobQuery, setSearchJobQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => currentUser?.role === 'admin');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (currentUser?.role === 'admin' ? 'admin' : 'public'));

  // Sync Places to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLACES, JSON.stringify(places));
    } catch (e) {}
  }, [places]);

  // Sync Favorites to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  // Real-time Firestore Synchronization
  useEffect(() => {
    let unsubPlaces: (() => void) | undefined;
    let unsubJobs: (() => void) | undefined;

    unsubPlaces = subscribePlaces((remotePlaces) => {
      if (remotePlaces && remotePlaces.length > 0) {
        setPlaces((prevLocal) => {
          const map = new Map<string, Place>();
          // Set remote places
          remotePlaces.forEach((p) => map.set(p.id, p));
          // Merge local places if missing remotely (ensures no local additions are lost if DB was recreated)
          prevLocal.forEach((p) => {
            if (!map.has(p.id)) {
              map.set(p.id, p);
              savePlaceToFirestore(p);
            }
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEY_PLACES, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      } else {
        // If remote collection is empty, seed Firestore with existing local places or initial demo places
        setPlaces((prevLocal) => {
          const placesToSave = prevLocal.length > 0 ? prevLocal : INITIAL_PLACES;
          seedInitialPlacesInFirestore(placesToSave);
          return placesToSave;
        });
      }
    });

    unsubJobs = subscribeJobs((remoteJobs) => {
      if (remoteJobs && remoteJobs.length > 0) {
        setJobs((prevLocal) => {
          const map = new Map<string, JobOffer>();
          remoteJobs.forEach((j) => map.set(j.id, j));
          prevLocal.forEach((j) => {
            if (!map.has(j.id)) {
              map.set(j.id, j);
              saveJobToFirestore(j);
            }
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      } else {
        setJobs((prevLocal) => {
          const jobsToSave = prevLocal.length > 0 ? prevLocal : INITIAL_JOBS;
          seedInitialJobsInFirestore(jobsToSave);
          return jobsToSave;
        });
      }
    });

    return () => {
      if (unsubPlaces) unsubPlaces();
      if (unsubJobs) unsubJobs();
    };
  }, []);

  // Inicialização das Notificações Push e permissão Notification.requestPermission()
  useEffect(() => {
    initPushNotifications();

    const unsubPush = escutarNotificacoesPush(() => {
      // Recebido em background / foreground
    });

    return () => {
      if (unsubPush) unsubPush();
    };
  }, []);

  // Sync City to LocalStorage (as clean string without quotes/escaped backslashes)
  useEffect(() => {
    try {
      const cleanCity = sanitizeCityName(selectedCity);
      localStorage.setItem(STORAGE_KEY_CITY, cleanCity);
    } catch (e) {}
  }, [selectedCity]);

  // Place CRUD Handlers
  const handleAddPlace = (newPlaceData: Omit<Place, 'id'>) => {
    const newPlace: Place = {
      ...newPlaceData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setPlaces((prev) => [newPlace, ...prev]);
    savePlaceToFirestore(newPlace);
  };

  const handleUpdatePlace = (id: string, updatedFields: Partial<Place>) => {
    setPlaces((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p));
      const target = updated.find((p) => p.id === id);
      if (target) savePlaceToFirestore(target);
      return updated;
    });
    if (selectedPlace && selectedPlace.id === id) {
      setSelectedPlace((prev) => (prev ? { ...prev, ...updatedFields } : null));
    }
  };

  const handleDeletePlace = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    setFavorites((prev) => prev.filter((favId) => favId !== id));
    deletePlaceFromFirestore(id);
    if (selectedPlace && selectedPlace.id === id) {
      setSelectedPlace(null);
    }
  };

  const handleAddJob = (newJobData: Omit<JobOffer, 'id'>) => {
    const newJob: JobOffer = {
      ...newJobData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ativa: true,
    };
    setJobs((prev) => [newJob, ...prev]);
    saveJobToFirestore(newJob);
  };

  const handleDeleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    deleteJobFromFirestore(id);
  };

  const handleResetPlaces = () => {
    setPlaces(INITIAL_PLACES);
    setFavorites(['1', '5']);
    seedInitialPlacesInFirestore(INITIAL_PLACES);
  };

  const handleSelectPlace = (place: Place | null) => {
    if (!place) {
      setSelectedPlace(null);
      return;
    }
    const updatedViews = (place.views || 0) + 1;
    const updatedPlace = { ...place, views: updatedViews };
    setSelectedPlace(updatedPlace);
    setPlaces((prev) =>
      prev.map((p) => (p.id === place.id ? { ...p, views: updatedViews } : p))
    );
    savePlaceToFirestore(updatedPlace);
  };

  const handleAddMultiplePlaces = (newPlacesList: Place[]) => {
    setPlaces((prev) => [...newPlacesList, ...prev]);
    seedInitialPlacesInFirestore(newPlacesList);
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Category Title Helper
  const getCategoryTitle = () => {
    if (dicionarioCategorias[activeTab]) {
      return dicionarioCategorias[activeTab];
    }
    return 'Guia Local';
  };

  // Filter Logic
  const filteredPlaces = places.filter((place) => {
    // Banners exclusivos do carrossel topo não aparecem na lista de anúncios abaixo
    if (place.apenasBanner) {
      return false;
    }

    // Tab Filter
    let matchesTab = true;
    if (activeTab === 'todos') {
      matchesTab = true;
    } else if (activeTab === 'favoritos') {
      matchesTab = favorites.includes(place.id);
    } else if (activeTab === 'comercio') {
      matchesTab = place.tipo !== 'praca' && place.tipo !== 'turismo';
    } else if (activeTab === 'praca') {
      matchesTab = place.tipo === 'praca';
    } else if (activeTab === 'turismo') {
      matchesTab = place.tipo === 'turismo';
    } else {
      matchesTab = place.tipo === activeTab;
    }

    // Search Query Filter
    const query = searchQuery.trim().toLowerCase();
    let matchesSearch = true;
    if (query) {
      const matchName = place.nome.toLowerCase().includes(query);
      const matchDesc = place.descricao.toLowerCase().includes(query);
      const matchEnd = (place.endereco || '').toLowerCase().includes(query);
      const matchBairro = (place.bairro || '').toLowerCase().includes(query);
      const matchCategoryLabel = (dicionarioCategorias[place.tipo] || '').toLowerCase().includes(query);
      const matchTipoKey = (place.tipo || '').toLowerCase().includes(query);
      const matchTags = (place.tags || []).some((t) =>
        t.toLowerCase().includes(query)
      );
      matchesSearch =
        matchName ||
        matchDesc ||
        matchEnd ||
        matchBairro ||
        matchCategoryLabel ||
        matchTipoKey ||
        matchTags;
    }

    return matchesTab && matchesSearch;
  });

  // Filter Logic for Jobs
  const filteredJobs = jobs.filter((job) => {
    const query = searchJobQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      job.nome.toLowerCase().includes(query) ||
      job.empresa.toLowerCase().includes(query) ||
      job.local.toLowerCase().includes(query) ||
      job.descricao.toLowerCase().includes(query)
    );
  });

  // Se o Administrador estiver logado/ativo, exibe EXCLUSIVAMENTE a Interface de Cadastro & Administração
  if ((currentUser?.role === 'admin' || viewMode === 'admin') && isAdminOpen) {
    return (
      <div className="bg-gray-950 min-h-screen text-gray-100 font-sans">
        <AdminPanel
          isOpen={true}
          onClose={handleLogout}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSwitchToPublicView={() => {
            setIsAdminOpen(false);
            setViewMode('public');
          }}
          places={places}
          onAddPlace={handleAddPlace}
          onUpdatePlace={handleUpdatePlace}
          onDeletePlace={handleDeletePlace}
          onResetPlaces={handleResetPlaces}
          selectedCity={selectedCity}
          onAddMultiplePlaces={handleAddMultiplePlaces}
          jobs={jobs}
          onAddJob={handleAddJob}
          onDeleteJob={handleDeleteJob}
        />

        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          initialTab={loginInitialTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-950 min-h-screen text-gray-800 dark:text-gray-100 font-sans pb-24 selection:bg-yellow-200 transition-colors duration-200">
      {/* Top Main Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveSection('guia');
          setActiveTab(tab);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAdmin={handleOpenAdminWithAuth}
        favoritesCount={favorites.length}
        totalPlacesCount={places.length}
        selectedCity={selectedCity}
        onCityChange={handleCityChange}
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
        onDetectGPS={handleDetectGPSInApp}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Banner Carrossel (Visível no Guia Comercial) */}
      {activeSection === 'guia' && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <FeaturedCarousel places={places} onSelectPlace={handleSelectPlace} />
        </div>
      )}

      {/* Conteúdo Principal (GUIA COMERCIAL) */}
      {activeSection === 'guia' && (
        <main
          className="max-w-6xl mx-auto px-4 mt-2 grid grid-cols-1 md:grid-cols-4 gap-6"
          id="app-content"
        >
          {/* COLUNA DA ESQUERDA: FILTROS E BUSCA */}
          <div className="md:col-span-1 space-y-4">
            {/* BUSCA */}
            <div className="relative">
              <input
                type="text"
                id="search-populacao"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou produto..."
                className="w-full p-3 pl-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-red-500 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <Search className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
            </div>

            {/* SELETOR DE CATEGORIAS */}
            <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <p className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  CATEGORIAS
                </p>
                {activeTab !== 'todos' && (
                  <button
                    onClick={() => setActiveTab('todos')}
                    className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Ver Todas
                  </button>
                )}
              </div>
              <div
                id="lista-categorias-container"
                className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:max-h-[560px] md:overflow-y-auto md:pb-0 md:pr-1 scrollbar-thin snap-x scroll-smooth"
              >
                {Object.entries(dicionarioCategorias).map(([chave, label]) => {
                  const ativo = chave === activeTab;
                  // Calculate count for badge
                  let count = 0;
                  if (chave === 'todos') {
                    count = places.filter((p) => !p.apenasBanner).length;
                  } else if (chave === 'favoritos') {
                    count = favorites.length;
                  } else if (chave === 'comercio') {
                    count = places.filter((p) => !p.apenasBanner && p.tipo !== 'praca' && p.tipo !== 'turismo').length;
                  } else {
                    count = places.filter((p) => !p.apenasBanner && p.tipo === chave).length;
                  }

                  return (
                    <button
                      key={chave}
                      onClick={() => setActiveTab(chave)}
                      className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition text-left border flex items-center justify-between gap-2 cursor-pointer ${
                        ativo
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                            ativo ? 'bg-white text-red-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUNA DA DIREITA: RECURSOS RÁPIDOS + RESULTADOS DO GUIA */}
          <div className="md:col-span-3 space-y-5">
            {/* RECURSOS RÁPIDOS (LINHA DE DESTAQUES) */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => alert('Área de cupons em breve! Cadastre-se no aplicativo para receber em primeira mão.')}
                className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col items-center justify-center text-center hover:bg-red-50 dark:hover:bg-gray-800/80 transition group cursor-pointer"
              >
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/60 group-hover:bg-red-600 rounded-full flex items-center justify-center transition mb-1.5 text-red-600 dark:text-red-400 group-hover:text-white">
                  <Ticket className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 tracking-tight leading-none">
                  Cupons
                </span>
                <span className="text-[8px] text-gray-400 mt-0.5">De Descontos</span>
              </button>

              <button
                onClick={() => setActiveTab('supermercados')}
                className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col items-center justify-center text-center hover:bg-yellow-50 dark:hover:bg-gray-800/80 transition group cursor-pointer"
              >
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-950/60 group-hover:bg-yellow-500 rounded-full flex items-center justify-center transition mb-1.5 text-yellow-600 dark:text-yellow-400 group-hover:text-gray-900">
                  <Rocket className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 tracking-tight leading-none">
                  Empresas
                </span>
                <span className="text-[8px] text-gray-400 mt-0.5">Em Destaque</span>
              </button>

              <button
                onClick={() => {
                  const gasPlace = places.find(p => p.nome.toLowerCase().includes('gás') || p.nome.toLowerCase().includes('bebida') || p.nome.toLowerCase().includes('água'));
                  if (gasPlace) {
                    handleSelectPlace(gasPlace);
                  } else {
                    alert('Distribuidora de Gás & Água: Entre em contato pelo WhatsApp no topo!');
                  }
                }}
                className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col items-center justify-center text-center hover:bg-blue-50 dark:hover:bg-gray-800/80 transition group cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/60 group-hover:bg-blue-600 rounded-full flex items-center justify-center transition mb-1.5 text-blue-600 dark:text-blue-400 group-hover:text-white">
                  <Droplet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 tracking-tight leading-none">
                  Pedir Gás
                </span>
                <span className="text-[8px] text-gray-400 mt-0.5">& Água Rápido</span>
              </button>
            </div>

            {/* Cabeçalho de Resultados e Contador */}
            <div className="flex items-center justify-between mb-3 px-1">
              <h2
                id="titulo-categoria"
                className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2"
              >
                <span>{getCategoryTitle()}</span>
              </h2>
              <span
                id="contador-locais"
                className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full font-medium"
              >
                {filteredPlaces.length}{' '}
                {filteredPlaces.length === 1 ? 'local' : 'locais'}
              </span>
            </div>

            {/* Grade de anúncios (2 por linha no celular, 2 no tablet, 3 no notebook) */}
            {filteredPlaces.length > 0 ? (
              <div id="grid-populacao" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlaces.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    isFavorite={favorites.includes(place.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectPlace={handleSelectPlace}
                  />
                ))}
              </div>
            ) : (
              /* Estado Vazio de Busca */
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-3">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-1">
                  <SearchX className="text-gray-400 w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
                    Nenhum resultado encontrado
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {searchQuery
                      ? `Não encontramos resultados para "${searchQuery}". Tente buscar por termos mais genéricos.`
                      : activeTab === 'favoritos'
                      ? 'Você ainda não salvou nenhum local nos favoritos. Toque no coração em qualquer card para salvar!'
                      : 'Nenhum local cadastrado nesta categoria no momento.'}
                  </p>
                </div>

                <div className="pt-2 flex justify-center gap-2">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                    >
                      Limpar Pesquisa
                    </button>
                  )}
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={handleOpenAdminWithAuth}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Adicionar Local</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* SEÇÃO VAGAS DE EMPREGO (Dedicada) */}
      {activeSection === 'empregos' && (
        <main id="conteudo-empregos" className="max-w-5xl mx-auto p-4 mt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Briefcase className="text-blue-600 dark:text-blue-400 w-6 h-6" />
                <span>Balcão de Empregos Local</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Oportunidades de trabalho e utilidade pública atualizadas na cidade
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <input
                type="text"
                id="search-vagas"
                value={searchJobQuery}
                onChange={(e) => setSearchJobQuery(e.target.value)}
                placeholder="Buscar cargo ou empresa..."
                className="w-full p-2.5 pl-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* Grade de Vagas Lado a Lado */}
          {filteredJobs.length > 0 ? (
            <div id="grid-vagas" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.07, ease: 'easeOut' }}
                  onClick={() => setSelectedJob(job)}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-black px-2 py-0.5 rounded uppercase">
                        Vaga Aberta
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {job.createdAt || 'Recente'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {job.nome}
                      </h3>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{job.empresa}</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {job.descricao}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {job.linkContato && !job.linkContato.startsWith('mailto:') && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/60">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </span>
                      )}
                      {(job.emailContato || (job.linkContato && job.linkContato.startsWith('mailto:'))) && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/60">
                          <Mail className="w-3 h-3" /> E-mail
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {job.salario}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                      }}
                      className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-3 py-1.5 rounded-xl transition text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Vaga</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-2">
              <Briefcase className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Nenhuma vaga encontrada</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tente ajustar a sua busca por cargos ou empresas da cidade.
              </p>
            </div>
          )}
        </main>
      )}

      {/* Barra de Navegação Inferior (Tabs do Público) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveSection('guia');
          setActiveTab(tab);
        }}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onOpenAdmin={handleOpenAdminWithAuth}
        onOpenLogin={() => handleOpenLogin('public')}
        favoritesCount={favorites.length}
        jobsCount={jobs.length}
      />

      {/* Modal de Detalhes do Local */}
      <PlaceDetailModal
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
        isFavorite={selectedPlace ? favorites.includes(selectedPlace.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Modal de Detalhes da Vaga de Emprego */}
      <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />

      {/* Tela de Login / Autenticação (População & Admin) */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialTab={loginInitialTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        selectedCity={selectedCity}
        onCityChange={handleCityChange}
      />

      {/* Painel do Administrador (Modal Exclusivo) */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        places={places}
        onAddPlace={handleAddPlace}
        onUpdatePlace={handleUpdatePlace}
        onDeletePlace={handleDeletePlace}
        onResetPlaces={handleResetPlaces}
        selectedCity={selectedCity}
        onAddMultiplePlaces={handleAddMultiplePlaces}
      />
    </div>
  );
}

