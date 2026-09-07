import React, { useState, useEffect } from 'react';
import AlertsWidget from './AlertsWidget';
import LoyaltyWidget from './LoyaltyWidget';
import './Dashboard.css'; // Asumiendo un archivo de estilos

// --- MOCK API CALLS (REEMPLAZAR CON LLAMADAS REALES A LA API) ---
const mockFetchAlerts = () => {
    // Simula la llamada a /api/dashboard/alerts
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([
                { id: 2, cliente: 'Carlos Rodríguez', servicio: 'Sesión Familiar', estado: 'Entregada', alerta: 'Saldo pendiente en entrega', saldo_pendiente: 200.00 },
                { id: 5, cliente: 'María González', servicio: 'N/A', estado: 'Agendada', alerta: 'Sin contrato firmado', saldo_pendiente: 0 },
            ]);
        }, 500);
    });
};

const mockFetchLoyalty = () => {
    // Simula la llamada a /api/dashboard/loyalty
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                sesiones_completadas: 6,
                total_gastado: 7500.00,
                fecha_ultima_sesion: '2024-08-10',
                total_referidos: 2,
                descuento_sugerido_pct: 20,
            });
        }, 500);
    });
};

const mockFetchOpportunities = () => {
    // Simula la llamada a /api/dashboard/opportunities
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([
                { nombre: 'Ana Martínez', motivo: 'Aniversario', fecha: '2024-08-10', dias: 10 },
                { nombre: 'Luis Fernández', motivo: 'Inactividad', fecha: '2024-04-01', dias: 300 },
            ]);
        }, 500);
    });
};
// -----------------------------------------------------------------

const Dashboard = () => {
    const [alerts, setAlerts] = useState([]);
    const [loyaltyData, setLoyaltyData] = useState(null);
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Obtener Alertas Operativas
                const alertsData = await mockFetchAlerts();
                setAlerts(alertsData);

                // 2. Obtener Métricas de Lealtad
                const loyaltyData = await mockFetchLoyalty();
                setLoyaltyData(loyaltyData);

                // 3. Obtener Oportunidades de Recontacto
                const opportunitiesData = await mockFetchOpportunities();
                setOpportunities(opportunitiesData);

            } catch (error) {
                console.error("Error al cargar datos del dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="dashboard-container">Cargando panel de control...</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Dashboard de Gestión</h1>
            <p className="subtitle">Resumen de alertas y oportunidades de negocio.</p>

            <div className="dashboard-grid">
                {/* Columna Izquierda: Alertas y Oportunidades */}
                <div className="col-md-7">
                    <section className="card mb-4">
                        <h2>🚨 Alertas Operativas Críticas</h2>
                        <AlertsWidget alerts={alerts} />
                    </section>
                    
                    {/* Widget de Oportunidades de Recontacto (Nuevo) */}
                    <section className="card mb-4">
                        <h2>📅 Oportunidades de Recontacto</h2>
                        <div className="opportunity-list">
                            {opportunities.length > 0 ? (
                                opportunities.map((opp, index) => (
                                    <div key={index} className="opportunity-item">
                                        <strong>{opp.nombre}</strong> ({opp.motivo}): {opp.dias} días.
                                    </div>
                                ))
                            ) : (
                                <p>No hay oportunidades de recontacto programadas.</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Columna Derecha: Métricas y Lealtad */}
                <div className="col-md-5">
                    <section className="card mb-4">
                        <h2>🏆 Lealtad del Cliente</h2>
                        <LoyaltyWidget loyaltyData={loyaltyData} />
                    </section>
                    
                    {/* Aquí irían los KPIs (Key Performance Indicators) */}
                    <section className="card mb-4">
                        <h2>📊 KPIs Rápidos</h2>
                        <div className="kpi-grid">
                            <div className="kpi-card">Reservas Hoy: 5</div>
                            <div className="kpi-card">Ingreso Semanal: $15,000</div>
                            <div className="kpi-card">Clientes Activos: 120</div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
