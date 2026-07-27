const regex1 = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s\u{1F3FB}-\u{1F3FF}]/gu;
const text1 = "🤖";
const text2 = "😎";
const text3 = "😜";
console.log(text1.replace(regex1, '').length);
console.log(text2.replace(regex1, '').length);
console.log(text3.replace(regex1, '').length);
