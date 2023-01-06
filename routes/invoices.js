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
  const result = await db.query(
    `SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date, c.code, c.name, c.description
      FROM invoices AS i
        JOIN companies as c
          ON i.comp_code = c.code
      WHERE i.id = $1`,
    [req.params.id]
  );
  const invoiceAndCompany = result.rows[0];
  if (!invoiceAndCompany) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  let { code, name, description, ...invoice } = invoiceAndCompany;
  invoice.company = { code, name, description };

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
    if (err.message.includes('violates foreign key constraint')) {
      throw new BadRequestError(`${comp_code} company code does not exist`);
    }
  }

  const invoice = result.rows[0];
  return res.status(201).json({ invoice });

});

/**
 * PUT /invoices/:id
 * If invoice cannot be found, returns a 404.
 * Needs to be passed in a JSON body of {amt, paid}
 * Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}}
 */
router.put('/:id', async function(req, res) {
  const { amt, paid } = req.body;
  if (!amt || paid === undefined) throw new BadRequestError();

  const id = req.params.id;

  const getResult = await db.query(
    `SELECT paid, paid_date
      FROM invoices
      WHERE id = $1`,
    [id]
  );

  const invoiceBefore = getResult.rows[0];
  if (!invoiceBefore) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  let paidDate = invoiceBefore.paid_date;

  if (!invoiceBefore.paid && paid) { // Here we are paying the invoice
    paidDate = new Date();
  } else if (invoiceBefore.paid && !paid) { // Here we are unpaying the invoice
    paidDate = null;
  }

  const result = await db.query(
    `UPDATE invoices
          SET amt=$1,
            paid=$2,
            paid_date=$3
          WHERE id = $4
          RETURNING id, comp_code, amt, paid, add_date, paid_date`,
    [amt, paid, paidDate, id]
  );

  const invoice = result.rows[0];

  // Redundant now with above check
  // if (!invoice) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

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
      RETURNING id`,
    [req.params.id]
  );

  const invoice = result.rows[0];
  if (!invoice) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

  return res.json({status: 'deleted'});
})


module.exports = router;