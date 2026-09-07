# 🚀 Resumen de Arquitectura y Requisitos para el Frontend (Sistema de Gestión de Fotografía)

Este documento sirve como guía de alto nivel para el desarrollo del frontend, mapeando la lógica de negocio compleja (contenida en las vistas SQL) a módulos de interfaz de usuario (UI) y flujos de trabajo.

## 🎯 Objetivo del Frontend

Crear una interfaz de usuario intuitiva y robusta que permita al personal gestionar el ciclo de vida completo de una reserva, desde la agendación hasta el registro del pago y la generación de reportes de lealtad.

## 🌐 Flujo de Datos General (API Conceptual)

El frontend no debe interactuar directamente con la base de datos. Debe consumir una API RESTful que actúe como capa de servicio, ejecutando las consultas complejas de las vistas SQL.

**Endpoints Clave Sugeridos:**

1.  `/api/clients`: CRUD de clientes.
2.  `/api/services`: CRUD de servicios.
3.  `/api/bookings`: Obtener, crear, actualizar y listar reservas.
4.  `/api/payments`: Registrar pagos y obtener historial financiero.
5.  `/api/dashboard/alerts`: Obtener las alertas operativas (`v_alertas_operativas`).
6.  `/api/dashboard/opportunities`: Obtener oportunidades de recontacto (`v_oportunidades_recontacto`).
7.  `/api/dashboard/loyalty`: Obtener métricas de lealtad (`v_client_loyalty`).

---

## 🧩 Módulos de Interfaz de Usuario (UI)

### 1. Dashboard Principal (Vista de Resumen)
**Propósito:** Mostrar al usuario, al iniciar sesión, qué requiere atención inmediata.
**Datos a Consumir:**
*   **Alertas Operativas:** Lista de reservas 'Entregadas' con saldo pendiente o reservas 'Agendadas' sin contrato firmado. (Fuente: `v_alertas_operativas`).
*   **Oportunidades de Recontacto:** Tarjetas o lista de clientes que deben ser contactados (inactivos o con fechas especiales próximas). (Fuente: `v_oportunidades_recontacto`).
*   **Métricas Rápidas:** Resumen de ingresos del día/semana, número de reservas pendientes.

### 2. Gestión de Clientes (CRM)
**Propósito:** Ver el perfil completo y el historial de un cliente.
**Datos a Consumir:**
*   **Datos Base:** `clients` (Nombre, Teléfono, Email, Instagram, Notas).
*   **Historial:** Lista de todas las reservas (`bookings`) asociadas a este cliente.
*   **Lealtad:** Mostrar métricas de lealtad (Total Gastado, Sesiones Completadas, Descuento Sugerido) en un panel lateral. (Fuente: `v_client_loyalty`).

### 3. Gestión de Servicios (Catálogo)
**Propósito:** Administrar el catálogo de servicios.
**Datos a Consumir:**
*   `services` (Nombre, Precio Base, Entregables, Estado Activo).
*   **Funcionalidad:** Debe permitir la activación/desactivación de servicios.

### 4. Gestión de Reservas (Booking Flow)
**Propósito:** El flujo de trabajo central. Debe guiar al usuario a través de los diferentes estados.
**Datos a Consumir:**
*   `bookings` (Detalles de la cita, Ubicación, Fecha).
*   **Flujo de Estado (CRÍTICO):** La UI debe cambiar drásticamente según el estado:
    *   **Agendada:** Debe forzar la verificación de `contrato_firmado`.
    *   **Realizada:** Debe habilitar el módulo de pago.
    *   **Entregada:** Debe mostrar el saldo pendiente y la opción de generar reportes.
    *   **Cancelada:** Debe registrar la razón de la cancelación.

### 5. Gestión de Pagos (Finanzas)
**Propósito:** Registrar y visualizar el estado financiero de la reserva.
**Datos a Consumir:**
*   `payments` (Monto Bruto, Descuento, Anticipo, Estado de Pago).
*   **Lógica de Cálculo:** El campo `saldo_pendiente` debe ser **solo de lectura** en el frontend, ya que es calculado por la base de datos. El frontend solo debe enviar los valores de `monto_bruto`, `descuento_aplicado` y `anticipo_pagado`.

---

## 💡 Requisitos de Lógica de Negocio (Backend/API)

Estos puntos son la columna vertebral del sistema y deben ser manejados por la API, no por el frontend.

1.  **Cálculo de Saldo Pendiente:** El frontend debe entender que el saldo es un cálculo derivado (`Monto Bruto - Descuento - Anticipo`).
2.  **Validación de Estados:** La API debe validar transiciones de estado (Ej: No se puede pasar de 'Agendada' a 'Entregada' sin pasar por 'Realizada').
3.  **Lógica de Lealtad:** La lógica de cálculo de `descuento_sugerido_pct` debe ser consumida directamente de la vista `v_client_loyalty`.
4.  **Fechas de Recontacto:** La lógica de detección de fechas especiales (aniversarios, etc.) debe ser consumida de `v_oportunidades_recontacto`.

## 🛠️ Recomendaciones Técnicas para el Desarrollo

*   **Componentización:** Diseñar componentes reutilizables para el estado de la reserva (ej: un componente de "Estado" que cambie color y texto según el valor de `bookings.estado`).
*   **Manejo de Fechas:** Utilizar librerías de manejo de fechas robustas, ya que la lógica de negocio depende fuertemente de la comparación de fechas (días, meses, años).
*   **Validaciones:** Implementar validaciones de formulario en el cliente, pero **siempre** asumir que la API realizará las validaciones de negocio finales (ej: ¿Es posible pagar un saldo negativo?).
