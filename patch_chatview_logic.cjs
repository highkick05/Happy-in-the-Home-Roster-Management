const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf8');

// 1. Fetch from /api/chat/messages on mount
const oldUseEffect = /useEffect\(\(\) => \{\n\s*\/\/ Initialize socket connection\n\s*const newSocket = io\(\{\n\s*path: '\/socket\.io',\n\s*\}\);\n\s*setSocket\(newSocket\);\n\s*newSocket\.on\('initial_messages', \(initialMessages: ChatMessage\[\]\) => \{\n\s*setMessages\(initialMessages\);\n\s*scrollToBottom\(\);\n\s*\}\);\n\s*newSocket\.on\('new_message', \(msg: ChatMessage\) => \{\n\s*setMessages\(\(prev\) => \[\.\.\.prev, msg\]\);\n\s*scrollToBottom\(\);\n\s*\}\);\n\s*return \(\) => \{\n\s*newSocket\.disconnect\(\);\n\s*\};\n\s*\}, \[\]\);/;

const newUseEffect = `useEffect(() => {
    // Fetch initial messages instantly
    fetch('/api/chat/messages', {
      headers: {
        'Authorization': \`Bearer \${token}\`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          scrollToBottom();
        }
      })
      .catch(err => console.error("Failed to load messages", err));

    // Initialize socket connection
    const newSocket = io({
      path: '/socket.io',
    });
    
    setSocket(newSocket);

    newSocket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);`;

if (code.match(oldUseEffect)) {
    code = code.replace(oldUseEffect, newUseEffect);
} else {
    console.log("Failed to match useEffect");
}

// 2. Optimistic update and callback
const oldHandleSendMessage = /const handleSendMessage = \(e: React\.FormEvent\) => \{\n\s*e\.preventDefault\(\);\n\s*if \(!newMessage\.trim\(\) \|\| !socket \|\| !user\) return;\n\s*socket\.emit\('send_message', \{\n\s*user_id: user\.id,\n\s*content: newMessage\.trim\(\)\n\s*\}\);\n\s*setNewMessage\(''\);\n\s*\};/;

const newHandleSendMessage = `const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic UI update
    const tempId = Date.now();
    const tempMessage: ChatMessage = {
      id: tempId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      first_name: user.firstName,
      last_name: user.lastName,
      avatar_url: user.avatarUrl || null,
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    socket.emit('send_message', {
      user_id: user.id,
      content
    }, (realMsg: ChatMessage) => {
       // Replace temp message with realMsg containing actual ID from DB
       setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
    });
  };`;

if (code.match(oldHandleSendMessage)) {
    code = code.replace(oldHandleSendMessage, newHandleSendMessage);
} else {
    console.log("Failed to match handleSendMessage");
}

fs.writeFileSync('src/components/Chat/ChatView.tsx', code);
console.log('Done');
