# Deploy SolarTech Backend su Railway

## Passo 1: Crea Account Railway
1. Vai su **https://railway.app**
2. Clicca **"Start a New Project"**
3. Accedi con GitHub (consigliato) o email

---

## Passo 2: Crea Nuovo Progetto
1. Clicca **"New Project"**
2. Seleziona **"Deploy from GitHub repo"**
3. Autorizza Railway ad accedere ai tuoi repository

---

## Passo 3: Configura il Repository
Se il codice è su Replit (non su GitHub), segui questi passi:

### Opzione A: Deploy Manuale (più semplice)
1. In Railway, clicca **"Empty Project"**
2. Poi clicca **"+ New"** → **"Database"** → **"PostgreSQL"**
3. Poi clicca **"+ New"** → **"Empty Service"**

### Opzione B: Copia su GitHub
1. Crea un nuovo repository su GitHub
2. Copia la cartella `server/` nel repository
3. Pusha su GitHub
4. Connetti Railway al repository GitHub

---

## Passo 4: Aggiungi Database PostgreSQL
1. Nel progetto Railway, clicca **"+ New"**
2. Seleziona **"Database"** → **"Add PostgreSQL"**
3. Railway crea automaticamente un database
4. Copia il valore di **DATABASE_URL** (lo trovi nelle variabili)

---

## Passo 5: Configura il Servizio Backend
1. Clicca sul servizio backend
2. Vai su **"Variables"**
3. Aggiungi queste variabili:

| Variabile | Valore |
|-----------|--------|
| `DATABASE_URL` | (Copiata dal database PostgreSQL) |
| `JWT_SECRET` | (Una stringa segreta a tua scelta, es: "SolarTech2024Secret!") |
| `NODE_ENV` | production |

---

## Passo 6: Configura il Build
1. Vai su **"Settings"**
2. In **"Root Directory"** inserisci: `server`
3. In **"Build Command"** inserisci: `npm install && npm run build`
4. In **"Start Command"** inserisci: `npm start`

---

## Passo 7: Deploy
1. Clicca **"Deploy"**
2. Attendi che il build finisca (circa 2-3 minuti)
3. Una volta completato, Railway ti fornirà un URL tipo:
   ```
   https://solartech-server-production.up.railway.app
   ```

---

## Passo 8: Testa l'API
Apri il browser e vai su:
```
https://TUO-URL-RAILWAY.railway.app/api/health
```
Dovresti vedere:
```json
{"status":"ok","timestamp":"2024-..."}
```

---

## Passo 9: Aggiorna l'App Mobile
Ora che hai l'URL del server, devi aggiornare `eas.json`:

1. Apri il file `eas.json`
2. Sostituisci `YOUR_RAILWAY_URL` con il tuo URL Railway:
```json
"env": {
  "API_URL": "https://solartech-server-production.up.railway.app/api"
}
```

---

## Passo 10: Genera l'APK
Esegui nel terminale:
```bash
npx eas build --platform android --profile production
```

---

## Note Importanti

### Costi Railway
- **Gratuito**: ~500 ore/mese (circa 20 giorni di uso continuo)
- **Hobby Plan**: $5/mese per uso illimitato
- Il database PostgreSQL è incluso

### Migrazione Dati
Il database su Railway è vuoto. Dovrai:
1. Creare l'utente MASTER iniziale
2. Ricreare le aziende e i tecnici
3. Oppure esportare/importare i dati

### Supporto
Se hai problemi, controlla:
- I log in Railway (sezione "Deployments" → "View Logs")
- Che DATABASE_URL sia configurata correttamente
- Che il build sia completato senza errori
