import React from 'react';

const OpportunityWidget = ({ opportunities }) => {
    if (!opportunities || opportunities.length === 0) {
        return <p>No hay oportunidades de recontacto programadas.</p>;
    }

    return (
        <div className="opportunity-list">
            {opportunities.map((opp, index) => (
                <div key={index} className="opportunity-item">
                    <strong className="opportunity-name">{opp.nombre}</strong> ({opp.motivo}): {opp.dias} días.
                </div >
            ))}
        </div >
    );
};

export default OpportunityWidget;
