import sqlite3
import os

def init_database():
    # Verificar si el archivo schema.sql existe
    if not os.path.exists('schema.sql'):
        print("Error: No se encontró el archivo schema.sql")
        return
    
    # Conectar a la base de datos (o crearla si no existe)
    conn = sqlite3.connect('fotografia.db')
    cursor = conn.cursor()
    
    try:
        # Leer y ejecutar el esquema SQL
        with open('schema.sql', 'r') as f:
            schema_sql = f.read()
        
        cursor.executescript(schema_sql)
        print("Esquema de base de datos creado exitosamente")
        
        # --- 1. Insertar Servicios del catálogo ---
        services_data = [
            ('Sesión Matrimonial', 2500.0, '30 fotos editadas + álbum premium', 1),
            ('Sesión Familiar', 1800.0, '25 fotos editadas + digital download', 1),
            ('Sesión Individual', 1200.0, '20 fotos editadas + galería online', 1),
            ('Sesión Corporativa', 3000.0, '40 fotos editadas + uso comercial', 1),
        ]
        cursor.executemany(
            "INSERT INTO services (nombre, precio_base, entregables_detalle, activo) VALUES (?, ?, ?, ?)",
            services_data
        )
        
        # Obtener IDs de servicios recién insertados
        service_ids = [cursor.lastrowid - i for i in range(len(services_data))]
        
        # --- 2. Insertar Clientes interconectados con referidos ---
        clients_data = [
            ('María González', '555-0101', 'maria.g@email.com', '@maria_gonzalez', '2024-01-15', None, '2024-03-20', '2024-06-15', 'Prefiere luz natural, estilo minimalista'),
            ('Carlos Rodríguez', '555-0102', 'carlos.r@email.com', '@carlos_rodriguez', '2024-02-20', None, '2024-04-10', '2024-07-01', 'Estilo urbano, colores vibrantes'),
            ('Ana Martínez', '555-0103', 'ana.m@email.com', '@ana_martinez_foto', '2024-03-10', 1, '2024-05-05', '2024-08-10', 'Estilo clásico, tonos cálidos'),
            ('Luis Fernández', '555-0104', 'luis.f@email.com', '@luis_fernandez', '2024-04-01', 2, '2024-06-01', '2024-09-01', 'Estilo moderno, blanco y negro'),
        ]
        cursor.executemany(
            "INSERT INTO clients (nombre, telefono, email, instagram, fecha_registro, referred_by_client_id, fecha_aniversario, fecha_cumpleanos_hijos_o_parto, notas_estilo_preferencias) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            clients_data
        )
        
        # Obtener IDs de clientes recién insertados
        client_ids = [cursor.lastrowid - i for i in range(len(clients_data))]
        
        # --- 3. Insertar Reservas/Bookings en distintos estados ---
        bookings_data = [
            (client_ids[0], service_ids[0], '2024-05-15', 'Estudio Central', 'Realizada', 1, 1, 'https://galeria.com/maria1'),
            (client_ids[0], service_ids[0], '2024-06-20', 'Parque Central', 'Entregada', 1, 1, 'https://galeria.com/maria2'),
            (client_ids[0], service_ids[0], '2024-08-10', 'Estudio Central', 'Realizada', 1, 1, 'https://galeria.com/maria3'),
            (client_ids[1], service_ids[1], '2024-05-25', 'Rooftop Sunset', 'Entregada', 1, 1, 'https://galeria.com/carlos1'),
            (client_ids[1], service_ids[0], '2024-07-15', 'Parque Central', 'Agendada', 1, 1, None),
            (client_ids[2], service_ids[0], '2024-06-01', 'Estudio Central', 'Realizada', 1, 1, 'https://galeria.com/ana1'),
            (client_ids[2], service_ids[0], '2024-08-20', 'Rooftop Sunset', 'En_edicion', 1, 1, None),
            (client_ids[3], service_ids[1], '2024-09-05', 'Estudio Central', 'Seleccion_pendiente', 1, 1, None),
            (client_ids[0], service_ids[0], '2024-10-15', 'Parque Central', 'Agendada', 0, 1, None),  # Sin contrato firmado
        ]
        cursor.executemany(
            "INSERT INTO bookings (client_id, service_id, fecha_sesion, ubicacion, estado, contrato_firmado, autoriza_redes_sociales, url_galeria) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            bookings_data
        )
        
        # Obtener IDs de bookings recién insertados
        booking_ids = [cursor.lastrowid - i for i in range(len(bookings_data))]
        
        # --- 4. Pagos con descuentos y anticipos ---
        payments_data = [
            (booking_ids[0], 2500.0, 300.0, 'Primer cliente', 800.0, 'Completado', '2024-05-16'),
            (booking_ids[1], 1800.0, 0.0, '', 1800.0, 'Completado', '2024-06-21'),
            (booking_ids[2], 1200.0, 150.0, 'Fidelidad', 1050.0, 'Completado', '2024-08-11'),
            (booking_ids[3], 3000.0, 0.0, '', 3000.0, 'Completado', '2024-05-26'),
            (booking_ids[4], 1800.0, 0.0, '', 1800.0, 'Pendiente', None),
            (booking_ids[5], 1200.0, 100.0, 'Promoción', 1100.0, 'Parcial', '2024-06-02'),
            (booking_ids[6], 3000.0, 0.0, '', 3000.0, 'Pendiente', None),
        ]
        
        cursor.executemany(
            "INSERT INTO payments (booking_id, monto_bruto, descuento_aplicado, motivo_descuento, anticipo_pagado, estado_pago, fecha_ultimo_pago) VALUES (?, ?, ?, ?, ?, ?, ?)",
            payments_data
        )
        
        conn.commit()
        print("Datos de prueba insertados exitosamente")
        
    except Exception as e:
        conn.rollback()
        print(f"Error al inicializar la base de datos: {e}")
        return
    
    finally:
        # Mostrar contenido de las vistas en tablas legibles
        views_to_show = ['v_client_loyalty', 'v_alertas_operativas', 'v_oportunidades_recontacto']
        
        for view_name in views_to_show:
            print(f"\n{'='*60}")
            print(f"VISTA: {view_name.upper()}")
            print('='*60)
            
            try:
                cursor.execute(f"SELECT * FROM {view_name}")
                columns = [description[0] for description in cursor.description]
                
                # Imprimir encabezados
                header_format = "{:<25}" * len(columns)
                print(header_format.format(*columns))
                print('-' * 100)
                
                # Imprimir filas
                rows = cursor.fetchall()
                
                for row in rows:
                    formatted_row = []
                    for value in row:
                        # Manejo de None y truncamiento de texto
                        value_str = str(value) if value is not None else 'NULL'
                        formatted_row.append(value_str[:24].ljust(25))
                    
                    print("".join(formatted_row))
                
            except Exception as e:
                print(f"Error al consultar la vista {view_name}: {e}")
        
        # Cerrar conexión
        conn.close()
        print("\nBase de datos finalizada exitosamente")

if __name__ == '__main__':
    init_database()
