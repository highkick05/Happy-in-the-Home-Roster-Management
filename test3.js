const isOnlyEmojis = (text) => {
    if (!text || text.trim().length === 0) return false;
    if (/[a-zA-Z0-9\.,!\?'"\(\)\[\]\{\};:@#\$%\^&\*\-_=\+\/\\]/.test(text)) {
      return false;
    }
    const cleaned = text.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    if (cleaned.length === 0) return false;
    const emojiRegex = /^[\p{Emoji}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]+$/gu;
    return emojiRegex.test(cleaned);
};
console.log('🤠', isOnlyEmojis('🤠'));
console.log('😎', isOnlyEmojis('😎'));
