from flask import Blueprint, jsonify, request
from database import get_db
from datetime import datetime, date

clients_bp = Blueprint('clients', __name__)

def calculate_client_events_and_promotions(client, bookings, loyalty):
    today = date.today()
    events = []
    
    # 1. Aniversario
    if client.get('fecha_aniversario'):
        try:
            aniv_date = datetime.strptime(client['fecha_aniversario'], '%Y-%m-%d').date()
            aniv_this_year = date(today.year, aniv_date.month, aniv_date.day)
            aniv_next = aniv_this_year if aniv_this_year >= today else date(today.year + 1, aniv_date.month, aniv_date.day)
            diff = (aniv_next - today).days
            events.append({
                "tipo": "aniversario",
                "titulo": "Aniversario de Pareja / Boda",
                "fecha_original": client['fecha_aniversario'],
                "proxima_fecha": aniv_next.strftime('%Y-%m-%d'),
                "dias_restantes": diff,
                "urgente": diff <= 30
            })
        except Exception:
            pass

    # 2. Cumpleaños hijos o parto
    if client.get('fecha_cumpleanos_hijos_o_parto'):
        try:
            bday_date = datetime.strptime(client['fecha_cumpleanos_hijos_o_parto'], '%Y-%m-%d').date()
            bday_this_year = date(today.year, bday_date.month, bday_date.day)
            bday_next = bday_this_year if bday_this_year >= today else date(today.year + 1, bday_date.month, bday_date.day)
            diff = (bday_next - today).days
            events.append({
                "tipo": "cumpleanos_parto",
                "titulo": "Cumpleaños / Hito Infantil",
                "fecha_original": client['fecha_cumpleanos_hijos_o_parto'],
                "proxima_fecha": bday_next.strftime('%Y-%m-%d'),
                "dias_restantes": diff,
                "urgente": diff <= 30
            })
        except Exception:
            pass

    # 3. Motor de promociones de ciclo de vida del cliente
    descuento_pct = (loyalty.get('descuento_sugerido_pct') or 0) if loyalty else 0
    tier = "Oro" if descuento_pct >= 20 else ("Plata" if descuento_pct >= 15 else "Bronce")
    
    # Evaluar última sesión realizada/entregada
    last_booking = None
    for b in bookings:
        if b.get('estado') in ['Realizada', 'Entregada']:
            last_booking = b
            break
    
    servicio_anterior = (last_booking.get('servicio_nombre') or '').lower() if last_booking else ''
    nombre_cliente = client.get('nombre', 'estimado/a cliente')
    primer_nombre = nombre_cliente.split()[0] if nombre_cliente else 'cliente'

    # Reglas fotográficas por ciclo de vida
    if 'maternidad' in servicio_anterior or 'embarazo' in servicio_anterior:
        sugerencia = "Sesión Newborn (Recién Nacido)"
        motivo = "Etapa posterior a Maternidad (primeros 15-30 días del bebé)"
        precio_base = 2500.0
        pitch = f"¡Hola {primer_nombre}! En Diogo Studio esperamos que la llegada del nuevo integrante haya llenado de felicidad a la familia. Recordamos tu hermosa sesión de Maternidad y nos encantaría capturar sus primeros días en una tierna Sesión Newborn. Por ser cliente VIP {tier}, cuentas con {descuento_pct}% de descuento de cortesía. ¿Te gustaría agendar una fecha tentativa?"
    elif 'boda' in servicio_anterior or 'matrimon' in servicio_anterior:
        sugerencia = "Sesión de 1er Aniversario de Bodas"
        motivo = "Celebración del primer aniversario de casados"
        precio_base = 2500.0
        pitch = f"¡Hola {primer_nombre}! Recordamos con mucho cariño la cobertura de su boda. Nos encantaría acompañarlos en una sesión al atardecer para conmemorar su aniversario. Además, como cliente {tier} tienen un {descuento_pct}% de descuento exclusivo. ¿Les gustaría ver locaciones disponibles?"
    elif 'familiar' in servicio_anterior:
        sugerencia = "Mini-Sesión de Temporada / Retrato Anual"
        motivo = "Actualización anual del álbum familiar de recuerdos"
        precio_base = 1800.0
        pitch = f"¡Hola {primer_nombre}! ¿Cómo están en casa? Ha pasado un tiempo desde su última sesión familiar y los recuerdos no se detienen. Estamos abriendo agenda para nuestras mini-sesiones de temporada. Con tu estatus {tier} tienes un {descuento_pct}% de descuento. ¿Te gustaría reservar su espacio familiar?"
    elif 'individual' in servicio_anterior or 'retrato' in servicio_anterior or 'branding' in servicio_anterior:
        sugerencia = "Renovación de Marca Personal / Retrato Pro"
        motivo = "Actualización de imagen profesional y redes"
        precio_base = 1500.0
        pitch = f"¡Hola {primer_nombre}! Esperamos que tus proyectos marchen genial. Sabemos lo importante que es tener fotografías actualizadas y de alto impacto. Tenemos fechas abiertas para retrato profesional con tu {descuento_pct}% de descuento {tier}. ¿Te gustaría apartar tu sesión?"
    else:
        sugerencia = "Sesión Familiar & Retrato de Temporada"
        motivo = "Fidelización de cliente y nuevos recuerdos"
        precio_base = 1800.0
        pitch = f"¡Hola {primer_nombre}! Te saludamos de Diogo Studio. Queremos agradecerte por formar parte de nuestra comunidad y ofrecerte un {descuento_pct if descuento_pct > 0 else 10}% de descuento exclusivo en tu próxima sesión fotográfica. ¿Qué tipo de sesión te gustaría realizar próximamente?"

    precio_final = round(precio_base * (1 - (descuento_pct / 100.0)), 2)

    promo = {
        "sugerencia_servicio": sugerencia,
        "motivo": motivo,
        "descuento_pct": descuento_pct,
        "tier": tier,
        "precio_base": precio_base,
        "precio_con_descuento": precio_final,
        "whatsapp_pitch": pitch
    }

    return events, promo

@clients_bp.route('/')
def get_clients():
    try:
        db = get_db()
        rows = db.execute("""
            SELECT c.*, 
                   ref.nombre AS referred_by_name,
                   l.descuento_sugerido_pct
            FROM clients c
            LEFT JOIN clients ref ON c.referred_by_client_id = ref.id
            LEFT JOIN v_client_loyalty l ON c.id = l.id
            ORDER BY c.nombre ASC
        """).fetchall()
        db.close()
        
        result = []
        today = date.today()
        for r in rows:
            d = dict(r)
            d['id_cliente'] = d.get('id')
            
            # Detectar si tiene evento próximo en los siguientes 30 días
            proximo = None
            for fld, lbl in [('fecha_aniversario', 'Aniversario'), ('fecha_cumpleanos_hijos_o_parto', 'Cumpleaños/Parto')]:
                val = d.get(fld)
                if val:
                    try:
                        dt = datetime.strptime(val, '%Y-%m-%d').date()
                        ty = date(today.year, dt.month, dt.day)
                        nxt = ty if ty >= today else date(today.year + 1, dt.month, dt.day)
                        days = (nxt - today).days
                        if 0 <= days <= 30:
                            proximo = {"tipo": lbl, "dias": days, "fecha": nxt.strftime('%Y-%m-%d')}
                            break
                    except Exception:
                        pass
            d['proximo_evento'] = proximo
            result.append(d)

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clients_bp.route('/<int:id>')
def get_client(id):
    try:
        db = get_db()
        client_row = db.execute("""
            SELECT c.*, ref.nombre AS referred_by_name
            FROM clients c
            LEFT JOIN clients ref ON c.referred_by_client_id = ref.id
            WHERE c.id = ?
        """, (id,)).fetchone()
        
        if not client_row:
            db.close()
            return jsonify({"error": "Cliente no encontrado"}), 404

        client = dict(client_row)
        client['id_cliente'] = client.get('id')

        bookings_rows = db.execute("""
            SELECT b.*, s.nombre AS servicio_nombre
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.client_id = ?
            ORDER BY b.fecha_sesion DESC
        """, (id,)).fetchall()
        bookings = [dict(b) for b in bookings_rows]

        loyalty_row = db.execute("SELECT * FROM v_client_loyalty WHERE id = ?", (id,)).fetchone()
        loyalty = dict(loyalty_row) if loyalty_row else {}

        # Lista de posibles referidores (otros clientes)
        other_clients = db.execute("SELECT id, nombre FROM clients WHERE id != ? ORDER BY nombre ASC", (id,)).fetchall()
        referrers = [{"id": r['id'], "nombre": r['nombre']} for r in other_clients]

        db.close()

        events, recommended_promo = calculate_client_events_and_promotions(client, bookings, loyalty)

        return jsonify({
            "client": client,
            "bookings": bookings,
            "loyalty": loyalty,
            "events": events,
            "recommended_promo": recommended_promo,
            "referrers": referrers
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clients_bp.route('/', methods=['POST'])
def create_client():
    try:
        data = request.get_json()
        if not data or not data.get('nombre'):
            return jsonify({"error": "El campo 'nombre' es obligatorio"}), 400

        def clean_val(val):
            if val is None:
                return None
            s = str(val).strip()
            return s if s != '' else None

        nombre = data.get('nombre', '').strip()
        telefono = clean_val(data.get('telefono'))
        email = clean_val(data.get('email'))
        instagram = clean_val(data.get('instagram'))
        referred_by = clean_val(data.get('referred_by_client_id'))
        if referred_by is not None:
            try:
                referred_by = int(referred_by)
            except Exception:
                referred_by = None

        fecha_aniversario = clean_val(data.get('fecha_aniversario'))
        fecha_cumpleanos = clean_val(data.get('fecha_cumpleanos_hijos_o_parto'))
        notas = clean_val(data.get('notas_estilo_preferencias'))

        db = get_db()
        cur = db.execute("""
            INSERT INTO clients (nombre, telefono, email, instagram,
                fecha_registro, referred_by_client_id,
                fecha_aniversario, fecha_cumpleanos_hijos_o_parto, notas_estilo_preferencias)
            VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?)
        """, (
            nombre, telefono, email, instagram,
            referred_by, fecha_aniversario, fecha_cumpleanos, notas
        ))
        db.commit()
        new_id = cur.lastrowid
        row = db.execute("SELECT * FROM clients WHERE id = ?", (new_id,)).fetchone()
        db.close()

        res = dict(row)
        res['id_cliente'] = res.get('id')
        return jsonify(res), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@clients_bp.route('/<int:id>', methods=['PUT'])
def update_client(id):
    try:
        data = request.get_json() or {}
        db = get_db()
        client = db.execute("SELECT * FROM clients WHERE id = ?", (id,)).fetchone()
        if not client:
            db.close()
            return jsonify({"error": "Cliente no encontrado"}), 404

        def parse_field(key, current_val):
            if key in data:
                val = data[key]
                if val is None:
                    return None
                s = str(val).strip()
                return s if s != '' else None
            return current_val

        nombre = data.get('nombre', client['nombre']).strip() or client['nombre']
        telefono = parse_field('telefono', client['telefono'])
        email = parse_field('email', client['email'])
        instagram = parse_field('instagram', client['instagram'])
        
        ref_raw = parse_field('referred_by_client_id', client['referred_by_client_id'])
        try:
            referred_by = int(ref_raw) if ref_raw is not None else None
        except Exception:
            referred_by = None

        fecha_aniversario = parse_field('fecha_aniversario', client['fecha_aniversario'])
        fecha_cumpleanos = parse_field('fecha_cumpleanos_hijos_o_parto', client['fecha_cumpleanos_hijos_o_parto'])
        notas = parse_field('notas_estilo_preferencias', client['notas_estilo_preferencias'])

        db.execute("""
            UPDATE clients SET
                nombre = ?,
                telefono = ?,
                email = ?,
                instagram = ?,
                referred_by_client_id = ?,
                fecha_aniversario = ?,
                fecha_cumpleanos_hijos_o_parto = ?,
                notas_estilo_preferencias = ?
            WHERE id = ?
        """, (
            nombre, telefono, email, instagram,
            referred_by, fecha_aniversario, fecha_cumpleanos,
            notas, id
        ))
        db.commit()
        row = db.execute("SELECT * FROM clients WHERE id = ?", (id,)).fetchone()
        db.close()

        res = dict(row)
        res['id_cliente'] = res.get('id')
        return jsonify(res)
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

