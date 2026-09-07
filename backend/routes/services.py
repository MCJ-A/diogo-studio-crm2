from flask import Blueprint, jsonify, request
from database import get_db

services_bp = Blueprint('services', __name__)

@services_bp.route('/')
def get_services():
    try:
        db = get_db()
        rows = db.execute("SELECT * FROM services ORDER BY nombre").fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
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
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@services_bp.route('/', methods=['POST'])
def create_service():
    try:
        data = request.get_json()
        if not data or not data.get('nombre') or data.get('precio_base') is None:
            return jsonify({"error": "Campos requeridos: nombre, precio_base"}), 400
        db = get_db()
        cur = db.execute("""
            INSERT INTO services (nombre, precio_base, entregables_detalle, activo)
            VALUES (?, ?, ?, ?)
        """, (
            data['nombre'],
            data['precio_base'],
            data.get('entregables_detalle'),
            1 if data.get('activo', True) else 0
        ))
        db.commit()
        row = db.execute("SELECT * FROM services WHERE id = ?", (cur.lastrowid,)).fetchone()
        db.close()
        return jsonify(dict(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@services_bp.route('/<int:id>', methods=['PUT'])
def update_service(id):
    try:
        data = request.get_json()
        db = get_db()
        svc = db.execute("SELECT id FROM services WHERE id = ?", (id,)).fetchone()
        if not svc:
            db.close()
            return jsonify({"error": "Servicio no encontrado"}), 404
        db.execute("""
            UPDATE services SET
                nombre = COALESCE(?, nombre),
                precio_base = COALESCE(?, precio_base),
                entregables_detalle = COALESCE(?, entregables_detalle),
                activo = COALESCE(?, activo)
            WHERE id = ?
        """, (
            data.get('nombre'), data.get('precio_base'),
            data.get('entregables_detalle'), data.get('activo'), id
        ))
        db.commit()
        row = db.execute("SELECT * FROM services WHERE id = ?", (id,)).fetchone()
        db.close()
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@services_bp.route('/<int:id>/toggle', methods=['PATCH'])
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
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@services_bp.route('/<int:id>', methods=['DELETE'])
def delete_service(id):
    try:
        db = get_db()
        svc = db.execute("SELECT id FROM services WHERE id = ?", (id,)).fetchone()
        if not svc:
            db.close()
            return jsonify({"error": "Servicio no encontrado"}), 404
        db.execute("DELETE FROM services WHERE id = ?", (id,))
        db.commit()
        db.close()
        return jsonify({"message": "Servicio eliminado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
