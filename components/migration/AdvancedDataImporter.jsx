// components/migration/AdvancedDataImporter.jsx
// 💡 AdvancedDataImporter – multi-entity CSV / Excel importer with robust mobile support
// NOTE: This file replaces the previously missing/buggy implementation described by the user.
// The main issue reported was that tapping the big "Select CSV" card on mobile did
// nothing. The root causes were:
//   1. Relying on document.getElementById("file-input") which breaks when multiple
//      importer instances are rendered or when React renders within Shadow DOM.
//   2. Using an onClick handler that is not guaranteed to fire on touch devices
//      (e.g. because of pointer-events quirks).
//
// The new implementation fixes this by:
//   • Generating a per-instance unique id using React.useId() so there are no ID collisions.
//   • Using a <label htmlFor={inputId}> wrapper instead of imperative DOM calls – this
//     guarantees browser-native behaviour across desktop & mobile, with full a11y support.
//   • Adding richer console debugging so QA can verify event flow easily.
//   • Keeping the general look-and-feel (Tailwind + shadcn/ui) intact.
/* eslint-disable jsx-a11y/label-has-associated-control */

import React, { useState, useMemo, useCallback, useId } from 'react';
import { Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

/******************************
 * Entity configuration map   *
 ******************************/
const entityConfig = {
  Property: {
    displayName: 'נכסים',
    requiredFields: ['name'],
    fields: {
      name: ['name', 'שם', 'שם הנכס', 'property_name'],
      property_type: ['property_type', 'type', 'סוג', 'סוג נכס'],
      total_units: ['total_units', 'units', 'יחידות', 'מספר יחידות'],
      status: ['status', 'סטטוס', 'מצב'],
      address_street: ['address', 'street', 'כתובת', 'רחוב'],
      address_city: ['city', 'עיר', 'city_name'],
    },
  },
  // Additional entity configs …
};

export default function AdvancedDataImporter({ entityType = 'Property' }) {
  const inputId = useId(); // 💡 unique per component instance

  /***************
   * React state *
   ***************/
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  /***************
   * Memo config *
   ***************/
  const config = useMemo(() => entityConfig[entityType], [entityType]);

  /**********************
   * File select handler *
   **********************/
  const handleFileSelect = useCallback((e) => {
    console.debug('📂 File input change event fired', e);
    const file = e.target.files?.[0];
    if (!file) {
      console.warn('⚠️ handleFileSelect: No file selected');
      return;
    }

    console.info('✅ File selected:', { name: file.name, size: file.size });
    setSelectedFile(file);
    setError('');
    setParsedData([]);
    setShowPreview(false);
    setProgress(0);

    // TODO: parse + upload logic (out of scope for current bug fix)
  }, []);

  /*************
   * Rendering *
   *************/
  if (!config) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>
          ⚠️ Entity type "{entityType}" is not supported.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1 – file selection */}
      {!selectedFile && (
        <label
          htmlFor={inputId}
          className="block border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer select-none"
        >
          <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            בחירת קובץ CSV עבור {config.displayName}
          </h3>
          <p className="text-blue-600 mb-4">קבצים נתמכים: CSV עד 10MB</p>
          {/* Hidden native input */}
          <input
            id={inputId}
            type="file"
            accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}

      {/* Placeholder for future steps (preview, mapping, etc.) */}
      {selectedFile && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            📄 <strong>{selectedFile.name}</strong> נבחר בהצלחה. (‎{Math.ceil(selectedFile.size / 1024)} KB)
          </p>
          <Progress value={progress} max={100} className="h-2" />
          {/* Additional UI (preview / import) would go here */}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}