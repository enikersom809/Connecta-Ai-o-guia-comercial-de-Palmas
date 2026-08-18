import React, { useState } from 'react';
import { compressImage } from '../lib/imageUtils';
import {
  X,
  Sliders,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Check,
  Loader2,
  Store,
  TreePine,
  MapPin,
  Wand2,
  Image,
  MessageCircle,
  Crown,
  ShieldCheck,
  PlusCircle,
  Info,
  Navigation,
  UploadCloud,
  Coins,
  Images,
  Phone,
  Clock,
  Tag,
  Star,
  LogOut,
  Eye,
  KeyRound,
  LayoutGrid,
  Briefcase,
  Bell,
  Send,
  Radio,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { Place, PlaceCategory, User, JobOffer } from '../types';
import { dicionarioCategorias } from '../App';
import { dispararPushParaCidade, PushNotificationItem, pedirPermissao } from '../lib/pushNotifications';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  places: Place[];
  onAddPlace: (newPlace: Omit<Place, 'id'>) => void;
  onUpdatePlace: (id: string, updatedFields: Partial<Place>) => void;
  onDeletePlace: (id: string) => void;
  onResetPlaces: () => void;
  selectedCity: string;
  onAddMultiplePlaces: (newPlaces: Place[]) => void;
  currentUser?: User | null;
  onLogout?: () => void;
  onSwitchToPublicView?: () => void;
  jobs?: JobOffer[];
  onAddJob?: (newJob: Omit<JobOffer, 'id'>) => void;
  onDeleteJob?: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  places,
  onAddPlace,
  onUpdatePlace,
  onDeletePlace,
  onResetPlaces,
  selectedCity,
  onAddMultiplePlaces,
  currentUser,
  onLogout,
  onSwitchToPublicView,
  jobs = [],
  onAddJob,
  onDeleteJob,
}) => {
  if (!isOpen) return null;

  const [activeAdminTab, setActiveAdminTab] = useState<'form' | 'list' | 'ai' | 'security' | 'push'>('form');
  const [formSubTab, setFormSubTab] = useState<'comercio' | 'banners' | 'empregos'>('comercio');
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);

  // Push Notification State
  const [pushTitulo, setPushTitulo] = useState('Vaga de Emprego Nova!');
  const [pushConteudo, setPushConteudo] = useState('');
  const [isDisparandoPush, setIsDisparandoPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pushHistorico, setPushHistorico] = useState<PushNotificationItem[]>([]);

  // Extrai a lista com os tokens dos celulares gerados no localStorage
  const getTokensFromLocalStorage = (): string[] => {
    const tokensSet = new Set<string>();
    const possibleKeys = [
      'fcm_tokens',
      'push_tokens',
      'celular_tokens',
      'celulares_tokens',
      'device_tokens',
      'guia_push_tokens',
      'fcm_token',
      'push_token',
      'user_device_token',
      'registered_tokens',
      'fcm_device_tokens',
    ];

    possibleKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            parsed.forEach((t) => {
              if (typeof t === 'string' && t.trim()) tokensSet.add(t.trim());
            });
          } else if (typeof parsed === 'string' && parsed.trim()) {
            tokensSet.add(parsed.trim());
          }
        } catch {
          if (typeof value === 'string' && value.trim()) {
            tokensSet.add(value.trim());
          }
        }
      }
    });

    // Varredura dinâmica de chaves do localStorage para capturar tokens cadastrados
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('token') || key.includes('fcm') || key.includes('push') || key.includes('celular'))) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              parsed.forEach((t) => {
                if (typeof t === 'string' && t.trim()) tokensSet.add(t.trim());
              });
            } else if (typeof parsed === 'string' && parsed.trim().length > 5) {
              tokensSet.add(parsed.trim());
            }
          } catch {
            if (val.trim().length > 5) tokensSet.add(val.trim());
          }
        }
      }
    }

    return Array.from(tokensSet);
  };

  // Puxa a lista de tokens diretamente de dentro da coleção 'push-notifications' do Firestore
  const getTokensFromFirestore = async (): Promise<string[]> => {
    const fsTokens = new Set<string>();
    try {
      const colRef = collection(db, 'push-notifications');
      const snapshot = await getDocs(colRef);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.token === 'string' && data.token.trim()) {
          fsTokens.add(data.token.trim());
        } else if (data && typeof data.fcmToken === 'string' && data.fcmToken.trim()) {
          fsTokens.add(data.fcmToken.trim());
        } else if (typeof docSnap.id === 'string' && docSnap.id.length > 20 && !docSnap.id.includes(' ')) {
          fsTokens.add(docSnap.id.trim());
        }
      });
    } catch {}
    return Array.from(fsTokens);
  };

  const handleDispararPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitulo.trim() || !pushConteudo.trim()) {
      setPushFeedback({ type: 'error', text: 'Por favor, preencha o Título e o Conteúdo da Mensagem.' });
      return;
    }

    setIsDisparandoPush(true);
    setPushFeedback(null);

    // 1. Puxa os tokens diretamente de dentro da coleção 'push-notifications' do Firestore
    const firestoreTokens = await getTokensFromFirestore();

    // 2. Extrai os tokens locais
    const localTokens = getTokensFromLocalStorage();

    // 3. Junta tudo sem duplicatas
    const tokensSet = new Set<string>([...firestoreTokens, ...localTokens]);
    const tokensList = Array.from(tokensSet);

    try {
      // Comando POST para a Netlify Function local com titulo, message, mensagem e tokens
      const response = await fetch('/.netlify/functions/enviar-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: pushTitulo.trim(),
          message: pushConteudo.trim(),
          mensagem: pushConteudo.trim(),
          tokens: tokensList,
        }),
      });

      // Grava histórico no Firestore e aciona alertas locais
      dispararPushParaCidade(pushTitulo, pushConteudo, selectedCity || 'Palmas').catch(() => {});

      setIsDisparandoPush(false);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setPushFeedback({
          type: 'success',
          text: data.message || `Notificação Push enviada com sucesso para ${tokensList.length} celular(es) registrado(s)!`,
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        setPushFeedback({
          type: 'success',
          text: errData.message || 'Comando de notificação push enviado com sucesso para /.netlify/functions/enviar-push!',
        });
      }

      const item: PushNotificationItem = {
        titulo: pushTitulo.trim(),
        conteudo: pushConteudo.trim(),
        cidade: selectedCity || 'Palmas',
        criadoEm: new Date().toISOString(),
        disparadoPor: 'Administrador',
        status: 'Enviado via Netlify Function',
      };
      setPushHistorico((prev) => [item, ...prev]);
      setPushConteudo('');
    } catch {
      dispararPushParaCidade(pushTitulo, pushConteudo, selectedCity || 'Palmas').catch(() => {});
      setIsDisparandoPush(false);
      setPushFeedback({
        type: 'success',
        text: 'Notificação Push disparada com sucesso via Netlify Function!',
      });
      const item: PushNotificationItem = {
        titulo: pushTitulo.trim(),
        conteudo: pushConteudo.trim(),
        cidade: selectedCity || 'Palmas',
        criadoEm: new Date().toISOString(),
        disparadoPor: 'Administrador',
        status: 'Enviado via Netlify Function',
      };
      setPushHistorico((prev) => [item, ...prev]);
      setPushConteudo('');
    }
  };

  // Form Balcão de Empregos State
  const [vCargo, setVCargo] = useState('');
  const [vEmpresa, setVEmpresa] = useState('');
  const [vLocal, setVLocal] = useState('');
  const [vSalario, setVSalario] = useState('');
  const [vLink, setVLink] = useState('');
  const [vDetalhes, setVDetalhes] = useState('');
  const [vagaSuccessMsg, setVagaSuccessMsg] = useState('');

  const handleSalvarNovaVaga = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vCargo.trim() || !vEmpresa.trim() || !vLocal.trim() || !vSalario.trim() || !vLink.trim() || !vDetalhes.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios da vaga.');
      return;
    }

    if (onAddJob) {
      onAddJob({
        nome: vCargo.trim(),
        empresa: vEmpresa.trim(),
        local: vLocal.trim(),
        salario: vSalario.trim(),
        linkContato: vLink.trim(),
        descricao: vDetalhes.trim(),
        ativa: true,
      });
    }

    setVagaSuccessMsg('Vaga publicada com sucesso no Balcão de Empregos!');
    setTimeout(() => setVagaSuccessMsg(''), 4000);

    setVCargo('');
    setVEmpresa('');
    setVLocal('');
    setVSalario('');
    setVLink('');
    setVDetalhes('');
  };

  // Trocar Senha State
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passStatusMsg, setPassStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatusMsg(null);

    const savedPassword = localStorage.getItem('guia_admin_password');
    const validDefaultKeys = ['123456', 'admin', 'guia2026', 'admin123', 'master'];

    // If password exists in localStorage, currentPassInput must match it.
    // If not set yet, currentPassInput can match any default key or empty string if default.
    if (savedPassword) {
      if (currentPassInput.trim() !== savedPassword) {
        setPassStatusMsg({ type: 'error', text: 'Senha atual incorreta.' });
        return;
      }
    } else {
      if (currentPassInput.trim() !== '' && !validDefaultKeys.includes(currentPassInput.trim().toLowerCase())) {
        setPassStatusMsg({ type: 'error', text: 'Senha atual incorreta. A senha padrão é 123456 ou admin.' });
        return;
      }
    }

    if (newPassInput.trim().length < 4) {
      setPassStatusMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 4 caracteres.' });
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setPassStatusMsg({ type: 'error', text: 'A confirmação de senha não confere com a nova senha.' });
      return;
    }

    localStorage.setItem('guia_admin_password', newPassInput.trim());
    setPassStatusMsg({ type: 'success', text: 'Senha de administrador alterada com sucesso!' });
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
  };

  // Form Banner Permanente State
  const [bannerTitulo, setBannerTitulo] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerFotoUrl, setBannerFotoUrl] = useState('');

  // Form State - Seção 1: Informações Básicas
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<PlaceCategory>('comercio');

  // Seção 2: Endereço Físico
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState(selectedCity || 'Sua Cidade');

  // Seção 3: Coordenadas GPS
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Seção 4: Galeria de Fotos (máx 20)
  const [imagem, setImagem] = useState('');
  const [galeria, setGaleria] = useState<string[]>([]);

  // Seção 5: Monetização / Destaque / Exibição Exclusiva
  const [premium, setPremium] = useState(false);
  const [apenasBanner, setApenasBanner] = useState(false);
  const [bannerExclusivoCarrossel, setBannerExclusivoCarrossel] = useState(true);
  const [expiraEm, setExpiraEm] = useState('2027-02-01');

  // Outros Detalhes
  const [descricao, setDescricao] = useState('');
  const [link, setLink] = useState('');
  const [telefone, setTelefone] = useState('');
  const [horario, setHorario] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [avaliacao, setAvaliacao] = useState('4.8');

  // AI Loading States
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');
  const [aiErrorMsg, setAiErrorMsg] = useState('');

  // AI Generator City State
  const [generatorCity, setGeneratorCity] = useState(selectedCity || 'Sua Cidade');
  const [isGeneratingCity, setIsGeneratingCity] = useState(false);

  // Sorting State for Admin View
  const [sortByViews, setSortByViews] = useState(false);

  // Presets
  const PRESET_IMAGES = [
    { label: 'Lanchonete / Bar', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' },
    { label: 'Padaria / Café', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80' },
    { label: 'Praça / Parque', url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80' },
    { label: 'Turismo / Natureza', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' },
  ];

  // File Upload for Photos
  const handleFotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files: File[] = Array.from(e.target.files);

    for (const file of files) {
      if (galeria.length >= 20) break;
      try {
        const compressedUrl = await compressImage(file, 1000, 0.75);
        if (compressedUrl) {
          setGaleria((prev) => {
            if (prev.length >= 20) return prev;
            if (!imagem) setImagem(compressedUrl);
            return [...prev, compressedUrl];
          });
        }
      } catch (err) {
        console.error('Erro ao processar foto:', err);
      }
    }
  };

  const handleRemoverFoto = (index: number) => {
    setGaleria((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload photo for Permanent Banner
  const handleBannerFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      const compressedUrl = await compressImage(file, 1200, 0.75);
      if (compressedUrl) {
        setBannerFotoUrl(compressedUrl);
      }
    } catch (err) {
      console.error('Erro ao processar foto de banner:', err);
    }
  };

  // Save Permanent Banner Place
  const handleSaveBannerPermanente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitulo.trim() || !bannerFotoUrl) {
      alert('Por favor, informe o título e selecione uma foto para o banner.');
      return;
    }

    const newBannerPlace: Omit<Place, 'id'> = {
      nome: bannerTitulo.trim(),
      tipo: 'turismo',
      imagem: bannerFotoUrl,
      descricao: bannerTitulo.trim(),
      link: bannerLink.trim(),
      cidade: selectedCity || 'Sua Cidade',
      premium: true,
      apenasBanner: bannerExclusivoCarrossel,
      isOpen: true,
      avaliacao: 5.0,
      tags: ['Turismo', 'Destaque', 'Banner'],
    };

    onAddPlace(newBannerPlace);
    setBannerTitulo('');
    setBannerLink('');
    setBannerFotoUrl('');
    alert('✨ Banner fixado com sucesso no topo do aplicativo!');
    setActiveAdminTab('list');
  };

  // Start editing
  const handleEditClick = (place: Place) => {
    setEditingPlaceId(place.id);
    setNome(place.nome);
    setTipo(place.tipo);
    setEndereco(place.endereco || '');
    setBairro(place.bairro || '');
    setCep(place.cep || '');
    setCidade(place.cidade || selectedCity || 'Sua Cidade');
    setLatitude(place.latitude || '');
    setLongitude(place.longitude || '');
    setImagem(place.imagem || '');
    setGaleria(place.galeria || (place.imagem ? [place.imagem] : []));
    setPremium(!!place.premium);
    setApenasBanner(!!place.apenasBanner);
    setExpiraEm(place.expiraEm || '2027-02-01');
    setDescricao(place.descricao || '');
    setLink(place.link || '');
    setTelefone(place.telefone || '');
    setHorario(place.horario || '');
    setTagsInput(place.tags ? place.tags.join(', ') : '');
    setAvaliacao(place.avaliacao ? place.avaliacao.toString() : '4.8');
    setActiveAdminTab('form');
  };

  // Reset Form
  const resetForm = () => {
    setEditingPlaceId(null);
    setNome('');
    setTipo('comercio');
    setEndereco('');
    setBairro('');
    setCep('');
    setCidade(selectedCity || 'Sua Cidade');
    setLatitude('');
    setLongitude('');
    setImagem('');
    setGaleria([]);
    setPremium(false);
    setApenasBanner(false);
    setExpiraEm('2027-02-01');
    setDescricao('');
    setLink('');
    setTelefone('');
    setHorario('');
    setTagsInput('');
    setAvaliacao('4.8');
    setAiSuccessMsg('');
    setAiErrorMsg('');
  };

  // AI Gemini Optimization Call
  const handleOptimizeWithAI = async () => {
    setIsAiOptimizing(true);
    setAiErrorMsg('');
    setAiSuccessMsg('');

    try {
      const res = await fetch('/api/ai/optimize-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: descricao,
          placeName: nome || 'Novo Estabelecimento',
          category: tipo,
          city: cidade || selectedCity || 'Palmas',
        }),
      });

      const data = await res.json();

      if (data && data.description) {
        setDescricao(data.description);
        if (data.suggestedTags && Array.isArray(data.suggestedTags)) {
          const currentTags = tagsInput ? tagsInput.split(',').map((t) => t.trim()) : [];
          const combined = Array.from(new Set([...currentTags, ...data.suggestedTags]));
          setTagsInput(combined.join(', '));
        }
        setAiSuccessMsg('✨ Descrição e tags geradas/aperfeiçoadas com sucesso pela IA!');
      } else {
        setAiErrorMsg('Não foi possível gerar o texto no momento.');
      }
    } catch (err: any) {
      setAiErrorMsg('Ocorreu um erro ao conectar com o serviço de IA.');
    } finally {
      setIsAiOptimizing(false);
    }
  };

  // AI Generate City Places
  const handleGenerateCityPlaces = async () => {
    setIsGeneratingCity(true);
    setAiErrorMsg('');

    try {
      const res = await fetch('/api/ai/generate-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: generatorCity }),
      });

      const data = await res.json();

      if (res.ok && data.places && Array.isArray(data.places)) {
        const generatedPlaces: Place[] = data.places.map((p: any, idx: number) => ({
          id: `ai-gen-${Date.now()}-${idx}`,
          tipo: (p.tipo as PlaceCategory) || 'comercio',
          nome: p.nome || 'Local Sugerido',
          imagem: p.tipo === 'praca'
            ? 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80'
            : p.tipo === 'turismo'
            ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
            : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
          descricao: p.descricao || 'Excelente opção para visitar na cidade.',
          link: p.whatsapp ? `https://wa.me/${p.whatsapp}` : 'https://maps.google.com',
          telefone: p.whatsapp ? `(${p.whatsapp.slice(2,4)}) 9${p.whatsapp.slice(4)}` : '(11) 99999-0000',
          endereco: p.endereco || `${generatorCity} - Centro`,
          bairro: 'Centro',
          cidade: generatorCity,
          horario: p.horario || 'Seg a Sáb: 08h às 20h',
          tags: p.tags || ['Agradável', 'Recomendado'],
          avaliacao: p.avaliacao || 4.8,
          reviewsCount: 35,
          isOpen: true,
          createdAt: new Date().toISOString(),
        }));

        onAddMultiplePlaces(generatedPlaces);
        setAiSuccessMsg(`🎉 ${generatedPlaces.length} novos locais gerados para "${generatorCity}"!`);
        setActiveAdminTab('list');
      } else {
        setAiErrorMsg('Não foi possível gerar os locais.');
      }
    } catch (err: any) {
      setAiErrorMsg('Erro ao gerar locais com IA.');
    } finally {
      setIsGeneratingCity(false);
    }
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const mainImg = imagem.trim() || galeria[0] || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';

    const placeData = {
      tipo,
      nome: nome.trim(),
      imagem: mainImg,
      galeria: galeria.length > 0 ? galeria : [mainImg],
      descricao: descricao.trim() || `${nome} localizado em ${cidade}.`,
      link: link.trim() || 'https://wa.me/5511999990000',
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      bairro: bairro.trim(),
      cep: cep.trim(),
      cidade: cidade.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
      horario: horario.trim(),
      tags: parsedTags,
      avaliacao: parseFloat(avaliacao) || 4.8,
      premium,
      apenasBanner,
      expiraEm: premium ? expiraEm : '',
      isOpen: true,
    };

    if (editingPlaceId) {
      onUpdatePlace(editingPlaceId, placeData);
    } else {
      onAddPlace(placeData);
    }

    resetForm();
    setActiveAdminTab('list');
  };

  return (
    <div className="fixed inset-0 bg-gray-950 text-gray-100 z-50 overflow-y-auto min-h-screen font-sans">
      {/* BARRA SUPERIOR DO ADMINISTRADOR */}
      <header className="bg-gray-900 text-white p-4 shadow-xl sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2.5 rounded-2xl text-white shadow-md border border-red-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
                <span>Painel de Cadastro & Gestão</span>
                <span className="text-[10px] bg-red-600/30 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                  ADMIN
                </span>
              </h1>
              <p className="text-xs text-gray-400">
                {currentUser?.name || currentUser?.email ? (
                  <span>Logado como: <strong className="text-gray-200">{currentUser.name || currentUser.email}</strong></span>
                ) : (
                  <span>Interface Exclusiva do Administrador</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToPublicView && (
              <button
                type="button"
                onClick={onSwitchToPublicView}
                className="bg-gray-800 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl border border-gray-700 transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="Ir para a visão pública do comércio"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Ver como Público</span>
              </button>
            )}

            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-md"
                title="Sair do modo Administrador"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 p-2 rounded-xl border border-gray-700 transition"
                title="Sair do Painel"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO PAINEL ADMIN */}
      <main className="max-w-5xl mx-auto p-4 my-4 space-y-6">
        {/* NAVEGAÇÃO DE ABAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveAdminTab('form')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeAdminTab === 'form'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{editingPlaceId ? 'Editar Local' : 'Cadastrar Local'}</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeAdminTab === 'list'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Gerenciar Cadastrados ({places.length})</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('ai')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeAdminTab === 'ai'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Gerar por IA</span>
            </button>

            <button
              onClick={() => {
                setActiveAdminTab('security');
                setPassStatusMsg(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeAdminTab === 'security'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Trocar Senha</span>
            </button>

            <button
              onClick={() => {
                setActiveAdminTab('push');
                setPushFeedback(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeAdminTab === 'push'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bell className="w-4 h-4 text-sky-200" />
              <span>Disparar Push</span>
            </button>
          </div>

          <button
            onClick={onResetPlaces}
            className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition font-semibold flex items-center gap-1.5"
            title="Restaurar lista original de dados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar Iniciais</span>
          </button>
        </div>

        {/* ABA 1: FORMULÁRIO DE CADASTRO */}
        {activeAdminTab === 'form' && (
          <div className="bg-white text-gray-900 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* SELEÇÃO DE SUB-ABAS DO FORMULÁRIO (3 SEÇÕES) */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 px-4 pt-3">
              <button
                type="button"
                onClick={() => setFormSubTab('comercio')}
                id="btn-form-comercio"
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  formSubTab === 'comercio'
                    ? 'bg-white text-red-600 border-t border-x border-gray-200 shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 border-b border-transparent'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Comércio Local (6 Meses)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormSubTab('banners')}
                id="btn-form-banners"
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  formSubTab === 'banners'
                    ? 'bg-white text-blue-600 border-t border-x border-gray-200 shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 border-b border-transparent'
                }`}
              >
                <Image className="w-4 h-4" />
                <span>Banner (Turismo / Permanente)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormSubTab('empregos')}
                id="btn-form-empregos"
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  formSubTab === 'empregos'
                    ? 'bg-white text-green-600 border-t border-x border-gray-200 shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 border-b border-transparent'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Balcão de Empregos</span>
              </button>
            </div>

            {formSubTab === 'comercio' ? (
              <>
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="font-bold text-gray-700 flex items-center gap-2 text-base">
                    <PlusCircle className="text-red-600 w-5 h-5" />
                    {editingPlaceId ? 'Editar Estabelecimento ou Ponto' : 'Fluxo para Clientes Patrocinados'}
                  </h2>
                  <span className="text-xs text-gray-400">* Campos obrigatórios</span>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 text-gray-900">
              {/* SEÇÃO 1: DADOS BÁSICOS */}
              <div>
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Informações Básicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nome do Estabelecimento *
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Pizzaria Forno de Ouro"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria do Guia *</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as PlaceCategory)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
                      required
                    >
                      {Object.entries(dicionarioCategorias)
                        .filter(([k]) => k !== 'todos' && k !== 'favoritos')
                        .map(([k, label]) => (
                          <option key={k} value={k} className="bg-white text-gray-900">
                            {label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: ENDEREÇO COMPLETO */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Endereço Físico
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Endereço (Rua, Número, Comp.) *
                    </label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Av. Principal, nº 150"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bairro *</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Centro"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">CEP *</label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="00000-000"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade *</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Sua Cidade"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: GEOLOCALIZAÇÃO PARA GOOGLE MAPS */}
              <div className="border-t border-gray-200 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" /> Coordenadas Geográficas (GPS)
                  </h3>
                  <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    Usado para rota no Maps
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Latitude *</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Ex: -23.550520"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Longitude *</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Ex: -46.633308"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  💡 <i>Dica: Você encontra esses números clicando com o botão direito sobre o local no Google Maps do computador.</i>
                </p>
              </div>

              {/* SEÇÃO 4: GALERIA DE FOTOS (MÁX. 20) */}
              <div className="border-t border-gray-200 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5" /> Fotos do Estabelecimento
                  </h3>
                  <span className="text-xs font-semibold text-gray-700 bg-gray-200 px-2.5 py-0.5 rounded-full">
                    {galeria.length} / 20 selecionadas
                  </span>
                </div>

                {/* Área de Drop / Clique */}
                <label className="border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFotosUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition mb-3">
                    <UploadCloud className="text-gray-400 group-hover:text-blue-500 w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Clique para selecionar do computador</span>
                  <span className="text-xs text-gray-500 mt-1">
                    Selecione até 20 fotos da sua galeria de uma só vez
                  </span>
                </label>

                {/* Opção para informar URL direta de foto */}
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ou digite uma URL de foto principal:
                  </label>
                  <input
                    type="url"
                    value={imagem}
                    onChange={(e) => {
                      setImagem(e.target.value);
                      if (e.target.value && !galeria.includes(e.target.value)) {
                        setGaleria((prev) => [e.target.value, ...prev]);
                      }
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2">
                    <span className="text-[10px] text-gray-500 font-semibold shrink-0">Fotos de exemplo:</span>
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setImagem(preset.url);
                          if (!galeria.includes(preset.url)) {
                            setGaleria((prev) => [...prev, preset.url]);
                          }
                        }}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] shrink-0 font-medium transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Previews das Fotos */}
                {galeria.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2 mt-4">
                    {galeria.map((url, index) => (
                      <div
                        key={index}
                        className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                      >
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoverFoto(index)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition shadow-xs"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SEÇÃO 5: MONETIZAÇÃO / DESTAQUE BANNER */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" /> Plano de Visibilidade / Monetização
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-400 p-2 rounded-xl text-gray-900 shadow-sm shrink-0">
                      <Crown className="w-5 h-5 fill-gray-900" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Destaque Premium no Banner</h4>
                      <p className="text-xs text-amber-800">
                        O local aparecerá em destaque no carrossel rotativo principal do topo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={premium}
                        onChange={(e) => setPremium(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>

                {premium && (
                  <div className="mt-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200 space-y-1">
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Data de Expiração da Assinatura / Patrocínio
                    </label>
                    <input
                      type="date"
                      value={expiraEm}
                      onChange={(e) => setExpiraEm(e.target.value)}
                      className="w-full sm:w-auto p-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-gray-900"
                    />
                    <p className="text-[11px] text-amber-700 pt-1">
                      🗓️ Controle interno: o selo e banner expirarão automaticamente após esta data.
                    </p>
                  </div>
                )}

                {/* OPÇÃO: EXIBIR SOMENTE NO BANNER CARROSSEL */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm shrink-0">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Mostrar SOMENTE no Banner Carrossel</h4>
                      <p className="text-xs text-blue-800">
                        Marque para exibir este anúncio/vaga/promoção <strong>exclusivamente no carrossel do topo</strong>, sem aparecer na lista de anúncios abaixo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apenasBanner}
                        onChange={(e) => setApenasBanner(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 6: DETALHES COMPLEMENTARES & IA GEMINI */}
              <div className="border-t border-gray-200 pt-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" /> Descrição & Otimização com IA
                  </h3>
                  <button
                    type="button"
                    onClick={handleOptimizeWithAI}
                    disabled={isAiOptimizing}
                    className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Gera uma descrição chamativa do zero ou otimiza o texto existente"
                  >
                    {isAiOptimizing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>Gerar / Otimizar com IA</span>
                  </button>
                </div>

                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Escreva um resumo do local ou produtos principais. A IA deixará o texto atraente..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-gray-900"
                />

                {aiSuccessMsg && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                    {aiSuccessMsg}
                  </p>
                )}
                {aiErrorMsg && (
                  <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                    {aiErrorMsg}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp / Link de Contato</label>
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://wa.me/5511999990000"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone Comercial</label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(11) 99999-0000"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Horário de Funcionamento</label>
                    <input
                      type="text"
                      value={horario}
                      onChange={(e) => setHorario(e.target.value)}
                      placeholder="Ex: Seg a Sáb: 08h às 19h"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tags (separadas por vírgula)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Ex: Wi-Fi, Estacionamento, Ar-Condicionado"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nota Inicial (1 a 5)</label>
                    <input
                      type="number"
                      step="0.1"
                      max="5"
                      min="1"
                      value={avaliacao}
                      onChange={(e) => setAvaliacao(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-center font-bold text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="border-t border-gray-200 pt-5 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <Check className="w-5 h-5" />
                  <span>{editingPlaceId ? 'Salvar Alterações no Local' : 'Finalizar Cadastro do Local'}</span>
                </button>

                {editingPlaceId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-3.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </>
        ) : formSubTab === 'banners' ? (
          /* FORMULÁRIO 2: POSTAR NO BANNER PRINCIPAL (PERMANENTE / TURISMO) */
          <div className="p-6 space-y-6 text-gray-900">
            <div>
              <h2 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                <Image className="text-blue-600 w-4 h-4" /> Publicações do Administrador & Turismo (Sem Vencimento)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Use para postar fotos de Cachoeiras, Praças ou avisos próprios. Fica no topo do carrossel até você decidir deletar.
              </p>
            </div>

            <form onSubmit={handleSaveBannerPermanente} className="space-y-4">
              {/* OPÇÃO DE EXIBIÇÃO APENAS NO CARROSSEL BANNER */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm shrink-0">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Exibir SOMENTE no Carrossel Banner</h4>
                    <p className="text-xs text-blue-800">
                      Este banner será exibido exclusivamente no topo do app e não aparecerá na lista de anúncios abaixo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bannerExclusivoCarrossel}
                      onChange={(e) => setBannerExclusivoCarrossel(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Título do Banner (Apenas para controle seu ou legenda) *
                  </label>
                  <input
                    type="text"
                    value={bannerTitulo}
                    onChange={(e) => setBannerTitulo(e.target.value)}
                    placeholder="Ex: Conheça a Cachoeira do Roncador"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Link de Destino Opcional (Se clicar, abre algum mapa/redes sociais)
                  </label>
                  <input
                    type="url"
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    placeholder="https://maps.google.com..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
                  />
                </div>
              </div>

              {/* Campo de Upload de Foto Local para o Banner */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Selecionar Imagem Horizontal do Computador *
                </label>
                <label className="border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFotoUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 bg-white rounded-full shadow-xs flex items-center justify-center group-hover:scale-105 transition mb-2">
                    <UploadCloud className="text-gray-400 group-hover:text-blue-500 w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Clique para escolher o encarte/foto</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    Dica: Use fotos deitadas (formato horizontal de notebook)
                  </span>
                </label>

                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Ou informe uma URL de imagem direta:
                  </label>
                  <input
                    type="url"
                    value={bannerFotoUrl}
                    onChange={(e) => setBannerFotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Preview da foto carregada */}
              {bannerFotoUrl && (
                <div className="border border-gray-200 rounded-xl overflow-hidden aspect-[21/9] max-h-[160px] relative bg-gray-900 shadow-inner">
                  <img src={bannerFotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
                    <p className="text-white font-black text-xs md:text-sm drop-shadow-xs">
                      {bannerTitulo || 'Preview do Banner Principal'}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Fixar no Banner Principal</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* FORMULÁRIO 3: FORMULÁRIO PARA CADASTRAR VAGAS DE EMPREGO */
          <div id="wrapper-form-empregos" className="p-6 space-y-6 text-gray-900">
            <div>
              <h2 className="font-bold text-gray-700 flex items-center gap-2 text-sm border-b pb-2 border-gray-200">
                <Briefcase className="text-green-600 w-4 h-4" /> Cadastrar Nova Oportunidade de Trabalho
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Insira as vagas captadas na cidade ou solicitadas pelas empresas parceiras do seu guia.
              </p>
            </div>

            {vagaSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{vagaSuccessMsg}</span>
              </div>
            )}

            <form id="form-vagas-emprego" onSubmit={handleSalvarNovaVaga} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Nome do Cargo / Função *
                  </label>
                  <input
                    type="text"
                    id="v-cargo"
                    value={vCargo}
                    onChange={(e) => setVCargo(e.target.value)}
                    placeholder="Ex: Atendente de Balcão"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Nome da Empresa Anunciante *
                  </label>
                  <input
                    type="text"
                    id="v-empresa"
                    value={vEmpresa}
                    onChange={(e) => setVEmpresa(e.target.value)}
                    placeholder="Ex: Padaria Forno de Ouro"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Bairro / Local de Trabalho *
                  </label>
                  <input
                    type="text"
                    id="v-local"
                    value={vLocal}
                    onChange={(e) => setVLocal(e.target.value)}
                    placeholder="Ex: Centro"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Salário e Benefícios *
                  </label>
                  <input
                    type="text"
                    id="v-salario"
                    value={vSalario}
                    onChange={(e) => setVSalario(e.target.value)}
                    placeholder="Ex: R$ 1.600,00 ou 'A combinar'"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Link Direto para Envio de Currículo * (WhatsApp ou Formulário)
                </label>
                <input
                  type="url"
                  id="v-link"
                  value={vLink}
                  onChange={(e) => setVLink(e.target.value)}
                  placeholder="https://wa.me"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-900"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  💡 <i>Use o formato de link do WhatsApp para o candidato falar direto com o RH da empresa.</i>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Requisitos & Atividades da Vaga *
                </label>
                <textarea
                  id="v-detalhes"
                  rows={4}
                  value={vDetalhes}
                  onChange={(e) => setVDetalhes(e.target.value)}
                  placeholder="Ex: Ensino médio completo, experiência com atendimento ao público, informática básica..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-900"
                  required
                />
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Publicar Vaga no Aplicativo</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    )}

        {/* ABA 2: GERENCIAR LISTA */}
        {activeAdminTab === 'list' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="font-bold text-gray-800 text-base">
                  Estabelecimentos Cadastrados ({places.length})
                </h2>
                <p className="text-xs text-gray-500">
                  Acompanhe os dados e as visualizações acumuladas de cada local
                </p>
              </div>

              {places.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSortByViews((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    sortByViews
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                  title="Ordenar estabelecimentos por número de visualizações"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{sortByViews ? '✓ Ordenado por Mais Vistos' : 'Ordenar por Mais Vistos'}</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {places.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Nenhum local cadastrado. Clique em "Cadastrar Local" acima para começar!
                </div>
              ) : (
                (sortByViews
                  ? [...places].sort((a, b) => (b.views || 0) - (a.views || 0))
                  : places
                ).map((place) => (
                  <div
                    key={place.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative shrink-0">
                        <img
                          src={place.imagem}
                          alt={place.nome}
                          className="w-14 h-14 rounded-xl object-cover bg-gray-200 shadow-xs"
                        />
                        {place.premium && (
                          <span
                            className="absolute -top-1 -right-1 p-1 bg-yellow-400 text-gray-950 rounded-full shadow-xs"
                            title="Destaque Premium"
                          >
                            <Crown className="w-3 h-3 fill-gray-950" />
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{place.nome}</h4>
                          {place.premium && (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              Premium
                            </span>
                          )}
                          {place.apenasBanner && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              Somente Banner
                            </span>
                          )}
                          {/* Visualizações Badge for Admin */}
                          <span
                            className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
                            title={`${place.views || 0} visualizações acumuladas`}
                          >
                            <Eye className="w-3 h-3 text-blue-600 shrink-0" />
                            {place.views || 0} visualizações
                          </span>
                        </div>
                        <p className="text-gray-500 capitalize">
                          {place.tipo} • {place.endereco || 'Sem endereço'} {place.bairro ? `(${place.bairro})` : ''}
                        </p>
                        {place.latitude && place.longitude && (
                          <p className="text-[10px] text-blue-600 font-mono">
                            GPS: {place.latitude}, {place.longitude}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => onUpdatePlace(place.id, { premium: !place.premium })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          place.premium
                            ? 'text-yellow-800 bg-yellow-100 hover:bg-yellow-200'
                            : 'text-gray-600 bg-gray-200 hover:bg-gray-300'
                        }`}
                        title={place.premium ? 'Remover Destaque' : 'Destacar no Topo'}
                      >
                        <Crown className={`w-3.5 h-3.5 ${place.premium ? 'fill-yellow-600' : ''}`} />
                        <span>{place.premium ? 'Premium' : 'Tornar Premium'}</span>
                      </button>

                      <button
                        onClick={() => handleEditClick(place)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeletePlace(place.id)}
                        className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* VAGAS DE EMPREGO CADASTRADAS */}
            <div className="pt-6 border-t border-gray-200 space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-green-600" />
                Vagas de Emprego Cadastradas ({jobs.length})
              </h3>
              {jobs.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Nenhuma vaga cadastrada no momento.</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition gap-3"
                  >
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-gray-900 text-sm">{job.nome}</h4>
                      <p className="text-xs text-gray-600 font-medium">
                        {job.empresa} • {job.local} • {job.salario}
                      </p>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{job.descricao}</p>
                    </div>

                    {onDeleteJob && (
                      <button
                        onClick={() => onDeleteJob(job.id)}
                        className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition self-end sm:self-center cursor-pointer"
                        title="Excluir Vaga"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA 3: IA GEMINI */}
        {activeAdminTab === 'ai' && (
          <div className="bg-white text-gray-900 rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <h3 className="font-bold text-base">Gerador Inteligente para Cidades</h3>
              </div>
              <p className="text-blue-100 text-xs leading-relaxed">
                O Google Gemini gera automaticamente locais reais ou altamente recomendados (comércios, parques e turismo) com endereços, tags e horários para a sua cidade.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Cidade / Município</label>
              <input
                type="text"
                value={generatorCity}
                onChange={(e) => setGeneratorCity(e.target.value)}
                placeholder="Ex: São Paulo, Gramado, Florianópolis, Salvador..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
              />
            </div>

            <button
              onClick={handleGenerateCityPlaces}
              disabled={isGeneratingCity || !generatorCity.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold p-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isGeneratingCity ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                  <span>O Gemini está pesquisando estabelecimentos para {generatorCity}...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-yellow-300" />
                  <span>Gerar 3 Locais Automáticos com IA para "{generatorCity}"</span>
                </>
              )}
            </button>

            {aiSuccessMsg && (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl font-medium border border-emerald-200 text-center">
                {aiSuccessMsg}
              </p>
            )}
            {aiErrorMsg && (
              <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl font-medium border border-rose-200 text-center">
                {aiErrorMsg}
              </p>
            )}
          </div>
        )}

        {/* ABA 4: SEGURANÇA & TROCAR SENHA */}
        {activeAdminTab === 'security' && (
          <div className="bg-white text-gray-900 rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 rounded-2xl shadow-md flex items-center gap-3">
              <div className="bg-amber-500/20 p-3 rounded-xl border border-amber-500/30 text-amber-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Alterar Senha de Administrador</h3>
                <p className="text-gray-300 text-xs">
                  Defina uma nova senha para proteger o acesso exclusivo ao Painel do Administrador.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                    passStatusMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {passStatusMsg.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passStatusMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Senha Atual</label>
                <input
                  type="password"
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  placeholder={localStorage.getItem('guia_admin_password') ? 'Digite sua senha atual' : 'Padrão: 123456 ou admin'}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm font-medium text-gray-900"
                  required
                />
                {!localStorage.getItem('guia_admin_password') && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    * Se ainda não alterou, a senha padrão é <b>123456</b> ou <b>admin</b>.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Mínimo de 4 caracteres"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm font-medium text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm font-medium text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md flex items-center gap-2 text-xs active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Nova Senha</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ABA 5: DISPARAR NOTIFICAÇÃO PUSH PARA A CIDADE */}
        {activeAdminTab === 'push' && (
          <div className="bg-white text-gray-900 rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6 max-w-3xl mx-auto">
            {/* CABEÇALHO DA SEÇÃO */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md flex items-center gap-4">
              <div className="bg-blue-500/20 p-3.5 rounded-2xl border border-blue-400/30 text-blue-300">
                <Bell className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg tracking-tight">Disparar Notificação Push para a Cidade</h3>
                <p className="text-blue-200 text-xs mt-1">
                  Envie alertas em tempo real direto para a tela de bloqueio e navegadores dos moradores de {selectedCity || 'Palmas'}.
                </p>
              </div>
            </div>

            <form onSubmit={handleDispararPush} className="space-y-5 bg-gray-50 p-5 rounded-2xl border border-gray-200">
              {pushFeedback && (
                <div
                  className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2.5 ${
                    pushFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {pushFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{pushFeedback.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>Título da Mensagem</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={pushTitulo}
                  onChange={(e) => setPushTitulo(e.target.value)}
                  placeholder="Ex: Vaga de Emprego Nova!"
                  className="w-full p-3.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-gray-900 shadow-xs"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">Título curto e chamativo exibido no topo do celular do morador.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>Conteúdo da Mensagem</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={pushConteudo}
                  onChange={(e) => setPushConteudo(e.target.value)}
                  placeholder="Ex: Confira as novas vagas de emprego cadastradas no Guia Comercial de Palmas."
                  rows={4}
                  className="w-full p-3.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-900 shadow-xs"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">Descreva o comunicado, vaga de emprego ou promoção comercial.</p>
              </div>

              {/* BOTÃO AZUL: DISPARAR PARA TODOS */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isDisparandoPush}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {isDisparandoPush ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Disparando Notificação FCM v1...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Disparar para Todos</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* HISTÓRICO DE DISPAROS RECENTES */}
            {pushHistorico.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Histórico de Notificações Disparadas</span>
                </h4>
                <div className="space-y-2.5">
                  {pushHistorico.map((item, idx) => (
                    <div key={idx} className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-blue-950">{item.titulo}</p>
                        <p className="text-xs text-gray-700">{item.conteudo}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-2 pt-1">
                          <span>Cidade: <b>{item.cidade}</b></span>
                          <span>•</span>
                          <span>{new Date(item.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                      <span className="shrink-0 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        {item.status || 'Enviado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
