// SimpleCSVImporter.jsx – Enhanced CSV importer with better error handling
import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

/*************************
 * Field aliases & helpers
 *************************/
const FIELD_ALIASES = {
  full_name: ['full_name', 'name', 'שם', 'שם מלא'],
  status: ['status', 'סטטוס', 'מצב'],
  total_units: ['total_units', 'units', 'unit_count', 'יחידות', 'סהכ יחידות'],
  start_date: ['start_date', 'תאריך התחלה', 'start', 'תאריך התחלה', 'תחילת תאריך'],
  tenant_id: ['tenant_id', 'id', 'מזהה דייר', 'ת.ז', 'תז'],
  property_id: ['property_id', 'prop_id', 'מזהה נכס'],
  amount: ['amount', 'סכום', 'price', 'cost'],
};

const STATUS_MAP = {
  'פעיל': 'active',
  'Active': 'active',
  'active': 'active',
  'באיחור': 'overdue',
  'overdue': 'overdue',
  'paid': 'paid',
  'שולם': 'paid',
  'בוטל': 'cancelled',
  'cancelled': 'cancelled',
};

const parseStatus = (value) => {
  if (!value) return 'active';
  const trimmed = String(value).trim();
  return STATUS_MAP[trimmed] || trimmed.toLowerCase();
};

const parseDate = (value) => {
  if (!value) return null;
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/; // yyyy-mm-dd
  if (isoRegex.test(value)) return value; // already ISO

  // Support dd/mm/yyyy or dd/mm/yy
  const parts = value.split(/[\/\-.]/);
  if (parts.length === 3) {
    let [day, month, year] = parts;
    if (year.length === 2) year = `20${year}`; // naive 20xx handling
    if (day.length === 1) day = `0${day}`;
    if (month.length === 1) month = `0${month}`;
    if (year.length === 4) {
      return `${year}-${month}-${day}`; // ISO output
    }
  }
  // fallback – return original to avoid data loss
  return value;
};

const numericSanitizer = (value) => {
  if (value === null || value === undefined) return null;
  const num = parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? null : num;
};

/*****************
 * Error helpers
 *****************/
const makeError = (row, column, message, severity = 'error') => ({
  id: uuidv4(),
  row, // 1-indexed row in source file
  column,
  message,
  severity,
  ts: Date.now(),
});

/************************
 * normalizeRecord (core)
 ************************/
export const normalizeRecord = (raw = {}, rowIndex = 0, errors = []) => {
  const record = {};

  // Map aliases → canonical
  Object.entries(FIELD_ALIASES).forEach(([canonical, aliases]) => {
    const sourceKey = Object.keys(raw).find((k) =>
      aliases.some((alias) => alias.toLowerCase() === k.toLowerCase())
    );
    if (sourceKey !== undefined) {
      record[canonical] = raw[sourceKey];
    }
  });

  // Mandatory field: full_name
  if (!record.full_name || String(record.full_name).trim() === '') {
    errors.push(makeError(rowIndex + 1, 'full_name', 'Missing full_name value'));
  }

  // Status parsing
  record.status = parseStatus(record.status);

  // Date parsing
  if (record.start_date) {
    record.start_date = parseDate(record.start_date);
  }

  // Numeric parsing
  if (record.total_units !== undefined)
    record.total_units = numericSanitizer(record.total_units) ?? 0;
  if (record.amount !== undefined) record.amount = numericSanitizer(record.amount);

  // Merge untouched data (do not discard)
  const merged = { ...raw, ...record };
  return merged;
};

/************************
 * React component
 ************************/
const SimpleCSVImporter = () => {
  const [records, setRecords] = useState([]);
  const [errors, setErrors] = useState([]);

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true, // use separate thread for large files
      step: (results, parser) => {
        const { data, errors: papaErrors } = results;

        // Collect papaparse errors as importer errors
        if (papaErrors?.length) {
          const mapped = papaErrors.map((pe) =>
            makeError(pe.row + 1, pe.type, pe.message, 'warning')
          );
          setErrors((prev) => [...prev, ...mapped]);
        }

        // Normalize row
        const rowErrors = [];
        const normalized = normalizeRecord(data, results.row, rowErrors);
        if (rowErrors.length) setErrors((prev) => [...prev, ...rowErrors]);

        setRecords((prev) => [...prev, normalized]);
      },
      complete: () => {
        console.info('✅ Import finished', {
          totalRows: records.length,
          errors: errors.length,
        });
      },
      error: (err) => {
        console.error('❌ Parser error', err);
        setErrors((prev) => [...prev, makeError(0, 'parser', err.message)]);
      },
    });
  }, [records.length, errors.length]);

  return (
    <div>
      <label htmlFor="csvInput" className="block font-medium mb-2">Select CSV / Excel file</label>
      <input id="csvInput" type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFile} />

      <div className="mt-4">
        <strong>Records parsed:</strong> {records.length}
      </div>
      <div className="mt-2 text-red-600" style={{ maxHeight: 200, overflowY: 'auto' }}>
        {errors.map((e) => (
          <div key={e.id}>Row {e.row} – {e.message}</div>
        ))}
      </div>
    </div>
  );
};

export default SimpleCSVImporter;