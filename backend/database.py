import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'fotografia.db')

def run_migrations(conn):
    try:
        cursor = conn.cursor()

        # 1. Columnas en bookings
        cursor.execute("PRAGMA table_info(bookings)")
        cols_bookings = [r[1] for r in cursor.fetchall()]
        
        if cols_bookings:
            if 'hora_sesion' not in cols_bookings:
                cursor.execute("ALTER TABLE bookings ADD COLUMN hora_sesion TEXT")
            if 'notas_internas' not in cols_bookings:
                cursor.execute("ALTER TABLE bookings ADD COLUMN notas_internas TEXT")
            if 'razon_cancelacion' not in cols_bookings:
                cursor.execute("ALTER TABLE bookings ADD COLUMN razon_cancelacion TEXT")

        # 2. Columnas en payments
        cursor.execute("PRAGMA table_info(payments)")
        cols_payments = [r[1] for r in cursor.fetchall()]
        if cols_payments:
            if 'metodo_pago' not in cols_payments:
                cursor.execute("ALTER TABLE payments ADD COLUMN metodo_pago TEXT DEFAULT 'MB WAY'")
            if 'notas_pago' not in cols_payments:
                cursor.execute("ALTER TABLE payments ADD COLUMN notas_pago TEXT")

        # 3. Actualizar vistas SQL críticas
        cursor.execute("DROP VIEW IF EXISTS v_client_loyalty")
        cursor.execute("""
            CREATE VIEW v_client_loyalty AS
            SELECT 
                c.id,
                c.nombre,
                COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) AS sesiones_completadas,
                COALESCE(SUM(CASE WHEN b.estado IN ('Realizada','Entregada') THEN p.monto_bruto - COALESCE(p.descuento_aplicado,0) ELSE 0 END), 0) AS total_gastado,
                MAX(CASE WHEN b.estado IN ('Realizada','Entregada') THEN b.fecha_sesion END) AS fecha_ultima_sesion,
                (SELECT COUNT(*) FROM clients r WHERE r.referred_by_client_id = c.id) AS total_referidos,
                CASE 
                    WHEN COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) >= 3 AND (SELECT COUNT(*) FROM clients r WHERE r.referred_by_client_id = c.id) > 0 THEN 20
                    WHEN COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) >= 4 THEN 20
                    WHEN COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) BETWEEN 2 AND 3 THEN 15
                    WHEN (SELECT COUNT(*) FROM clients r WHERE r.referred_by_client_id = c.id) > 0 THEN 15
                    ELSE 0
                END AS descuento_sugerido_pct
            FROM clients c
            LEFT JOIN bookings b ON c.id = b.client_id
            LEFT JOIN payments p ON b.id = p.booking_id
            GROUP BY c.id, c.nombre
        """)

        cursor.execute("DROP VIEW IF EXISTS v_alertas_operativas")
        cursor.execute("""
            CREATE VIEW v_alertas_operativas AS
            SELECT 
                b.id,
                c.nombre AS cliente,
                s.nombre AS servicio,
                b.fecha_sesion,
                b.estado,
                CASE 
                    WHEN b.estado = 'Agendada' AND b.contrato_firmado = 0 THEN 'Sin contrato firmado'
                    WHEN b.estado IN ('Realizada', 'Seleccion_pendiente', 'En_edicion') AND COALESCE(p.saldo_pendiente, 0) > 0 THEN 'Saldo pendiente post-sesión'
                    WHEN b.estado = 'Entregada' AND COALESCE(p.saldo_pendiente, 0) > 0 THEN 'Saldo pendiente en entrega'
                    ELSE NULL
                END AS alerta,
                p.saldo_pendiente
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE (b.estado = 'Agendada' AND b.contrato_firmado = 0)
               OR (b.estado IN ('Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada') AND COALESCE(p.saldo_pendiente, 0) > 0)
        """)

        conn.commit()
    except Exception as e:
        print(f"Advertencia en run_migrations: {e}")

_migrated = False

def get_db():
    global _migrated
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    if not _migrated:
        run_migrations(conn)
        _migrated = True
    return conn
