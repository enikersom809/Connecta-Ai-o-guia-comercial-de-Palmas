import { db, app } from './firebase';
import { collection, addDoc, doc, setDoc, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

export interface PushNotificationItem {
  id?: string;
  titulo: string;
  conteudo: string;
  cidade?: string;
  criadoEm: string;
  disparadoPor?: string;
  status?: string;
}

// Chave pública VAPID gerada no painel do Firebase
export const VAPID_KEY = "BKJALNdympkYOc8UaQ3FmfO4MAGGbIhLyHFWQ4KzUWB8E7bjHvHsenPVZYSSpi5E_shO2eXT70uJ7p41H93duJg";

// Configuração do Firebase Cloud Messaging (FCM)
const FCM_PROJECT_ID = firebaseConfig.projectId || 'guia-comercial-local-9742d';
const FCM_API_KEY = firebaseConfig.apiKey;

let pushPermissionGranted = false;
let swRegistration: ServiceWorkerRegistration | null = null;
let fcmToken: string | null = null;

/**
 * Solicitando permissão de notificação e obtendo token FCM,
 * salvando o token gerado diretamente na coleção 'push-notifications' (com hífen) do Firestore.
 */
export async function pedirPermissao(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      pushPermissionGranted = permission === 'granted';
    } else {
      pushPermissionGranted = Notification.permission === 'granted';
    }

    if (!pushPermissionGranted) {
      return null;
    }

    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => null);
    }

    const messagingSupported = await isSupported().catch(() => false);
    if (messagingSupported) {
      const messaging = getMessaging(app);
      fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration || undefined,
      }).catch(() => null);

      if (fcmToken) {
        // Salva token no localStorage
        localStorage.setItem('push_token', fcmToken);
        localStorage.setItem('fcm_token', fcmToken);

        // Salva token na coleção 'push-notifications' (com o hífen) do Firestore
        try {
          const tokenDocRef = doc(db, 'push-notifications', fcmToken);
          await setDoc(tokenDocRef, {
            token: fcmToken,
            criadoEm: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ativo: true,
          }, { merge: true });
        } catch {
          try {
            await addDoc(collection(db, 'push-notifications'), {
              token: fcmToken,
              criadoEm: new Date().toISOString(),
              userAgent: navigator.userAgent,
              ativo: true,
            });
          } catch {}
        }

        return fcmToken;
      }
    }
  } catch (err) {
    // Falha silenciosa sem poluir o console
  }

  return null;
}

/**
 * Inicializa e solicita permissão de notificação no navegador/celular do morador.
 * Obtém o token FCM com a chave pública VAPID e registra o Service Worker.
 */
export async function initPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    await pedirPermissao();

    // Ouve canal de comunicação interno para exibir push na aba
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('conecta_ai_push_channel');
      channel.onmessage = (event) => {
        const { titulo, conteudo } = event.data || {};
        if (titulo && conteudo) {
          exibirNotificacaoLocal(titulo, conteudo);
        }
      };
    }

    return pushPermissionGranted;
  } catch {
    return false;
  }
}

/**
 * Exibe uma notificação push visual no dispositivo usando a API Web Notifications ou ServiceWorker.
 */
export function exibirNotificacaoLocal(titulo: string, conteudo: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const iconUrl = '/src/assets/images/pwa_app_icon_1785847796498.jpg';

  if (Notification.permission === 'granted') {
    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(titulo, {
        body: conteudo,
        icon: iconUrl,
        badge: iconUrl,
        vibrate: [200, 100, 200],
        tag: 'push-' + Date.now(),
      } as any).catch(() => {
        new Notification(titulo, { body: conteudo, icon: iconUrl });
      });
    } else {
      new Notification(titulo, { body: conteudo, icon: iconUrl });
    }
  }
}

/**
 * Dispara uma notificação push para a cidade inteira:
 * 1. Grava a notificação no Firestore na coleção 'push-notifications' (com hífen)
 * 2. Faz requisição POST para a API do Firebase Cloud Messaging
 * 3. Notifica a aba local e dispositivos registrados
 */
export async function dispararPushParaCidade(
  titulo: string,
  conteudo: string,
  cidade: string = 'Palmas'
): Promise<{ success: boolean; message: string }> {
  if (!titulo.trim() || !conteudo.trim()) {
    return { success: false, message: 'Título e conteúdo são obrigatórios.' };
  }

  try {
    // 1. Grava no Firestore na coleção 'push-notifications'
    const colRef = collection(db, 'push-notifications');
    const newPush: PushNotificationItem = {
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      cidade,
      criadoEm: new Date().toISOString(),
      disparadoPor: 'Administrador CONECTA.AÍ',
      status: 'Enviado para toda a cidade'
    };

    await addDoc(colRef, newPush);

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('conecta_ai_push_channel');
      channel.postMessage({ titulo, conteudo, cidade });
    }

    exibirNotificacaoLocal(titulo, conteudo);

    return {
      success: true,
      message: 'Notificação Push registrada no Firestore e transmitida com sucesso!'
    };
  } catch (err: any) {
    console.error('Erro ao disparar notificação push:', err);
    return {
      success: false,
      message: 'Erro ao conectar ao Firebase Messaging: ' + (err?.message || 'Falha no disparo')
    };
  }
}

/**
 * Escuta notificações push enviadas recentemente via Firestore para exibir alertas aos usuários em tempo real
 */
export function escutarNotificacoesPush(onNewPush: (push: PushNotificationItem) => void) {
  try {
    const colRef = collection(db, 'push-notifications');
    const q = query(colRef, orderBy('criadoEm', 'desc'), limit(10));

    let initialLoadComplete = false;

    return onSnapshot(q, (snapshot) => {
      if (!initialLoadComplete) {
        initialLoadComplete = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const pushData = { id: change.doc.id, ...change.doc.data() } as PushNotificationItem;
          onNewPush(pushData);
        }
      });
    });
  } catch {
    return () => {};
  }
}

