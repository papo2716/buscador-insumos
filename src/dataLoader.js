// ============================================================
// FETCHER DE DATOS
// - Usuarios normales: leen public/data.json (subido por admin)
// - Admin: lee directo del Google Sheet y sube data.json
// ============================================================

const SHEET_ID = '1yeQPjiwPbeSdKV9XbYbICa5YxqqTA1A6W1a6uJSWWwE'
const API_KEY  = import.meta.env.VITE_SHEETS_API_KEY

// Caché en memoria (dura mientras la pestaña está abierta)
let memoryCache     = null
let cacheTimestamp  = null

const SHEETS = {
  vias: { name: 'VIAS DE EXCEPCION', range: 'A:R' },
  alt:  { name: 'ALTERNATIVOS',      range: 'A:Z' },
}

function parsePrecio(val) {
  if (!val) return 0
  const str = val.toString().replace(/\$/g, '').trim()
  if (str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0
}

function sheetRowToVias(headers, row) {
  const get = col => {
    const idx = headers.indexOf(col.toLowerCase())
    return idx >= 0 && row[idx] !== undefined ? row[idx] : ''
  }
  return {
    orden:     get('orden ve'),
    nombre:    get('descripcion'),
    precio:    parsePrecio(get('precio')),
    fecha:     get('f_solicitud'),
    prestador: get('detalle_prestador'),
    ugl:       get('c_ugl'),
    proveedor: get('proveedor'),
  }
}

function sheetRowToAlt(headers, row) {
  const get = col => {
    const idx = headers.indexOf(col.toLowerCase())
    return idx >= 0 && row[idx] !== undefined ? row[idx] : ''
  }
  return {
    orden:     get('orden alt'),
    nombre:    get('nombre_normalizado'),
    precio:    parsePrecio(get('precio')),
    fecha:     get('fecha'),
    prestador: get('prestador'),
    ugl:       get('ugl'),
  }
}

async function fetchSheet(sheetName, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName + '!' + range)}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Error ${res.status} al leer "${sheetName}": ${body?.error?.message || res.statusText}`)
  }
  const data = await res.json()
  return data.values || []
}

// Lee directo del Sheet (solo admin)
export async function loadDataFromSheet() {
  const results = {}
  for (const [key, cfg] of Object.entries(SHEETS)) {
    const values = await fetchSheet(cfg.name, cfg.range)
    if (values.length < 2) { results[key] = []; continue }
    const headers = values[0].map(h => h.toString().toLowerCase().trim())
    const rows    = values.slice(1)
    results[key] = key === 'vias'
      ? rows.map(r => sheetRowToVias(headers, r)).filter(r => r.nombre && r.precio > 0)
      : rows.map(r => sheetRowToAlt(headers, r)).filter(r => r.nombre && r.precio > 0)
  }
  memoryCache    = results
  cacheTimestamp = new Date()
  return results
}

// Lee el data.json publicado por el admin (usuarios normales)
export async function loadDataFromJSON() {
  if (memoryCache) return memoryCache

  // Agregar timestamp para evitar caché del navegador
  const url = `./data.json?t=${Date.now()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se encontró data.json (${res.status}). El admin debe actualizar los datos primero.`)
  const json = await res.json()

  memoryCache    = { vias: json.vias || [], alt: json.alt || [] }
  cacheTimestamp = json.updatedAt ? new Date(json.updatedAt) : new Date()
  return memoryCache
}

export function getCacheTimestamp() { return cacheTimestamp }
export function setCacheTimestamp() { cacheTimestamp = new Date() }
export function clearCache() { memoryCache = null; cacheTimestamp = null }