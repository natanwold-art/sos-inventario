const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

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
      [activationCode.trim().toUpperCase()]
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
        message: 'Esta licença já está vinculada a outro aparelho.',
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
      [activationCode.trim().toUpperCase()]
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

app.listen(PORT, () => {
  console.log(`License API running on port ${PORT}`);
});