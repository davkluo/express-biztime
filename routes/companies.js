'use strict';

const express = require("express");
const { NotFoundError } = require('../expressError');

const db = require("../db");
const router = new express.Router();

/**
 * GET /companies:
 * Returns list of companies, like {companies: [{code, name}, ...]}
 */
router.get('/', async function(req, res) {
  const results = await db.query(
    `SELECT code, name
      FROM companies`
  );

  const companies = results.rows;
  return res.json({ companies });
})


/**
 * GET /companies/:code
 * Return obj of company: {company: {code, name, description}}
 */
router.get('/:code', async function(req, res) {
  const code = req.params.code;

  const results = await db.query(
    `SELECT code, name, description
      FROM companies
      WHERE code = $1`,
    [code]
  );

  const company = results.rows[0];
  if (!company) {
    console.log('Supposed to get a not found error.')
    throw new NotFoundError();
  }

  return res.json({ company });
})

module.exports = router;