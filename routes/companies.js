'use strict';

const express = require("express");
const { NotFoundError, BadRequestError } = require('../expressError');
const NOT_FOUND_ERROR_MSG = "Could not find that company.";

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
});


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
    throw new NotFoundError(NOT_FOUND_ERROR_MSG);
  }

  return res.json({ company });
});

/**
 * POST / companies/
 * Returns obj of new company: {company: {code, name, description}}
 */
router.post('/', async function(req, res) {
  const {code, name, description} = req.body;
  if (!code || !name || !description) throw new BadRequestError();
  const result = await db.query(
    `INSERT INTO companies (code, name, description)
        VALUES ($1, $2, $3)
        RETURNING code, name, description`,
        [code, name, description]
  );
  const company = result.rows[0];
  return res.status(201).json({ company });

});

/**
 * PUT /companies/:code
 * Returns update company object: {company: {code, name, description}}
 */
router.put('/:code', async function(req, res) {
  const { name, description } = req.body;
  if (!name || !description) throw new BadRequestError();
  const result = await db.query(
    `UPDATE companies
          SET name=$1,
              description=$2
          WHERE code = $3
          RETURNING code, name, description`,
    [name, description, req.params.code]
  );

  const company = result.rows[0];
  if (!company) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  return res.json({ company });

});

/**
 * DELETE /companies/:code
 * Deletes company.
 * Should return 404 if company cannot be found.
 * Returns {status: "deleted"}
 */
router.delete('/:code', async function(req, res) {
  const result = await db.query(
    `DELETE FROM companies
      WHERE code = $1
      RETURNING code, name, description`,
    [req.params.code]
  );

  const company = result.rows[0];
  if (!company) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  return res.json({status: 'deleted'});
})

module.exports = router;