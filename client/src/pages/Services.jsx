import { useState, useEffect } from 'react'
import { Camera, Edit, Save, XCircle, CheckCircle, Plus } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v ?? 0)

const EMPTY_SERVICE = { nombre: '', precio_base: '', entregables: '', activo: true }

export default function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newService, setNewService] = useState(EMPTY_SERVICE)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => { fetchServices() }, [])

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services')
      if (!res.ok) throw new Error('Error al cargar servicios')
      const data = await res.json()
      setServices(Array.isArray(data) ? data : data.services || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newService, precio_base: parseFloat(newService.precio_base) || 0 }),
      })
      if (!res.ok) throw new Error('Error al crear servicio')
      const created = await res.json()
      setServices(prev => [...prev, created.service || created])
      setNewService(EMPTY_SERVICE)
      setShowModal(false)
      setSuccessMsg('Servicio creado correctamente')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (s) => {
    try {
      const res = await fetch(`/api/services/${s.id_servicio}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !s.activo }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      setServices(prev => prev.map(sv => sv.id_servicio === s.id_servicio ? { ...sv, activo: !sv.activo } : sv))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (s) => {
    setEditingId(s.id_servicio)
    setEditData({ precio_base: s.precio_base, entregables: s.entregables || '' })
  }

  const handleSaveEdit = async (s) => {
    try {
      const res = await fetch(`/api/services/${s.id_servicio}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio_base: parseFloat(editData.precio_base) || 0, entregables: editData.entregables }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setServices(prev => prev.map(sv => sv.id_servicio === s.id_servicio
        ? { ...sv, precio_base: parseFloat(editData.precio_base) || 0, entregables: editData.entregables }
        : sv
      ))
      setEditingId(null)
      setSuccessMsg('Servicio actualizado')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{display:'flex', alignItems:'center', gap:8}}>
            <Camera size={24} className="text-accent" /> Servicios
          </div>
          <div className="page-subtitle">Catálogo de paquetes fotográficos</div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{display:'flex', alignItems:'center', gap:8}}>
          <Plus size={16} /> Nuevo Servicio
        </button>
      </div>

      {error && <div className="alert-danger-card">{error}</div>}
      {successMsg && <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'var(--success)'}}>{successMsg}</div>}

      <div className="services-grid">
        {services.length === 0 ? (
          <div className="no-data" style={{gridColumn:'1/-1'}}>Sin servicios registrados</div>
        ) : services.map(s => (
          <div key={s.id_servicio} className={`service-card${!s.activo ? ' inactive' : ''}`}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div className="service-name">{s.nombre}</div>
              <label className="toggle-switch" title={s.activo ? 'Desactivar' : 'Activar'}>
                <input type="checkbox" checked={!!s.activo} onChange={() => handleToggle(s)} />
                <span className="toggle-slider" />
              </label>
            </div>

            {editingId === s.id_servicio ? (
              <>
                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label className="form-label">Precio Base (MXN)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={editData.precio_base}
                    onChange={e => setEditData({...editData, precio_base: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Entregables</label>
                  <textarea className="form-textarea" rows={3} value={editData.entregables} onChange={e => setEditData({...editData, entregables: e.target.value})} />
                </div>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn-secondary btn-sm" onClick={() => setEditingId(null)} style={{display:'flex', alignItems:'center', gap:4}}>
                    <XCircle size={14}/> Cancelar
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => handleSaveEdit(s)} style={{display:'flex', alignItems:'center', gap:4}}>
                    <Save size={14}/> Guardar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="service-price">{fmt(s.precio_base)}</div>
                {s.entregables && <div className="service-deliverables">{s.entregables}</div>}
                <div className="service-footer" style={{ marginTop: 'auto', paddingTop: '16px' }}>
                  <span style={{fontSize:'0.8rem', color: s.activo ? 'var(--success)' : 'var(--text-muted)', display:'flex', alignItems:'center', gap:4}}>
                    {s.activo ? <><CheckCircle size={14}/> Activo</> : <><XCircle size={14}/> Inactivo</>}
                  </span>
                  <button className="btn-secondary btn-sm" onClick={() => handleEdit(s)} style={{display:'flex', alignItems:'center', gap:4}}>
                    <Edit size={14}/> Editar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Camera size={20} className="text-accent" /> Nuevo Servicio
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del Servicio *</label>
                <input className="form-input" value={newService.nombre} onChange={e => setNewService({...newService, nombre: e.target.value})} placeholder="Ej: Sesión de Maternidad" />
              </div>
              <div className="form-group">
                <label className="form-label">Precio Base (MXN) *</label>
                <input type="number" className="form-input" value={newService.precio_base} onChange={e => setNewService({...newService, precio_base: e.target.value})} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Entregables</label>
                <textarea className="form-textarea" rows={3} value={newService.entregables} onChange={e => setNewService({...newService, entregables: e.target.value})} placeholder="Ej: 30 fotos editadas en alta resolución, galería digital..." />
              </div>
              <div className="checkbox-group" style={{marginBottom:8}}>
                <input type="checkbox" id="activo" checked={newService.activo} onChange={e => setNewService({...newService, activo: e.target.checked})} />
                <label htmlFor="activo">Servicio activo</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={creating || !newService.nombre || !newService.precio_base} onClick={handleCreate} style={{display:'flex', alignItems:'center', gap:8}}>
                <CheckCircle size={16}/> {creating ? 'Creando...' : 'Crear Servicio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
