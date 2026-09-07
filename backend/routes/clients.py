from flask import Blueprint, jsonify, request
from database import get_db

clients_bp = Blueprint('clients', __name__)

@clients_bp.route('/')
def get_clients():
    try:
        db = get_db()
        rows = db.execute("""
            SELECT c.*, l.descuento_sugerido_pct
            FROM clients c
            LEFT JOIN v_client_loyalty l ON c.id = l.id
        """).fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clients_bp.route('/<int:id>')
def get_client(id):
    try:
        db = get_db()
        client = db.execute("SELECT * FROM clients WHERE id = ?", (id,)).fetchone()
        if not client:
            db.close()
            return jsonify({"error": "Cliente no encontrado"}), 404
        bookings = db.execute("""
            SELECT b.*, s.nombre AS servicio_nombre
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.client_id = ?
            ORDER BY b.fecha_sesion DESC
        """, (id,)).fetchall()
        loyalty = db.execute(
            "SELECT * FROM v_client_loyalty WHERE id = ?", (id,)
        ).fetchone()
        db.close()
        return jsonify({
            "client": dict(client),
            "bookings": [dict(b) for b in bookings],
            "loyalty": dict(loyalty) if loyalty else {}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clients_bp.route('/', methods=['POST'])
def create_client():
    try:
        data = request.get_json()
        if not data or not data.get('nombre'):
            return jsonify({"error": "El campo 'nombre' es obligatorio"}), 400
        db = get_db()
        cur = db.execute("""
            INSERT INTO clients (nombre, telefono, email, instagram,
                fecha_registro, referred_by_client_id,
                fecha_aniversario, fecha_cumpleanos_hijos_o_parto, notas_estilo_preferencias)
            VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?)
        """, (
            data.get('nombre'),
            data.get('telefono'),
            data.get('email'),
            data.get('instagram'),
            data.get('referred_by_client_id'),
            data.get('fecha_aniversario'),
            data.get('fecha_cumpleanos_hijos_o_parto'),
            data.get('notas_estilo_preferencias')
        ))
        db.commit()
        new_id = cur.lastrowid
        row = db.execute("SELECT * FROM clients WHERE id = ?", (new_id,)).fetchone()
        db.close()
        return jsonify(dict(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@clients_bp.route('/<int:id>', methods=['PUT'])
def update_client(id):
    try:
        data = request.get_json()
        db = get_db()
        client = db.execute("SELECT id FROM clients WHERE id = ?", (id,)).fetchone()
        if not client:
            db.close()
            return jsonify({"error": "Cliente no encontrado"}), 404
        db.execute("""
            UPDATE clients SET
                nombre = COALESCE(?, nombre),
                telefono = COALESCE(?, telefono),
                email = COALESCE(?, email),
                instagram = COALESCE(?, instagram),
                referred_by_client_id = COALESCE(?, referred_by_client_id),
                fecha_aniversario = COALESCE(?, fecha_aniversario),
                fecha_cumpleanos_hijos_o_parto = COALESCE(?, fecha_cumpleanos_hijos_o_parto),
                notas_estilo_preferencias = COALESCE(?, notas_estilo_preferencias)
            WHERE id = ?
        """, (
            data.get('nombre'), data.get('telefono'), data.get('email'),
            data.get('instagram'), data.get('referred_by_client_id'),
            data.get('fecha_aniversario'), data.get('fecha_cumpleanos_hijos_o_parto'),
            data.get('notas_estilo_preferencias'), id
        ))
        db.commit()
        row = db.execute("SELECT * FROM clients WHERE id = ?", (id,)).fetchone()
        db.close()
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@clients_bp.route('/<int:id>', methods=['DELETE'])
def delete_client(id):
    try:
        db = get_db()
        client = db.execute("SELECT id FROM clients WHERE id = ?", (id,)).fetchone()
        if not client:
            db.close()
            return jsonify({"error": "Cliente no encontrado"}), 404
        booking_count = db.execute(
            "SELECT COUNT(*) FROM bookings WHERE client_id = ?", (id,)
        ).fetchone()[0]
        if booking_count > 0:
            db.close()
            return jsonify({"error": f"No se puede eliminar: el cliente tiene {booking_count} booking(s) asociado(s)"}), 400
        db.execute("DELETE FROM clients WHERE id = ?", (id,))
        db.commit()
        db.close()
        return jsonify({"message": "Cliente eliminado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
