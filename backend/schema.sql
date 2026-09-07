PRAGMA foreign_keys = ON;

-- Tabla de usuarios (Autenticación)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- Tabla de clientes
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT UNIQUE,
    instagram TEXT,
    fecha_registro DATE NOT NULL,
    referred_by_client_id INTEGER,
    fecha_aniversario DATE,
    fecha_cumpleanos_hijos_o_parto DATE,
    notas_estilo_preferencias TEXT,
    FOREIGN KEY (referred_by_client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- Tabla de servicios
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio_base REAL NOT NULL,
    entregables_detalle TEXT,
    activo INTEGER DEFAULT 1
);

-- Tabla de reservas/booking
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    fecha_sesion DATE NOT NULL,
    ubicacion TEXT,
    estado TEXT CHECK (estado IN ('Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada', 'Cancelada')),
    contrato_firmado BOOLEAN DEFAULT 0,
    autoriza_redes_sociales BOOLEAN DEFAULT 0,
    url_galeria TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Tabla de pagos
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    monto_bruto REAL NOT NULL,
    descuento_aplicado REAL DEFAULT 0,
    motivo_descuento TEXT,
    anticipo_pagado REAL DEFAULT 0,
    saldo_pendiente GENERATED ALWAYS AS (monto_bruto - descuento_aplicado - anticipo_pagado) STORED,
    estado_pago TEXT CHECK (estado_pago IN ('Pendiente', 'Parcial', 'Completado')),
    fecha_ultimo_pago DATE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Vista de lealtad del cliente
CREATE VIEW v_client_loyalty AS
SELECT 
    c.id,
    c.nombre,
    COUNT(CASE WHEN b.estado = 'Realizada' THEN 1 END) AS sesiones_completadas,
    COALESCE(SUM(CASE WHEN b.estado IN ('Realizada','Entregada') THEN p.monto_bruto - COALESCE(p.descuento_aplicado,0) ELSE 0 END), 0) AS total_gastado,
    MAX(b.fecha_sesion) AS fecha_ultima_sesion,
    COUNT(DISTINCT c.referred_by_client_id) AS total_referidos,
    CASE 
        WHEN COUNT(CASE WHEN b.estado = 'Realizada' THEN 1 END) >= 4 AND COUNT(DISTINCT c.referred_by_client_id) > 0 THEN 20
        WHEN COUNT(CASE WHEN b.estado = 'Realizada' THEN 1 END) BETWEEN 2 AND 3 THEN 15
        WHEN COUNT(CASE WHEN b.estado = 'Realizada' THEN 1 END) >= 4 THEN 15
        ELSE 0
    END AS descuento_sugerido_pct
FROM clients c
LEFT JOIN bookings b ON c.id = b.client_id
LEFT JOIN payments p ON b.id = p.booking_id
GROUP BY c.id, c.nombre;


-- Vista de oportunidades de recontacto
CREATE VIEW v_oportunidades_recontacto AS
SELECT 
    c.id,
    c.nombre,
    c.email,
    c.telefono,
    CASE 
        WHEN julianday('now') - julianday(c.fecha_registro) > 180 THEN 'Inactivo'
        ELSE 'Activo'
    END AS estado_cliente,
    MIN(CASE 
        WHEN b.estado = 'Entregada' AND julianday(b.fecha_sesion) < julianday('now') + 30 THEN b.fecha_sesion
        WHEN c.fecha_aniversario IS NOT NULL AND julianday(c.fecha_aniversario) BETWEEN julianday('now') AND julianday('now') + 30 THEN c.fecha_aniversario
        WHEN c.fecha_cumpleanos_hijos_o_parto IS NOT NULL AND julianday(c.fecha_cumpleanos_hijos_o_parto) BETWEEN julianday('now') AND julianday('now') + 30 THEN c.fecha_cumpleanos_hijos_o_parto
    END) AS fecha_opcion_recontacto,
    CASE 
        WHEN julianday('now') - julianday(c.fecha_registro) > 180 THEN 'Inactividad'
        ELSE 'Cumpleaños/Aniversario/Fecha especial'
    END AS motivo_recontacto
FROM clients c
LEFT JOIN bookings b ON c.id = b.client_id AND b.estado = 'Entregada'
WHERE julianday('now') - julianday(c.fecha_registro) > 180 
   OR (c.fecha_aniversario IS NOT NULL AND julianday(c.fecha_aniversario) BETWEEN julianday('now') AND julianday('now') + 30)
   OR (c.fecha_cumpleanos_hijos_o_parto IS NOT NULL AND julianday(c.fecha_cumpleanos_hijos_o_parto) BETWEEN julianday('now') AND julianday('now') + 30);

-- Vista de alertas operativas
CREATE VIEW v_alertas_operativas AS
SELECT 
    b.id,
    c.nombre AS cliente,
    s.nombre AS servicio,
    b.fecha_sesion,
    b.estado,
    CASE 
        WHEN b.estado = 'Entregada' AND p.saldo_pendiente > 0 THEN 'Saldo pendiente en entrega'
        WHEN b.estado = 'Agendada' AND b.contrato_firmado = 0 THEN 'Sin contrato firmado'
        ELSE NULL
    END AS alerta,
    p.saldo_pendiente
FROM bookings b
JOIN clients c ON b.client_id = c.id
JOIN services s ON b.service_id = s.id
LEFT JOIN payments p ON b.id = p.booking_id
WHERE (b.estado = 'Entregada' AND COALESCE(p.saldo_pendiente, 0) > 0)
   OR (b.estado = 'Agendada' AND b.contrato_firmado = 0);

-- Índices para optimización de consultas
CREATE INDEX idx_clients_telefono ON clients(telefono);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_bookings_fecha_sesion ON bookings(fecha_sesion);
CREATE INDEX idx_bookings_estado ON bookings(estado);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_estado_pago ON payments(estado_pago);
