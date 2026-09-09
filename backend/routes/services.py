from flask import Blueprint, jsonify, request
from database import get_db

services_bp = Blueprint('services', __name__)

def format_service(row):
    if not row:
        return None
    d = dict(row)
    # Ensure backwards and forwards compatibility for field names
    d['id_servicio'] = d.get('id')
    d['entregables'] = d.get('entregables_detalle')
    return d

@services_bp.route('/')
def get_services():
    try:
        db = get_db()
        rows = db.execute("SELECT * FROM services ORDER BY nombre").fetchall()
        db.close()
        return jsonify([format_service(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@services_bp.route('/<int:id>')
def get_service(id):
    try:
        db = get_db()
        row = db.execute("SELECT * FROM services WHERE id = ?", (id,)).fetchone()
        db.close()
        if not row:
            return jsonify({"error": "Servicio no encontrado"}), 404
        return jsonify(format_service(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@services_bp.route('/', methods=['POST'])
def create_service():
    try:
        data = request.get_json()
        if not data or not data.get('nombre') or data.get('precio_base') is None:
            return jsonify({"error": "Campos requeridos: nombre, precio_base"}), 400
        
        entregables = data.get('entregables_detalle') if data.get('entregables_detalle') is not None else data.get('entregables')
        activo = 1 if data.get('activo', True) else 0

        db = get_db()
        cur = db.execute("""
            INSERT INTO services (nombre, precio_base, entregables_detalle, activo)
            VALUES (?, ?, ?, ?)
        """, (
            data['nombre'],
            float(data['precio_base']),
            entregables,
            activo
        ))
        db.commit()
        row = db.execute("SELECT * FROM services WHERE id = ?", (cur.lastrowid,)).fetchone()
        db.close()
        return jsonify(format_service(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@services_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_service(id):
    try:
        data = request.get_json() or {}
        db = get_db()
        svc = db.execute("SELECT id, nombre, precio_base, entregables_detalle, activo FROM services WHERE id = ?", (id,)).fetchone()
        if not svc:
            db.close()
            return jsonify({"error": "Servicio no encontrado"}), 404
        
        nombre = data['nombre'] if 'nombre' in data else svc['nombre']
        precio_base = float(data['precio_base']) if 'precio_base' in data and data['precio_base'] is not None else svc['precio_base']
        
        if 'entregables_detalle' in data:
            entregables = data['entregables_detalle']
        elif 'entregables' in data:
            entregables = data['entregables']
        else:
            entregables = svc['entregables_detalle']
            
        if 'activo' in data:
            activo = 1 if data['activo'] else 0
        else:
            activo = svc['activo']

        db.execute("""
            UPDATE services SET
                nombre = ?,
                precio_base = ?,
                entregables_detalle = ?,
                activo = ?
            WHERE id = ?
        """, (nombre, precio_base, entregables, activo, id))
        db.commit()
        row = db.execute("SELECT * FROM services WHERE id = ?", (id,)).fetchone()
        db.close()
        return jsonify(format_service(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@services_bp.route('/<int:id>/toggle', methods=['PATCH', 'POST'])
def toggle_service(id):
    try:
        db = get_db()
        svc = db.execute("SELECT id, activo FROM services WHERE id = ?", (id,)).fetchone()
        if not svc:
            db.close()
            return jsonify({"error": "Servicio no encontrado"}), 404
        new_activo = 0 if svc['activo'] else 1
        db.execute("UPDATE services SET activo = ? WHERE id = ?", (new_activo, id))
        db.commit()
        row = db.execute("SELECT * FROM services WHERE id = ?", (id,)).fetchone()
        db.close()
        return jsonify(format_service(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@services_bp.route('/<int:id>', methods=['DELETE'])
def delete_service(id):
    try:
        db = get_db()
        svc = db.execute("SELECT id, nombre FROM services WHERE id = ?", (id,)).fetchone()
        if not svc:
            db.close()
            return jsonify({"error": "Servicio no encontrado"}), 404

        # Verificar si hay reservas usando este servicio
        booking_count = db.execute("SELECT COUNT(*) FROM bookings WHERE service_id = ?", (id,)).fetchone()[0]
        
        deactivate_requested = request.args.get('deactivate', '').lower() in ['true', '1', 'yes']

        if booking_count > 0:
            if deactivate_requested:
                db.execute("UPDATE services SET activo = 0 WHERE id = ?", (id,))
                db.commit()
                db.close()
                return jsonify({
                    "message": f"El servicio '{svc['nombre']}' tiene {booking_count} reserva(s) en el historial. Se ha desactivado exitosamente para preservar los datos históricos.",
                    "deactivated": True,
                    "booking_count": booking_count
                }), 200
            
            db.close()
            return jsonify({
                "error": f"No se puede eliminar permanentemente el servicio '{svc['nombre']}' porque tiene {booking_count} reserva(s) registrada(s). Puedes desactivarlo para que no aparezca en nuevas reservas.",
                "has_bookings": True,
                "booking_count": booking_count
            }), 409

        db.execute("DELETE FROM services WHERE id = ?", (id,))
        db.commit()
        db.close()
        return jsonify({
            "message": f"Servicio '{svc['nombre']}' eliminado correctamente.",
            "deleted": True
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
