#!/usr/bin/env bash
set -o errexit

echo ">>> Instalando dependencias de Python..."
pip install -r requirements.txt

echo ">>> Construyendo Frontend React (Vite)..."
npm install --include=dev --prefix client
npm run build --prefix client

echo ">>> Inicializando Base de Datos si es necesario..."
python backend/init_db.py

echo ">>> Build finalizado con éxito!"
