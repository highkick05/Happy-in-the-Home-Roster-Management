import re

with open('src/components/NotificationsDropdown.tsx', 'r') as f:
    text = f.read()

bell_target = """        <Bell className="w-[18px] h-[18px] text-[#8B949E] hover:text-[#E6EDF3] transition-colors" />"""
bell_replacement = """        <Bell className={`w-[18px] h-[18px] transition-colors ${notifications.some(n => n.type === 'ALERT' && n.is_read === 0) ? 'text-red-500 animate-pulse' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`} />"""
text = text.replace(bell_target, bell_replacement)

notif_target = """              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    notif.is_read === 0 
                      ? 'bg-brand-navy border border-brand-teal/20' 
                      : 'hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-medium text-sm text-white mb-1">{notif.title}</div>
                    {notif.is_read === 0 && (
                      <span className="w-2 h-2 rounded-full bg-brand-teal shrink-0 mt-1"></span>
                    )}
                  </div>"""

notif_replacement = """              notifications.map((notif) => {
                const isAlert = notif.type === 'ALERT';
                return (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    isAlert
                      ? (notif.is_read === 0 ? 'bg-red-500/10 border border-red-500' : 'hover:bg-white/[0.02] border border-red-500/30 bg-red-500/5')
                      : (notif.is_read === 0 
                         ? 'bg-brand-navy border border-brand-teal/20' 
                         : 'hover:bg-white/[0.02] border border-transparent')
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className={`font-medium text-sm mb-1 ${isAlert ? 'text-red-400' : 'text-white'}`}>{notif.title}</div>
                    {notif.is_read === 0 && (
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${isAlert ? 'bg-red-500 animate-pulse' : 'bg-brand-teal'}`}></span>
                    )}
                  </div>"""
text = text.replace(notif_target, notif_replacement)

map_close_target = """                </div>
              ))"""

map_close_replacement = """                </div>
              );
            })"""
text = text.replace(map_close_target, map_close_replacement)

with open('src/components/NotificationsDropdown.tsx', 'w') as f:
    f.write(text)
