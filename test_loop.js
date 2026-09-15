const url = "https://care.happyinthehome.org/compliance?v=1789408025451";
console.log(url.split('#')[0].split('?')[0] + '?v=' + new Date().getTime());
