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
        
        # Insertar datos de prueba realistas
        
        # 1. Servicios del catálogo
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
        
        # 2. Clientes interconectados con referidos
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
        
        # 3. Reservas/Bookings en distintos estados
        bookings_data = [
            (1, 1, '2024-05-15', 'Estudio Central', 'Realizada', 1, 1, 'https://galeria.com/maria1'),
            (2, 1, '2024-06-20', 'Parque Central', 'Entregada', 1, 1, 'https://galeria.com/maria2'),
            (3, 1, '2024-08-10', 'Estudio Central', 'Realizada', 1, 1, 'https://galeria.com/maria3'),
            (4, 2, '2024-05-25', 'Rooftop Sunset', 'Entregada', 1, 1, 'https://galeria.com/carlos1'),
            (5, 2, '2024-07-15', 'Parque Central', 'Agendada', 1, 1, None),
            (6, 3, '2024-06-01', 'Estudio Central', 'Realizada', 1, 1, 'https://galeria.com/ana1'),
            (7, 3, '2024-08-20', 'Rooftop Sunset', 'En_edicion', 1, 1, None),
            (8, 4, '2024-09-05', 'Estudio Central', 'Seleccion_pendiente', 1, 1, None),
            (9, 1, '2024-10-15', 'Parque Central', 'Agendada', 0, 1, None),  # Sin contrato firmado
        ]
        
        cursor.executemany(
            "INSERT INTO bookings (client_id, service_id, fecha_sesion, ubicacion, estado, contrato_firmado, autoriza_redes_sociales, url_galeria) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            bookings_data
        )
        
        # 4. Pagos con descuentos y anticipos
        # Se omite 'saldo_pendiente' ya que es una columna generada (GENERATED ALWAYS AS)
        payments_data = [
            (1, 2500.0, 300.0, 'Primer cliente', 800.0, 'Completado', '2024-05-16'),
            (2, 1800.0, 0.0, '', 1800.0, 'Completado', '2024-06-21'),
            (3, 1200.0, 150.0, 'Fidelidad', 1050.0, 'Completado', '2024-08-11'),
            (4, 3000.0, 0.0, '', 3000.0, 'Completado', '2024-05-26'),
            (5, 1800.0, 0.0, '', 1800.0, 'Pendiente', None),
            (6, 1200.0, 100.0, 'Promoción', 1100.0, 'Parcial', '2024-06-02'),
            (7, 3000.0, 0.0, '', 3000.0, 'Pendiente', None),
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
                max_widths = [len(col) for col in columns]
                
                for row in rows:
                    formatted_row = []
                    for i, (value, width) in enumerate(zip(row, max_widths)):
                        if value is None:
                            formatted_row.append('NULL')
                        else:
                            formatted_row.append(str(value)[:width])
                    
                    print("{:<25}" * len(columns).format(*formatted_row))
                
            except Exception as e:
                print(f"Error al consultar la vista {view_name}: {e}")
        
        # Cerrar conexión
        conn.close()
        print("\nBase de datos finalizada exitosamente")

if __name__ == '__main__':
    init_database()
