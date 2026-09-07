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

@bookings_bp.route('/')
def get_bookings():
    try:
        db = get_db()
        rows = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            ORDER BY b.fecha_sesion DESC
        """).fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bookings_bp.route('/<int:id>')
def get_booking(id):
    try:
        db = get_db()
        booking = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
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
            "booking": dict(booking),
            "payments": [dict(p) for p in payments]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bookings_bp.route('/', methods=['POST'])
def create_booking():
    try:
        data = request.get_json()
        required = ['client_id', 'service_id', 'fecha_sesion']
        for field in required:
            if not data or not data.get(field):
                return jsonify({"error": f"Campo requerido: {field}"}), 400
        db = get_db()
        cur = db.execute("""
            INSERT INTO bookings (client_id, service_id, fecha_sesion, ubicacion,
                contrato_firmado, autoriza_redes_sociales, estado)
            VALUES (?, ?, ?, ?, ?, ?, 'Agendada')
        """, (
            data['client_id'], data['service_id'], data['fecha_sesion'],
            data.get('ubicacion'),
            1 if data.get('contrato_firmado') else 0,
            1 if data.get('autoriza_redes_sociales') else 0
        ))
        db.commit()
        new_id = cur.lastrowid
        row = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            WHERE b.id = ?
        """, (new_id,)).fetchone()
        db.close()
        return jsonify(dict(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bookings_bp.route('/<int:id>', methods=['PUT'])
def update_booking(id):
    try:
        data = request.get_json()
        db = get_db()
        booking = db.execute("SELECT * FROM bookings WHERE id = ?", (id,)).fetchone()
        if not booking:
            db.close()
            return jsonify({"error": "Booking no encontrado"}), 404
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
            data.get('client_id'), data.get('service_id'), data.get('fecha_sesion'),
            data.get('ubicacion'), data.get('contrato_firmado'),
            data.get('autoriza_redes_sociales'), data.get('url_galeria'), id
        ))
        db.commit()
        row = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre
            FROM bookings b JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id WHERE b.id = ?
        """, (id,)).fetchone()
        db.close()
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bookings_bp.route('/<int:id>/status', methods=['PATCH'])
def change_status(id):
    try:
        data = request.get_json()
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
                return jsonify({"error": f"No se puede marcar como 'Entregada': hay saldo pendiente de ${payment['saldo_pendiente']:.2f}"}), 400

        # Cancelada requiere razon_cancelacion
        if new_status == 'Cancelada':
            if not data.get('razon_cancelacion'):
                db.close()
                return jsonify({"error": "Se requiere el campo 'razon_cancelacion' para cancelar un booking."}), 400

        db.execute("UPDATE bookings SET estado = ? WHERE id = ?", (new_status, id))
        db.commit()
        row = db.execute("""
            SELECT b.*, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre
            FROM bookings b JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id WHERE b.id = ?
        """, (id,)).fetchone()
        db.close()
        return jsonify(dict(row))
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
