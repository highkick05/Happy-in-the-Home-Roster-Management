self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/masked-icon.svg',
      data: { url: data.url }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options).then(() => {
        // Try to update app badge if supported (works on desktop/some platforms)
        if (navigator.setAppBadge && data.badgeCount) {
          navigator.setAppBadge(data.badgeCount).catch(() => {});
        }
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url.indexOf(event.notification.data.url) !== -1 && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_NOTIFICATIONS') {
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(notification => notification.close());
    });
  }
});
