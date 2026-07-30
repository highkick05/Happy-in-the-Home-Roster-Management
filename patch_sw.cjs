const fs = require('fs');
let swContent = fs.readFileSync('public/custom-sw.js', 'utf-8');

swContent = swContent.replace(
  `        if (navigator.setAppBadge) {
          // You would need to fetch the unread count here if not provided in payload, 
          // or just increment.
          // But web push in SW doesn't easily have access to incrementing a global badge 
          // without storing it in IndexedDB. Let's just catch it.
        }`,
  `        if (navigator.setAppBadge && data.badgeCount) {
          navigator.setAppBadge(data.badgeCount).catch(() => {});
        }`
);

fs.writeFileSync('public/custom-sw.js', swContent);
