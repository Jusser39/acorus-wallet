fetch('https://24wallet.ru/swap').then(r=>r.text()).then(h=>{ const lines = h.split(String.fromCharCode(34)); const css = lines.filter(l=>l.endsWith('.css')); console.log(css); })
