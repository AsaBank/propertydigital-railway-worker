import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { normalizeRecord } from './SimpleCSVImporter';
import { getEntities } from './entityApi';
import { v4 as uuidv4 } from 'uuid';

/***********************
 * Canonical fields & aliases (duplication kept local for clarity)
 ***********************/
const FIELD_ALIASES = {
  full_name: ['full_name', 'name', 'שם', 'שם מלא'],
  status: ['status', 'סטטוס', 'מצב'],
  total_units: ['total_units', 'units', 'unit_count', 'יחידות', 'סהכ יחידות'],
  start_date: ['start_date', 'תאריך התחלה', 'start', 'תאריך התחלה', 'תחילת תאריך'],
  tenant_id: ['tenant_id', 'id', 'מזהה דייר', 'ת.ז', 'תז'],
  property_id: ['property_id', 'prop_id', 'מזהה נכס'],
  amount: ['amount', 'סכום', 'price', 'cost'],
};

const CANONICAL_FIELDS = Object.keys(FIELD_ALIASES);

const guessCanonicalField = (header) => {
  const lower = header.toLowerCase();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.map((a) => a.toLowerCase()).includes(lower)) return canonical;
  }
  return '';
};

const Stepper = ({ step }) => {
  const labels = ['Select File', 'Preview', 'Mapping', 'Import'];
  return (
    <div className="flex space-x-4 mb-6">
      {labels.map((label, idx) => (
        <div key={idx} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              idx === step ? 'bg-blue-600 text-white' : idx < step ? 'bg-green-500 text-white' : 'bg-gray-300'
            }`}
          >
            {idx + 1}
          </div>
          <span className="ml-2 text-sm">{label}</span>
        </div>
      ))}
    </div>
  );
};

const SimpleCSVWizard = () => {
  const [step, setStep] = useState(0);
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [mapping, setMapping] = useState({}); // header -> canonical or ''
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [summary, setSummary] = useState(null); // { succeeded, failed, errors }
  const [errors, setErrors] = useState([]); // row-level errors

  /************
   * Step 0 – File selection & parsing
   ************/
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (result) => {
        setRawRows(result.data);
        setHeaders(result.meta.fields || []);
        setSampleRows(result.data.slice(0, 5));
        // initial mapping guess
        const guessed = {};
        (result.meta.fields || []).forEach((h) => {
          guessed[h] = guessCanonicalField(h);
        });
        setMapping(guessed);
        setStep(1);
      },
      error: (err) => {
        alert('CSV parse error: ' + err.message);
      },
    });
  }, []);

  /************
   * Derived mapped rows – memoized for performance
   ************/
  const mappedRows = useMemo(() => {
    if (headers.length === 0) return [];
    return rawRows.map((row) => {
      const mapped = {};
      headers.forEach((h) => {
        const target = mapping[h];
        if (target) mapped[target] = row[h];
      });
      return mapped;
    });
  }, [rawRows, mapping, headers]);

  /************
   * Step 3 – Perform import
   ************/
  const runImport = async () => {
    setProgress({ processed: 0, total: mappedRows.length });
    setErrors([]);
    const rowErrors = [];
    const succeeded = [];

    // Collect ids for batch fetching (property & tenant)
    const propertyIds = [];
    const tenantIds = [];
    mappedRows.forEach((r) => {
      if (r.property_id) propertyIds.push(r.property_id);
      if (r.tenant_id) tenantIds.push(r.tenant_id);
    });

    // Prefetch entities (errors ignored for missing)
    try {
      await Promise.all([
        propertyIds.length ? getEntities('properties', propertyIds) : Promise.resolve(),
        tenantIds.length ? getEntities('tenants', tenantIds) : Promise.resolve(),
      ]);
    } catch (e) {
      console.warn('Prefetch warning', e);
    }

    const CHUNK = 100;
    for (let i = 0; i < mappedRows.length; i += CHUNK) {
      const chunk = mappedRows.slice(i, i + CHUNK);

      await Promise.all(
        chunk.map(async (row, idx) => {
          const perRowErrors = [];
          const normalized = normalizeRecord(row, i + idx, perRowErrors);
          if (perRowErrors.length) {
            rowErrors.push(...perRowErrors);
          } else {
            succeeded.push(normalized);
          }
        })
      );

      setProgress((p) => ({ ...p, processed: Math.min(p.processed + CHUNK, mappedRows.length) }));
      await new Promise((res) => setTimeout(res, 10)); // yield to UI
    }

    setSummary({
      succeeded: succeeded.length,
      failed: rowErrors.length,
      errors: rowErrors,
    });
    setErrors(rowErrors);
    setStep(3);
  };

  /************
   * Render helpers
   ************/
  const renderPreviewTable = () => (
    <table className="table-auto w-full text-xs border">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-2 py-1 border bg-gray-100">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sampleRows.map((row, idx) => (
          <tr key={idx} className="border-t">
            {headers.map((h) => (
              <td key={h} className="px-2 py-1 border">
                {row[h] !== undefined ? String(row[h]).slice(0, 20) : ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderMappingTable = () => (
    <table className="table-auto w-full text-sm border">
      <thead>
        <tr>
          <th className="border px-2 py-1">CSV Header</th>
          <th className="border px-2 py-1">Map to field</th>
        </tr>
      </thead>
      <tbody>
        {headers.map((h) => (
          <tr key={h} className="border-t">
            <td className="border px-2 py-1">{h}</td>
            <td className="border px-2 py-1">
              <select
                value={mapping[h] || ''}
                onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                className="border rounded p-1 text-sm"
              >
                <option value="">-- Ignore --</option>
                {CANONICAL_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderProgress = () => (
    <div className="w-full max-w-lg">
      <div className="h-4 w-full bg-gray-200 rounded">
        <div
          className="h-4 bg-blue-600 rounded"
          style={{ width: `${(progress.processed / progress.total) * 100}%` }}
        />
      </div>
      <p className="text-sm mt-2">
        {progress.processed}/{progress.total} processed
      </p>
    </div>
  );

  const renderSummary = () => (
    <div className="mt-4 text-sm">
      <p>
        ✅ Succeeded: {summary.succeeded} | ❌ Failed: {summary.failed}
      </p>
      {summary.errors.length > 0 && (
        <details className="mt-2 max-h-60 overflow-y-auto">
          <summary className="cursor-pointer">Show errors ({summary.errors.length})</summary>
          {summary.errors.map((e) => (
            <div key={e.id} className="text-red-600">
              Row {e.row}: {e.message}
            </div>
          ))}
        </details>
      )}
    </div>
  );

  /************
   * Main render
   ************/
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Stepper step={step} />

      {step === 0 && (
        <div>
          <input type="file" accept=".csv" onChange={handleFileSelect} />
        </div>
      )}

      {step === 1 && (
        <div>
          <h3 className="font-medium mb-2">Preview (first 5 rows)</h3>
          {renderPreviewTable()}
          <div className="mt-4 flex justify-end space-x-2">
            <button className="px-3 py-1 border rounded" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => setStep(2)}>
              Next – Mapping
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="font-medium mb-2">Field Mapping</h3>
          {renderMappingTable()}
          <div className="mt-4 flex justify-between">
            <button className="px-3 py-1 border rounded" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded"
              onClick={() => {
                setStep(3); // Import step
                runImport();
              }}
            >
              Start Import
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="font-medium mb-2">Import</h3>
          {summary ? renderSummary() : renderProgress()}
          {!summary && (
            <p className="text-xs text-gray-600 mt-2">Please keep this tab open until import completes.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleCSVWizard;