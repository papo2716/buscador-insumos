import { useState, useEffect, useCallback, useRef } from 'react'
import { loadDataFromJSON, loadDataFromSheet, clearCache, getCacheTimestamp } from './dataLoader'
import { subirDataAGitHub } from './github'
import { buscar, calcularStats } from './search'
import styles from './App.module.css'

// ─── CREDENCIALES ─────────────────────────────────────────────────────────────
const PASSWORD       = '*InsumosAlt2026'
const ADMIN_USER     = 'administrador'
const ADMIN_PASSWORD = 'PaPo2716Mat'

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

// ─── LOGIN USUARIO ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pass, setPass]   = useState('')
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

// ─── LOGIN ADMIN ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onClose }) {
  const [user, setUser]   = useState('')
  const [pass, setPass]   = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (user === ADMIN_USER && pass === ADMIN_PASSWORD && token.trim()) {
      onLogin(token.trim())
    } else if (user !== ADMIN_USER || pass !== ADMIN_PASSWORD) {
      setError('Usuario o contraseña incorrectos')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } else {
      setError('Ingresá el token de GitHub')
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.adminBox} ${shake ? styles.shake : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.adminHeader}>
          <span>🔐 Ingreso administrador</span>
          <button className={styles.btnClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.loginField}>
            <label>Usuario</label>
            <input
              type="text"
              value={user}
              onChange={e => { setUser(e.target.value); setError('') }}
              placeholder="administrador"
              autoFocus
            />
          </div>
          <div className={styles.loginField}>
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setError('') }}
              placeholder="••••••••••••••"
            />
          </div>
          <div className={styles.loginField}>
            <label>Token de GitHub <span className={styles.hint}>(ver instrucciones)</span></label>
            <input
              type="password"
              value={token}
              onChange={e => { setToken(e.target.value); setError('') }}
              placeholder="ghp_..."
            />
          </div>
          {error && <span className={styles.loginError}>{error}</span>}
          <button type="submit" className={styles.btnLogin}>Ingresar como admin →</button>
        </form>
      </div>
    </div>
  )
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ data, color }) {
  if (!data || data.length === 0) return null
  const precios = data.map(d => parseFloat(d.precio))
  const stats   = calcularStats(precios)
  return (
    <div className={styles.statsBar} style={{ '--accent': color }}>
      {[
        { label: 'Media',   val: stats.media   },
        { label: 'Mediana', val: stats.mediana },
        { label: 'Mín',     val: stats.min     },
        { label: 'Máx',     val: stats.max     },
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
function TablaResultados({ data, tipo, onSelect }) {
  if (!data) return null
  if (data.length === 0) return <div className={styles.noResults}>Sin coincidencias</div>

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
            <tr key={i} className={styles.rowClickable} onClick={() => onSelect({ row, tipo })}>
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

// ─── FICHA DETALLE ────────────────────────────────────────────────────────────
function val(v) {
  if (v === null || v === undefined || v === '') return '—'
  return v
}

function Ficha({ item, tipo, onClose }) {
  const { row } = item
  const esVias = tipo === 'vias'
  const titulo = esVias ? 'Ficha — Vías de Excepción' : 'Ficha — Alternativos'
  const accent = esVias ? '#3b82f6' : '#22c55e'

  const campos = esVias
    ? [
        { label: 'Código de solicitud',  value: val(row.c_solicitud) },
        { label: 'Fecha de solicitud',   value: row.fecha ? formatDate(row.fecha) : '—' },
        { label: 'Tipo de solicitud',    value: val(row.d_tipo_solicitud) },
        { label: 'Código de insumo',     value: val(row.insumo) },
        { label: 'Descripción',          value: val(row.nombre), full: true },
        { label: 'UGL',                  value: val(row.ugl) },
        { label: 'Código de prestador',  value: val(row.prestador_cod) },
        { label: 'Prestador',            value: val(row.prestador) },
        { label: 'Tipo',                 value: val(row.detalle) },
        { label: 'Sub-Tipo',             value: val(row.detalle_sub) },
        { label: 'Especificaciones',     value: val(row.espec_tecnicas), full: true },
        { label: 'Observaciones',        value: val(row.d_observacion), full: true },
        { label: 'Cantidad',             value: val(row.n_cantidad) },
        { label: 'Proveedor',            value: val(row.proveedor) },
        { label: 'Precio',               value: row.precio ? fmt(row.precio) : '—', highlight: true },
      ]
    : [
        { label: 'Nro de presupuesto', value: val(row.presupuesto_nro) },
        { label: 'Fecha',              value: row.fecha ? formatDate(row.fecha) : '—' },
        { label: 'Afiliado',           value: ((row.nro_afiliado || '') + ' ' + (row.afiliado_nombre || '')).trim() || '—', full: true },
        { label: 'Nro de OP',          value: val(row.nro_op) },
        { label: 'Prestador',          value: val(row.prestador), full: true },
        { label: 'UGL',                value: val(row.ugl) },
        { label: 'Insumo',             value: val(row.nombre), full: true },
        { label: 'Cantidad',           value: val(row.unidades) },
        { label: 'Precio',             value: row.precio ? fmt(row.precio) : '—', highlight: true },
      ]

  return (
    <div className={styles.fichaWrap} style={{ '--accent': accent }}>
      <div className={styles.fichaHeader}>
        <button className={styles.btnVolver} onClick={onClose}>← Volver</button>
        <div className={styles.fichaTitleBlock}>
          <h2 className={styles.fichaTitle}>{titulo}</h2>
          <span className={styles.fichaSub}>{row.nombre}</span>
        </div>
      </div>
      <div className={styles.fichaGrid}>
        {campos.map((c, i) => (
          <div
            key={i}
            className={`${styles.fichaField} ${c.full ? styles.fichaFieldFull : ''} ${c.highlight ? styles.fichaFieldHighlight : ''}`}
          >
            <span className={styles.fichaLabel}>{c.label}</span>
            <span className={styles.fichaValue}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn]     = useState(() => sessionStorage.getItem('auth') === '1')
  const [data, setData]             = useState({ vias: [], alt: [] })
  const [loadState, setLoadState]   = useState('idle')
  const [loadMsg, setLoadMsg]       = useState('')
  const [cacheTs, setCacheTs]       = useState(null)

  // Admin
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [isAdmin, setIsAdmin]               = useState(false)
  const [adminToken, setAdminToken]         = useState('')
  const [updating, setUpdating]             = useState(false)
  const [updateMsg, setUpdateMsg]           = useState('')
  const [updateOk, setUpdateOk]             = useState(null) // true | false | null

  // Search
  const [termino, setTermino]     = useState('')
  const [fecha, setFecha]         = useState('')
  const [ugl, setUgl]             = useState('')
  const [prestador, setPrestador] = useState('Todos')
  const [resVias, setResVias]     = useState(null)
  const [resAlt, setResAlt]       = useState(null)
  const [searched, setSearched]   = useState(false)
  const [itemSel, setItemSel]     = useState(null)

  const terminoRef = useRef(null)

  const handleLogin = () => {
    sessionStorage.setItem('auth', '1')
    setLoggedIn(true)
  }

  // Cargar datos al ingresar (desde data.json)
  useEffect(() => {
    if (!loggedIn) return
    cargarDatos()
    setTimeout(() => terminoRef.current?.focus(), 100)
  }, [loggedIn])

  const cargarDatos = useCallback(async () => {
    setLoadState('loading')
    setLoadMsg('Cargando datos...')
    try {
      const result = await loadDataFromJSON()
      setData(result)
      setCacheTs(getCacheTimestamp())
      setLoadState('ready')
      setLoadMsg('')
    } catch (err) {
      console.error(err)
      setLoadState('error')
      setLoadMsg(err.message || 'Error al cargar datos.')
    }
  }, [])

  // Admin: actualizar datos desde el Sheet y subir a GitHub
  const handleActualizar = useCallback(async () => {
    setUpdating(true)
    setUpdateMsg('Descargando datos del Sheet...')
    setUpdateOk(null)
    try {
      const result = await loadDataFromSheet()
      setUpdateMsg('Subiendo datos a GitHub...')
      await subirDataAGitHub(result, adminToken)
      setData(result)
      setCacheTs(new Date())
      setUpdateMsg('✓ Datos actualizados correctamente. Los usuarios verán los datos nuevos al recargar.')
      setUpdateOk(true)
      setLoadState('ready')
    } catch (err) {
      console.error(err)
      setUpdateMsg('✗ Error: ' + err.message)
      setUpdateOk(false)
    } finally {
      setUpdating(false)
    }
  }, [adminToken])

  const handleAdminLogin = (token) => {
    setAdminToken(token)
    setIsAdmin(true)
    setShowAdminLogin(false)
  }

  const handleSearch = useCallback(() => {
    if (!termino.trim()) return
    const fechaMinima = fecha
      ? (() => { const d = new Date(fecha); d.setHours(0,0,0,0); return d })()
      : null
    setResVias(buscar(data.vias, termino, fechaMinima, ugl, null))
    setResAlt(buscar(data.alt, termino, fechaMinima, ugl, prestador))
    setSearched(true)
    setItemSel(null)
  }, [termino, fecha, ugl, prestador, data])

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }

  if (!loggedIn) return <Login onLogin={handleLogin} />

  return (
    <div className={styles.app}>

      {/* MODAL ADMIN LOGIN */}
      {showAdminLogin && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onClose={() => setShowAdminLogin(false)}
        />
      )}

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>⬡</span>
          <div>
            <h1 className={styles.headerTitle}>Buscador de Insumos</h1>
            <span className={styles.headerSub}>
              {loadState === 'ready'
                ? `${data.vias.length.toLocaleString()} VE · ${data.alt.length.toLocaleString()} ALT`
                : loadState === 'loading' ? 'Cargando...' : ''}
              {cacheTs && (
                <span className={styles.cacheInfo}> · Datos al {formatDate(cacheTs)}</span>
              )}
            </span>
          </div>
        </div>

        <div className={styles.headerRight}>
          {isAdmin ? (
            <div className={styles.adminPanel}>
              <span className={styles.adminBadge}>🔐 Admin</span>
              <button
                className={styles.btnActualizar}
                onClick={handleActualizar}
                disabled={updating}
              >
                {updating ? '⟳ Actualizando...' : '⟳ Actualizar datos'}
              </button>
              <button
                className={styles.btnAdminOut}
                onClick={() => { setIsAdmin(false); setAdminToken(''); setUpdateMsg(''); setUpdateOk(null) }}
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              className={styles.btnAdminLink}
              onClick={() => setShowAdminLogin(true)}
            >
              🔐 Ingreso admin
            </button>
          )}
        </div>
      </header>

      {/* MENSAJE ACTUALIZACIÓN */}
      {updateMsg && (
        <div className={updateOk === true ? styles.successBanner : updateOk === false ? styles.errorBanner : styles.loadBanner}>
          {updating && <span className={styles.spinner} />} {updateMsg}
        </div>
      )}

      {/* LOADING / ERROR */}
      {loadState === 'loading' && !updateMsg && (
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

      {/* FICHA DETALLE */}
      {searched && itemSel && (
        <Ficha item={itemSel} tipo={itemSel.tipo} onClose={() => setItemSel(null)} />
      )}

      {/* RESULTADOS */}
      {searched && !itemSel && (
        <div className={styles.resultsGrid}>
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
            <TablaResultados data={resVias} tipo="vias" onSelect={setItemSel} />
          </div>

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
            <TablaResultados data={resAlt} tipo="alt" onSelect={setItemSel} />
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