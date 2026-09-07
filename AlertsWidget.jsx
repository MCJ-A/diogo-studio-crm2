import React from 'react';

const AlertsWidget = ({ alerts }) => {
    if (!alerts || alerts.length === 0) {
        return <p className="text-success">✅ No hay alertas operativas pendientes. ¡Todo en orden!</p>;
    }

    return (
        <div className="alert-list">
            {alerts.map((alert, index) => (
                <div key={index} className={`alert-item ${alert.alerta.includes('pendiente') ? 'alert-danger' : 'alert-warning'}`}>
                    <div className="alert-icon">⚠️</div>
                    <div className="alert-details">
                        <strong>{alert.cliente}</strong> ({alert.servicio})
                        <p className="alert-message">{alert.alerta}</p>
                    </div>
                    <div className="alert-actions">
                        {/* Botón que lleva al detalle de la reserva */}
                        <button className="btn-small">Ver Detalle</button>
                    </div>
                    {/* Mostrar el saldo pendiente de forma visible */}
                    {alert.saldo_pendiente > 0 && (
                        <div className="saldo-pendiente">
                            Saldo Pendiente: ${alert.saldo_pendiente.toFixed(2)}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default AlertsWidget;
