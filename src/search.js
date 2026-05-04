// ============================================================
// MOTOR DE BÚSQUEDA - Misma lógica que el Apps Script original
// ============================================================

function editDistance(s1, s2) {
  const costs = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1))
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

function getSimilarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  if (longer.length === 0) return 1.0
  const dist = editDistance(longer, shorter)
  return (longer.length - dist) / longer.length
}

function matchesQuery(itemName, terminoCompleto) {
  const lower = itemName.toLowerCase()
  const termino = terminoCompleto.toLowerCase().trim()

  // Búsqueda exacta con comillas
  if (termino.startsWith('"') && termino.endsWith('"') && termino.length > 2) {
    const exact = termino.slice(1, -1).trim()
    return lower.includes(exact)
  }

  // Búsqueda AND
  const palabras = termino.split(' ').filter(p => p.length > 0)
  return palabras.every(palabra => {
    if (lower.includes(palabra)) return true
    if (palabra.length <= 4) return false
    const palabrasItem = lower.split(/[\s,.-]+/)
    return palabrasItem.some(pi => {
      const umbral = palabra.length === 5 ? 0.85 : 0.70
      return getSimilarity(palabra, pi) >= umbral
    })
  })
}

export function calcularStats(precios) {
  if (precios.length === 0) return { media: 0, mediana: 0, min: 0, max: 0 }
  const sorted = [...precios].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  const mid = Math.floor(sorted.length / 2)
  const mediana = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
  return { media: sum / sorted.length, mediana, min: sorted[0], max: sorted[sorted.length - 1] }
}

export function buscar(rows, termino, fechaMinima, uglFiltro, prestadorFiltro) {
  if (!termino) return []

  const uglTarget = uglFiltro ? uglFiltro.toString().trim() : null
  const prestTarget = (prestadorFiltro && prestadorFiltro !== 'Todos')
    ? prestadorFiltro.toLowerCase().trim()
    : null

  const resultados = []

  for (const row of rows) {
    // Filtro fecha
    if (fechaMinima && row.fecha) {
      const fechaItem = new Date(row.fecha)
      fechaItem.setHours(0, 0, 0, 0)
      if (fechaItem < fechaMinima) continue
    }

    // Filtro UGL
    if (uglTarget && row.ugl?.toString() !== uglTarget) continue

    // Filtro prestador (solo para alternativos)
    if (prestTarget && !row.prestador?.toLowerCase().includes(prestTarget)) continue

    // Filtro texto
    const nombre = row.nombre || ''
    const precio = parseFloat(row.precio)
    if (!nombre || isNaN(precio)) continue

    if (matchesQuery(nombre, termino)) {
      resultados.push(row)
    }
  }

  return resultados.sort((a, b) => parseFloat(b.precio) - parseFloat(a.precio))
}
