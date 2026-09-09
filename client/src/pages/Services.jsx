import { useState, useEffect } from 'react'
import { Camera, Edit, Save, XCircle, CheckCircle, Plus, Trash2, AlertTriangle, Power } from 'lucide-react'

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
  
  // Modals for deletion & conflict handling
  const [serviceToDelete, setServiceToDelete] = useState(null)
  const [conflictModal, setConflictModal] = useState(null)

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
    if (!newService.nombre || !newService.precio_base) return
    setCreating(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newService.nombre.trim(),
          precio_base: parseFloat(newService.precio_base) || 0,
          entregables_detalle: newService.entregables.trim(),
          activo: !!newService.activo,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear servicio')
      
      const created = data.service || data
      setServices(prev => [...prev, created])
      setNewService(EMPTY_SERVICE)
      setShowModal(false)
      setSuccessMsg(`Servicio "${created.nombre}" creado exitosamente`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (s) => {
    const svcId = s.id || s.id_servicio
    try {
      const res = await fetch(`/api/services/${svcId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar estado')
      
      setServices(prev => prev.map(sv => (sv.id || sv.id_servicio) === svcId ? { ...sv, activo: data.activo } : sv))
      setSuccessMsg(`Servicio "${s.nombre}" ${data.activo ? 'activado' : 'desactivado'}`)
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (s) => {
    const svcId = s.id || s.id_servicio
    setEditingId(svcId)
    setEditData({
      nombre: s.nombre,
      precio_base: s.precio_base,
      entregables: s.entregables_detalle || s.entregables || ''
    })
  }

  const handleSaveEdit = async (s) => {
    const svcId = s.id || s.id_servicio
    try {
      const res = await fetch(`/api/services/${svcId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editData.nombre || s.nombre,
          precio_base: parseFloat(editData.precio_base) || 0,
          entregables_detalle: editData.entregables,
        }),
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error || 'Error al guardar cambios')

      setServices(prev => prev.map(sv => (sv.id || sv.id_servicio) === svcId ? updated : sv))
      setEditingId(null)
      setSuccessMsg(`Servicio "${updated.nombre}" actualizado`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteClick = (s) => {
    setError(null)
    setServiceToDelete(s)
  }

  const confirmDelete = async (deactivate = false) => {
    const s = serviceToDelete || conflictModal?.service
    if (!s) return
    const svcId = s.id || s.id_servicio

    try {
      const url = deactivate ? `/api/services/${svcId}?deactivate=true` : `/api/services/${svcId}`
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()

      if (res.status === 409) {
        // Tiene reservas asociadas
        setConflictModal({
          service: s,
          message: data.error,
          count: data.booking_count
        })
        setServiceToDelete(null)
        return
      }

      if (!res.ok) throw new Error(data.error || 'Error al procesar la eliminación')

      if (data.deactivated) {
        setServices(prev => prev.map(sv => (sv.id || sv.id_servicio) === svcId ? { ...sv, activo: 0 } : sv))
        setSuccessMsg(data.message)
      } else {
        setServices(prev => prev.filter(sv => (sv.id || sv.id_servicio) !== svcId))
        setSuccessMsg(data.message)
      }

      setServiceToDelete(null)
      setConflictModal(null)
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (err) {
      setError(err.message)
      setServiceToDelete(null)
      setConflictModal(null)
    }
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={24} className="text-accent" /> Servicios
          </div>
          <div className="page-subtitle">Catálogo de paquetes fotográficos y entregables</div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Nuevo Servicio
        </button>
      </div>

      {error && (
        <div className="alert-danger-card" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} className="text-danger" style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <div className="services-grid">
        {services.length === 0 ? (
          <div className="no-data" style={{ gridColumn: '1/-1' }}>Sin servicios registrados</div>
        ) : services.map(s => {
          const svcId = s.id || s.id_servicio
          const isEditing = editingId === svcId
          const entregables = s.entregables_detalle || s.entregables || ''

          return (
            <div key={svcId} className={`service-card${!s.activo ? ' inactive' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="service-name">{s.nombre}</div>
                <label className="toggle-switch" title={s.activo ? 'Desactivar servicio' : 'Activar servicio'}>
                  <input type="checkbox" checked={!!s.activo} onChange={() => handleToggle(s)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              {isEditing ? (
                <>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">Nombre del Servicio</label>
                    <input
                      className="form-input"
                      value={editData.nombre || ''}
                      onChange={e => setEditData({ ...editData, nombre: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Base (MXN)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={editData.precio_base}
                      onChange={e => setEditData({ ...editData, precio_base: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Entregables y Detalles</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={editData.entregables}
                      onChange={e => setEditData({ ...editData, entregables: e.target.value })}
                      placeholder="Ej: 30 fotos editadas, galería web en alta resolución..."
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: '8px' }}>
                    <button className="btn-secondary btn-sm" onClick={() => setEditingId(null)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={14} /> Cancelar
                    </button>
                    <button className="btn-primary btn-sm" onClick={() => handleSaveEdit(s)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Save size={14} /> Guardar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="service-price">{fmt(s.precio_base)}</div>
                  {entregables && <div className="service-deliverables">{entregables}</div>}
                  
                  <div className="service-footer" style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: s.activo ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {s.activo ? <><CheckCircle size={14} /> Activo</> : <><XCircle size={14} /> Inactivo</>}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-secondary btn-sm" onClick={() => handleEdit(s)} style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Editar servicio">
                        <Edit size={14} /> Editar
                      </button>
                      <button 
                        className="btn-danger-outline btn-sm" 
                        onClick={() => handleDeleteClick(s)} 
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }} 
                        title="Eliminar o desactivar servicio"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Nuevo Servicio */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Camera size={20} className="text-accent" /> Nuevo Paquete Fotográfico
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del Servicio *</label>
                <input
                  className="form-input"
                  value={newService.nombre}
                  onChange={e => setNewService({ ...newService, nombre: e.target.value })}
                  placeholder="Ej: Sesión Newborn / Recién Nacido"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Precio Base (MXN) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={newService.precio_base}
                  onChange={e => setNewService({ ...newService, precio_base: e.target.value })}
                  placeholder="2500"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Entregables y Cobertura</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={newService.entregables}
                  onChange={e => setNewService({ ...newService, entregables: e.target.value })}
                  placeholder="Ej: 30 fotos editadas en alta resolución, galería privada en línea, 2 cambios de vestuario..."
                />
              </div>
              <div className="checkbox-group" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="nuevo-activo"
                  checked={newService.activo}
                  onChange={e => setNewService({ ...newService, activo: e.target.checked })}
                />
                <label htmlFor="nuevo-activo" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Servicio activo de inmediato</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={creating || !newService.nombre.trim() || !newService.precio_base}
                onClick={handleCreate}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <CheckCircle size={16} /> {creating ? 'Guardando...' : 'Crear Servicio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación Normal */}
      {serviceToDelete && !conflictModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--danger)' }}>
                <Trash2 size={20} /> Eliminar Paquete
              </h3>
              <button className="modal-close" onClick={() => setServiceToDelete(null)}><XCircle size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0' }}>
                ¿Estás seguro de que deseas eliminar el paquete <strong>"{serviceToDelete.nombre}"</strong>?
              </p>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Si el servicio cuenta con reservas pasadas, el sistema te ofrecerá desactivarlo para mantener íntegro tu historial financiero.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setServiceToDelete(null)}>Cancelar</button>
              <button
                className="btn-danger"
                onClick={() => confirmDelete(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Trash2 size={16} /> Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conflicto por Reservas Existentes -> Opción Desactivar */}
      {conflictModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: '#f59e0b' }}>
                <AlertTriangle size={20} /> Reservas Asociadas Detectadas
              </h3>
              <button className="modal-close" onClick={() => setConflictModal(null)}><XCircle size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 14,
                fontSize: '0.9rem',
                color: '#fbbf24'
              }}>
                El paquete <strong>"{conflictModal.service.nombre}"</strong> tiene <strong>{conflictModal.count} reserva(s)</strong> registradas en el historial.
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                Para evitar inconsistencias en el historial de sesiones y pagos, no se puede borrar permanentemente de la base de datos.
                <br /><br />
                <strong>Solución recomendada:</strong> Desactivar el servicio. De esta forma tus reservas anteriores se conservan intactas pero ya no aparecerá disponible para nuevas reservas.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConflictModal(null)}>Cerrar</button>
              <button
                className="btn-primary"
                onClick={() => confirmDelete(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Power size={16} /> Desactivar Servicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
