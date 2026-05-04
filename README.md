# Buscador de Insumos

App web para buscar insumos médicos basada en Google Sheets. Reemplaza la app de Apps Script con una interfaz moderna hosteada en GitHub Pages.

---

## Stack

- **Frontend:** React + Vite
- **Datos:** Google Sheets API v4 (lectura pública)
- **Caché:** localStorage del navegador
- **Hosting:** GitHub Pages (gratis)

---

## Setup paso a paso

### 1. Crear una API Key de Google

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear un proyecto nuevo (o usar uno existente)
3. Ir a **APIs & Services → Library**
4. Buscar y habilitar **Google Sheets API**
5. Ir a **APIs & Services → Credentials → Create Credentials → API Key**
6. (Recomendado) Restringir la API Key:
   - En **Application restrictions:** seleccionar "HTTP referrers"
   - Agregar `https://TU-USUARIO.github.io/*`
   - En **API restrictions:** restringir a "Google Sheets API"
7. Copiar la API Key

### 2. Hacer el Sheet público (solo lectura)

1. Abrir el Google Sheet
2. Click en **Compartir**
3. Cambiar acceso a **"Cualquier persona con el enlace"** → **Viewer**
4. Guardar

> ⚠️ Esto solo permite leer los datos. Nadie puede editar el Sheet desde la app.

### 3. Clonar y configurar el proyecto

```bash
git clone https://github.com/TU-USUARIO/buscador-insumos.git
cd buscador-insumos
npm install
```

Crear archivo `.env` en la raíz del proyecto:

```
VITE_SHEETS_API_KEY=AIzaSy...TU_API_KEY
```

> ⚠️ Nunca subas el archivo `.env` a GitHub. Ya está en el `.gitignore`.

### 4. Probar localmente

```bash
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173)

### 5. Publicar en GitHub Pages

#### Opción A: Manual (build + push)

```bash
npm run build
# Subir el contenido de /dist a la rama gh-pages
```

#### Opción B: GitHub Actions (recomendado - automático)

Crear el archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build
        env:
          VITE_SHEETS_API_KEY: ${{ secrets.VITE_SHEETS_API_KEY }}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Luego agregar el secret en GitHub:
1. Ir al repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Nombre: `VITE_SHEETS_API_KEY`
4. Valor: tu API Key
5. Guardar

Y activar GitHub Pages:
1. **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `gh-pages` / `/ (root)`

---

## Cómo usar la app

### Login
- Contraseña: `*InsumosAlt2026`

### Buscar
- **Búsqueda normal:** escribe palabras separadas por espacios (lógica AND — deben aparecer todas)
- **Búsqueda exacta:** encierra el término entre comillas: `"cateter foley"`
- **Filtro UGL:** número de UGL (ej: `19`)
- **Filtro fecha:** solo muestra resultados a partir de esa fecha
- **Filtro prestador:** solo aplica a la columna Alternativos

### Actualizar datos
- Los datos se cachean en el navegador al primera carga
- Cuando actualizás el Sheet, presionar el botón **"⟳ Actualizar datos"** en el header
- Cada usuario que usa la app puede actualizar su caché de forma independiente

---

## Cambiar la contraseña

Editar la constante `PASSWORD` en `src/App.jsx`:

```js
const PASSWORD = '*InsumosAlt2026'
```

---

## Estructura del proyecto

```
buscador-insumos/
├── src/
│   ├── App.jsx          # Componente principal
│   ├── App.module.css   # Estilos
│   ├── search.js        # Motor de búsqueda (AND + fuzzy)
│   ├── dataLoader.js    # Fetch de Google Sheets + caché
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── .gitignore
```

---

## .gitignore recomendado

```
node_modules/
dist/
.env
.env.local
```
