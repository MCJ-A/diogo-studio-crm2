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
        
        # 1. Verificar que todas las tablas existen
        tables_ok = True
        for table in ['clients', 'services', 'bookings', 'payments']:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not cursor.fetchone():
                print(f"  ✗ Tabla '{table}' NO existe")
                tables_ok = False
        
        # 2. Verificar que todas las vistas existen
        views_ok = True
        for view in ['v_client_loyalty', 'v_alertas_operativas', 'v_oportunidades_recontacto']:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='view' AND name='{view}'")
            if not cursor.fetchone():
                print(f"  ✗ Vista '{view}' NO existe")
                views_ok = False
        
        # 3. Verificar índices
        indexes_ok = True
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [row[0] for row in cursor.fetchall()]
        expected_indexes = ['idx_clients_telefono', 'idx_clients_email', 
                          'idx_bookings_fecha_sesion', 'idx_bookings_estado',
                          'idx_payments_booking_id', 'idx_payments_estado_pago']
        
        for idx in expected_indexes:
            if idx not in indexes:
                print(f"  ✗ Índice '{idx}' NO existe")
                indexes_ok = False
        
        # 4. Verificar integridad de datos (FK constraints)
        cursor.execute("""
            SELECT COUNT(*) FROM bookings b
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE c.id IS NULL
        """)
        orphan_bookings = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            WHERE s.id IS NULL
        """)
        orphan_services = cursor.fetchone()[0]
        
        # 5. Verificar restricciones CHECK
        cursor.execute("""
            SELECT COUNT(*) FROM bookings 
            WHERE estado NOT IN ('Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada', 'Cancelada')
        """)
        invalid_states = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM payments 
            WHERE estado_pago NOT IN ('Pendiente', 'Parcial', 'Completado')
        """)
        invalid_payment_states = cursor.fetchone()[0]
        
        # 6. Verificar referencias foráneas (clientes con referidos)
        cursor.execute("""
            SELECT COUNT(*) FROM clients 
            WHERE referred_by_client_id IS NOT NULL
        """)
        referred_count = cursor.fetchone()[0]
        
        # 7. Verificar reservas agendadas sin contrato
        cursor.execute("""
            SELECT COUNT(*) FROM bookings 
            WHERE estado = 'Agendada' AND contrato_firmado = 0
        """)
        no_contract_count = cursor.fetchone()[0]
        
        # 8. Verificar entregas con saldo pendiente
        cursor.execute("""
            SELECT COUNT(*) FROM bookings b
            JOIN payments p ON b.id = p.booking_id
            WHERE b.estado = 'Entregada' AND p.saldo_pendiente > 0
        """)
        pending_balance_count = cursor.fetchone()[0]
        
        # Cerrar conexión
        conn.close()
        
        # Resumen final
        print("\n" + "=" * 70)
        print("RESULTADO DEL TEST")
        print("=" * 70)
        
        all_passed = (tables_ok and views_ok and indexes_ok and 
                     orphan_bookings == 0 and orphan_services == 0 and 
                     invalid_states == 0 and invalid_payment_states == 0)
        
        if all_passed:
            print("✓ TODAS LAS PRUEBAS PASARON")
            print(f"  - Tablas: OK")
            print(f"  - Vistas: OK")
            print(f"  - Índices: OK")
            print(f"  - Datos huérfanos: {orphan_bookings} reservas, {orphan_services} servicios")
            print(f"  - Estados inválidos: {invalid_states} reservas, {invalid_payment_states} pagos")
            print(f"  - Clientes referidos: {referred_count}")
            print(f"  - Reservas sin contrato: {no_contract_count}")
            print(f"  - Entregadas con saldo pendiente: {pending_balance_count}")
        else:
            print("✗ ALGUNAS PRUEBAS FALLARON")
            if not tables_ok:
                print("  - Falta alguna tabla")
            if not views_ok:
                print("  - Falta alguna vista")
            if not indexes_ok:
                print("  - Falta algún índice")
            if orphan_bookings > 0 or orphan_services > 0:
                print(f"  - Datos huérfanos detectados")
            if invalid_states > 0 or invalid_payment_states > 0:
                print(f"  - Estados inválidos detectados")
        
        return all_passed
        
    except Exception as e:
        print(f"\n✗ ERROR DURANTE EL TEST: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_database()
    exit(0 if success else 1)
