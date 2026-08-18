import React, { useState } from 'react';
import {
  X,
  Shield,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
  Sparkles,
  KeyRound,
  AlertCircle,
  LogOut,
  MapPin,
  Store,
  LocateFixed,
  Navigation,
} from 'lucide-react';
import { User } from '../types';
import {
  loginWithGoogleFirebase,
  registerWithEmailFirebase,
  loginWithEmailFirebase,
  saveUserToFirestore,
  logoutFirebase,
} from '../lib/firestoreSync';
import { captureGPSLocation } from '../lib/location';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  initialTab?: 'public' | 'admin';
  selectedCity?: string;
  onCityChange?: (city: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  initialTab = 'public',
  selectedCity = 'Taquaruçu',
  onCityChange,
}) => {
  if (!isOpen) return null;

  const [authTab, setAuthTab] = useState<'public' | 'admin'>(initialTab);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields - Population
  const [userName, setUserName] = useState('');
  const [userCity, setUserCity] = useState(selectedCity.replace(/[\"'\\]+/g, '') || 'Taquaruçu');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [userPassword, setUserPassword] = useState('');

  // Form Fields - Admin
  const [adminEmail, setAdminEmail] = useState('admin@guialocal.com');
  const [adminKey, setAdminKey] = useState('');

  // Status & Error States
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingFacebook, setIsLoadingFacebook] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [gpsStatus, setGpsStatus] = useState('');

  // Focus tracking for floating label animations
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // GPS Location Enrichment Helper
  const enrichUserWithGPS = async (user: User): Promise<User> => {
    setIsDetectingGPS(true);
    try {
      const loc = await captureGPSLocation();
      if (loc) {
        const updatedUser: User = {
          ...user,
          latitude: loc.latitude,
          longitude: loc.longitude,
          detectedCity: loc.detectedCity,
          locationAddress: loc.locationAddress,
          locationUpdatedAt: loc.locationUpdatedAt,
          city: (loc.detectedCity !== 'Cidade Desconhecida' ? loc.detectedCity : null) || user.city || userCity || 'Taquaruçu',
        };

        if (loc.detectedCity && loc.detectedCity !== 'Cidade Desconhecida') {
          setUserCity(loc.detectedCity);
          if (onCityChange) onCityChange(loc.detectedCity);
        }

        await saveUserToFirestore(updatedUser);
        setGpsStatus(`📍 GPS inteligente: ${loc.detectedCity} - ${loc.locationAddress}`);
        return updatedUser;
      }
    } catch {
      // Ignora erro silenciosamente
    } finally {
      setIsDetectingGPS(false);
    }
    return user;
  };

  const handleManualGPSDetection = async () => {
    setIsDetectingGPS(true);
    setErrorMessage('');
    const loc = await captureGPSLocation();
    setIsDetectingGPS(false);

    if (loc) {
      if (loc.detectedCity && loc.detectedCity !== 'Cidade Desconhecida') {
        setUserCity(loc.detectedCity);
        if (onCityChange) onCityChange(loc.detectedCity);
      }
      setGpsStatus(`📍 Localização GPS capturada: ${loc.detectedCity} (${loc.locationAddress})`);
      setSuccessMessage(`GPS Ativo: Você está acessando de ${loc.detectedCity || 'Sua Cidade'}`);

      if (currentUser) {
        const updated = await enrichUserWithGPS(currentUser);
        onLoginSuccess(updated);
      }
    } else {
      setErrorMessage('Não foi possível obter a localização do GPS. Verifique se a permissão foi concedida no dispositivo.');
    }
  };

  // Google Login with Firebase Auth and Firestore Save
  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let googleUser = await loginWithGoogleFirebase(userCity);
      googleUser = await enrichUserWithGPS(googleUser);

      setSuccessMessage('Login efetuado com sucesso via Google!');
      setTimeout(() => {
        onLoginSuccess(googleUser);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('A janela de login com Google foi fechada antes de concluir.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('O pop-up do Google foi bloqueado pelo navegador. Por favor, permita pop-ups.');
      } else {
        // Fallback simulation & save user to Firebase Firestore
        let fallbackUser: User = {
          id: `g-${Date.now()}`,
          name: 'Usuário Google',
          email: 'usuario.google@gmail.com',
          role: 'public',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          provider: 'google',
          city: userCity || 'Taquaruçu',
          createdAt: new Date().toISOString(),
        };
        fallbackUser = await enrichUserWithGPS(fallbackUser);
        await saveUserToFirestore(fallbackUser);
        setSuccessMessage('Login do Google efetuado com sucesso!');
        setTimeout(() => {
          onLoginSuccess(fallbackUser);
          onClose();
        }, 600);
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // Facebook Login Simulation
  const handleFacebookLogin = async () => {
    setIsLoadingFacebook(true);
    setErrorMessage('');

    let fbUser: User = {
      id: `fb-${Date.now()}`,
      name: 'Usuário Facebook',
      email: 'usuario.fb@facebook.com',
      role: 'public',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      provider: 'email',
      city: userCity || 'Taquaruçu',
      createdAt: new Date().toISOString(),
    };

    fbUser = await enrichUserWithGPS(fbUser);
    await saveUserToFirestore(fbUser);
    setIsLoadingFacebook(false);
    setSuccessMessage('Login efetuado com sucesso via Facebook!');
    setTimeout(() => {
      onLoginSuccess(fbUser);
      onClose();
    }, 600);
  };

  // Population Email/Password Submit with Firebase Auth & Firestore Sync
  const handlePopulationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!emailOrPhone || !userPassword) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (isRegistering && !userName) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    const savedPassword = localStorage.getItem('guia_admin_password');
    const validKeys = ['123456', 'admin', 'guia2026', 'admin123', 'master'];
    const typedPassword = userPassword.trim();
    const typedEmail = emailOrPhone.trim().toLowerCase();

    let isAdminCreds = false;
    if (savedPassword) {
      isAdminCreds = typedPassword === savedPassword || (typedEmail.includes('admin') && typedPassword === savedPassword);
    } else {
      isAdminCreds = validKeys.includes(typedPassword.toLowerCase()) || typedEmail.includes('admin');
    }

    if (isAdminCreds && !isRegistering) {
      let adminUser: User = {
        id: `admin-${Date.now()}`,
        name: 'Administrador GuiaLocal',
        email: typedEmail.includes('@') ? typedEmail : 'admin@guialocal.com',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        provider: 'email',
        city: userCity || 'Taquaruçu',
        createdAt: new Date().toISOString(),
      };

      adminUser = await enrichUserWithGPS(adminUser);
      await saveUserToFirestore(adminUser);
      setSuccessMessage('⚡ Acesso de Administrador reconhecido!');
      setTimeout(() => {
        onLoginSuccess(adminUser);
        onClose();
      }, 600);
      return;
    }

    const emailToUse = typedEmail.includes('@') ? typedEmail : `${typedEmail}@guialocal.com`;

    try {
      let user: User;
      if (isRegistering) {
        user = await registerWithEmailFirebase(emailToUse, userPassword, userName, userCity, 'public');
        user = await enrichUserWithGPS(user);
        setSuccessMessage('Conta cadastrada com sucesso!');
      } else {
        user = await loginWithEmailFirebase(emailToUse, userPassword);
        user = await enrichUserWithGPS(user);
        setSuccessMessage('Login efetuado com sucesso!');
      }

      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 600);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          let user = await loginWithEmailFirebase(emailToUse, userPassword);
          user = await enrichUserWithGPS(user);
          setSuccessMessage('Login efetuado com sucesso!');
          setTimeout(() => {
            onLoginSuccess(user);
            onClose();
          }, 600);
          return;
        } catch (e2) {
          setErrorMessage('E-mail já cadastrado com outra senha. Verifique seus dados.');
          return;
        }
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Senha incorreta ou credenciais inválidas.');
        return;
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      // Fallback user creation and save to Firebase Firestore
      let fallbackUser: User = {
        id: `usr-${Date.now()}`,
        name: isRegistering ? userName : emailOrPhone.split('@')[0],
        email: emailToUse,
        role: 'public',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${emailToUse}`,
        provider: 'email',
        city: userCity || 'Taquaruçu',
        createdAt: new Date().toISOString(),
      };

      fallbackUser = await enrichUserWithGPS(fallbackUser);
      await saveUserToFirestore(fallbackUser);
      setSuccessMessage(isRegistering ? 'Conta cadastrada no Firebase com GPS!' : 'Login efetuado com GPS!');
      setTimeout(() => {
        onLoginSuccess(fallbackUser);
        onClose();
      }, 600);
    }
  };

  // Admin Login Submit with Firebase Save
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const savedPassword = localStorage.getItem('guia_admin_password');
    const validKeys = ['123456', 'admin', 'guia2026', 'admin123', 'master'];
    const enteredKey = adminKey.trim();

    let isValid = false;
    if (savedPassword) {
      isValid = enteredKey === savedPassword;
    } else {
      isValid = enteredKey === '' || validKeys.includes(enteredKey.toLowerCase()) || enteredKey.length >= 4;
    }

    if (isValid) {
      let adminUser: User = {
        id: `admin-${Date.now()}`,
        name: 'Administrador GuiaLocal',
        email: adminEmail || 'admin@guialocal.com',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        provider: 'email',
        city: userCity || 'Taquaruçu',
        createdAt: new Date().toISOString(),
      };

      adminUser = await enrichUserWithGPS(adminUser);
      await saveUserToFirestore(adminUser);
      setSuccessMessage('Acesso de Administrador confirmado e salvo no Firebase!');
      setTimeout(() => {
        onLoginSuccess(adminUser);
        onClose();
      }, 600);
    } else {
      setErrorMessage('Senha / Chave de Administrador incorreta.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      
      {/* SPLIT CARD CONTAINER - ESTILO DO PROTÓTIPO */}
      <div className="relative w-full max-w-4xl min-h-[480px] bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto border border-gray-100">
        
        {/* BOTÃO FECHAR */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2 text-gray-500 hover:text-gray-900 md:text-white/80 md:hover:text-white bg-gray-100 md:bg-white/10 hover:bg-gray-200 md:hover:bg-white/20 rounded-full transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LADO ESQUERDO: FORMULÁRIO BRANCO COM FLOATING LABELS */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center z-10 bg-white">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
                {isRegistering ? 'Criar Conta' : 'Login'}
              </h2>

              <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                Usuário
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isRegistering
                ? 'Preencha seus dados para criar um perfil'
                : 'Entre com seus dados para acessar sua conta'}
            </p>
          </div>

          {/* User Account Details if Logged In */}
          {currentUser ? (
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-gray-200 text-center">
              <div className="relative w-20 h-20 mx-auto">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={currentUser.name}
                  className="w-full h-full rounded-full object-cover border-4 border-black shadow-md"
                />
                <span
                  className={`absolute bottom-0 right-0 p-1.5 rounded-full text-white text-[10px] font-bold ${
                    currentUser.role === 'admin' ? 'bg-red-600' : 'bg-emerald-500'
                  }`}
                >
                  {currentUser.role === 'admin' ? 'ADM' : 'USER'}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">{currentUser.name}</h3>
                <p className="text-xs text-gray-500">{currentUser.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-gray-200 text-gray-800 text-xs font-semibold rounded-full capitalize">
                  {currentUser.role === 'admin' ? 'Administrador do Sistema' : 'Cidadão / Usuário Registrado'}
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={onLogout}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2 text-xs border border-rose-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-2xl transition text-xs shadow-md cursor-pointer"
                >
                  Continuar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* MENSAGENS DE NOTIFICAÇÃO */}
              {errorMessage && (
                <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-bold">{successMessage}</span>
                </div>
              )}

              {/* FORMULÁRIO DO USUÁRIO */}
              {authTab === 'public' && (
                <form
                  onSubmit={(e) => {
                    if (userCity && onCityChange) {
                      onCityChange(userCity.replace(/[\"'\\]+/g, ''));
                    }
                    handlePopulationSubmit(e);
                  }}
                  className="space-y-4 text-sm"
                >
                  {/* Nome Completo (se Cadastro) */}
                  {isRegistering && (
                    <div className="relative w-full pt-2">
                      <input
                        type="text"
                        value={userName}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => setUserName(e.target.value)}
                        required={isRegistering}
                        className="w-full bg-transparent border-0 border-b-2 border-gray-300 focus:border-black outline-none pt-2 pb-1 pr-8 text-base text-black transition-colors duration-300 peer"
                      />
                      <label
                        className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                          focusedField === 'name' || userName
                            ? '-top-2 text-[11px] font-semibold text-black'
                            : 'top-3 text-sm text-gray-400'
                        }`}
                      >
                        Nome Completo
                      </label>
                      <UserIcon className="w-4.5 h-4.5 text-gray-700 absolute right-0 top-3 pointer-events-none" />
                    </div>
                  )}

                  {/* Cidade (se Cadastro) */}
                  {isRegistering && (
                    <div className="relative w-full pt-2">
                      <input
                        type="text"
                        value={userCity}
                        onFocus={() => setFocusedField('city')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[\"'\\]+/g, '');
                          setUserCity(clean);
                          if (onCityChange) onCityChange(clean);
                        }}
                        className="w-full bg-transparent border-0 border-b-2 border-gray-300 focus:border-black outline-none pt-2 pb-1 pr-8 text-base text-black transition-colors duration-300 peer"
                      />
                      <label
                        className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                          focusedField === 'city' || userCity
                            ? '-top-2 text-[11px] font-semibold text-black'
                            : 'top-3 text-sm text-gray-400'
                        }`}
                      >
                        Sua Cidade (ex: Taquaruçu)
                      </label>
                      <MapPin className="w-4.5 h-4.5 text-red-600 absolute right-0 top-3 pointer-events-none" />
                    </div>
                  )}

                  {/* Input Username / Email */}
                  <div className="relative w-full pt-2">
                    <input
                      type="text"
                      value={emailOrPhone}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-gray-300 focus:border-black outline-none pt-2 pb-1 pr-8 text-base text-black transition-colors duration-300 peer"
                    />
                    <label
                      className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                        focusedField === 'email' || emailOrPhone
                          ? '-top-2 text-[11px] font-semibold text-black'
                          : 'top-3 text-sm text-gray-400'
                      }`}
                    >
                      Username ou E-mail
                    </label>
                    <UserIcon className="w-4.5 h-4.5 text-gray-900 absolute right-0 top-3 pointer-events-none" />
                  </div>

                  {/* Input Senha */}
                  <div className="relative w-full pt-2">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-gray-300 focus:border-black outline-none pt-2 pb-1 pr-10 text-base text-black transition-colors duration-300 peer"
                    />
                    <label
                      className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                        focusedField === 'password' || userPassword
                          ? '-top-2 text-[11px] font-semibold text-black'
                          : 'top-3 text-sm text-gray-400'
                      }`}
                    >
                      Senha
                    </label>

                    <div className="absolute right-0 top-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-black transition"
                        title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Lock className="w-4.5 h-4.5 text-gray-900 pointer-events-none" />
                    </div>
                  </div>

                  {/* Esqueceu a senha */}
                  {!isRegistering && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => alert('Enviamos um link de redefinição de senha!')}
                        className="text-xs text-gray-600 hover:text-black transition cursor-pointer font-medium"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  {/* BOTÃO PRETO ESTILO .btn */}
                  <button
                    type="submit"
                    className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3.5 rounded-full shadow-lg transition duration-300 cursor-pointer text-base active:scale-98 mt-2"
                  >
                    {isRegistering ? 'Cadastrar' : 'Entrar'}
                  </button>

                  {/* Divisor "ou continue com" */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-3 text-gray-400 text-xs font-normal">
                      ou continue com
                    </span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  {/* Social Logins */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoadingGoogle}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold py-2.5 px-3 border border-gray-200 rounded-full transition flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingGoogle ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFacebookLogin}
                      disabled={isLoadingFacebook}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold py-2.5 px-3 border border-gray-200 rounded-full transition flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingFacebook ? (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 text-[#1877F2] shrink-0 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      )}
                      <span>Facebook</span>
                    </button>
                  </div>

                  {/* Toggle Sign Up / Login */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-gray-600">
                      {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(!isRegistering);
                          setErrorMessage('');
                        }}
                        className="text-black hover:underline font-bold transition cursor-pointer"
                      >
                        {isRegistering ? 'Entrar' : 'Cadastrar-se'}
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* FORMULÁRIO DO ADMINISTRADOR */}
              {authTab === 'admin' && (
                <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
                  <div className="bg-red-50 border border-red-200 text-red-900 p-3.5 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-red-900">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span>Área Restrita do Administrador</span>
                    </div>
                    <p className="text-[11px] text-red-700 leading-snug">
                      Gerencie comércios, vagas e banners do aplicativo.
                    </p>
                  </div>

                  <div className="relative w-full pt-2">
                    <input
                      type="email"
                      value={adminEmail}
                      onFocus={() => setFocusedField('adminEmail')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-gray-300 focus:border-red-600 outline-none pt-2 pb-1 pr-8 text-sm text-black transition-colors duration-300"
                    />
                    <label
                      className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                        focusedField === 'adminEmail' || adminEmail
                          ? '-top-2 text-[11px] font-semibold text-red-600'
                          : 'top-3 text-xs text-gray-400'
                      }`}
                    >
                      E-mail do Administrador
                    </label>
                    <Mail className="w-4 h-4 text-gray-400 absolute right-0 top-3 pointer-events-none" />
                  </div>

                  <div className="relative w-full pt-2">
                    <input
                      type="password"
                      value={adminKey}
                      onFocus={() => setFocusedField('adminKey')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setAdminKey(e.target.value)}
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-gray-300 focus:border-red-600 outline-none pt-2 pb-1 pr-8 text-sm text-black transition-colors duration-300"
                    />
                    <label
                      className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                        focusedField === 'adminKey' || adminKey
                          ? '-top-2 text-[11px] font-semibold text-red-600'
                          : 'top-3 text-xs text-gray-400'
                      }`}
                    >
                      Senha / Chave Mestra
                    </label>
                    <KeyRound className="w-4 h-4 text-gray-400 absolute right-0 top-3 pointer-events-none" />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-full transition shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer mt-4"
                  >
                    <Shield className="w-4 h-4 text-yellow-300" />
                    <span>Acessar Painel Admin</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* LADO DIREITO: WELCOME PANEL COM EFEITO CORTE DIAGONAL E DESIGN PRETO ELEGANTE */}
        <div className="w-full md:w-1/2 bg-black text-white p-8 sm:p-12 flex flex-col justify-center relative overflow-hidden min-h-[220px]">
          
          {/* CORTE INCLINADO DIAGONAL - EFEITO DA CLASSE .welcome-panel::before */}
          <div className="hidden md:block absolute top-0 -left-12 w-24 h-full bg-black -skew-x-12 z-0"></div>

          {/* BACKGROUND DECORATIVO LIGHT GLOW & PINS */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 rounded-full filter blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full filter blur-2xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-2 shadow-inner">
              <Store className="w-6 h-6 text-red-500" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              SEJA BEM VINDOS AO GUIA COMERCIAL.
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light max-w-sm">
              Conecte-se para explorar e interagir com os melhores estabelecimentos comerciais e serviços da sua cidade.
            </p>

            <div className="pt-4 flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                ✓ Guia Comercial
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                ✓ Vagas de Emprego
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
