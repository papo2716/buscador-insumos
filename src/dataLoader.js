// ============================================================
// FETCHER DE DATOS - Google Sheets API + caché localStorage
// ============================================================

const SHEET_ID = '1yeQPjiwPbeSdKV9XbYbICa5YxqqTA1A6W1a6uJSWWwE'
const API_KEY = import.meta.env.VITE_SHEETS_API_KEY

const SHEETS = {
  vias: { name: 'VIAS DE EXCEPCION', range: 'A:R', cacheKey: 'cache_vias' },
  alt:  { name: 'ALTERNATIVOS',      range: 'A:Z', cacheKey: 'cache_alt'  },
}

function parseDate(val) {
  if (!val) return null
  // Sheets puede devolver string de fecha en distintos formatos
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function sheetRowToVias(headers, row) {
  const get = (col) => {
    const idx = headers.indexOf(col.toLowerCase())
    return idx >= 0 ? row[idx] : ''
  }
  return {
    orden:     get('orden ve'),
    nombre:    get('descripcion'),
    precio:    parseFloat((get('precio') || '').toString().replace(/[$,.\s]/g, '').replace(',', '.')) || 0,
    fecha:     get('f_solicitud'),
    prestador: get('detalle_prestador'),
    ugl:       get('c_ugl'),
    proveedor: get('proveedor'),
    detalle:   get('detalle'),
    detalleSub: get('detalle_sub'),
  }
}

function sheetRowToAlt(headers, row) {
  const get = (col) => {
    const idx = headers.indexOf(col.toLowerCase())
    return idx >= 0 ? row[idx] : ''
  }
  return {
    orden:     get('orden alt'),
    nombre:    get('nombre_normalizado'),
    precio:    parseFloat((get('precio') || '').toString().replace(/[$,.\s]/g, '')) || 0,
    fecha:     get('fecha'),
    prestador: get('prestador'),
    ugl:       get('ugl'),
  }
}

async function fetchSheet(sheetName, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName + '!' + range)}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error ${res.status} al leer ${sheetName}`)
  const data = await res.json()
  return data.values || []
}

export async function loadData(forceRefresh = false) {
  const results = {}

  for (const [key, cfg] of Object.entries(SHEETS)) {
    const cached = localStorage.getItem(cfg.cacheKey)

    if (!forceRefresh && cached) {
      results[key] = JSON.parse(cached)
      continue
    }

    const values = await fetchSheet(cfg.name, cfg.range)
    if (values.length < 2) { results[key] = []; continue }

    const headers = values[0].map(h => h.toString().toLowerCase().trim())
    const rows = values.slice(1)

    let parsed
    if (key === 'vias') {
      parsed = rows.map(r => sheetRowToVias(headers, r)).filter(r => r.nombre && r.precio > 0)
    } else {
      parsed = rows.map(r => sheetRowToAlt(headers, r)).filter(r => r.nombre && r.precio > 0)
    }

    localStorage.setItem(cfg.cacheKey, JSON.stringify(parsed))
    results[key] = parsed
  }

  return results
}

export function getCacheTimestamp() {
  // Retorna cuándo se cargaron los datos por última vez
  const ts = localStorage.getItem('cache_timestamp')
  return ts ? new Date(parseInt(ts)) : null
}

export function setCacheTimestamp() {
  localStorage.setItem('cache_timestamp', Date.now().toString())
}

export function clearCache() {
  localStorage.removeItem('cache_vias')
  localStorage.removeItem('cache_alt')
  localStorage.removeItem('cache_timestamp')
}
