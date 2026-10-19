self.addEventListener('push', function(event) {
  let data = null;
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      try {
        data = { title: 'New Notification', body: event.data.text() };
      } catch (err) {}
    }
  }

  // Ensure Chrome on Android always receives a visible notification on push, preventing the "This site has been updated in the background" fallback
  const title = (data && data.title) ? data.title : 'Happy in the Home';
  const body = (data && data.body) ? data.body : 'You have a new update';
  const url = (data && data.url) ? data.url : '/chat';
  const tag = (data && data.conversationId) ? `chat-conv-${data.conversationId}` : (data && data.tag ? data.tag : 'chat-notification');

  const options = {
    body: body,
    icon: '/icon-192x192.png',
    badge: '/masked-icon.svg',
    tag: tag,
    renotify: true,
    data: { url: url }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Try to update app badge if supported (works on desktop/some platforms)
      if (navigator.setAppBadge && data && typeof data.badgeCount !== 'undefined') {
        if (data.badgeCount > 0) {
          navigator.setAppBadge(data.badgeCount).catch(() => {});
        } else {
          if (navigator.clearAppBadge) {
            navigator.clearAppBadge().catch(() => {});
          }
        }
      }
    }).catch(err => {
      console.error('Failed to show notification', err);
    })
  );
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
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
  }
});
