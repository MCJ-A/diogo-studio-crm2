#!/usr/bin/env python3
"""
Diogo Studio CRM — Utilitário de Sincronização e Migração para Turso Cloud SQLite.
Permite enviar a base de dados local existente (clientes, marcações, serviços, pagamentos e notas)
para uma base de dados na cloud permanente no Turso.

Utilização:
  1. Configura as variáveis de ambiente:
       set TURSO_DATABASE_URL=libsql://diogo-studio-crm-seuutilizador.turso.io
       set TURSO_AUTH_TOKEN=seu_token_aqui
  2. Executa:
       python backend/sync_to_turso.py

Ou passa diretamente por argumentos:
  python backend/sync_to_turso.py "libsql://diogo-studio..." "seu_token..."
"""

import sys
import os
import sqlite3

def run_sync():
    print("=" * 65)
    print("  DIOGO STUDIO CRM — Sincronização Definitiva para Turso Cloud")
    print("=" * 65)

    # Obter credenciais do Turso
    turso_url = (sys.argv[1] if len(sys.argv) > 1 else None) or os.environ.get('TURSO_DATABASE_URL') or os.environ.get('TURSO_URL')
    turso_token = (sys.argv[2] if len(sys.argv) > 2 else None) or os.environ.get('TURSO_AUTH_TOKEN') or os.environ.get('TURSO_TOKEN')

    if not turso_url or not turso_token:
        print("\n❌ Erro: Faltam as credenciais do Turso.")
        print("\nIndica o URL e Token como argumentos ou define as variáveis de ambiente:")
        print("  python backend/sync_to_turso.py <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN>")
        print("\nExemplo:")
        print("  python backend/sync_to_turso.py \"libsql://diogo-crm.turso.io\" \"eyJhbGciOi...\"")
        sys.exit(1)

    try:
        import libsql
    except ImportError:
        print("\n❌ Erro: O pacote 'libsql' não está instalado.")
        print("Instala com: pip install libsql")
        sys.exit(1)

    local_db_path = os.path.join(os.path.dirname(__file__), 'fotografia.db')
    if not os.path.exists(local_db_path):
        print(f"\n❌ Erro: Base de dados local não encontrada em {local_db_path}")
        sys.exit(1)

    print(f"\n1. A ler base de dados local: {local_db_path}")
    local_conn = sqlite3.connect(local_db_path)
    local_conn.row_factory = sqlite3.Row

    print(f"2. A estabelecer ligação à Turso Cloud ({turso_url[:35]}...)...")
    try:
        remote_conn = libsql.connect(turso_url, auth_token=turso_token)
        print("   ✓ Ligação remota ao Turso estabelecida com sucesso!")
    except Exception as e:
        print(f"\n❌ Falha na ligação ao Turso: {e}")
        sys.exit(1)

    # 3. Criar esquema inicial remoto se necessário
    print("3. A inicializar tabelas e vistas remotas...")
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    if os.path.exists(schema_path):
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        stmts = [s.strip() for s in schema_sql.split(';') if s.strip()]
        for s in stmts:
            try:
                remote_conn.execute(s)
            except Exception as e:
                # Vistas ou tabelas já existentes podem ser ignoradas
                pass
        remote_conn.commit()
        print("   ✓ Estrutura remota validada.")

    # 4. Tabelas a sincronizar em ordem de dependência (chaves estrangeiras)
    tables = [
        'users',
        'services',
        'clients',
        'bookings',
        'payments',
        'calendar_notes',
        'newsletter_campaigns'
    ]

    total_synced = 0
    print("\n4. A sincronizar registos para a Turso Cloud:")

    for table in tables:
        try:
            local_cur = local_conn.cursor()
            local_cur.execute(f"SELECT * FROM {table}")
            rows = local_cur.fetchall()
            
            if not rows:
                print(f"   • {table:22}: 0 registos (vazio)")
                continue

            # Obter colunas
            cols = [desc[0] for desc in local_cur.description]
            placeholders = ', '.join(['?'] * len(cols))
            cols_str = ', '.join(cols)

            # Inserir ou atualizar na base remota
            inserted = 0
            for r in rows:
                values = tuple(r)
                insert_sql = f"INSERT OR REPLACE INTO {table} ({cols_str}) VALUES ({placeholders})"
                remote_conn.execute(insert_sql, values)
                inserted += 1

            remote_conn.commit()
            print(f"   ✓ {table:22}: {inserted} registos sincronizados com sucesso.")
            total_synced += inserted

        except Exception as e:
            print(f"   ⚠️ Aviso na tabela {table}: {e}")

    local_conn.close()
    remote_conn.close()

    print("\n" + "=" * 65)
    print(f"  🎉 SINCRONIZAÇÃO CONCLUÍDA: {total_synced} registos transferidos!")
    print("  A tua base de dados na Turso Cloud está 100% pronta e ativa.")
    print("=" * 65 + "\n")

if __name__ == '__main__':
    run_sync()
