from flask import Blueprint, jsonify
from database import get_db

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/alerts')
def get_alerts():
    try:
        db = get_db()
        rows = db.execute(
            "SELECT * FROM v_alertas_operativas WHERE alerta IS NOT NULL"
        ).fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/opportunities')
def get_opportunities():
    try:
        db = get_db()
        rows = db.execute("SELECT * FROM v_oportunidades_recontacto").fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/loyalty')
def get_loyalty():
    try:
        db = get_db()
        rows = db.execute(
            "SELECT * FROM v_client_loyalty ORDER BY total_gastado DESC"
        ).fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/kpis')
def get_kpis():
    try:
        db = get_db()

        # bookings_today: primero sesiones hoy, si 0 usa Agendadas
        today_count = db.execute(
            "SELECT COUNT(*) FROM bookings WHERE fecha_sesion = date('now')"
        ).fetchone()[0]
        if today_count == 0:
            today_count = db.execute(
                "SELECT COUNT(*) FROM bookings WHERE estado = 'Agendada'"
            ).fetchone()[0]

        # weekly_revenue: anticipos últimos 7 días; si NULL/0 suma todos los completados
        weekly = db.execute(
            "SELECT SUM(anticipo_pagado) FROM payments WHERE fecha_ultimo_pago >= date('now','-7 days')"
        ).fetchone()[0]
        if not weekly:
            weekly = db.execute(
                "SELECT SUM(anticipo_pagado) FROM payments WHERE estado_pago = 'Completado'"
            ).fetchone()[0] or 0

        # active_clients
        active_clients = db.execute(
            "SELECT COUNT(DISTINCT client_id) FROM bookings WHERE estado != 'Cancelada'"
        ).fetchone()[0]

        # pending_alerts
        pending_alerts = db.execute(
            "SELECT COUNT(*) FROM v_alertas_operativas"
        ).fetchone()[0]

        db.close()
        return jsonify({
            "bookings_today": today_count,
            "weekly_revenue": weekly,
            "active_clients": active_clients,
            "pending_alerts": pending_alerts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
