# 📷 Diogo Studio — Sistema de Gestión de Fotografía

CRM/Booking completo para estudio fotográfico. Gestiona clientes, reservas, servicios y pagos con alertas operativas, métricas de lealtad y oportunidades de recontacto.

---

## 🏗️ Estructura del Proyecto

```
Base-de-datos-Diogo/
├── backend/               # API REST con Flask + SQLite
│   ├── app.py             # Servidor principal (puerto 5000)
│   ├── database.py        # Helper de conexión SQLite
│   ├── fotografia.db      # Base de datos SQLite
│   ├── schema.sql         # Esquema de tablas y vistas SQL
│   ├── init_db.py         # Script para reinicializar la BD
│   ├── test_db.py         # Pruebas de integridad de la BD
│   └── routes/
│       ├── dashboard.py   # KPIs, alertas, oportunidades, lealtad
│       ├── clients.py     # CRUD de clientes
│       ├── bookings.py    # CRUD de reservas + flujo de estados
│       ├── services.py    # CRUD del catálogo de servicios
│       └── payments.py    # Registro y consulta de pagos
├── client/                # Frontend React + Vite (puerto 5173)
│   ├── package.json
│   ├── vite.config.js     # Proxy /api → localhost:5000
│   ├── index.html
│   └── src/
│       ├── App.jsx        # Router principal
│       ├── main.jsx       # Entry point
│       ├── styles/
│       │   └── index.css  # Paleta oscura profesional
│       ├── components/    # Componentes reutilizables
│       │   ├── Navbar.jsx
│       │   ├── StatusBadge.jsx
│       │   ├── KpiCard.jsx
│       │   ├── AlertsWidget.jsx
│       │   ├── LoyaltyWidget.jsx
│       │   └── OpportunityWidget.jsx
│       └── pages/         # Vistas principales
│           ├── Dashboard.jsx
│           ├── Clients.jsx
│           ├── Bookings.jsx
│           ├── Services.jsx
│           └── Payments.jsx
├── requirements.txt       # Dependencias Python
├── DESIGN.md              # Documento de diseño UI/UX
└── frontend_summary.md    # Arquitectura del frontend
```

---

## 🚀 Cómo Iniciar

### Requisitos
- Python 3.8+
- Node.js 18+

### 1. Backend (Flask API)

```bash
# Instalar dependencias Python
pip install -r requirements.txt

# Iniciar el servidor API
cd backend
python app.py
```

El servidor quedará corriendo en **http://localhost:5000**

### 2. Frontend (React)

Abrir una **segunda terminal**:

```bash
cd client
npm install      # Solo la primera vez
npm run dev
```

La aplicación quedará en **http://localhost:5173**

---

## 🌐 Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/kpis` | Métricas rápidas |
| GET | `/api/dashboard/alerts` | Alertas operativas |
| GET | `/api/dashboard/opportunities` | Oportunidades de recontacto |
| GET | `/api/dashboard/loyalty` | Ranking de lealtad de clientes |
| GET/POST | `/api/clients/` | Listar / Crear clientes |
| GET/PUT/DELETE | `/api/clients/<id>` | Detalle / Editar / Eliminar |
| GET/POST | `/api/bookings/` | Listar / Crear reservas |
| PATCH | `/api/bookings/<id>/status` | Cambiar estado (con validaciones) |
| GET/POST | `/api/services/` | Catálogo de servicios |
| PATCH | `/api/services/<id>/toggle` | Activar / Desactivar servicio |
| POST | `/api/payments/` | Registrar pago |
| GET | `/api/payments/booking/<id>` | Pago de una reserva |

---

## 🗄️ Base de Datos

**Tablas:** `clients`, `services`, `bookings`, `payments`

**Vistas SQL:**
- `v_client_loyalty` — Nivel de lealtad y descuento sugerido por cliente
- `v_alertas_operativas` — Reservas con saldo pendiente o sin contrato firmado
- `v_oportunidades_recontacto` — Clientes inactivos o con fechas especiales próximas

---

## 🚀 Despliegue en la Nube (100% Gratis)

### Opción Recomendada: Render.com (Frontend + Backend Unificado en 1 solo servicio)
El proyecto está preconfigurado con `render.yaml`, `build.sh` y `Procfile` para compilar React y servirlo directamente desde Flask con Gunicorn sin costo.

1. Sube este repositorio a tu **GitHub** (`git add .`, `git commit -m "Deploy"`, `git push`).
2. Entra a [render.com](https://render.com) y crea una cuenta gratuita.
3. Haz clic en **New +** → **Blueprint** y selecciona tu repositorio.
4. Render leerá automáticamente el archivo `render.yaml` y desplegará todo:
   - **Build Command:** `bash build.sh`
   - **Start Command:** `gunicorn --chdir backend app:app`
5. ¡Listo! Te entregará una URL pública con HTTPS (ej. `https://diogo-studio-crm.onrender.com`).

**Credenciales de acceso inicial:**
- Usuario: `admin`
- Contraseña: `admin123`

---

### Opción 2: Vercel (Frontend) + Render (Backend)
Si prefieres tener el frontend en Vercel:
1. En **Render**, despliega solo la carpeta `backend` como Web Service gratuito.
2. En **Vercel**, importa la carpeta `client` y configura en las variables de entorno o proxy la URL de tu backend en Render.

```bash
cd backend
python init_db.py
```
