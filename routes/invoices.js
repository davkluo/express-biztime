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
      WHERE id = $1`,
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

// /**
//  * POST / companies/
//  * Returns obj of new company: {company: {code, name, description}}
//  */
// router.post('/', async function(req, res) {
//   const {code, name, description} = req.body;
//   if (!code || !name || !description) throw new BadRequestError();
//   const result = await db.query(
//     `INSERT INTO companies (code, name, description)
//         VALUES ($1, $2, $3)
//         RETURNING code, name, description`,
//         [code, name, description]
//   );
//   const company = result.rows[0];
//   return res.status(201).json({ company });

// });

// /**
//  * PUT /companies/:code
//  * Returns update company object: {company: {code, name, description}}
//  */
// router.put('/:code', async function(req, res) {
//   const { name, description } = req.body;
//   if (!name || !description) throw new BadRequestError();
//   const result = await db.query(
//     `UPDATE companies
//           SET name=$1,
//               description=$2
//           WHERE code = $3
//           RETURNING code, name, description`,
//     [name, description, req.params.code]
//   );

//   const company = result.rows[0];
//   if (!company) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

//   return res.json({ company });

// });

// /**
//  * DELETE /companies/:code
//  * Deletes company.
//  * Should return 404 if company cannot be found.
//  * Returns {status: "deleted"}
//  */
// router.delete('/:code', async function(req, res) {
//   const result = await db.query(
//     `DELETE FROM companies
//       WHERE code = $1
//       RETURNING code, name, description`,
//     [req.params.code]
//   );

//   const company = result.rows[0];
//   if (!company) throw new NotFoundError(NOT_FOUND_ERROR_MSG);

//   return res.json({status: 'deleted'});
// })


module.exports = router;