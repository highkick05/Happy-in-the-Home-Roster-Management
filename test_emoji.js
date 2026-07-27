const isOnlyEmojis = (text) => {
    if (!text) return false;
    const textWithoutEmojis = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, '');
    return textWithoutEmojis.length === 0 && text.trim().length > 0;
};
console.log(isOnlyEmojis("😃"));
console.log(isOnlyEmojis("😃😃"));
console.log(isOnlyEmojis("😃 hello"));
console.log(isOnlyEmojis("   👍   "));
