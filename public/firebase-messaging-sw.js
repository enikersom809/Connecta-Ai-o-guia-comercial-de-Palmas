// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Chave pública VAPID gerada no painel do Firebase
const VAPID_KEY = "BKJALNdympkYOc8UaQ3FmfO4MAGGbIhLyHFWQ4KzUWB8E7bjHvHsenPVZYSSpi5E_shO2eXT70uJ7p41H93duJg";

// Configuração do Firebase Cloud Messaging para a cidade de Palmas / Guia Comercial
const firebaseConfig = {
  apiKey: "AIzaSyDJ0zcw-JVODHY8aN-vn09SVV0kj1rYjYQ",
  authDomain: "guia-comercial-local-9742d.firebaseapp.com",
  projectId: "guia-comercial-local-9742d",
  storageBucket: "guia-comercial-local-9742d.firebasestorage.app",
  messagingSenderId: "277793209791",
  appId: "1:277793209791:web:6422cdbd642931ecfab50a"
};

// Inicializa o Firebase no Service Worker se ainda não tiver inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Callback para mensagens recebidas em segundo plano (app fechado/minimizado)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificação push recebida em 2º plano:', payload);

  const title = payload.notification?.title || payload.data?.title || 'CONECTA.AÍ - Palmas';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || payload.data?.message || 'Nova atualização no Guia Comercial da Cidade!',
    icon: '/src/assets/images/pwa_app_icon_1785847796498.jpg',
    badge: '/src/assets/images/pwa_app_icon_1785847796498.jpg',
    vibrate: [200, 100, 200],
    tag: 'conecta-ai-push-' + Date.now(),
    data: payload.data || payload
  };

  self.registration.showNotification(title, notificationOptions);
});

// Listener para eventos nativos de 'push'
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || data.data?.title || 'CONECTA.AÍ - Palmas';
    const options = {
      body: data.notification?.body || data.body || data.data?.body || 'Nova notificação!',
      icon: '/src/assets/images/pwa_app_icon_1785847796498.jpg',
      badge: '/src/assets/images/pwa_app_icon_1785847796498.jpg',
      vibrate: [200, 100, 200],
      data: data
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const rawText = event.data.text();
    event.waitUntil(
      self.registration.showNotification('CONECTA.AÍ - Notificação da Cidade', {
        body: rawText,
        icon: '/src/assets/images/pwa_app_icon_1785847796498.jpg'
      })
    );
  }
});

// Ação ao clicar na notificação push do celular/computador
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
