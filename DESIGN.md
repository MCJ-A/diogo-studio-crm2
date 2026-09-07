# 🎨 Documento de Diseño de Interfaz de Usuario (UI/UX) - Sistema de Gestión de Fotografía

Este documento detalla los requisitos de diseño y experiencia de usuario (UX) para el desarrollo del frontend, basándose en la arquitectura de datos y la lógica de negocio definida en la base de datos.

## 🎯 Objetivo de la Interfaz

Crear una plataforma de gestión de servicios (CRM/Booking) que sea intuitiva, eficiente y que guíe al usuario a través del ciclo de vida de la reserva, minimizando errores y maximizando la visibilidad de los datos críticos (alertas y saldos pendientes).

## 👤 Flujos de Usuario Principales (User Journeys)

1. **Flujo de Agendamiento:** Cliente -> Selecciona Servicio -> Elige Fecha/Hora -> Genera Reserva (Estado: Agendada).
2. **Flujo de Servicio:** Reserva Agendada -> Se realiza la sesión -> Actualiza Estado a 'Realizada' -> Se registra el pago (Estado: Completado/Parcial).
3. **Flujo de Revisión:** Reserva 'Entregada' -> El sistema alerta sobre el saldo pendiente -> El usuario genera el reporte final.
4. **Flujo de Gestión:** Dashboard -> El usuario revisa las alertas y oportunidades de recontacto.

## 🧩 Módulos de Interfaz de Usuario (UI) y Componentes

### 1. Dashboard Principal (Vista de Resumen)
*   **Componentes:**
    *   **Widget de Alertas Críticas:** Debe ser el elemento más visible (color rojo/naranja). Debe listar las alertas de `v_alertas_operativas` (Ej: "Saldo pendiente en entrega", "Sin contrato firmado").
    *   **Widget de Oportunidades:** Lista de clientes a contactar (Ej: "María González - Aniversario en 10 días").
    *   **KPIs (Key Performance Indicators):** Tarjetas de métricas rápidas (Ej: "Reservas Hoy", "Ingreso Semanal", "Clientes Activos").
*   **UX Requisito:** La información debe ser escaneable. El usuario debe saber inmediatamente qué requiere acción.

### 2. Gestión de Clientes (CRM)
*   **Estructura:** Debe ser una vista de perfil de cliente.
*   **Secciones:**
    *   **Datos Personales:** (Editable) Nombre, Contacto, Notas.
    *   **Historial de Servicios:** Lista cronológica de todas las reservas (`bookings`).
    *   **Panel de Lealtad:** Un widget dedicado que muestre los datos de `v_client_loyalty` (Ej: "Nivel de Lealtad: Oro", "Descuento Sugerido: 20%").
*   **UX Requisito:** Al hacer clic en un cliente, su historial debe cargarse automáticamente, permitiendo ver el impacto de la lealtad en la gestión.

### 3. Gestión de Reservas (Booking Flow)
*   **Componente Central:** El *Card* de la Reserva. Este componente debe ser dinámico y cambiar su apariencia y funcionalidad según el estado.
*   **Flujo de Estado (CRÍTICO):**
    *   **Agendada:** Mostrar un *checkbox* o botón de "Contrato Firmado" (Validación: Debe ser `true` para avanzar).
    *   **Realizada:** Habilitar el módulo de pagos.
    *   **Entregada:** Mostrar un resumen de pagos y un botón de "Generar Reporte Final".
    *   **Cancelada:** Requerir un campo de texto obligatorio para la "Razón de Cancelación".
*   **UX Requisito:** El usuario debe sentir que está siguiendo un proceso guiado. Los botones de acción deben estar deshabilitados si las condiciones de negocio no se cumplen (Ej: No se puede marcar como 'Entregada' si el pago no está completo).

### 4. Gestión de Pagos (Finanzas)
*   **Diseño:** Debe ser una tabla de transacciones.
*   **Visualización:**
    *   **Monto Bruto:** Visible.
    *   **Descuento Aplicado:** Visible.
    *   **Anticipo Pagado:** Visible.
    *   **Saldo Pendiente:** **Destacar este valor** (Ej: en un color de alerta) y hacerlo de solo lectura.
*   **UX Requisito:** Debe haber un cálculo visible en tiempo real (o al menos una confirmación visual) de cómo se llega al saldo pendiente.

## 🛠️ Requisitos Técnicos y de Componentes (Para el Equipo de Desarrollo)

| Componente | Descripción | Requisitos de Datos |
| :--- | :--- | :--- |
| **Date Picker Avanzado** | Debe manejar zonas horarias y validar la disponibilidad de servicios. | `bookings.fecha_sesion`, `services.activo` |
| **Selector de Estado** | Un componente de *badge* o *pill* que cambie color y texto según el estado de la reserva. | `bookings.estado` |
| **Formulario de Pago** | Debe recibir los tres valores de entrada y mostrar el resultado calculado. | `monto_bruto`, `descuento_aplicado`, `anticipo_pagado` |
| **Tabla de Alertas** | Debe ser un componente de lista que filtre y muestre solo los registros activos. | `v_alertas_operativas` |

## ⚠️ Consideraciones de Diseño General

*   **Consistencia:** Usar una paleta de colores que refleje profesionalismo y confianza.
*   **Accesibilidad:** Asegurar un alto contraste de color y navegación por teclado.
*   **Mobile First:** El flujo de agendamiento y la vista de cliente deben ser completamente funcionales en dispositivos móviles.
