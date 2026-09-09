from flask import Blueprint, jsonify, request
from database import get_db
from datetime import date, datetime
from services.email_service import get_email_status, render_email_html, send_campaign_batch, send_single_email

newsletter_bp = Blueprint('newsletter', __name__)

@newsletter_bp.route('/status')
def get_status():
    try:
        return jsonify(get_email_status())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@newsletter_bp.route('/audiences')
def get_audiences():
    try:
        db = get_db()
        today = date.today()

        # 1. Todos los clientes con email
        all_rows = db.execute("SELECT id, nombre, email, telefono FROM clients WHERE email IS NOT NULL AND email LIKE '%@%'").fetchall()
        all_clients = [dict(r) for r in all_rows]

        # 2. Clientes VIP (Oro y Plata con descuento_sugerido_pct >= 15)
        vip_rows = db.execute("""
            SELECT c.id, c.nombre, c.email, c.telefono, l.descuento_sugerido_pct
            FROM clients c
            JOIN v_client_loyalty l ON c.id = l.id
            WHERE c.email IS NOT NULL AND c.email LIKE '%@%' AND l.descuento_sugerido_pct >= 15
        """).fetchall()
        vip_clients = [dict(r) for r in vip_rows]

        # 3. Clientes con fechas especiales próximas (aniversario o cumpleaños en próximos 30 días)
        special_clients = []
        for c in all_clients:
            full_c = db.execute("SELECT fecha_aniversario, fecha_cumpleanos_hijos_o_parto FROM clients WHERE id = ?", (c['id'],)).fetchone()
            if not full_c:
                continue
            has_upcoming = False
            for fld in ['fecha_aniversario', 'fecha_cumpleanos_hijos_o_parto']:
                val = full_c[fld]
                if val:
                    try:
                        d = datetime.strptime(val, '%Y-%m-%d').date()
                        this_yr = date(today.year, d.month, d.day)
                        if this_yr < today:
                            next_dt = date(today.year + 1, d.month, d.day)
                        else:
                            next_dt = this_yr
                        if 0 <= (next_dt - today).days <= 30:
                            has_upcoming = True
                            break
                    except Exception:
                        pass
            if has_upcoming:
                special_clients.append(c)

        # 4. Inactivos (> 180 días sin sesiones o registrados hace más de 180 días)
        inactive_rows = db.execute("""
            SELECT c.id, c.nombre, c.email, c.telefono
            FROM clients c
            WHERE c.email IS NOT NULL AND c.email LIKE '%@%'
              AND (julianday('now') - julianday(c.fecha_registro) > 180)
              AND c.id NOT IN (
                  SELECT client_id FROM bookings WHERE fecha_sesion >= date('now', '-180 days')
              )
        """).fetchall()
        inactive_clients = [dict(r) for r in inactive_rows]

        db.close()
        return jsonify({
            "all": {"count": len(all_clients), "label": "Todos los clientes", "clients": all_clients},
            "vip": {"count": len(vip_clients), "label": "Clientes VIP (Oro y Plata)", "clients": vip_clients},
            "special_dates": {"count": len(special_clients), "label": "Fechas especiales este mes", "clients": special_clients},
            "inactive": {"count": len(inactive_clients), "label": "Clientes inactivos (>6 meses)", "clients": inactive_clients}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@newsletter_bp.route('/preview', methods=['POST'])
def preview_email():
    try:
        data = request.get_json() or {}
        titulo = data.get('titulo', 'Promoción Exclusiva en Diogo Studio')
        contenido = data.get('contenido', 'Nos encanta capturar tus mejores momentos.')
        boton_texto = data.get('boton_texto', 'Reservar Mi Sesión')
        boton_url = data.get('boton_url', 'https://wa.me/')
        nombre_ejemplo = data.get('nombre_ejemplo', 'María González')

        html = render_email_html(
            titulo=titulo,
            contenido_parrafos=contenido,
            boton_texto=boton_texto,
            boton_url=boton_url,
            nombre_cliente=nombre_ejemplo
        )
        return jsonify({"html": html})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@newsletter_bp.route('/send', methods=['POST'])
def send_campaign():
    try:
        data = request.get_json() or {}
        titulo = data.get('titulo', '').strip()
        asunto = data.get('asunto', '').strip()
        contenido = data.get('contenido', '').strip()
        boton_texto = data.get('boton_texto', 'Reservar Mi Sesión').strip()
        boton_url = data.get('boton_url', 'https://wa.me/').strip()
        audience_key = data.get('audience', 'all')
        test_email = data.get('test_email', '').strip()

        if not titulo or not asunto or not contenido:
            return jsonify({"error": "Campos requeridos: titulo, asunto, contenido"}), 400

        db = get_db()

        # Si es envío de prueba a un solo correo
        if test_email:
            html = render_email_html(titulo, contenido, boton_texto, boton_url, "Fotógrafo / Admin")
            res = send_single_email(test_email, f"[TEST] {asunto}", html, "Admin")
            db.close()
            return jsonify({
                "test": True,
                "success": res.get('success', False),
                "message": f"Correo de prueba enviado a {test_email}",
                "result": res
            })

        # Obtener destinatarios de la audiencia seleccionada
        recipients = []
        if audience_key == 'vip':
            rows = db.execute("""
                SELECT c.id, c.nombre, c.email FROM clients c
                JOIN v_client_loyalty l ON c.id = l.id
                WHERE c.email IS NOT NULL AND c.email LIKE '%@%' AND l.descuento_sugerido_pct >= 15
            """).fetchall()
            recipients = [dict(r) for r in rows]
        elif audience_key == 'inactive':
            rows = db.execute("""
                SELECT c.id, c.nombre, c.email FROM clients c
                WHERE c.email IS NOT NULL AND c.email LIKE '%@%'
                  AND (julianday('now') - julianday(c.fecha_registro) > 180)
                  AND c.id NOT IN (
                      SELECT client_id FROM bookings WHERE fecha_sesion >= date('now', '-180 days')
                  )
            """).fetchall()
            recipients = [dict(r) for r in rows]
        elif audience_key == 'special_dates':
            all_r = db.execute("SELECT id, nombre, email, fecha_aniversario, fecha_cumpleanos_hijos_o_parto FROM clients WHERE email IS NOT NULL AND email LIKE '%@%'").fetchall()
            today = date.today()
            for r in all_r:
                has_u = False
                for fld in ['fecha_aniversario', 'fecha_cumpleanos_hijos_o_parto']:
                    val = r[fld]
                    if val:
                        try:
                            d = datetime.strptime(val, '%Y-%m-%d').date()
                            this_yr = date(today.year, d.month, d.day)
                            next_dt = date(today.year + 1, d.month, d.day) if this_yr < today else this_yr
                            if 0 <= (next_dt - today).days <= 30:
                                has_u = True
                                break
                        except Exception:
                            pass
                if has_u:
                    recipients.append({'id': r['id'], 'nombre': r['nombre'], 'email': r['email']})
        else: # 'all'
            rows = db.execute("SELECT id, nombre, email FROM clients WHERE email IS NOT NULL AND email LIKE '%@%'").fetchall()
            recipients = [dict(r) for r in rows]

        if not recipients:
            db.close()
            return jsonify({"error": "No se encontraron clientes con email válido en la audiencia seleccionada"}), 400

        # Renderizar plantilla base
        sample_html = render_email_html(titulo, contenido, boton_texto, boton_url)

        # Enviar batch
        batch_result = send_campaign_batch(recipients, asunto, sample_html)

        # Guardar en base de datos
        estado = 'simulado' if batch_result.get('simulated') else ('enviado' if batch_result.get('sent', 0) > 0 else 'error')
        cur = db.execute("""
            INSERT INTO newsletter_campaigns (titulo, asunto, audiencia, contenido_html, destinatarios_count, estado, proveedor, notas_resultado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            titulo,
            asunto,
            audience_key,
            sample_html,
            batch_result.get('sent', 0),
            estado,
            batch_result.get('provider', 'sandbox'),
            f"Enviados: {batch_result.get('sent')}, Fallidos: {batch_result.get('failed')}"
        ))
        db.commit()
        campaign_id = cur.lastrowid
        db.close()

        return jsonify({
            "success": True,
            "campaign_id": campaign_id,
            "audiencia": audience_key,
            "total_destinatarios": batch_result.get('total'),
            "enviados": batch_result.get('sent'),
            "fallidos": batch_result.get('failed'),
            "simulated": batch_result.get('simulated'),
            "provider": batch_result.get('provider'),
            "message": f"Campaña '{titulo}' procesada con éxito ({batch_result.get('sent')} destinatarios)"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@newsletter_bp.route('/campaigns')
def get_campaigns():
    try:
        db = get_db()
        rows = db.execute("SELECT * FROM newsletter_campaigns ORDER BY fecha_envio DESC").fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

