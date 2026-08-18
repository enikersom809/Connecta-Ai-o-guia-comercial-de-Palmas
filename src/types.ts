export type PlaceCategory =
  | 'supermercados'
  | 'distribuidoras'
  | 'lanchonetes'
  | 'pizzaria'
  | 'gastronomia'
  | 'padarias'
  | 'açougues'
  | 'farmacias'
  | 'roupas'
  | 'calcados'
  | 'eletronicos'
  | 'mecanica'
  | 'petshop'
  | 'academias'
  | 'clinicas'
  | 'dentistas'
  | 'salao'
  | 'barbearia'
  | 'lavajato'
  | 'construcao'
  | 'agropecuaria'
  | 'utilidades'
  | 'moveis'
  | 'artesanato'
  | 'imoveis'
  | 'autoescola'
  | 'papelaria'
  | 'contabilidade'
  | 'educacao'
  | 'hotelaria'
  | 'eventos'
  | 'praca'
  | 'turismo'
  | 'servicos'
  | 'comercio';

export interface Place {
  id: string;
  tipo: PlaceCategory;
  nome: string;
  imagem: string;
  descricao: string;
  link: string; // WhatsApp or Google Maps / Web link
  telefone?: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  latitude?: string;
  longitude?: string;
  galeria?: string[];
  horario?: string;
  tags?: string[];
  avaliacao?: number;
  reviewsCount?: number;
  featured?: boolean;
  premium?: boolean;
  permanente?: boolean;
  apenasBanner?: boolean;
  views?: number;
  expiraEm?: string;
  isOpen?: boolean;
  instagram?: string;
  createdAt?: string;
}

export type ActiveTab = 'comercio' | 'praca' | 'turismo' | 'favoritos' | 'todos';

export type ActiveSection = 'guia' | 'empregos';

export interface JobOffer {
  id: string;
  nome: string;
  empresa: string;
  local: string;
  salario: string;
  descricao: string;
  requisitos?: string;
  linkContato: string; // WhatsApp or link
  createdAt?: string;
  ativa?: boolean;
}

export type ViewMode = 'public' | 'admin';

export type UserRole = 'public' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  provider?: 'google' | 'email';
  city?: string;
  createdAt?: string;
  latitude?: number;
  longitude?: number;
  detectedCity?: string;
  locationAddress?: string;
  locationUpdatedAt?: string;
}

export interface AIFormatResult {
  description: string;
  suggestedTags: string[];
  tagline: string;
}
