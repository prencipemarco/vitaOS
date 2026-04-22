# vitaOS — WorkLife Dashboard

Sistema operativo personale per gestione di vita lavorativa, finanze, risparmi e studio.

---

## 🚀 Come avviarlo (senza IDE o terminale)

### Opzione A — App installabile (PWA) ⭐ Consigliata
1. Apri vitaOS nel browser (da qualsiasi metodo sotto)
2. Chrome/Edge: clicca l'icona **⊕** nella barra dell'indirizzo → "Installa app"
3. Safari (iOS/Mac): "Condividi" → "Aggiungi alla schermata Home"
4. L'app appare nell'home come un'app nativa e funziona **offline**

### Opzione B — Doppio click (Mac)
```
Doppio click su → apri-vitaos.command
```
Apre automaticamente il browser su `http://localhost:4173`.
Prima esecuzione: installa le dipendenze e compila (2-3 minuti).

### Opzione C — Doppio click (Windows)
```
Doppio click su → apri-vitaos.bat
```

### Opzione D — Deploy su Netlify (URL permanente, gratuito)
1. Crea account su [netlify.com](https://netlify.com)
2. Trascina la cartella `dist/` nel pannello Netlify
3. Ottieni un URL tipo `vitaos-tuonome.netlify.app`
4. Accessibile da qualsiasi dispositivo, anche mobile

### Opzione E — Deploy su Vercel
```bash
npm install -g vercel
vercel --prod
```

---

## 🛠 Prima installazione (solo prima volta)
```bash
npm install
npm run build
```

## 💻 Sviluppo con hot-reload
```bash
npm run dev
```

## 📦 Compilare per produzione
```bash
npm run build
# La cartella dist/ contiene l'app pronta
```

---

## 📂 Struttura
```
src/
  hooks/          # Logica di business (localStorage sync)
  pages/          # Pagine dell'app
  utils/          # Algoritmi puri (risparmio, studio, festività)
  components/     # Componenti UI riutilizzabili
public/
  sw.js           # Service Worker (offline PWA)
  manifest.json   # Configurazione PWA
  icon-*.png      # Icone app
```

## 🔒 Privacy
Tutti i dati sono salvati **solo nel browser** (localStorage).
Nessun server, nessuna API esterna (tranne le chiamate AI opzionali con la tua chiave).
