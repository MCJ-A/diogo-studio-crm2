import React from 'react';
import Dashboard from './pages/Dashboard';
import './styles/Dashboard.css'; // Importar estilos globales

function App() {
    return (
        <div className="App">
            {/* Aquí se podría añadir un componente de navegación global */}
            <Dashboard />
        </div>
    );
}

export default App;
