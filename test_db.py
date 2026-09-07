import sqlite3
import os

def test_database():
    """Verifica la integridad y estructura de la base de datos"""
    
    # Verificar si el archivo de base de datos existe
    if not os.path.exists('fotografia.db'):
        print("Error: No se encontró el archivo fotografia.db")
        return False
    
    try:
        conn = sqlite3.connect('fotografia.db')
        cursor = conn.cursor()
        
        print("=" * 70)
        print("TEST DE INTEGRIDAD DE BASE DE DATOS - CRM Fotografía")
        print("=" * 70)
        
        # 1. Verificar que todas las tablas existen
        print("\n[1] VERIFICANDO TABLAS...")
        tables = ['clients', 'services', 'bookings', 'payments']
        for table in tables:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if cursor.fetchone():
                print(f"  ✓ Tabla '{table}' existe")
            else:
                print(f"  ✗ Tabla '{table}' NO existe")
        
        # 2. Verificar que todas las vistas existen
        print("\n[2] VERIFICANDO VISTAS...")
        views = ['v_client_loyalty', 'v_alertas_operativas', 'v_oportunidades_recontacto']
        for view in views:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='view' AND name='{view}'")
            if cursor.fetchone():
                print(f"  ✓ Vista '{view}' existe")
            else:
                print(f"  ✗ Vista '{view}' NO existe")
        
        # 3. Verificar índices
        print("\n[3] VERIFICANDO ÍNDICES...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [row[0] for row in cursor.fetchall()]
        expected_indexes = ['idx_clients_telefono', 'idx_clients_email', 
                          'idx_bookings_fecha_sesion', 'idx_bookings_estado',
                          'idx_payments_booking_id', 'idx_payments_estado_pago']
        
        for idx in expected_indexes:
            if idx in indexes:
                print(f"  ✓ Índice '{idx}' existe")
            else:
                print(f"  ✗ Índice '{idx}' NO existe")
        
        # 4. Verificar datos en tablas
        print("\n[4] VERIFICANDO DATOS EN TABLAS...")
        
        cursor.execute("SELECT COUNT(*) FROM clients")
        client_count = cursor.fetchone()[0]
        print(f"  Clientes: {client_count}")
        
        cursor.execute("SELECT COUNT(*) FROM services")
        service_count = cursor.fetchone()[0]
        print(f"  Servicios: {service_count}")
        
        cursor.execute("SELECT COUNT(*) FROM bookings")
        booking_count = cursor.fetchone()[0]
        print(f"  Reservas: {booking_count}")
        
        cursor.execute("SELECT COUNT(*) FROM payments")
        payment_count = cursor.fetchone()[0]
        print(f"  Pagos: {payment_count}")
        
        # 5. Verificar referencias foráneas
        print("\n[5] VERIFICANDO REFERENCIAS FORÁNEAS...")
        
        # Clientes con referidos
        cursor.execute("""
            SELECT COUNT(*) FROM clients 
            WHERE referred_by_client_id IS NOT NULL
        """)
        referred_count = cursor.fetchone()[0]
        print(f"  Clientes referidos: {referred_count}")
        
        # Reservas sin contrato firmado (alerta)
        cursor.execute("""
            SELECT COUNT(*) FROM bookings 
            WHERE estado = 'Agendada' AND contrato_firmado = 0
        """)
        no_contract_count = cursor.fetchone()[0]
        print(f"  Reservas agendadas sin contrato: {no_contract_count}")
        
        # Pagos pendientes en entregas
        cursor.execute("""
            SELECT COUNT(*) FROM bookings b
            JOIN payments p ON b.id = p.booking_id
            WHERE b.estado = 'Entregada' AND p.saldo_pendiente > 0
        """)
        pending_balance_count = cursor.fetchone()[0]
        print(f"  Entregadas con saldo pendiente: {pending_balance_count}")
        
        # 6. Mostrar resumen de vistas
        print("\n[6] RESUMEN DE VISTAS...")
        
        for view in views:
            print(f"\n  Vista: {view.upper()}")
            cursor.execute(f"SELECT COUNT(*) FROM {view}")
            count = cursor.fetchone()[0]
            print(f"    Filas: {count}")
            
            # Mostrar algunos datos de ejemplo
            cursor.execute(f"SELECT * FROM {view} LIMIT 3")
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            if rows:
                print("    Ejemplo:")
                for row in rows:
                    print(f"      {row}")
        
        # 7. Verificar integridad de datos (FK constraints)
        print("\n[7] VERIFICANDO INTEGRIDAD DE DATOS...")
        
        cursor.execute("""
            SELECT COUNT(*) FROM bookings b
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE c.id IS NULL
        """)
        orphan_bookings = cursor.fetchone()[0]
        print(f"  Reservas huérfanas (sin cliente): {orphan_bookings}")
        
        cursor.execute("""
            SELECT COUNT(*) FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            WHERE s.id IS NULL
        """)
        orphan_services = cursor.fetchone()[0]
        print(f"  Reservas huérfanas (sin servicio): {orphan_services}")
        
        # 8. Verificar tipos de datos en columnas críticas
        print("\n[8] VERIFICANDO TIPOS DE DATOS...")
        
        cursor.execute("PRAGMA table_info(clients)")
        client_cols = cursor.fetchall()
        for col in client_cols:
            if col[1] == 'email':
                email_type = col[2]
                print(f"  Columna 'email' tipo: {email_type}")
        
        cursor.execute("PRAGMA table_info(bookings)")
        booking_cols = cursor.fetchall()
        for col in booking_cols:
            if col[1] == 'estado':
                estado_type = col[2]
                print(f"  Columna 'estado' tipo: {estado_type}")
        
        # 9. Verificar restricciones CHECK
        print("\n[9] VERIFICANDO RESTRICCIONES CHECK...")
        
        cursor.execute("""
            SELECT COUNT(*) FROM bookings 
            WHERE estado NOT IN ('Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada', 'Cancelada')
        """)
        invalid_states = cursor.fetchone()[0]
        print(f"  Reservas con estado inválido: {invalid_states}")
        
        cursor.execute("""
            SELECT COUNT(*) FROM payments 
            WHERE estado_pago NOT IN ('Pendiente', 'Parcial', 'Completado')
        """)
        invalid_payment_states = cursor.fetchone()[0]
        print(f"  Pagos con estado inválido: {invalid_payment_states}")
        
        # Cerrar conexión
        conn.close()
        
        # Resumen final
        print("\n" + "=" * 70)
        print("RESULTADO DEL TEST")
        print("=" * 70)
        
        all_passed = (orphan_bookings == 0 and orphan_services == 0 and 
                     invalid_states == 0 and invalid_payment_states == 0)
        
        if all_passed:
            print("✓ TODAS LAS PRUEBAS PASARON")
        else:
            print("✗ ALGUNAS PRUEBAS FALLARON")
        
        return all_passed
        
    except Exception as e:
        print(f"\n✗ ERROR DURANTE EL TEST: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_database()
    exit(0 if success else 1)
