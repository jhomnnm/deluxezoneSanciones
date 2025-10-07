// auth-routes.js
// Crea este archivo en: C:\Users\jhon\mi-bot-sanciones\auth-routes.js

const express = require('express');
const router = express.Router();

// LISTA DE EMAILS AUTORIZADOS
// Puedes moverlos a una base de datos después
const authorizedEmails = [
    'lizamaaa.09@gmail.com',
    'admin@deluxezone.net',
    'moderador@deluxezone.net',
    // Agrega más emails aquí
];

// Password de administrador (cámbialo por uno seguro)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cambiar_este_password_123';

// Verificar si un email está autorizado
router.post('/check-authorized', (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                error: 'Email requerido',
                authorized: false 
            });
        }
        
        const emailLower = email.toLowerCase().trim();
        const isAuthorized = authorizedEmails.includes(emailLower);
        
        console.log(`[AUTH] ${emailLower} - ${isAuthorized ? '✓ AUTORIZADO' : '✗ DENEGADO'}`);
        
        res.json({ 
            authorized: isAuthorized,
            email: emailLower
        });
    } catch (error) {
        console.error('Error en check-authorized:', error);
        res.status(500).json({ error: 'Error del servidor', authorized: false });
    }
});

// Agregar email autorizado
router.post('/add-email', (req, res) => {
    try {
        const { email, adminPassword } = req.body;
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(403).json({ 
                success: false,
                error: 'Password de administrador incorrecto' 
            });
        }
        
        const emailLower = email.toLowerCase().trim();
        
        if (authorizedEmails.includes(emailLower)) {
            return res.json({ 
                success: true,
                message: 'Email ya está autorizado', 
                email: emailLower 
            });
        }
        
        authorizedEmails.push(emailLower);
        console.log(`[AUTH] ✓ Email agregado: ${emailLower}`);
        
        res.json({ 
            success: true,
            message: 'Email autorizado exitosamente',
            email: emailLower,
            total: authorizedEmails.length
        });
    } catch (error) {
        console.error('Error en add-email:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Remover email autorizado
router.post('/remove-email', (req, res) => {
    try {
        const { email, adminPassword } = req.body;
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(403).json({ 
                success: false,
                error: 'Password de administrador incorrecto' 
            });
        }
        
        const emailLower = email.toLowerCase().trim();
        const index = authorizedEmails.indexOf(emailLower);
        
        if (index === -1) {
            return res.json({ 
                success: true,
                message: 'Email no estaba en la lista' 
            });
        }
        
        authorizedEmails.splice(index, 1);
        console.log(`[AUTH] ✗ Email removido: ${emailLower}`);
        
        res.json({ 
            success: true,
            message: 'Email removido exitosamente',
            email: emailLower,
            total: authorizedEmails.length
        });
    } catch (error) {
        console.error('Error en remove-email:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Listar todos los emails autorizados
router.post('/list-emails', (req, res) => {
    try {
        const { adminPassword } = req.body;
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(403).json({ 
                success: false,
                error: 'Password de administrador incorrecto' 
            });
        }
        
        res.json({ 
            success: true,
            emails: authorizedEmails,
            total: authorizedEmails.length
        });
    } catch (error) {
        console.error('Error en list-emails:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

module.exports = router;