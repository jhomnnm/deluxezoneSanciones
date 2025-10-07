// ==========================================
// SISTEMA DE SANCIONES DELUXEZONE NETWORK
// Bot de Discord + API Backend
// ==========================================

require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

// ==========================================
// VERIFICACIÓN DE VARIABLES DE ENTORNO
// ==========================================
console.log('🔍 Verificando configuración...');
if (!process.env.DISCORD_TOKEN) console.error('❌ DISCORD_TOKEN no configurado');
if (!process.env.MONGODB_URI) console.error('❌ MONGODB_URI no configurado');
if (!process.env.JWT_SECRET) console.error('❌ JWT_SECRET no configurado');
console.log('✅ Variables de entorno cargadas');

// ==========================================
// CONFIGURACIÓN
// ==========================================
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Configuración de canales de Discord
const CANALES_CONFIG = {
  '1424754617551425697': {
    nombre: 'Baneos',
    tipo: 'baneo',
    plantilla: '🚫 Usuario baneado'
  },
  '1424754731569381548': {
    nombre: 'Muteos',
    tipo: 'muteo',
    plantilla: '🔇 Usuario muteado'
  }
};

// Configuración de roles autorizados para comandos administrativos
const ROLES_AUTORIZADOS = [
  '1234567890123456789', // ID del rol Admin
  '9876543210987654321', // ID del rol Moderador
  '1111111111111111111'  // ID del rol Staff
  // Agrega aquí las IDs de los roles que pueden usar los comandos
];

// ==========================================
// SANCIONES PREDEFINIDAS
// ==========================================
const SANCIONES_PREDEFINIDAS = {
  muteo: {
    'Flood': [
      { nivel: 1, duracion: 1/24, descripcion: '1 Hora' },
      { nivel: 2, duracion: 2/24, descripcion: '2 Horas' }
    ],
    'Spam': [
      { nivel: 1, duracion: 1/24, descripcion: '1 Hora' },
      { nivel: 2, duracion: 2/24, descripcion: '2 Horas' }
    ],
    'Fomentar el Spam': [
      { nivel: 1, duracion: 0.5, descripcion: '12 Horas' },
      { nivel: 2, duracion: 2, descripcion: '2 Días' }
    ],
    'Spam x msg': [
      { nivel: 1, duracion: 5/24, descripcion: '5 Horas' },
      { nivel: 2, duracion: 1, descripcion: '1 Día' }
    ],
    'Insulto': [
      { nivel: 1, duracion: 2/24, descripcion: '2 Horas' },
      { nivel: 2, duracion: 5/24, descripcion: '5 Horas' }
    ],
    'Toxicidad': [
      { nivel: 1, duracion: 2/24, descripcion: '2 Horas' },
      { nivel: 2, duracion: 5/24, descripcion: '5 Horas' }
    ],
    'Acosar a Usuarios': [
      { nivel: 1, duracion: 1, descripcion: '1 Día' },
      { nivel: 2, duracion: 2, descripcion: '2 Días' }
    ],
    'Discusiones': [
      { nivel: 1, duracion: 3/24, descripcion: '3 Horas' }
    ],
    'Cuestionamiento al Staff': [
      { nivel: 1, duracion: 1, descripcion: '1 Día' }
    ],
    'Mal uso de /helpop y /report': [
      { nivel: 1, duracion: 1, descripcion: '1 Día' }
    ],
    'Mencionar servidor': [
      { nivel: 1, duracion: 5/24, descripcion: '5 Horas' }
    ],
    'Promoción de stream sin rango': [
      { nivel: 1, duracion: 5/24, descripcion: '5 Horas' }
    ],
    'Mandar ip de otro servidor': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Acumulación de 10 sanciones': [
      { nivel: 1, duracion: 5, descripcion: '5 Días' }
    ],
    'Acumulación de 15 sanciones': [
      { nivel: 1, duracion: 10, descripcion: '10 Días' },
      { nivel: 2, duracion: 15, descripcion: '15 Días' }
    ],
    'Acumulación de 20 sanciones': [
      { nivel: 1, duracion: 20, descripcion: '20 Días' },
      { nivel: 2, duracion: 30, descripcion: '30 Días' }
    ],
    'Acumulación de 25 sanciones': [
      { nivel: 1, duracion: 40, descripcion: '40 Días' },
      { nivel: 2, duracion: null, descripcion: 'Permanente' }
    ]
  },
  baneo: {
    'Abuso de bugs': [
      { nivel: 1, duracion: 5, descripcion: '5 Días' },
      { nivel: 2, duracion: 10, descripcion: '10 Días' },
      { nivel: 3, duracion: 20, descripcion: '20 Días' },
      { nivel: 4, duracion: 35, descripcion: '35 Días' },
      { nivel: 5, duracion: null, descripcion: 'Permanente' }
    ],
    'Hacks': [
      { nivel: 1, duracion: 20, descripcion: '20 Días' },
      { nivel: 2, duracion: 35, descripcion: '35 Días' },
      { nivel: 3, duracion: 50, descripcion: '50 Días' },
      { nivel: 4, duracion: null, descripcion: 'Permanente' }
    ],
    'Ghost Client': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Incumplimientos de SS': [
      { nivel: 1, duracion: 15, descripcion: '15 Días' },
      { nivel: 2, duracion: 20, descripcion: '20 Días' },
      { nivel: 3, duracion: 25, descripcion: '25 Días' }
    ],
    'Intento de tradeos ítem ilegales': [
      { nivel: 1, duracion: 7, descripcion: '7 Días', nota: 'Se remueven los ítems que se intentaron tradear' },
      { nivel: 2, duracion: 10, descripcion: '10 Días', nota: 'Se remueven los ítems que se intentaron tradear' },
      { nivel: 3, duracion: 15, descripcion: '15 Días', nota: 'Se remueven los ítems que se intentaron tradear' },
      { nivel: 4, duracion: 35, descripcion: '35 Días', nota: 'Se remueven los ítems que se intentaron tradear' },
      { nivel: 5, duracion: null, descripcion: 'Permanente', nota: 'Se remueven los ítems que se intentaron tradear' }
    ],
    'Tradeo/Prestar ítem ilegales': [
      { nivel: 1, duracion: 15, descripcion: '15 Días', nota: 'Se remueven los ítems tradeados/prestados' },
      { nivel: 2, duracion: 20, descripcion: '20 Días', nota: 'Se remueven los ítems tradeados/prestados' },
      { nivel: 3, duracion: 30, descripcion: '30 Días', nota: 'Se remueven los ítems tradeados/prestados' },
      { nivel: 4, duracion: 40, descripcion: '40 Días', nota: 'Se remueven los ítems tradeados/prestados' },
      { nivel: 5, duracion: null, descripcion: 'Permanente', nota: 'Se remueven los ítems tradeados/prestados' }
    ],
    'Intento de lucro en el servidor': [
      { nivel: 1, duracion: 20, descripcion: '20 Días', nota: 'Se remueven los ítems que se intentaron vender' },
      { nivel: 2, duracion: 30, descripcion: '30 Días', nota: 'Se remueven los ítems que se intentaron vender' },
      { nivel: 3, duracion: null, descripcion: 'Permanente', nota: 'Se remueven los ítems que se intentaron vender' }
    ],
    'Estafas Masivas': [
      { nivel: 1, duracion: 10, descripcion: '10 Días', nota: 'Se remueven los ítems estafados' },
      { nivel: 2, duracion: 15, descripcion: '15 Días', nota: 'Se remueven los ítems estafados' },
      { nivel: 3, duracion: 30, descripcion: '30 Días', nota: 'Se remueven los ítems estafados' },
      { nivel: 4, duracion: null, descripcion: 'Permanente', nota: 'Se remueven los ítems estafados' }
    ],
    'Estafas en Mercado': [
      { nivel: 1, duracion: 10, descripcion: '10 Días' },
      { nivel: 2, duracion: 20, descripcion: '20 Días' },
      { nivel: 3, duracion: 30, descripcion: '30 Días' },
      { nivel: 4, duracion: null, descripcion: 'Permanente' }
    ],
    'Mal uso de multicuentas': [
      { nivel: 1, duracion: 10, descripcion: '10 Días' },
      { nivel: 2, duracion: 20, descripcion: '20 Días' },
      { nivel: 3, duracion: 25, descripcion: '25 Días' },
      { nivel: 4, duracion: 30, descripcion: '30 Días' },
      { nivel: 5, duracion: null, descripcion: 'Permanente' }
    ],
    'Farmeo de kills': [
      { nivel: 1, duracion: 5, descripcion: '5 Días' },
      { nivel: 2, duracion: 7, descripcion: '7 Días' },
      { nivel: 3, duracion: 10, descripcion: '10 Días' },
      { nivel: 4, duracion: 15, descripcion: '15 Días' }
    ],
    'Doxeo a usuario DC o MC del server': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Doxeo a staff': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Robo de cuenta': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Prestar/Regalar/Vender Cuenta': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Nick Inapropiados': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Dupes': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'IPS de otros servidores': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ],
    'Manipulacion de evidencia': [
      { nivel: 1, duracion: null, descripcion: 'Permanente' }
    ]
  }
};

// ==========================================
// CONEXIÓN A MONGODB ATLAS
// ==========================================
console.log('🔗 Intentando conectar a MongoDB Atlas...');
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
.catch((err) => {
  console.error('❌ Error al conectar a MongoDB Atlas:', err.message);
  process.exit(1);
});

// ==========================================
// MODELOS DE MONGOOSE
// ==========================================

const usuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  codigoVerificacion: String,
  codigoExpiracion: Date,
  verificado: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

const sancionSchema = new mongoose.Schema({
  nombreUsuario: { type: String, required: true },
  servidor: { type: String, required: true },
  razon: { type: String, required: true },
  tipo: { type: String, enum: ['baneo', 'muteo'], required: true },
  canal: String,
  activo: { type: Boolean, default: true },
  evidencias: [String],
  plantilla: String,
  duracionDias: { type: Number, default: null },
  fechaExpiracion: { type: Date, default: null },
  nivelSancion: { type: Number, default: 1 },
  notaAdicional: String,
  createdAt: { type: Date, default: Date.now }
});

const Sancion = mongoose.model('Sancion', sancionSchema);

// Modelo para Backups
const backupSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  totalSanciones: Number,
  totalUsuarios: Number,
  datos: Object,
  tipo: { type: String, default: 'automatico' }
});

const Backup = mongoose.model('Backup', backupSchema);

// ==========================================
// CONFIGURACIÓN DE NODEMAILER
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==========================================
// SISTEMA DE BACKUPS AUTOMÁTICOS
// ==========================================
const realizarBackup = async () => {
  try {
    console.log('📦 Iniciando backup automático...');
    
    const sanciones = await Sancion.find({});
    const usuarios = await Usuario.find({});
    
    const backup = new Backup({
      totalSanciones: sanciones.length,
      totalUsuarios: usuarios.length,
      datos: {
        sanciones,
        usuarios
      }
    });
    
    await backup.save();
    
    console.log(`✅ Backup completado: ${sanciones.length} sanciones y ${usuarios.length} usuarios guardados`);
  } catch (error) {
    console.error('❌ Error al realizar backup:', error);
  }
};

// Ejecutar backup diario a las 3:00 AM
const programarBackups = () => {
  const ahora = new Date();
  const proximoBackup = new Date();
  proximoBackup.setHours(3, 0, 0, 0);
  
  if (ahora > proximoBackup) {
    proximoBackup.setDate(proximoBackup.getDate() + 1);
  }
  
  const tiempoHastaBackup = proximoBackup.getTime() - ahora.getTime();
  
  setTimeout(() => {
    realizarBackup();
    setInterval(realizarBackup, 24 * 60 * 60 * 1000); // Cada 24 horas
  }, tiempoHastaBackup);
  
  console.log(`⏰ Próximo backup programado para: ${proximoBackup.toLocaleString('es-ES')}`);
};

// Iniciar sistema de backups
programarBackups();

// ==========================================
// BOT DE DISCORD
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`📋 Canales configurados:`);
  Object.entries(CANALES_CONFIG).forEach(([id, config]) => {
    console.log(`   - ${config.nombre} (${config.tipo}): ${id}`);
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ==========================================
  // VERIFICACIÓN DE PERMISOS PARA COMANDOS ADMIN
  // ==========================================
  const tienePermisos = () => {
    if (!message.member) return false;
    return message.member.roles.cache.some(role => ROLES_AUTORIZADOS.includes(role.id));
  };

  // ==========================================
  // COMANDO: !BORRAR - Eliminar historial de jugador
  // ==========================================
  if (message.content.startsWith('!borrar ')) {
    if (!tienePermisos()) {
      return message.reply('❌ No tienes permisos para usar este comando.');
    }

    const username = message.content.slice(8).trim();
    
    if (!username) {
      return message.reply('❌ Debes especificar un nombre de usuario.\n**Uso:** `!borrar NombreUsuario`');
    }

    try {
      const resultado = await Sancion.deleteMany({ nombreUsuario: username });

      if (resultado.deletedCount === 0) {
        return message.reply(`⚠️ No se encontraron sanciones para el jugador **${username}**`);
      }

      await message.reply({
        content: `✅ **Historial eliminado exitosamente**\n\n👤 **Jugador:** ${username}\n🗑️ **Sanciones eliminadas:** ${resultado.deletedCount}\n\n_El historial de este jugador ha sido borrado completamente._`
      });

      console.log(`🗑️ Historial eliminado por ${message.author.tag}: ${username} (${resultado.deletedCount} sanciones)`);

    } catch (error) {
      console.error('Error al borrar historial:', error);
      await message.reply('❌ Error al eliminar el historial. Intenta nuevamente.');
    }
    return;
  }

  // ==========================================
  // COMANDO: !BACKUP - Crear backup manual
  // ==========================================
  if (message.content === '!backup') {
    if (!tienePermisos()) {
      return message.reply('❌ No tienes permisos para usar este comando.');
    }

    try {
      await message.reply('📦 Creando backup manual...');

      const sanciones = await Sancion.find({});
      const usuarios = await Usuario.find({});
      
      const backup = new Backup({
        totalSanciones: sanciones.length,
        totalUsuarios: usuarios.length,
        datos: {
          sanciones,
          usuarios
        },
        tipo: 'manual'
      });
      
      await backup.save();

      await message.reply({
        content: `✅ **Backup creado exitosamente**\n\n📊 **Estadísticas:**\n• Sanciones: ${sanciones.length}\n• Usuarios: ${usuarios.length}\n• Fecha: ${new Date().toLocaleString('es-ES')}\n• Tipo: Manual\n🆔 **ID:** \`${backup._id}\``
      });

      console.log(`📦 Backup manual creado por ${message.author.tag}`);

    } catch (error) {
      console.error('Error al crear backup:', error);
      await message.reply('❌ Error al crear el backup. Intenta nuevamente.');
    }
    return;
  }

  // ==========================================
  // COMANDO: !BACKUPS - Listar backups disponibles
  // ==========================================
  if (message.content === '!backups') {
    if (!tienePermisos()) {
      return message.reply('❌ No tienes permisos para usar este comando.');
    }

    try {
      const backups = await Backup.find({}).sort({ fecha: -1 }).limit(10);

      if (backups.length === 0) {
        return message.reply('⚠️ No hay backups disponibles.');
      }

      let lista = '📋 **Últimos 10 Backups**\n\n';
      
      backups.forEach((backup, index) => {
        lista += `**${index + 1}.** \`${backup._id}\`\n`;
        lista += `   📅 ${backup.fecha.toLocaleString('es-ES')}\n`;
        lista += `   📊 ${backup.totalSanciones} sanciones | ${backup.totalUsuarios} usuarios\n`;
        lista += `   🔖 Tipo: ${backup.tipo === 'manual' ? 'Manual' : 'Automático'}\n\n`;
      });

      await message.reply(lista);

    } catch (error) {
      console.error('Error al listar backups:', error);
      await message.reply('❌ Error al obtener la lista de backups.');
    }
    return;
  }

  // ==========================================
  // SISTEMA DE REGISTRO DE SANCIONES
  // ==========================================
  const canalConfig = CANALES_CONFIG[message.channel.id];
  if (!canalConfig) return;

  const lineas = message.content.trim().split('\n').filter(l => l.trim());
  
  if (lineas.length < 3) {
    return message.reply('❌ Formato incorrecto. Debes enviar:\n```\nNombreUsuario\nServidor\nRazón (ej: Hacks-2 para nivel 2)\nNivel (opcional, ej: 2)```');
  }

  const nombreUsuario = lineas[0].trim();
  const servidor = lineas[1].trim();
  let razon = lineas[2].trim();
  const evidencias = message.attachments.map(att => att.url);

  // Detectar nivel de sanción
  let nivelSancion = 1;
  let razonBase = razon;
  
  // Buscar patrón "Razón-Nivel" o "Razón nivel"
  const matchNivel = razon.match(/(.+?)[-\s](\d+)$/);
  if (matchNivel) {
    razonBase = matchNivel[1].trim();
    nivelSancion = parseInt(matchNivel[2]);
  }

  // Buscar en sanciones predefinidas
  let duracionDias = null;
  let fechaExpiracion = null;
  let descripcionDuracion = 'Permanente';
  let notaAdicional = null;

  const sancionesTipo = SANCIONES_PREDEFINIDAS[canalConfig.tipo];
  if (sancionesTipo) {
    for (const [nombreSancion, niveles] of Object.entries(sancionesTipo)) {
      if (razonBase.toLowerCase().includes(nombreSancion.toLowerCase()) || 
          nombreSancion.toLowerCase().includes(razonBase.toLowerCase())) {
        
        const nivel = niveles.find(n => n.nivel === nivelSancion) || niveles[0];
        
        if (nivel) {
          duracionDias = nivel.duracion;
          descripcionDuracion = nivel.descripcion;
          notaAdicional = nivel.nota;
          
          if (duracionDias !== null) {
            fechaExpiracion = new Date();
            fechaExpiracion.setDate(fechaExpiracion.getDate() + Math.ceil(duracionDias));
          }
          
          razonBase = nombreSancion;
          break;
        }
      }
    }
  }

  try {
    const sancion = new Sancion({
      nombreUsuario,
      servidor,
      razon: razonBase,
      tipo: canalConfig.tipo,
      canal: canalConfig.nombre,
      evidencias,
      plantilla: canalConfig.plantilla,
      activo: true,
      duracionDias,
      fechaExpiracion,
      nivelSancion,
      notaAdicional
    });

    await sancion.save();

    const duracionTexto = duracionDias !== null ? 
      `⏱️ **Duración:** ${descripcionDuracion}\n📅 **Expira:** ${fechaExpiracion.toLocaleDateString('es-ES')}` : 
      '⏱️ **Duración:** Permanente';
    
    const notaTexto = notaAdicional ? `\n⚠️ **Nota:** ${notaAdicional}` : '';
    
    await message.reply({
      content: `✅ **Sanción registrada exitosamente**\n\n${canalConfig.plantilla}\n\n**👤 Usuario:** ${nombreUsuario}\n**🎮 Servidor:** ${servidor}\n**📋 Razón:** ${razonBase}\n**🔢 Nivel:** ${nivelSancion}\n${duracionTexto}\n**📸 Evidencias:** ${evidencias.length} archivo(s)${notaTexto}\n**🆔 ID:** \`${sancion._id}\``
    });

    console.log(`📝 Nueva sanción registrada: ${nombreUsuario} - ${servidor} - ${razonBase} (Nivel ${nivelSancion})`);

  } catch (error) {
    console.error('Error al guardar sanción:', error);
    await message.reply('❌ Error al registrar la sanción. Intenta nuevamente.');
  }
});

client.login(process.env.DISCORD_TOKEN);

// ==========================================
// SERVIDOR EXPRESS (API)
// ==========================================
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.post('/api/enviar-codigo', async (req, res) => {
  try {
    const { email } = req.body;
    const codigo = crypto.randomInt(100000, 999999).toString();
    const expiracion = new Date(Date.now() + 10 * 60 * 1000);

    let usuario = await Usuario.findOne({ email });
    
    if (!usuario) {
      usuario = new Usuario({ 
        email, 
        password: 'temporal',
        verificado: false 
      });
    }

    usuario.codigoVerificacion = codigo;
    usuario.codigoExpiracion = expiracion;
    await usuario.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Código de Verificación - DeluxeZone Network',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #a855f7;">DeluxeZone Network</h2>
          <p>Tu código de verificación es:</p>
          <h1 style="background: linear-gradient(135deg, #a855f7, #10b981); 
                     -webkit-background-clip: text; 
                     -webkit-text-fill-color: transparent; 
                     font-size: 48px; 
                     letter-spacing: 10px;">
            ${codigo}
          </h1>
          <p>Este código expirará en 10 minutos.</p>
        </div>
      `
    });

    res.json({ mensaje: 'Código enviado exitosamente' });

  } catch (error) {
    console.error('Error al enviar código:', error);
    res.status(500).json({ error: 'Error al enviar el código' });
  }
});

app.post('/api/verificar-codigo', async (req, res) => {
  try {
    const { email, codigo } = req.body;
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.codigoVerificacion !== codigo) {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    if (new Date() > usuario.codigoExpiracion) {
      return res.status(400).json({ error: 'Código expirado' });
    }

    res.json({ mensaje: 'Código verificado correctamente' });

  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ error: 'Error al verificar el código' });
  }
});

app.post('/api/establecer-password', async (req, res) => {
  try {
    const { email, codigo, password } = req.body;
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.codigoVerificacion !== codigo) {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    usuario.password = passwordHash;
    usuario.verificado = true;
    usuario.codigoVerificacion = undefined;
    usuario.codigoExpiracion = undefined;
    await usuario.save();

    res.json({ mensaje: 'Contraseña establecida exitosamente' });

  } catch (error) {
    console.error('Error al establecer contraseña:', error);
    res.status(500).json({ error: 'Error al establecer la contraseña' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.verificado) {
      return res.status(401).json({ error: 'Usuario no verificado' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, email: usuario.email });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// ==========================================
// RUTAS DE SANCIONES
// ==========================================

app.get('/api/sanciones', verificarToken, async (req, res) => {
  try {
    const { usuario, servidor, tipo, activo } = req.query;
    
    let filtros = {};
    if (usuario) filtros.nombreUsuario = new RegExp(usuario, 'i');
    if (servidor) filtros.servidor = new RegExp(servidor, 'i');
    if (tipo) filtros.tipo = tipo;
    if (activo !== undefined) filtros.activo = activo === 'true';

    const sanciones = await Sancion.find(filtros).sort({ createdAt: -1 });
    
    res.json(sanciones);
  } catch (error) {
    console.error('Error al obtener sanciones:', error);
    res.status(500).json({ error: 'Error al obtener sanciones' });
  }
});

app.get('/api/sanciones-predefinidas', verificarToken, (req, res) => {
  res.json(SANCIONES_PREDEFINIDAS);
});

app.patch('/api/sanciones/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const sancion = await Sancion.findByIdAndUpdate(
      id,
      { activo },
      { new: true }
    );

    if (!sancion) {
      return res.status(404).json({ error: 'Sanción no encontrada' });
    }

    res.json(sancion);
  } catch (error) {
    console.error('Error al actualizar sanción:', error);
    res.status(500).json({ error: 'Error al actualizar sanción' });
  }
});

app.delete('/api/sanciones/jugador/:username', verificarToken, async (req, res) => {
  try {
    const { username } = req.params;

    const resultado = await Sancion.deleteMany({ nombreUsuario: username });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ error: 'No se encontraron sanciones para este jugador' });
    }

    res.json({ 
      mensaje: `Se eliminaron ${resultado.deletedCount} sanción(es) del jugador ${username}`,
      eliminadas: resultado.deletedCount 
    });
  } catch (error) {
    console.error('Error al eliminar sanciones:', error);
    res.status(500).json({ error: 'Error al eliminar sanciones del jugador' });
  }
});

// ==========================================
// RUTAS DE BACKUPS
// ==========================================

app.get('/api/backups', verificarToken, async (req, res) => {
  try {
    const backups = await Backup.find({})
      .select('-datos') // Excluir datos completos para optimizar
      .sort({ fecha: -1 })
      .limit(20);
    
    res.json(backups);
  } catch (error) {
    console.error('Error al obtener backups:', error);
    res.status(500).json({ error: 'Error al obtener backups' });
  }
});

app.post('/api/backups', verificarToken, async (req, res) => {
  try {
    const sanciones = await Sancion.find({});
    const usuarios = await Usuario.find({});
    
    const backup = new Backup({
      totalSanciones: sanciones.length,
      totalUsuarios: usuarios.length,
      datos: {
        sanciones,
        usuarios
      },
      tipo: 'manual'
    });
    
    await backup.save();

    res.json({ 
      mensaje: 'Backup creado exitosamente',
      backup: {
        id: backup._id,
        fecha: backup.fecha,
        totalSanciones: backup.totalSanciones,
        totalUsuarios: backup.totalUsuarios
      }
    });
  } catch (error) {
    console.error('Error al crear backup:', error);
    res.status(500).json({ error: 'Error al crear backup' });
  }
});

app.get('/api/backups/:id/restaurar', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await Backup.findById(id);

    if (!backup) {
      return res.status(404).json({ error: 'Backup no encontrado' });
    }

    // Restaurar sanciones
    if (backup.datos.sanciones) {
      await Sancion.deleteMany({});
      await Sancion.insertMany(backup.datos.sanciones);
    }

    res.json({ 
      mensaje: 'Backup restaurado exitosamente',
      sancionesRestauradas: backup.totalSanciones
    });
  } catch (error) {
    console.error('Error al restaurar backup:', error);
    res.status(500).json({ error: 'Error al restaurar backup' });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`🌐 Servidor web ejecutándose en puerto ${PORT}`);
  console.log(`📝 Panel disponible en: http://localhost:${PORT}`);
});