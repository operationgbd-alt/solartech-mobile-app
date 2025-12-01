# Come Generare l'APK di SolarTech

## Backend Già Attivo

Il backend è già online su Railway:
- **URL API**: `https://api-backend-production-c189.up.railway.app/api`
- **Health Check**: https://api-backend-production-c189.up.railway.app/api/health

---

## Requisiti per Generare l'APK

1. **Account Expo** (gratuito) - Registrati su https://expo.dev
2. **Node.js** installato sul tuo computer
3. **EAS CLI** installato

---

## Passaggi per Generare l'APK

### 1. Installa EAS CLI
```bash
npm install -g eas-cli
```

### 2. Fai Login su Expo
```bash
eas login
```
Inserisci le credenziali del tuo account Expo.

### 3. Scarica il Progetto
Scarica tutto il progetto da Replit (menu → Download as ZIP).

### 4. Genera l'APK
Naviga nella cartella del progetto ed esegui:
```bash
# Per APK di sviluppo (installabile direttamente)
eas build --platform android --profile preview

# Per APK di produzione
eas build --platform android --profile production
```

### 5. Scarica l'APK
Il build richiede circa 10-15 minuti.
Al termine, riceverai un link per scaricare l'APK.

---

## Per iOS (Richiede Account Apple Developer)

### Requisiti Aggiuntivi
- Account Apple Developer ($99/anno)
- Mac con Xcode installato (per le chiavi di firma)

### Comandi
```bash
# Per sviluppo interno (Ad-Hoc)
eas build --platform ios --profile preview

# Per TestFlight/App Store
eas build --platform ios --profile production
```

---

## Profili di Build Disponibili

| Profilo | Piattaforma | Tipo | Uso |
|---------|-------------|------|-----|
| `development` | Android | APK | Test su dispositivo con server locale |
| `preview` | Android | APK | Test con server Railway |
| `production` | Android | APK | Versione finale per distribuzione |
| `preview` | iOS | Simulator | Test su simulatore iOS |
| `production` | iOS | IPA | TestFlight/App Store |

---

## Verifica Configurazione

Il file `eas.json` è già configurato correttamente con:
```json
"production": {
  "env": {
    "API_URL": "https://api-backend-production-c189.up.railway.app/api"
  }
}
```

---

## Risoluzione Problemi

### "Account Expo non configurato"
```bash
eas login
```

### "Build fallito per dipendenze"
```bash
npm install
eas build --platform android --profile production --clear-cache
```

### "APK non si installa"
- Abilita "Origini sconosciute" nelle impostazioni Android
- Su Android 8+: Impostazioni → App → Consenti installazione app esterne

---

## Note Importanti

1. **L'APK preview** è consigliato per i test interni
2. **L'APK production** è per la distribuzione finale
3. Il backend Railway è sempre attivo e accessibile
4. Le foto e i dati sono sincronizzati sul server
5. **Generazione PDF**: Usa PDFKit (JavaScript puro) - funziona senza Chromium su Railway

---

## Contatti e Supporto

Per problemi con EAS Build:
- Documentazione: https://docs.expo.dev/build/introduction/
- Forum: https://forums.expo.dev/
