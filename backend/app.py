import os
from flask import Flask, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, verify_jwt_in_request

from routes.dashboard import dashboard_bp
from routes.clients import clients_bp
from routes.bookings import bookings_bp
from routes.services import services_bp
from routes.payments import payments_bp
from routes.auth import auth_bp
from init_db import init_database

# Determinar carpeta de archivos estáticos del frontend (React build)
client_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'client', 'dist'))
if not os.path.exists(client_dist):
    client_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), 'client', 'dist'))

app = Flask(__name__, static_folder=client_dist if os.path.exists(client_dist) else None)
app.url_map.strict_slashes = False
CORS(app)

# Asegurar que la base de datos exista al iniciar en el servidor
db_file = os.path.join(os.path.dirname(__file__), 'fotografia.db')
if not os.path.exists(db_file):
    print("Base de datos no encontrada. Inicializando...")
    init_database()

from datetime import timedelta

# Configuración JWT
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "super-secret-key-para-diogo-estudio")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)

@app.before_request
def check_jwt():
    # No verificar JWT en preflights OPTIONS de CORS
    if request.method == 'OPTIONS':
        return
    # Solo requerir JWT para rutas que empiecen con /api/ (excepto login)
    if request.path.startswith('/api/') and not request.path.startswith('/api/auth'):
        verify_jwt_in_request()

# Registrar Blueprints de la API
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(clients_bp, url_prefix='/api/clients')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
app.register_blueprint(services_bp, url_prefix='/api/services')
app.register_blueprint(payments_bp, url_prefix='/api/payments')

# Servir Frontend en Producción (SPA fallback)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if app.static_folder and os.path.exists(app.static_folder):
        file_path = os.path.join(app.static_folder, path)
        if path != "" and os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')
    return {"message": "Diogo Studio API está activo. Ejecute 'npm run build' en client/ para servir la interfaz gráfica unificada."}, 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
