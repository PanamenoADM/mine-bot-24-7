```js
const mineflayer = require('mineflayer');

const CONFIG = {
  host: process.env.MC_HOST || 'skybots.aternos.me',
  port: Number(process.env.MC_PORT || 22612),
  username: process.env.MC_USERNAME || 'Raboot_356',
  reconnectDelay: 25000,
  activityInterval: 45000
};

let bot = null;
let reconnectTimer = null;
let activityTimer = null;
let stopping = false;
let busy = false;

function createBot() {
  if (stopping) return;

  console.log(`[Bot] Conectando a ${CONFIG.host}:${CONFIG.port}...`);

  try {
    bot = mineflayer.createBot({
      host: CONFIG.host,
      port: CONFIG.port,
      username: CONFIG.username
      // Mineflayer intentará detectar automáticamente la versión.
    });
  } catch (error) {
    console.error('[Bot] No se pudo crear la conexión:', error.message);
    scheduleReconnect();
    return;
  }

  bot.on('login', () => {
    console.log('[Bot] Inicio de sesión completado.');
  });

  bot.on('spawn', () => {
    console.log('[Bot] Apareció en el mundo.');

    clearInterval(activityTimer);
    activityTimer = setInterval(runActivity, CONFIG.activityInterval);
  });

  bot.on('kicked', (reason) => {
    console.log('[Bot] Expulsado del servidor:', reason);
  });

  bot.on('error', (error) => {
    console.error('[Bot] Error de conexión:', error.message);
  });

  bot.on('end', (reason) => {
    console.log('[Bot] Conexión cerrada:', reason || 'sin motivo indicado');

    clearInterval(activityTimer);
    activityTimer = null;
    busy = false;
    bot = null;

    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    createBot();
  }, CONFIG.reconnectDelay);
}

async function runActivity() {
  if (!bot || !bot.entity || busy || stopping) return;

  busy = true;

  try {
    const chestId = bot.registry.blocksByName.chest?.id;

    if (chestId !== undefined) {
      const chestBlock = bot.findBlock({
        matching: chestId,
        maxDistance: 5
      });

      if (chestBlock) {
        console.log('[Bot] Cofre cercano encontrado.');

        const chest = await bot.openChest(chestBlock);

        await new Promise(resolve => setTimeout(resolve, 2000));

        chest.close();
        console.log('[Bot] Cofre cerrado.');
      } else {
        console.log('[Bot] No hay cofres normales cerca.');
      }
    }

    // Salto breve: puede no funcionar en zonas protegidas
    // y no garantiza que el servidor considere activa la sesión.
    if (bot && bot.entity) {
      bot.setControlState('jump', true);
      await new Promise(resolve => setTimeout(resolve, 300));
      bot.setControlState('jump', false);
    }
  } catch (error) {
    console.error('[Bot] Error durante la rutina:', error.message);

    if (bot) {
      try {
        bot.setControlState('jump', false);
      } catch {}
    }
  } finally {
    busy = false;
  }
}

function shutdown() {
  stopping = true;
  clearInterval(activityTimer);
  clearTimeout(reconnectTimer);

  if (bot) {
    bot.quit('Bot detenido');
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

createBot();
```
