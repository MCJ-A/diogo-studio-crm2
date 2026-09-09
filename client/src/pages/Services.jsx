import { useState, useEffect } from 'react'
import { 
  Camera, Edit, Save, XCircle, CheckCircle, Plus, Trash2, AlertTriangle, 
  Power, Sparkles, Award, TrendingUp, Layers, Timer, Users, MapPin, 
  BookOpen, Star, MoreVertical, Sliders, Check, Eye, PackagePlus
} from 'lucide-react'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0)

const EMPTY_SERVICE = { 
  nombre: '', 
  precio_base: '', 
  entregables: '', 
  categoria: 'bodas', 
  activo: true,
  destacado: false 
}

const CATEGORIES = [
  { id: 'all', label: 'Todos los servicios' },
  { id: 'bodas', label: 'Bodas & Parejas' },
  { id: 'corporativo', label: 'Corporativo' },
  { id: 'retrato', label: 'Retrato & Familia' }
]

function getCategoryFromService(s) {
  const name = (s.nombre || '').toLowerCase()
  if (name.includes('matrimoni') || name.includes('boda') || name.includes('pareja') || name.includes('novios')) return 'bodas'
  if (name.includes('corporativ') || name.includes('b2b') || name.includes('comercial') || name.includes('empresa')) return 'corporativo'
  return 'retrato'
}

function getCategoryLabel(cat) {
  if (cat === 'bodas') return 'Bodas de Alta Gama'
  if (cat === 'corporativo') return 'Comercial / B2B'
  return 'Retrato Intimista'
}

function getServiceVisualMeta(s) {
  const name = (s.nombre || '').toLowerCase()
  if (name.includes('matrimoni') || name.includes('boda')) {
    return {
      tag: 'Álbum Encuadernado Incluido',
      duration: 'Jornada Completa',
      isPopular: true,
      overline: 'Signature Atelier',
      gradient: 'linear-gradient(135deg, rgba(232, 176, 114, 0.2) 0%, rgba(19, 27, 42, 0.9) 100%)'
    }
  }
  if (name.includes('corporativ') || name.includes('b2b')) {
    return {
      tag: '2.5 Horas de toma',
      duration: 'Uso Comercial',
      isPopular: false,
      overline: 'Comercial / B2B',
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(19, 27, 42, 0.9) 100%)'
    }
  }
  if (name.includes('familiar') || name.includes('familia')) {
    return {
      tag: 'Hasta 5 integrantes',
      duration: '90 minutos',
      isPopular: false,
      overline: 'Retrato Intimista',
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(19, 27, 42, 0.9) 100%)'
    }
  }
  return {
    tag: '1 Locación exclusiva',
    duration: '60 minutos',
    isPopular: false,
    overline: 'Editorial & Personal',
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(19, 27, 42, 0.9) 100%)'
  }
}

export default function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  
  // Filtering
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  // Deletion & conflict handling
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

  const handleOpenCreate = () => {
    setModalMode('create')
    setServiceForm(EMPTY_SERVICE)
    setShowModal(true)
  }

  const handleOpenEdit = (s) => {
    const svcId = s.id || s.id_servicio
    setEditingId(svcId)
    setModalMode('edit')
    setServiceForm({
      nombre: s.nombre,
      precio_base: s.precio_base,
      entregables: s.entregables_detalle || s.entregables || '',
      categoria: getCategoryFromService(s),
      activo: !!s.activo,
      destacado: !!s.destacado
    })
    setShowModal(true)
  }

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!serviceForm.nombre || !serviceForm.precio_base) return
    setCreating(true)
    setError(null)

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: serviceForm.nombre.trim(),
            precio_base: parseFloat(serviceForm.precio_base) || 0,
            entregables_detalle: serviceForm.entregables.trim(),
            activo: !!serviceForm.activo,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al crear servicio')
        
        const created = data.service || data
        setServices(prev => [...prev, created])
        setSuccessMsg(`Servicio "${created.nombre}" creado exitosamente`)
      } else {
        const res = await fetch(`/api/services/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: serviceForm.nombre.trim(),
            precio_base: parseFloat(serviceForm.precio_base) || 0,
            entregables_detalle: serviceForm.entregables.trim(),
            activo: !!serviceForm.activo,
          }),
        })
        const updated = await res.json()
        if (!res.ok) throw new Error(updated.error || 'Error al guardar cambios')

        setServices(prev => prev.map(sv => (sv.id || sv.id_servicio) === editingId ? updated : sv))
        setSuccessMsg(`Servicio "${updated.nombre}" actualizado correctamente`)
      }

      setShowModal(false)
      setServiceForm(EMPTY_SERVICE)
      setEditingId(null)
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
      setSuccessMsg(`Servicio "${s.nombre}" ${data.activo ? 'activado' : 'pausado'}`)
      setTimeout(() => setSuccessMsg(null), 2500)
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

  // Métricas
  const totalRegistrados = services.length
  const activosCount = services.filter(s => !!s.activo).length
  const ticketPromedio = totalRegistrados > 0 
    ? services.reduce((acc, s) => acc + (parseFloat(s.precio_base) || 0), 0) / totalRegistrados 
    : 0

  // Filtrado de servicios
  const filteredServices = services.filter(s => {
    if (selectedCategory === 'all') return true
    const cat = getCategoryFromService(s)
    return cat === selectedCategory
  })

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div className="services-page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Top Command & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: '#282a30',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8b072',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}>
              <Camera size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
              Servicios
            </h1>
          </div>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.88rem' }}>
            Catálogo exclusivo de paquetes fotográficos, coberturas y entregables de alta gama
          </p>
        </div>

        {/* Action CTA */}
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', background: '#e8b072', color: '#482900',
            border: 'none', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 24px rgba(232,176,114,0.25)',
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={18} /> Nuevo Servicio
        </button>
      </div>

      {error && <div className="alert-danger-card">{error}</div>}
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8, padding: '12px 16px', color: '#4ade80',
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Studio Performance Strip (4 KPI Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        
        <div style={{
          background: '#191b22', borderRadius: 12, padding: 16, border: '1px solid #282f42',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Servicios Activos</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F8FAFC' }}>{activosCount}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>/ {totalRegistrados} registrados</span>
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#282a30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffcd99' }}>
            <Layers size={20} />
          </div>
        </div>

        <div style={{
          background: '#191b22', borderRadius: 12, padding: 16, border: '1px solid #282f42',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Top Atelier</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F5B955', marginTop: 4 }}>Matrimonial</span>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#282a30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5B955' }}>
            <Award size={20} />
          </div>
        </div>

        <div style={{
          background: '#191b22', borderRadius: 12, padding: 16, border: '1px solid #282f42',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Ticket Promedio</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', marginTop: 4 }}>{fmt(ticketPromedio)}</span>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#282a30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bcc7de' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        <div style={{
          background: '#191b22', borderRadius: 12, padding: 16, border: '1px solid #282f42',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 8 }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Tasa de Conversión</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC' }}>68.4%</span>
              <span style={{ fontSize: '0.75rem', color: '#e8b072', fontWeight: 600 }}>óptima</span>
            </div>
            <div style={{ width: '100%', height: 4, background: '#282a30', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: '68.4%', height: '100%', background: '#e8b072', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#282a30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adddff' }}>
            <Sparkles size={20} />
          </div>
        </div>

      </div>

      {/* Filter & Segment Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, background: '#191b22', padding: 10, borderRadius: 12, border: '1px solid #282f42'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                  background: isActive ? '#e8b072' : 'transparent',
                  color: isActive ? '#482900' : '#94A3B8'
                }}
              >
                {cat.label} {cat.id === 'all' ? `(${services.length})` : ''}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.8rem' }}>
          <Eye size={15} />
          <span>Vista de Catálogo Haute Atelier</span>
        </div>
      </div>

      {/* Services Grid (Haute Atelier Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {filteredServices.length === 0 ? (
          <div className="no-data" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center' }}>
            No se encontraron paquetes en esta categoría.
          </div>
        ) : (
          filteredServices.map(s => {
            const svcId = s.id || s.id_servicio
            const meta = getServiceVisualMeta(s)
            const entregables = s.entregables_detalle || s.entregables || ''
            const itemsList = entregables.split('\n').filter(Boolean)

            return (
              <article
                key={svcId}
                style={{
                  background: '#191b22', borderRadius: 14, padding: 20,
                  border: meta.isPopular ? '1px solid rgba(245, 185, 85, 0.4)' : '1px solid #282f42',
                  boxShadow: meta.isPopular ? '0 16px 48px rgba(0,0,0,0.8), 0 0 20px rgba(232,176,114,0.1)' : '0 12px 36px rgba(0,0,0,0.5)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  position: 'relative', overflow: 'hidden', opacity: s.activo ? 1 : 0.65,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Gold overline glow for signature */}
                {meta.isPopular && (
                  <div style={{
                    position: 'absolute', top: 0, left: 24, right: 24, height: 2,
                    background: 'linear-gradient(90deg, transparent 0%, #F5B955 50%, transparent 100%)',
                    boxShadow: '0 0 10px #F5B955'
                  }} />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  
                  {/* Card Header: Category Tag & Active Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {meta.isPopular ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 20, background: '#e8b072',
                          color: '#482900', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase'
                        }}>
                          <Star size={12} fill="#482900" /> Signature
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', fontWeight: 600 }}>
                          {meta.overline}
                        </span>
                      )}
                    </div>

                    {/* Interactive Toggle Switch */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} title={s.activo ? 'Desactivar paquete' : 'Activar paquete'}>
                      <input
                        type="checkbox"
                        checked={!!s.activo}
                        onChange={() => handleToggle(s)}
                        style={{ width: 16, height: 16, accentColor: '#e8b072', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: s.activo ? '#4ade80' : '#64748B', fontWeight: 600 }}>
                        {s.activo ? 'Activo' : 'Pausado'}
                      </span>
                    </label>
                  </div>

                  {/* Title & Price */}
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {s.nombre}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F5B955' }}>
                        {fmt(s.precio_base)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase' }}>EUR</span>
                    </div>
                  </div>

                  {/* Visual Strip / Preview Box */}
                  <div style={{
                    width: '100%', height: 90, borderRadius: 8, background: meta.gradient,
                    display: 'flex', alignItems: 'flex-end', padding: 10, position: 'relative',
                    border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden'
                  }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 4, background: 'rgba(11, 13, 19, 0.85)',
                      backdropFilter: 'blur(4px)', color: '#F8FAFC', fontSize: '0.72rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <Timer size={12} style={{ color: '#e8b072' }} /> {meta.tag}
                    </span>
                  </div>

                  {/* Deliverables Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                    {itemsList.length > 0 ? (
                      itemsList.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.82rem', color: '#cbd5e1' }}>
                          <CheckCircle size={15} style={{ color: '#F5B955', flexShrink: 0, marginTop: 2 }} />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                        Cobertura fotográfica profesional de estudio y galería digital de entrega.
                      </div>
                    )}
                  </div>

                </div>

                {/* Card Footer Actions */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 20, paddingTop: 14, borderTop: '1px solid #282f42'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.activo ? '#4ade80' : '#64748B' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.activo ? '#4ade80' : '#64748B' }}>
                      {s.activo ? 'En Catálogo' : 'Pausado'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleOpenEdit(s)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, background: '#282a30',
                        border: 'none', color: '#F8FAFC', fontSize: '0.8rem', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <Edit size={13} /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(s)}
                      style={{
                        padding: '6px 8px', borderRadius: 6, background: '#282a30',
                        border: 'none', color: '#ffb4ab', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title="Eliminar o pausar servicio"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </article>
            )
          })
        )}
      </div>

      {/* Bottom Add-on Upsell Ledger */}
      <div style={{
        background: '#191b22', borderRadius: 14, padding: 22, border: '1px solid #282f42',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: '#282a30',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8b072', flexShrink: 0
          }}>
            <PackagePlus size={24} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC', display: 'block' }}>
              ¿Deseas ofrecer servicios adicionales?
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
              Configura complementos como horas extra de cobertura, retocado express en 24h, o impresiones en papel Fine Art de algodón.
            </span>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{
            padding: '8px 16px', background: '#282a30', color: '#e8b072',
            border: '1px solid rgba(232, 176, 114, 0.3)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Crear Complemento
        </button>
      </div>

      {/* Modal: Configurar Paquete Fotográfico (Nuevo / Editar) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={20} className="text-accent" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#F8FAFC' }}>
                  {modalMode === 'create' ? 'Configurar Nuevo Paquete' : `Editar: ${serviceForm.nombre}`}
                </h3>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20} /></button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Paquete / Servicio *</label>
                  <input
                    className="form-input"
                    value={serviceForm.nombre}
                    onChange={e => setServiceForm({ ...serviceForm, nombre: e.target.value })}
                    placeholder="Ej. Sesión Editorial de Moda"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Precio (€) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={serviceForm.precio_base}
                      onChange={e => setServiceForm({ ...serviceForm, precio_base: e.target.value })}
                      placeholder="2500.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select
                      className="form-select"
                      value={serviceForm.categoria}
                      onChange={e => setServiceForm({ ...serviceForm, categoria: e.target.value })}
                    >
                      <option value="bodas">Bodas & Parejas</option>
                      <option value="corporativo">Corporativo / B2B</option>
                      <option value="retrato">Retrato & Familia</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Entregables y Cobertura (1 por línea)</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={serviceForm.entregables}
                    onChange={e => setServiceForm({ ...serviceForm, entregables: e.target.value })}
                    placeholder="30 fotos editadas en alta resolución&#10;Álbum artesanal encuadernado&#10;2 fotógrafos simultáneos"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={serviceForm.activo}
                      onChange={e => setServiceForm({ ...serviceForm, activo: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#e8b072' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#F8FAFC' }}>Disponible en catálogo público</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !serviceForm.nombre.trim() || !serviceForm.precio_base}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle size={16} /> {creating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación Normal */}
      {serviceToDelete && !conflictModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
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
                Si el servicio cuenta con reservas previas, podrás desactivarlo de inmediato para conservar tu historial contable.
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
          <div className="modal-content" style={{ maxWidth: 480 }}>
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
                El paquete <strong>"{conflictModal.service.nombre}"</strong> tiene <strong>{conflictModal.count} reserva(s)</strong> asociadas en el historial.
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.5', margin: 0, color: '#cbd5e1' }}>
                Para evitar inconsistencias en facturación y entregables, se recomienda desactivar el servicio en vez de eliminarlo.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConflictModal(null)}>Cerrar</button>
              <button
                className="btn-primary"
                onClick={() => confirmDelete(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Power size={16} /> Pausar Servicio
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
