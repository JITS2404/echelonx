import { query } from '../config/database.js';
import { audit } from '../config/logger.js';

/**
 * Resolves req.params.countryCode (or req.body.countryCode) to a DB row,
 * verifies the authenticated user owns it, and attaches req.ownedCountry.
 *
 * Requires requireAuth to have run first (req.user must be set).
 *
 * Usage:
 *   router.delete('/:countryCode', requireAuth, requireCountryOwnership, handler)
 */
export async function requireCountryOwnership(req, res, next) {
  try {
    const rawCode = req.params.countryCode ?? req.params.code ?? req.body?.countryCode;
    if (!rawCode) {
      return res.status(400).json({ error: 'Country code is required.' });
    }

    const countryCode = rawCode.toUpperCase().trim();
    const userId = req.user.userId;

    const result = await query(
      'SELECT id, code, name, user_id FROM countries WHERE code = $1',
      [countryCode]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: `Country '${countryCode}' not found.` });
    }

    const country = result.rows[0];

    // user_id NULL means it is a seeded/system country — only allow reads, not mutations.
    // For write operations the caller must own it.
    if (country.user_id !== userId) {
      audit.ownershipDenied(userId, `country:${countryCode}`, req.requestId);
      return res.status(404).json({ error: `Country '${countryCode}' not found.` });
    }

    req.ownedCountry = { id: country.id, code: country.code, name: country.name };
    next();
  } catch (err) {
    console.error('Ownership check error:', err.message);
    res.status(500).json({ error: 'Authorization check failed.' });
  }
}

/**
 * Resolves a simulation run by its DB id, verifies the requesting user owns it.
 * Expects req.params.runId.
 */
export async function requireSimulationOwnership(req, res, next) {
  try {
    const runId = parseInt(req.params.runId, 10);
    if (isNaN(runId)) {
      return res.status(400).json({ error: 'Invalid simulation run ID.' });
    }

    const result = await query(
      'SELECT id, user_id FROM simulation_runs WHERE id = $1',
      [runId]
    );

    if (result.rows.length === 0 || result.rows[0].user_id !== req.user.userId) {
      audit.ownershipDenied(req.user.userId, `simulation_run:${runId}`, req.requestId);
      return res.status(404).json({ error: 'Simulation run not found.' });
    }

    req.ownedRunId = runId;
    next();
  } catch (err) {
    console.error('Simulation ownership check error:', err.message);
    res.status(500).json({ error: 'Authorization check failed.' });
  }
}

/**
 * Resolves a backtest result by its DB id, verifies the requesting user owns it.
 * Expects req.params.backtestId.
 */
export async function requireBacktestOwnership(req, res, next) {
  try {
    const backtestId = parseInt(req.params.backtestId, 10);
    if (isNaN(backtestId)) {
      return res.status(400).json({ error: 'Invalid backtest ID.' });
    }

    const result = await query(
      'SELECT id, user_id FROM backtest_results WHERE id = $1',
      [backtestId]
    );

    if (!result.rows.length || result.rows[0].user_id !== req.user.userId) {
      audit.ownershipDenied(req.user.userId, `backtest:${backtestId}`, req.requestId);
      return res.status(404).json({ error: 'Backtest result not found.' });
    }

    req.ownedBacktestId = backtestId;
    next();
  } catch (err) {
    console.error('Backtest ownership check error:', err.message);
    res.status(500).json({ error: 'Authorization check failed.' });
  }
}

/**
 * Verifies that a country exists AND is either:
 *   (a) owned by the requesting user, OR
 *   (b) a system/seeded country (user_id IS NULL) — readable by all authenticated users.
 *
 * Use this for read-only endpoints where system countries should be visible to everyone.
 * Attaches req.resolvedCountry = { id, code, name, isOwned }.
 */
export async function resolveCountryForRead(req, res, next) {
  try {
    const rawCode = req.params.countryCode ?? req.params.code ?? req.body?.countryCode;
    if (!rawCode) {
      return res.status(400).json({ error: 'Country code is required.' });
    }

    const countryCode = rawCode.toUpperCase().trim();
    const userId = req.user.userId;

    const result = await query(
      'SELECT id, code, name, user_id FROM countries WHERE code = $1',
      [countryCode]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: `Country '${countryCode}' not found.` });
    }

    const country = result.rows[0];

    // Allow access if: system country (user_id IS NULL) OR owned by this user
    if (country.user_id !== null && country.user_id !== userId) {
      audit.ownershipDenied(userId, `country_read:${countryCode}`, req.requestId);
      return res.status(404).json({ error: `Country '${countryCode}' not found.` });
    }

    req.resolvedCountry = {
      id: country.id,
      code: country.code,
      name: country.name,
      isOwned: country.user_id === userId,
    };
    next();
  } catch (err) {
    console.error('Country read resolution error:', err.message);
    res.status(500).json({ error: 'Authorization check failed.' });
  }
}
