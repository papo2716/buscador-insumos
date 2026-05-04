import { useState, useEffect, useCallback, useRef } from 'react'
import { loadData, clearCache, getCacheTimestamp, setCacheTimestamp } from './dataLoader'
import { buscar, calcularStats } from './search'
import styles from './App.module.css'

const PASSWORD = '*InsumosAlt2026'

const PRESTADORES = [
  'Todos',
  'ASOCIIACION MUTUAL PROACTIVA',
  'CEMIC',
  'CLIMO S.A. – CLNICA DEL BUEN PASTOR',
  'CPN S.A - IMAC',
  'SILVER CROSS AMRICA INC S.A',
  'CLINICA DE LA ESPERANZA - CELSO',
  'CLINICA PRIVADA INDEPENDENCIA',
  'HOSPITAL ITALIANO',
  'ICIME S.A- Cnica Maria Ward',
  'Instituto de Tratamiento Endoluminal BS. AS - ITEBA',
  'ENERI- DR. PEDRO LYLYK Y ASOC S.A.',
  'FUNDACION FAVALORO',
  'HOSPITAL Dr. Alberto DUHAU',
  'ITAC - NEPHROLOG',
  'SANATORIO GUEMES',
]

function fmt(num) {
  return '$' + Number(num).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d)) return val
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pass === PASSWORD) {
      onLogin()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className={styles.loginWrap}>
      <div className={`${styles.loginBox} ${shake ? styles.shake : ''}`}>
        <div className={styles.loginLogo}>
          <span className={styles.loginIcon}>⬡</span>
          <h1>Buscador de Insumos</h1>
          <p>Sistema de consulta de precios</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.loginField}>
            <label>Contraseña de acceso</label>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(false) }}
              placeholder="••••••••••••••"
              className={error ? styles.inputError : ''}
              autoFocus
            />
            {error && <span className={styles.loginError}>Contraseña incorrecta</span>}
          </div>
          <button type="submit" className={styles.btnLogin}>Ingresar →</button>
        </form>
      </div>
    </div>
  )
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ data, color }) {
  if (!data || data.length === 0) return null
  const precios = data.map(d => parseFloat(d.precio))
  const stats = calcularStats(precios)
  return (
    <div className={styles.statsBar} style={{ '--accent': color }}>
      {[
        { label: 'Media', val: stats.media },
        { label: 'Mediana', val: stats.mediana },
        { label: 'Mín', val: stats.min },
        { label: 'Máx', val: stats.max },
      ].map(s => (
        <div key={s.label} className={styles.statItem}>
          <span className={styles.statVal}>{fmt(s.val)}</span>
          <span className={styles.statLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── TABLA RESULTADOS ─────────────────────────────────────────────────────────
function TablaResultados({ data, tipo }) {
  if (!data) return null

  if (data.length === 0) {
    return <div className={styles.noResults}>Sin coincidencias</div>
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 48 }}>UGL</th>
            <th>Descripción</th>
            <th style={{ width: 130 }}>Precio</th>
            <th style={{ width: 120 }}>Info</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td><span className={styles.uglBadge}>{row.ugl}</span></td>
              <td>
                <span className={styles.orderBadge}>#{row.orden}</span>
                <span className={styles.desc}>{row.nombre}</span>
                {row.proveedor && <span className={styles.sub}>{row.proveedor}</span>}
              </td>
              <td><span className={styles.price}>{fmt(row.precio)}</span></td>
              <td>
                <span className={styles.dateStr}>{formatDate(row.fecha)}</span>
                <span className={styles.prestador}>{row.prestador}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('auth') === '1')
  const [data, setData]         = useState({ vias: [], alt: [] })
  const [loadState, setLoadState] = useState('idle') // idle | loading | ready | error
  const [cacheTs, setCacheTs]   = useState(null)
  const [loadMsg, setLoadMsg]   = useState('')

  // Search state
  const [termino, setTermino]     = useState('')
  const [fecha, setFecha]         = useState('')
  const [ugl, setUgl]             = useState('')
  const [prestador, setPrestador] = useState('Todos')

  // Results
  const [resVias, setResVias] = useState(null)
  const [resAlt, setResAlt]   = useState(null)
  const [searched, setSearched] = useState(false)

  const terminoRef = useRef(null)

  const handleLogin = () => {
    sessionStorage.setItem('auth', '1')
    setLoggedIn(true)
  }

  // Cargar datos cuando loguea
  useEffect(() => {
    if (!loggedIn) return
    const cached = localStorage.getItem('cache_vias')
    if (cached) {
      // Tiene caché, carga silenciosa
      setData({
        vias: JSON.parse(localStorage.getItem('cache_vias') || '[]'),
        alt:  JSON.parse(localStorage.getItem('cache_alt')  || '[]'),
      })
      setCacheTs(getCacheTimestamp())
      setLoadState('ready')
    } else {
      // Sin caché, carga obligatoria
      iniciarCarga(false)
    }
    setTimeout(() => terminoRef.current?.focus(), 100)
  }, [loggedIn])

  const iniciarCarga = useCallback(async (forceRefresh = true) => {
    setLoadState('loading')
    setLoadMsg(forceRefresh ? 'Actualizando datos desde el Sheet...' : 'Cargando datos por primera vez...')
    try {
      if (forceRefresh) clearCache()
      const result = await loadData(forceRefresh)
      setData(result)
      setCacheTimestamp()
      setCacheTs(new Date())
      setLoadState('ready')
      setLoadMsg('')
    } catch (err) {
      console.error(err)
      setLoadState('error')
      setLoadMsg('Error al cargar datos. Verificá la API Key o el acceso al Sheet.')
    }
  }, [])

  const handleSearch = useCallback(() => {
    if (!termino.trim()) return
    const fechaMinima = fecha ? (() => { const d = new Date(fecha); d.setHours(0,0,0,0); return d })() : null
    setResVias(buscar(data.vias, termino, fechaMinima, ugl, null))
    setResAlt(buscar(data.alt, termino, fechaMinima, ugl, prestador))
    setSearched(true)
  }, [termino, fecha, ugl, prestador, data])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  if (!loggedIn) return <Login onLogin={handleLogin} />

  const totalVias = data.vias.length
  const totalAlt  = data.alt.length

  return (
    <div className={styles.app}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>⬡</span>
          <div>
            <h1 className={styles.headerTitle}>Buscador de Insumos</h1>
            <span className={styles.headerSub}>
              {loadState === 'ready'
                ? `${totalVias.toLocaleString()} VE · ${totalAlt.toLocaleString()} ALT`
                : loadState === 'loading' ? 'Cargando...' : ''}
              {cacheTs && <span className={styles.cacheInfo}> · Datos al {formatDate(cacheTs)}</span>}
            </span>
          </div>
        </div>
        <button
          className={styles.btnRefresh}
          onClick={() => iniciarCarga(true)}
          disabled={loadState === 'loading'}
          title="Actualizar datos desde el Sheet"
        >
          {loadState === 'loading' ? '⟳ Cargando...' : '⟳ Actualizar datos'}
        </button>
      </header>

      {/* LOADING / ERROR */}
      {loadState === 'loading' && (
        <div className={styles.loadBanner}>
          <span className={styles.spinner} /> {loadMsg}
        </div>
      )}
      {loadState === 'error' && (
        <div className={styles.errorBanner}>{loadMsg}</div>
      )}

      {/* BUSCADOR */}
      <div className={styles.searchBox}>
        <div className={`${styles.inputGroup} ${styles.gSearch}`}>
          <label>Insumo <span className={styles.hint}>(comillas "" para búsqueda exacta)</span></label>
          <input
            ref={terminoRef}
            type="text"
            value={termino}
            onChange={e => setTermino(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: cateter foley silicon..."
            disabled={loadState !== 'ready'}
          />
        </div>
        <div className={`${styles.inputGroup} ${styles.gUgl}`}>
          <label>UGL</label>
          <input
            type="text"
            value={ugl}
            onChange={e => setUgl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="N°"
            disabled={loadState !== 'ready'}
          />
        </div>
        <div className={`${styles.inputGroup} ${styles.gDate}`}>
          <label>Fecha mín.</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            disabled={loadState !== 'ready'}
          />
        </div>
        <div className={`${styles.inputGroup} ${styles.gPrest}`}>
          <label>Prestador <span className={styles.hint}>(solo Alt.)</span></label>
          <select
            value={prestador}
            onChange={e => setPrestador(e.target.value)}
            disabled={loadState !== 'ready'}
          >
            {PRESTADORES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button
          className={styles.btnSearch}
          onClick={handleSearch}
          disabled={loadState !== 'ready' || !termino.trim()}
        >
          Buscar
        </button>
      </div>

      {/* RESULTADOS */}
      {searched && (
        <div className={styles.resultsGrid}>
          {/* VÍAS DE EXCEPCIÓN */}
          <div className={`${styles.column} ${styles.colVias}`}>
            <div className={styles.colHeader}>
              <div className={styles.colTitleRow}>
                <span className={styles.colDot} style={{ background: '#3b82f6' }} />
                <h2>Vías de Excepción</h2>
                <span className={styles.countBadge} style={{ '--c': '#3b82f6' }}>
                  {resVias?.length ?? 0}
                </span>
              </div>
              <StatsBar data={resVias} color="#3b82f6" />
            </div>
            <TablaResultados data={resVias} tipo="vias" />
          </div>

          {/* ALTERNATIVOS */}
          <div className={`${styles.column} ${styles.colAlt}`}>
            <div className={styles.colHeader}>
              <div className={styles.colTitleRow}>
                <span className={styles.colDot} style={{ background: '#22c55e' }} />
                <h2>Alternativos</h2>
                <span className={styles.countBadge} style={{ '--c': '#22c55e' }}>
                  {resAlt?.length ?? 0}
                </span>
              </div>
              <StatsBar data={resAlt} color="#22c55e" />
            </div>
            <TablaResultados data={resAlt} tipo="alt" />
          </div>
        </div>
      )}

      {!searched && loadState === 'ready' && (
        <div className={styles.emptyState}>
          <span>Ingresá un término para comenzar la búsqueda</span>
        </div>
      )}
    </div>
  )
}
