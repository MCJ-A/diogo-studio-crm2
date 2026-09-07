from flask import Blueprint, jsonify, request
from database import get_db

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/booking/<int:booking_id>')
def get_payment_by_booking(booking_id):
    try:
        db = get_db()
        rows = db.execute(
            "SELECT * FROM payments WHERE booking_id = ?", (booking_id,)
        ).fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@payments_bp.route('/', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()
        if not data or not data.get('booking_id'):
            return jsonify({"error": "Campo requerido: booking_id"}), 400
        if data.get('monto_bruto') is None:
            return jsonify({"error": "Campo requerido: monto_bruto"}), 400
        db = get_db()
        # Verificar que el booking existe
        booking = db.execute(
            "SELECT id FROM bookings WHERE id = ?", (data['booking_id'],)
        ).fetchone()
        if not booking:
            db.close()
            return jsonify({"error": "Booking no encontrado"}), 404
        # saldo_pendiente es columna generada, NO se inserta
        cur = db.execute("""
            INSERT INTO payments (booking_id, monto_bruto, descuento_aplicado,
                motivo_descuento, anticipo_pagado, estado_pago, fecha_ultimo_pago)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data['booking_id'],
            data['monto_bruto'],
            data.get('descuento_aplicado', 0),
            data.get('motivo_descuento'),
            data.get('anticipo_pagado', 0),
            data.get('estado_pago', 'Pendiente'),
            data.get('fecha_ultimo_pago')
        ))
        db.commit()
        row = db.execute(
            "SELECT * FROM payments WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        db.close()
        return jsonify(dict(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@payments_bp.route('/<int:id>', methods=['PUT'])
def update_payment(id):
    try:
        data = request.get_json()
        db = get_db()
        payment = db.execute(
            "SELECT id FROM payments WHERE id = ?", (id,)
        ).fetchone()
        if not payment:
            db.close()
            return jsonify({"error": "Pago no encontrado"}), 404
        # saldo_pendiente es generada, no se actualiza manualmente
        db.execute("""
            UPDATE payments SET
                monto_bruto = COALESCE(?, monto_bruto),
                descuento_aplicado = COALESCE(?, descuento_aplicado),
                motivo_descuento = COALESCE(?, motivo_descuento),
                anticipo_pagado = COALESCE(?, anticipo_pagado),
                estado_pago = COALESCE(?, estado_pago),
                fecha_ultimo_pago = COALESCE(?, fecha_ultimo_pago)
            WHERE id = ?
        """, (
            data.get('monto_bruto'), data.get('descuento_aplicado'),
            data.get('motivo_descuento'), data.get('anticipo_pagado'),
            data.get('estado_pago'), data.get('fecha_ultimo_pago'), id
        ))
        db.commit()
        row = db.execute("SELECT * FROM payments WHERE id = ?", (id,)).fetchone()
        db.close()
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 400
