-- Script para crear la base de datos del Gestor Prestamista

CREATE DATABASE IF NOT EXISTS gestor_prestamista 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE gestor_prestamista;
SHOW TABLES;
-- Las tablas se crearán automáticamente con SQLAlchemy
-- Este script solo crea la base de datos
