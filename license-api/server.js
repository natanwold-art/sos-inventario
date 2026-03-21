const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS licenses (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(150) NOT NULL,
      owner_name VARCHAR(150),
      whatsapp VARCHAR(30),
      activation_code VARCHAR(80) UNIQUE NOT NULL,
      plan_days INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      device_id VARCHAR(120),
      expires_at TIMESTAMP NOT NULL,
      last_check_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Licenses table ready');
};

const requireAdmin = (req, res, next) => {
  const incomingSecret =
    req.headers['x-admin-secret'] ||
    req.body?.adminSecret ||
    req.query?.adminSecret;

  if (!ADMIN_SECRET || incomingSecret !== ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Acesso administrativo não autorizado.',
    });
  }

  next();
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'SOS Inventário License API online',
  });
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      ok: true,
      db: true,
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error('Health error:', error);
    res.status(500).json({
      ok: false,
      db: false,
      error: 'Database connection failed',
    });
  }
});

app.post('/license/create', async (req, res) => {
  try {
    const {
      companyName,
      ownerName,
      whatsapp,
      activationCode,
      planDays,
    } = req.body;

    if (!companyName || !activationCode || !planDays) {
      return res.status(400).json({
        success: false,
        message: 'companyName, activationCode e planDays são obrigatórios.',
      });
    }

    const normalizedCode = normalizeCode(activationCode);
    const days = Number(planDays);

    if (!days || days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'planDays deve ser maior que zero.',
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const result = await pool.query(
      `
      INSERT INTO licenses (
        company_name,
        owner_name,
        whatsapp,
        activation_code,
        plan_days,
        status,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, 'active', $6)
      RETURNING *
      `,
      [
        companyName.trim(),
        ownerName?.trim() || null,
        whatsapp?.trim() || null,
        normalizedCode,
        days,
        expiresAt.toISOString(),
      ]
    );

    return res.json({
      success: true,
      message: 'Licença criada com sucesso.',
      license: result.rows[0],
    });
  } catch (error) {
    console.error('Create license error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Esse código já existe.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno ao criar licença.',
    });
  }
});

app.post('/license/activate', async (req, res) => {
  try {
    const { activationCode, deviceId } = req.body;

    if (!activationCode) {
      return res.status(400).json({
        success: false,
        message: 'Código de ativação é obrigatório.',
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM licenses
      WHERE activation_code = $1
      LIMIT 1
      `,
      [normalizeCode(activationCode)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Código não encontrado.',
      });
    }

    const license = result.rows[0];

    if (license.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Licença bloqueada.',
      });
    }

    const now = new Date();
    const expiresAt = new Date(license.expires_at);

    if (expiresAt.getTime() <= now.getTime()) {
      return res.status(403).json({
        success: false,
        message: 'Licença expirada.',
      });
    }

    if (license.device_id && deviceId && license.device_id !== deviceId) {
      return res.status(403).json({
        success: false,
        message: 'Esta licença está vinculada a outro aparelho.',
      });
    }

    let updatedLicense = license;

    if (!license.device_id && deviceId) {
      const updateResult = await pool.query(
        `
        UPDATE licenses
        SET device_id = $1,
            last_check_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [deviceId, license.id]
      );

      updatedLicense = updateResult.rows[0];
    } else {
      const updateResult = await pool.query(
        `
        UPDATE licenses
        SET last_check_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [license.id]
      );

      updatedLicense = updateResult.rows[0];
    }

    return res.json({
      success: true,
      message: 'Licença ativada com sucesso.',
      license: {
        companyName: updatedLicense.company_name,
        ownerName: updatedLicense.owner_name,
        activationCode: updatedLicense.activation_code,
        expiresAt: updatedLicense.expires_at,
        status: updatedLicense.status,
        planDays: updatedLicense.plan_days,
      },
    });
  } catch (error) {
    console.error('Activate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao ativar licença.',
    });
  }
});

app.post('/license/check', async (req, res) => {
  try {
    const { activationCode, deviceId } = req.body;

    if (!activationCode) {
      return res.status(400).json({
        success: false,
        message: 'Código de ativação é obrigatório.',
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM licenses
      WHERE activation_code = $1
      LIMIT 1
      `,
      [normalizeCode(activationCode)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Licença não encontrada.',
      });
    }

    const license = result.rows[0];

    if (license.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Licença bloqueada.',
        hasAccess: false,
      });
    }

    const now = new Date();
    const expiresAt = new Date(license.expires_at);

    if (expiresAt.getTime() <= now.getTime()) {
      return res.status(403).json({
        success: false,
        message: 'Licença expirada.',
        hasAccess: false,
      });
    }

    if (license.device_id && deviceId && license.device_id !== deviceId) {
      return res.status(403).json({
        success: false,
        message: 'Licença vinculada a outro aparelho.',
        hasAccess: false,
      });
    }

    await pool.query(
      `
      UPDATE licenses
      SET last_check_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [license.id]
    );

    return res.json({
      success: true,
      hasAccess: true,
      message: 'Licença válida.',
      license: {
        companyName: license.company_name,
        ownerName: license.owner_name,
        activationCode: license.activation_code,
        expiresAt: license.expires_at,
        status: license.status,
        planDays: license.plan_days,
      },
    });
  } catch (error) {
    console.error('Check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao validar licença.',
      hasAccess: false,
    });
  }
});

app.get('/admin/licenses', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM licenses
      ORDER BY created_at DESC
    `);

    return res.json({
      success: true,
      licenses: result.rows,
    });
  } catch (error) {
    console.error('List licenses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar licenças.',
    });
  }
});

app.post('/admin/license/renew', requireAdmin, async (req, res) => {
  try {
    const { activationCode, days } = req.body;

    if (!activationCode || !days) {
      return res.status(400).json({
        success: false,
        message: 'activationCode e days são obrigatórios.',
      });
    }

    const normalizedCode = normalizeCode(activationCode);
    const renewalDays = Number(days);

    if (!renewalDays || renewalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'days deve ser maior que zero.',
      });
    }

    const currentResult = await pool.query(
      `
      SELECT *
      FROM licenses
      WHERE activation_code = $1
      LIMIT 1
      `,
      [normalizedCode]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Licença não encontrada.',
      });
    }

    const current = currentResult.rows[0];
    const baseDate =
      new Date(current.expires_at).getTime() > Date.now()
        ? new Date(current.expires_at)
        : new Date();

    baseDate.setDate(baseDate.getDate() + renewalDays);

    const result = await pool.query(
      `
      UPDATE licenses
      SET expires_at = $1,
          status = 'active',
          updated_at = NOW()
      WHERE activation_code = $2
      RETURNING *
      `,
      [baseDate.toISOString(), normalizedCode]
    );

    return res.json({
      success: true,
      message: 'Licença renovada com sucesso.',
      license: result.rows[0],
    });
  } catch (error) {
    console.error('Renew license error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao renovar licença.',
    });
  }
});

app.post('/admin/license/block', requireAdmin, async (req, res) => {
  try {
    const { activationCode } = req.body;

    if (!activationCode) {
      return res.status(400).json({
        success: false,
        message: 'activationCode é obrigatório.',
      });
    }

    const result = await pool.query(
      `
      UPDATE licenses
      SET status = 'blocked',
          updated_at = NOW()
      WHERE activation_code = $1
      RETURNING *
      `,
      [normalizeCode(activationCode)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Licença não encontrada.',
      });
    }

    return res.json({
      success: true,
      message: 'Licença bloqueada com sucesso.',
      license: result.rows[0],
    });
  } catch (error) {
    console.error('Block license error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao bloquear licença.',
    });
  }
});

app.post('/admin/license/unbind', requireAdmin, async (req, res) => {
  try {
    const { activationCode } = req.body;

    if (!activationCode) {
      return res.status(400).json({
        success: false,
        message: 'activationCode é obrigatório.',
      });
    }

    const result = await pool.query(
      `
      UPDATE licenses
      SET device_id = NULL,
          updated_at = NOW()
      WHERE activation_code = $1
      RETURNING *
      `,
      [normalizeCode(activationCode)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Licença não encontrada.',
      });
    }

    return res.json({
      success: true,
      message: 'Vínculo do aparelho removido com sucesso.',
      license: result.rows[0],
    });
  } catch (error) {
    console.error('Unbind license error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao desvincular licença.',
    });
  }
});

const startServer = async () => {
  try {
    await createTables();

    app.listen(PORT, () => {
      console.log(`License API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
};

startServer();