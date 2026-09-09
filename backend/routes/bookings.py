from flask import Blueprint, jsonify, request
from database import get_db

bookings_bp = Blueprint('bookings', __name__)

# Orden válido de transición de estados
ESTADO_ORDER = ['Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada']

def estado_index(estado):
    try:
        return ESTADO_ORDER.index(estado)
    except ValueError:
        return -1

def format_booking(row):
    if not row:
        return None
    d = dict(row)
    b_id = d.get('id') or d.get('id_reserva')
    d['id'] = b_id
    d['id_reserva'] = b_id

    c_id = d.get('client_id') or d.get('id_cliente')
    d['client_id'] = c_id
    d['id_cliente'] = c_id

    s_id = d.get('service_id') or d.get('id_servicio')
    d['service_id'] = s_id
    d['id_servicio'] = s_id

    c_name = d.get('cliente_nombre') or d.get('nombre_cliente')
    d['cliente_nombre'] = c_name
    d['nombre_cliente'] = c_name

    c_tel = d.get('cliente_telefono') or d.get('telefono_cliente') or d.get('telefono')
    d['cliente_telefono'] = c_tel
    d['telefono_cliente'] = c_tel

    s_name = d.get('servicio_nombre') or d.get('nombre_servicio')
    d['servicio_nombre'] = s_name
    d['nombre_servicio'] = s_name

    return d

@bookings_bp.route('/')
def get_bookings():
    try:
        db = get_db()
        rows = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email,
                   s.nombre AS servicio_nombre,
                   p.id AS payment_id,
                   COALESCE(p.monto_bruto, s.precio_base) AS monto_bruto,
                   COALESCE(p.anticipo_pagado, 0) AS anticipo_pagado,
                   COALESCE(p.descuento_aplicado, 0) AS descuento_aplicado,
                   p.motivo_descuento,
                   COALESCE(p.saldo_pendiente, (COALESCE(p.monto_bruto, s.precio_base) - COALESCE(p.descuento_aplicado, 0) - COALESCE(p.anticipo_pagado, 0))) AS saldo_pendiente,
                   COALESCE(p.estado_pago, 'Pendiente') AS estado_pago,
                   p.fecha_ultimo_pago
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            LEFT JOIN payments p ON p.booking_id = b.id
            ORDER BY b.fecha_sesion DESC
        """).fetchall()
        db.close()
        return jsonify([format_booking(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bookings_bp.route('/<int:id>')
def get_booking(id):
    try:
        db = get_db()
        booking = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email,
                   s.nombre AS servicio_nombre,
                   p.id AS payment_id,
                   COALESCE(p.monto_bruto, s.precio_base) AS monto_bruto,
                   COALESCE(p.anticipo_pagado, 0) AS anticipo_pagado,
                   COALESCE(p.descuento_aplicado, 0) AS descuento_aplicado,
                   p.motivo_descuento,
                   COALESCE(p.saldo_pendiente, (COALESCE(p.monto_bruto, s.precio_base) - COALESCE(p.descuento_aplicado, 0) - COALESCE(p.anticipo_pagado, 0))) AS saldo_pendiente,
                   COALESCE(p.estado_pago, 'Pendiente') AS estado_pago,
                   p.fecha_ultimo_pago
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.id = ?
        """, (id,)).fetchone()
        if not booking:
            db.close()
            return jsonify({"error": "Booking no encontrado"}), 404
        payments = db.execute(
            "SELECT * FROM payments WHERE booking_id = ?", (id,)
        ).fetchall()
        db.close()
        return jsonify({
            "booking": format_booking(booking),
            "payments": [dict(p) for p in payments]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bookings_bp.route('/', methods=['POST'])
def create_booking():
    try:
        data = request.get_json() or {}
        client_id = data.get('client_id') or data.get('id_cliente')
        service_id = data.get('service_id') or data.get('id_servicio')
        fecha_sesion = data.get('fecha_sesion')

        if not client_id or not service_id or not fecha_sesion:
            return jsonify({"error": "Campos requeridos: cliente, servicio y fecha_sesion"}), 400

        db = get_db()
        cur = db.execute("""
            INSERT INTO bookings (client_id, service_id, fecha_sesion, ubicacion,
                contrato_firmado, autoriza_redes_sociales, estado)
            VALUES (?, ?, ?, ?, ?, ?, 'Agendada')
        """, (
            client_id, service_id, fecha_sesion,
            data.get('ubicacion'),
            1 if data.get('contrato_firmado') else 0,
            1 if data.get('autoriza_redes_sociales') else 0
        ))
        db.commit()
        new_id = cur.lastrowid

        # Crear automáticamente el registro inicial de pago si no existe
        serv = db.execute("SELECT precio_base FROM services WHERE id = ?", (service_id,)).fetchone()
        if serv:
            db.execute("""
                INSERT INTO payments (booking_id, monto_bruto, descuento_aplicado, anticipo_pagado, estado_pago)
                VALUES (?, ?, 0, 0, 'Pendiente')
            """, (new_id, serv['precio_base']))
            db.commit()

        row = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre,
                   COALESCE(p.monto_bruto, s.precio_base) AS monto_bruto,
                   p.saldo_pendiente, p.estado_pago
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.id = ?
        """, (new_id,)).fetchone()
        db.close()
        return jsonify(format_booking(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bookings_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_booking(id):
    try:
        data = request.get_json() or {}
        db = get_db()
        booking = db.execute("SELECT * FROM bookings WHERE id = ?", (id,)).fetchone()
        if not booking:
            db.close()
            return jsonify({"error": "Booking no encontrado"}), 404

        client_id = data.get('client_id') or data.get('id_cliente')
        service_id = data.get('service_id') or data.get('id_servicio')

        db.execute("""
            UPDATE bookings SET
                client_id = COALESCE(?, client_id),
                service_id = COALESCE(?, service_id),
                fecha_sesion = COALESCE(?, fecha_sesion),
                ubicacion = COALESCE(?, ubicacion),
                contrato_firmado = COALESCE(?, contrato_firmado),
                autoriza_redes_sociales = COALESCE(?, autoriza_redes_sociales),
                url_galeria = COALESCE(?, url_galeria)
            WHERE id = ?
        """, (
            client_id, service_id, data.get('fecha_sesion'),
            data.get('ubicacion'), data.get('contrato_firmado'),
            data.get('autoriza_redes_sociales'), data.get('url_galeria'), id
        ))
        db.commit()
        row = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre,
                   COALESCE(p.monto_bruto, s.precio_base) AS monto_bruto,
                   p.saldo_pendiente, p.estado_pago
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.id = ?
        """, (id,)).fetchone()
        db.close()
        return jsonify(format_booking(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bookings_bp.route('/<int:id>/status', methods=['PATCH'])
def change_status(id):
    try:
        data = request.get_json() or {}
        new_status = data.get('estado')
        VALID_STATES = ['Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada', 'Cancelada']
        if new_status not in VALID_STATES:
            return jsonify({"error": f"Estado inválido. Válidos: {VALID_STATES}"}), 400

        db = get_db()
        booking = db.execute("SELECT * FROM bookings WHERE id = ?", (id,)).fetchone()
        if not booking:
            db.close()
            return jsonify({"error": "Booking no encontrado"}), 404

        current = booking['estado']

        # Validar: no puede saltar de Agendada a Entregada
        if current == 'Agendada' and new_status == 'Entregada':
            db.close()
            return jsonify({"error": "No se puede pasar de 'Agendada' directamente a 'Entregada'. Debe pasar por los estados intermedios."}), 400

        # Agendada -> Realizada requiere contrato firmado
        if current == 'Agendada' and new_status == 'Realizada':
            if not booking['contrato_firmado']:
                db.close()
                return jsonify({"error": "Para marcar como 'Realizada', el contrato debe estar firmado."}), 400

        # Entregada: verificar saldo_pendiente = 0
        if new_status == 'Entregada':
            payment = db.execute(
                "SELECT saldo_pendiente FROM payments WHERE booking_id = ?", (id,)
            ).fetchone()
            if payment and payment['saldo_pendiente'] > 0:
                db.close()
                return jsonify({"error": f"No se puede marcar como 'Entregada': hay saldo pendiente de €{payment['saldo_pendiente']:.2f}"}), 400

        # Cancelada requiere razon_cancelacion o motivo_cancelacion
        if new_status == 'Cancelada':
            reason = data.get('razon_cancelacion') or data.get('motivo_cancelacion')
            if not reason:
                db.close()
                return jsonify({"error": "Se requiere el motivo de cancelación para cancelar un booking."}), 400

        db.execute("UPDATE bookings SET estado = ? WHERE id = ?", (new_status, id))
        db.commit()
        row = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre,
                   COALESCE(p.monto_bruto, s.precio_base) AS monto_bruto,
                   p.saldo_pendiente, p.estado_pago
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.id = ?
        """, (id,)).fetchone()
        db.close()
        return jsonify(format_booking(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bookings_bp.route('/<int:id>', methods=['DELETE'])
def delete_booking(id):
    try:
        db = get_db()
        booking = db.execute("SELECT id FROM bookings WHERE id = ?", (id,)).fetchone()
        if not booking:
            db.close()
            return jsonify({"error": "Booking no encontrado"}), 404
        db.execute("DELETE FROM payments WHERE booking_id = ?", (id,))
        db.execute("DELETE FROM bookings WHERE id = ?", (id,))
        db.commit()
        db.close()
        return jsonify({"message": "Booking eliminado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
