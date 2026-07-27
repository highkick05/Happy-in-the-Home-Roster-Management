const isOnlyEmojis = (text) => {
    if (!text || text.trim().length === 0) return false;
    const stripped = text.replace(/[\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\uFE0F\u200D\s\u200B-\u200D\uFEFF]/gu, '');
    return stripped.length === 0;
};
console.log('🤯', isOnlyEmojis('🤯'));
console.log('🥳', isOnlyEmojis('🥳'));
