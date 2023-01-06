'use strict';

const express = require("express");
const { NotFoundError, BadRequestError } = require('../expressError');
const NOT_FOUND_ERROR_MSG = "Could not find that invoice.";

const db = require("../db");
const router = new express.Router();

/**
 * GET /invoices:
 * Return info on invoices: like {invoices: [{id, comp_code}, ...]}
 */
router.get('/', async function(req, res) {
  const results = await db.query(
    `SELECT id, comp_code
      FROM invoices`
  );

  const invoices = results.rows;
  return res.json({ invoices });
});

/**
 * GET /invoices/:id
 * Returns
 * {invoice:
 *  {id, amt, paid, add_date, paid_date, company: {code, name, description}
 * }
 */
router.get('/:id', async function(req, res) {
  const invoiceResults = await db.query(
    `SELECT id, comp_code, amt, paid, add_date, paid_date
      FROM invoices
      WHERE id = $1`,  // TODO: use a join to capture company & delete below query
    [req.params.id]
  );
  const invoice = invoiceResults.rows[0];
  if (!invoice) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  const companyResults = await db.query(
    `SELECT code, name, description
      FROM companies
      WHERE code = $1`,
    [invoice.comp_code]
  );
  const company = companyResults.rows[0];

  delete invoice['comp_code'];
  invoice.company = company;

  return res.json({ invoice });
});

/**
 * POST / invoices/
 * Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}}
 */
router.post('/', async function(req, res) {
  const {comp_code, amt} = req.body;
  if (!comp_code || !amt ) throw new BadRequestError();

  let result;

  try {
    result = await db.query(
      `INSERT INTO invoices (comp_code, amt)
          VALUES ($1, $2)
          RETURNING id, comp_code, amt, paid, add_date, paid_date`,
          [comp_code, amt]
    );
  } catch(err) {
    //TODO: could add if to add another catch for a duplicate key error
    throw new NotFoundError(`${comp_code} not found`);  //TODO: update to bad req
  }

  const invoice = result.rows[0];
  return res.status(201).json({ invoice });

});

/**
 * PUT /invoices/:id
 * If invoice cannot be found, returns a 404.
 * Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}}
 */
router.put('/:id', async function(req, res) {
  const { amt } = req.body;
  if (!amt ) throw new BadRequestError();
  const result = await db.query(
    `UPDATE invoices
          SET amt=$1
          WHERE id = $2
          RETURNING id, comp_code, amt, paid, add_date, paid_date`,
    [amt, req.params.id]
  );

  const invoice = result.rows[0];
  if (!invoice) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  return res.json({ invoice });

});

/**
 * DELETE /invoices/:id
 * Deletes invoice.
 * Should return 404 if invoice cannot be found.
 * Returns {status: "deleted"}
 */
router.delete('/:id', async function(req, res) {
  const result = await db.query(
    `DELETE FROM invoices
      WHERE id = $1
      RETURNING id, comp_code, amt, paid, add_date, paid_date`,// TODO: just return id
    [req.params.id]
  );

  const invoice = result.rows[0];
  if (!invoice) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  return res.json({status: 'deleted'});
})


module.exports = router;