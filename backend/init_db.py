import sqlite3
import os

def init_database():
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    db_path = os.path.join(os.path.dirname(__file__), 'fotografia.db')

    if not os.path.exists(schema_path):
        print("Error: No se encontró el archivo schema.sql")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()

        # executescript hace COMMIT implícito; usamos una nueva conexión limpia después
        cursor.executescript(schema_sql)
        print("Esquema de base de datos creado exitosamente")

        # Reabrir el cursor en modo normal (executescript cerró la transacción)
        conn.row_factory = sqlite3.Row

        # --- 0. Usuarios (Admin) ---
        from werkzeug.security import generate_password_hash
        admin_hash = generate_password_hash('admin123')
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", ('admin', admin_hash))

        # --- 1. Servicios ---
        services_data = [
            ('Sesión Matrimonial', 2500.0, '30 fotos editadas + álbum premium', 1),
            ('Sesión Familiar',    1800.0, '25 fotos editadas + digital download', 1),
            ('Sesión Individual',  1200.0, '20 fotos editadas + galería online', 1),
            ('Sesión Corporativa', 3000.0, '40 fotos editadas + uso comercial', 1),
        ]
        service_ids = []
        for row in services_data:
            cursor.execute(
                "INSERT INTO services (nombre, precio_base, entregables_detalle, activo) VALUES (?, ?, ?, ?)",
                row
            )
            service_ids.append(cursor.lastrowid)

        # --- 2. Clientes ---
        clients_data = [
            ('María González',  '555-0101', 'maria.g@email.com',    '@maria_gonzalez',     '2024-01-15', None, '2024-03-20', '2024-06-15', 'Prefiere luz natural, estilo minimalista'),
            ('Carlos Rodríguez','555-0102', 'carlos.r@email.com',   '@carlos_rodriguez',   '2024-02-20', None, '2024-04-10', '2024-07-01', 'Estilo urbano, colores vibrantes'),
            ('Ana Martínez',    '555-0103', 'ana.m@email.com',      '@ana_martinez_foto',  '2024-03-10', 1,    '2024-05-05', '2024-08-10', 'Estilo clásico, tonos cálidos'),
            ('Luis Fernández',  '555-0104', 'luis.f@email.com',     '@luis_fernandez',     '2024-04-01', 2,    '2024-06-01', '2024-09-01', 'Estilo moderno, blanco y negro'),
        ]
        client_ids = []
        for row in clients_data:
            cursor.execute(
                "INSERT INTO clients (nombre, telefono, email, instagram, fecha_registro, referred_by_client_id, fecha_aniversario, fecha_cumpleanos_hijos_o_parto, notas_estilo_preferencias) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                row
            )
            client_ids.append(cursor.lastrowid)

        # --- 3. Reservas ---
        bookings_data = [
            (client_ids[0], service_ids[0], '2024-05-15', 'Estudio Central',  'Realizada',           1, 1, 'https://galeria.com/maria1'),
            (client_ids[0], service_ids[0], '2024-06-20', 'Parque Central',   'Entregada',            1, 1, 'https://galeria.com/maria2'),
            (client_ids[0], service_ids[0], '2024-08-10', 'Estudio Central',  'Realizada',           1, 1, 'https://galeria.com/maria3'),
            (client_ids[1], service_ids[1], '2024-05-25', 'Rooftop Sunset',   'Entregada',            1, 1, 'https://galeria.com/carlos1'),
            (client_ids[1], service_ids[0], '2024-07-15', 'Parque Central',   'Agendada',             1, 1, None),
            (client_ids[2], service_ids[0], '2024-06-01', 'Estudio Central',  'Realizada',           1, 1, 'https://galeria.com/ana1'),
            (client_ids[2], service_ids[0], '2024-08-20', 'Rooftop Sunset',   'En_edicion',           1, 1, None),
            (client_ids[3], service_ids[1], '2024-09-05', 'Estudio Central',  'Seleccion_pendiente', 1, 1, None),
            (client_ids[0], service_ids[0], '2024-10-15', 'Parque Central',   'Agendada',             0, 1, None),  # Sin contrato firmado
        ]
        booking_ids = []
        for row in bookings_data:
            cursor.execute(
                "INSERT INTO bookings (client_id, service_id, fecha_sesion, ubicacion, estado, contrato_firmado, autoriza_redes_sociales, url_galeria) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                row
            )
            booking_ids.append(cursor.lastrowid)

        # --- 4. Pagos ---
        payments_data = [
            (booking_ids[0], 2500.0, 300.0, 'Primer cliente', 800.0,  'Completado', '2024-05-16'),
            (booking_ids[1], 1800.0,   0.0, '',               1800.0, 'Completado', '2024-06-21'),
            (booking_ids[2], 1200.0, 150.0, 'Fidelidad',      1050.0, 'Completado', '2024-08-11'),
            (booking_ids[3], 3000.0,   0.0, '',               3000.0, 'Completado', '2024-05-26'),
            (booking_ids[4], 1800.0,   0.0, '',                800.0, 'Pendiente',  None),          # Saldo pendiente: 1000
            (booking_ids[5], 1200.0, 100.0, 'Promoción',      1100.0, 'Parcial',    '2024-06-02'),  # Saldo: 0 (completado de facto)
            (booking_ids[6], 3000.0,   0.0, '',                  0.0, 'Pendiente',  None),          # Saldo: 3000
        ]
        for row in payments_data:
            cursor.execute(
                "INSERT INTO payments (booking_id, monto_bruto, descuento_aplicado, motivo_descuento, anticipo_pagado, estado_pago, fecha_ultimo_pago) VALUES (?, ?, ?, ?, ?, ?, ?)",
                row
            )

        conn.commit()
        print("Datos de prueba insertados exitosamente")
        print(f"  Servicios: {len(service_ids)} | IDs: {service_ids}")
        print(f"  Clientes:  {len(client_ids)} | IDs: {client_ids}")
        print(f"  Reservas:  {len(booking_ids)} | IDs: {booking_ids}")

    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        print(f"Error al inicializar la base de datos: {e}")
        return

    finally:
        # Mostrar resumen de vistas
        views_to_show = ['v_client_loyalty', 'v_alertas_operativas', 'v_oportunidades_recontacto']
        for view_name in views_to_show:
            print(f"\n{'='*60}")
            print(f"VISTA: {view_name.upper()}")
            print('='*60)
            try:
                cursor.execute(f"SELECT * FROM {view_name}")
                columns = [d[0] for d in cursor.description]
                print("  ".join(f"{c:<22}" for c in columns))
                print('-' * 90)
                for row in cursor.fetchall():
                    vals = [str(v)[:21] if v is not None else 'NULL' for v in row]
                    print("  ".join(f"{v:<22}" for v in vals))
            except Exception as e:
                print(f"Error al consultar la vista {view_name}: {e}")

        conn.close()
        print("\nBase de datos inicializada exitosamente [OK]")


if __name__ == '__main__':
    init_database()
