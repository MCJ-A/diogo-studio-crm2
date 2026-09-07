import React from 'react';

const LoyaltyWidget = ({ loyaltyData }) => {
    if (!loyaltyData) {
        return <p>Cargando datos de lealtad...</p>;
    }

    const { sesiones_completadas, total_gastado, fecha_ultima_sesion, total_referidos, descuento_sugerido_pct } = loyaltyData;

    return (
        <div className="loyalty-card">
            <h3>Nivel de Lealtad</h3>
            <p className="level-badge">Nivel Oro (20% Descuento)</p>
            
            <div className="metric-group">
                <div className="metric-item">
                    <span className="metric-value">${total_gastado.toLocaleString('es-MX')}</span>
                    <span className="metric-label">Total Gastado</span>
                </div >
                <div className="metric-item">
                    <span className="metric-value">{sesiones_completadas}</span>
                    <span className="metric-label">Sesiones Completadas</span>
                </div >
                <div className="metric-item">
                    <span className="metric-value">{total_referidos}</span>
                    <span className="metric-label">Clientes Referidos</span>
                </div >
            </div >

            <div className="action-panel mt-3">
                <p className="alert-info">🎁 Descuento Sugerido: <span className="highlight-discount">{descuento_sugerido_pct}%</span></p>
                <button className="btn-primary">Ver Historial Completo</button>
            </div >
        </div >
    );
};

export default LoyaltyWidget;
