const fs = require('fs');

const path = 'src/components/LiveChatIcon.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Function to safely base64 to Uint8Array
const pushLogic = `
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const response = await fetch('/api/push/public-key');
        const vapidPublicKey = await response.text();
        
        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/\\-/g, '+')
            .replace(/_/g, '/');
        
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
        
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }
      
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify({ subscription })
      });
    } catch (e) {
      console.error('Failed to subscribe to push notifications', e);
    }
  };

  useEffect(() => {
    if (token && 'Notification' in window && Notification.permission === 'granted') {
      subscribeToPush();
    }
  }, [token]);
`;

if (!content.includes('subscribeToPush')) {
  content = content.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n' + pushLogic);
  
  // also call subscribeToPush when permission is newly granted
  const onClickTarget = `Notification.requestPermission().catch(() => {});`;
  const onClickReplacement = `Notification.requestPermission().then(permission => {
            if (permission === 'granted') subscribeToPush();
          }).catch(() => {});`;
  content = content.replace(onClickTarget, onClickReplacement);
  
  fs.writeFileSync(path, content);
  console.log('Updated LiveChatIcon.tsx with push subscription');
}
