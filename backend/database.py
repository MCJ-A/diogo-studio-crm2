import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'fotografia.db')

# --- Wrapper compatível com DB-API e sqlite3.Row para LibSQL / Turso ---
class LibsqlRow:
    def __init__(self, cols, values):
        self._keys = [c[0] for c in cols] if cols else []
        self._values = list(values)
        self._map = {k: v for k, v in zip(self._keys, self._values)}

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return self._map[key]

    def get(self, key, default=None):
        return self._map.get(key, default)

    def keys(self):
        return self._keys

    def values(self):
        return self._values

    def items(self):
        return self._map.items()

    def __iter__(self):
        return iter(self._map)

    def __contains__(self, key):
        return key in self._map

    def __len__(self):
        return len(self._keys)

    def __repr__(self):
        return f'<LibsqlRow {self._map}>'


class LibsqlCursorWrapper:
    def __init__(self, cur):
        self._cur = cur

    def execute(self, sql, params=()):
        self._cur.execute(sql, params)
        return self

    def executemany(self, sql, seq_of_params):
        self._cur.executemany(sql, seq_of_params)
        return self

    def executescript(self, script):
        for stmt in script.split(';'):
            s = stmt.strip()
            if s:
                self._cur.execute(s)
        return self

    def fetchone(self):
        row = self._cur.fetchone()
        if row is None:
            return None
        return LibsqlRow(self._cur.description, row)

    def fetchall(self):
        rows = self._cur.fetchall()
        if not rows:
            return []
        cols = self._cur.description
        return [LibsqlRow(cols, r) for r in rows]

    def __iter__(self):
        while True:
            row = self.fetchone()
            if row is None:
                break
            yield row

    @property
    def description(self):
        return self._cur.description

    @property
    def lastrowid(self):
        return self._cur.lastrowid

    @property
    def rowcount(self):
        return self._cur.rowcount

    def close(self):
        return self._cur.close()


class LibsqlConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn

    @property
    def row_factory(self):
        return None

    @row_factory.setter
    def row_factory(self, val):
        pass

    def cursor(self):
        return LibsqlCursorWrapper(self._conn.cursor())

    def execute(self, sql, params=()):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def executescript(self, script):
        cur = self.cursor()
        cur.executescript(script)
        return cur

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()


def ensure_schema(conn):
    """Garante que as tabelas e vistas base existem (especialmente em novas bases de dados Turso)."""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='clients'")
        row = cursor.fetchone()
        has_clients = row[0] if row else 0

        if not has_clients:
            print("[DB] Esquema inicial não encontrado. A executar schema.sql...")
            schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
            if os.path.exists(schema_path):
                with open(schema_path, 'r', encoding='utf-8') as f:
                    schema_sql = f.read()

                statements = [s.strip() for s in schema_sql.split(';') if s.strip()]
                for stmt in statements:
                    cursor.execute(stmt)
                conn.commit()
                print("[DB] Esquema inicial e vistas criados com sucesso.")
    except Exception as e:
        print(f"[DB] Aviso em ensure_schema: {e}")


def sync_diogo_user(conn):
    """Cria e sincroniza o utilizador e palavra-passe privada de Diogo, removendo contas de teste."""
    try:
        from werkzeug.security import generate_password_hash
        diogo_user = os.environ.get('DIOGO_USER', 'diogo').strip()
        diogo_pass = os.environ.get('DIOGO_PASSWORD', 'DiogoStudio2026!').strip()

        cursor = conn.cursor()
        cursor.execute("SELECT id, username FROM users WHERE username = ?", (diogo_user,))
        user_row = cursor.fetchone()

        if not user_row:
            pwd_hash = generate_password_hash(diogo_pass)
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (diogo_user, pwd_hash))
            print(f"[AUTH] Utilizador privado '{diogo_user}' criado com sucesso.")
        elif os.environ.get('DIOGO_PASSWORD'):
            pwd_hash = generate_password_hash(diogo_pass)
            cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", (pwd_hash, diogo_user))
            print(f"[AUTH] Palavra-passe do utilizador '{diogo_user}' atualizada via DIOGO_PASSWORD.")

        # Remover conta de teste genérica 'admin' se o utilizador diogo existir
        cursor.execute("DELETE FROM users WHERE username = 'admin'")
        conn.commit()
    except Exception as e:
        print(f"[AUTH] Aviso em sync_diogo_user: {e}")


def run_migrations(conn):
    try:
        cursor = conn.cursor()

        # 1. Colunas em bookings
        cursor.execute("PRAGMA table_info(bookings)")
        cols_bookings = [r[1] for r in cursor.fetchall()]
        
        if cols_bookings:
            if 'hora_sesion' not in cols_bookings:
                cursor.execute("ALTER TABLE bookings ADD COLUMN hora_sesion TEXT")
            if 'notas_internas' not in cols_bookings:
                cursor.execute("ALTER TABLE bookings ADD COLUMN notas_internas TEXT")
            if 'razon_cancelacion' not in cols_bookings:
                cursor.execute("ALTER TABLE bookings ADD COLUMN razon_cancelacion TEXT")

        # 2. Colunas em payments
        cursor.execute("PRAGMA table_info(payments)")
        cols_payments = [r[1] for r in cursor.fetchall()]
        if cols_payments:
            if 'metodo_pago' not in cols_payments:
                cursor.execute("ALTER TABLE payments ADD COLUMN metodo_pago TEXT DEFAULT 'MB WAY'")
            if 'notas_pago' not in cols_payments:
                cursor.execute("ALTER TABLE payments ADD COLUMN notas_pago TEXT")

        # 3. Atualizar vistas SQL críticas
        cursor.execute("DROP VIEW IF EXISTS v_client_loyalty")
        cursor.execute("""
            CREATE VIEW v_client_loyalty AS
            SELECT 
                c.id,
                c.nombre,
                COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) AS sesiones_completadas,
                COALESCE(SUM(CASE WHEN b.estado IN ('Realizada','Entregada') THEN p.monto_bruto - COALESCE(p.descuento_aplicado,0) ELSE 0 END), 0) AS total_gastado,
                MAX(CASE WHEN b.estado IN ('Realizada','Entregada') THEN b.fecha_sesion END) AS fecha_ultima_sesion,
                (SELECT COUNT(*) FROM clients r WHERE r.referred_by_client_id = c.id) AS total_referidos,
                CASE 
                    WHEN COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) >= 3 AND (SELECT COUNT(*) FROM clients r WHERE r.referred_by_client_id = c.id) > 0 THEN 20
                    WHEN COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) >= 4 THEN 20
                    WHEN COUNT(CASE WHEN b.estado IN ('Realizada', 'Entregada') THEN 1 END) BETWEEN 2 AND 3 THEN 15
                    WHEN (SELECT COUNT(*) FROM clients r WHERE r.referred_by_client_id = c.id) > 0 THEN 15
                    ELSE 0
                END AS descuento_sugerido_pct
            FROM clients c
            LEFT JOIN bookings b ON c.id = b.client_id
            LEFT JOIN payments p ON b.id = p.booking_id
            GROUP BY c.id, c.nombre
        """)

        cursor.execute("DROP VIEW IF EXISTS v_alertas_operativas")
        cursor.execute("""
            CREATE VIEW v_alertas_operativas AS
            SELECT 
                b.id,
                c.nombre AS cliente,
                s.nombre AS servicio,
                b.fecha_sesion,
                b.estado,
                CASE 
                    WHEN b.estado = 'Agendada' AND b.contrato_firmado = 0 THEN 'Sin contrato firmado'
                    WHEN b.estado IN ('Realizada', 'Seleccion_pendiente', 'En_edicion') AND COALESCE(p.saldo_pendiente, 0) > 0 THEN 'Saldo pendiente post-sesión'
                    WHEN b.estado = 'Entregada' AND COALESCE(p.saldo_pendiente, 0) > 0 THEN 'Saldo pendiente en entrega'
                    ELSE NULL
                END AS alerta,
                p.saldo_pendiente
            FROM bookings b
            JOIN clients c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE (b.estado = 'Agendada' AND b.contrato_firmado = 0)
               OR (b.estado IN ('Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada') AND COALESCE(p.saldo_pendiente, 0) > 0)
        """)

        # 4. Tabela de datas marcadas / lembretes / bloqueios (calendar_notes)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS calendar_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha DATE NOT NULL,
                hora TEXT DEFAULT '09:00',
                titulo TEXT NOT NULL,
                tipo TEXT DEFAULT 'recordatorio' CHECK (tipo IN ('recordatorio', 'bloqueo', 'pre_reserva', 'entrega')),
                prioridad TEXT DEFAULT 'alta' CHECK (prioridad IN ('normal', 'alta', 'urgente')),
                notas TEXT,
                completado BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_calendar_notes_fecha ON calendar_notes(fecha)")

        # Inserir lembretes de exemplo se a tabela estiver vazia
        cursor.execute("SELECT COUNT(*) FROM calendar_notes")
        if cursor.fetchone()[0] == 0:
            from datetime import date, timedelta
            hoy = date.today()
            manana = (hoy + timedelta(days=1)).isoformat()
            prox_sem = (hoy + timedelta(days=4)).isoformat()
            cursor.execute("""
                INSERT INTO calendar_notes (fecha, hora, titulo, tipo, prioridad, notas, completado)
                VALUES 
                (?, '11:00', 'Pre-reserva Boda em Sintra (Confirmar com cliente)', 'pre_reserva', 'urgente', 'Cliente pediu para guardar data verbalmente. Confirmar sinal por MB WAY.', 0),
                (?, '16:00', 'Entrega de Álbum Fine Art + Revisão de Lentes', 'entrega', 'alta', 'Preparar embalagem de luxo do atelier antes das 15:00.', 0)
            """, (manana, prox_sem))

        conn.commit()
    except Exception as e:
        print(f"[MIGRATIONS] Advertência em run_migrations: {e}")


def _get_local_sqlite():
    db_file = os.environ.get('DB_PATH') or os.environ.get('DATABASE_PATH') or DB_PATH
    os.makedirs(os.path.dirname(os.path.abspath(db_file)), exist_ok=True)
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


_migrated = False

def get_db():
    global _migrated
    turso_url = os.environ.get('TURSO_DATABASE_URL') or os.environ.get('TURSO_URL')
    turso_token = os.environ.get('TURSO_AUTH_TOKEN') or os.environ.get('TURSO_TOKEN')

    if turso_url and turso_token:
        try:
            import libsql
            raw = libsql.connect(turso_url, auth_token=turso_token)
            conn = LibsqlConnectionWrapper(raw)
        except Exception as e:
            print(f"[TURSO] Erro ao ligar ao Turso ({e}). A recorrer ao SQLite local...")
            conn = _get_local_sqlite()
    else:
        conn = _get_local_sqlite()

    if not _migrated:
        ensure_schema(conn)
        run_migrations(conn)
        sync_diogo_user(conn)
        _migrated = True

    return conn
