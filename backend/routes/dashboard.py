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

from datetime import date, datetime

@dashboard_bp.route('/opportunities')
def get_opportunities():
    try:
        db = get_db()
        today = date.today()

        clients = db.execute("""
            SELECT c.id, c.nombre, c.email, c.telefono, c.fecha_registro,
                   c.fecha_aniversario, c.fecha_cumpleanos_hijos_o_parto,
                   l.descuento_sugerido_pct,
                   (SELECT MAX(b.fecha_sesion) FROM bookings b WHERE b.client_id = c.id AND b.estado IN ('Realizada','Entregada')) AS ultima_sesion
            FROM clients c
            LEFT JOIN v_client_loyalty l ON c.id = l.id
        """).fetchall()

        opps = []
        for row in clients:
            c = dict(row)
            cid = c['id']
            name = c['nombre']
            first_name = name.split()[0] if name else 'cliente'
            descuento = c['descuento_sugerido_pct'] or 10

            # 1. Checar aniversario
            if c.get('fecha_aniversario'):
                try:
                    dt = datetime.strptime(c['fecha_aniversario'], '%Y-%m-%d').date()
                    ty = date(today.year, dt.month, dt.day)
                    nxt = ty if ty >= today else date(today.year + 1, dt.month, dt.day)
                    days = (nxt - today).days
                    if 0 <= days <= 35:
                        opps.append({
                            "id": cid,
                            "nombre": name,
                            "telefono": c.get('telefono'),
                            "email": c.get('email'),
                            "motivo_recontacto": f"Aniversario en {days} días ({nxt.strftime('%d/%m')})",
                            "fecha_opcion_recontacto": nxt.strftime('%Y-%m-%d'),
                            "dias_restantes": days,
                            "tipo": "aniversario",
                            "whatsapp_pitch": f"¡Hola {first_name}! En Diogo Studio recordamos que pronto celebran su aniversario de pareja/boda. Nos encantaría capturar este nuevo capítulo con una sesión especial. Cuentas con un {descuento}% de descuento exclusivo. ¿Te gustaría coordinar fecha?"
                        })
                except Exception:
                    pass

            # 2. Checar cumpleaños / parto
            if c.get('fecha_cumpleanos_hijos_o_parto'):
                try:
                    dt = datetime.strptime(c['fecha_cumpleanos_hijos_o_parto'], '%Y-%m-%d').date()
                    ty = date(today.year, dt.month, dt.day)
                    nxt = ty if ty >= today else date(today.year + 1, dt.month, dt.day)
                    days = (nxt - today).days
                    if 0 <= days <= 35:
                        opps.append({
                            "id": cid,
                            "nombre": name,
                            "telefono": c.get('telefono'),
                            "email": c.get('email'),
                            "motivo_recontacto": f"Cumpleaños / Hito en {days} días ({nxt.strftime('%d/%m')})",
                            "fecha_opcion_recontacto": nxt.strftime('%Y-%m-%d'),
                            "dias_restantes": days,
                            "tipo": "cumpleanos",
                            "whatsapp_pitch": f"¡Hola {first_name}! Esperamos que tú y tu familia estén muy bien. Vimos que se acerca el cumpleaños / fecha especial del peque y nos encantaría inmortalizarlo en una hermosa sesión de fotos. Tienes un {descuento}% de descuento. ¿Te gustaría apartar fecha?"
                        })
                except Exception:
                    pass

            # 3. Checar inactividad (> 180 días)
            ref_date_str = c.get('ultima_sesion') or c.get('fecha_registro')
            if ref_date_str:
                try:
                    ref_d = datetime.strptime(ref_date_str, '%Y-%m-%d').date()
                    diff_days = (today - ref_d).days
                    if diff_days > 180:
                        opps.append({
                            "id": cid,
                            "nombre": name,
                            "telefono": c.get('telefono'),
                            "email": c.get('email'),
                            "motivo_recontacto": f"Inactivo ({diff_days} días sin sesión)",
                            "fecha_opcion_recontacto": ref_date_str,
                            "dias_restantes": diff_days,
                            "tipo": "inactividad",
                            "whatsapp_pitch": f"¡Hola {first_name}! Te saludamos del equipo de Diogo Studio. Hace tiempo que no actualizamos tus fotos y tenemos nuevas propuestas y paquetes de temporada. Nos encantaría verte de vuelta con un {descuento}% de descuento de bienvenida. ¿Agendamos?"
                        })
                except Exception:
                    pass

        db.close()
        # Ordenar: fechas más cercanas primero
        opps.sort(key=lambda x: x.get('dias_restantes', 999))
        return jsonify(opps)
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
