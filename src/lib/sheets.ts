import { google } from 'googleapis';

const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const spreadsheetId = process.env.GOOGLE_SHEET_ID || '';

// Initialize Google Auth JWT Client
const getAuthClient = () => {
  if (!clientEmail || !privateKey) {
    throw new Error('Google service account email or private key is missing');
  }
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

interface SyncPayload {
  table: 'customers' | 'orders' | 'invoices' | 'inventory';
  data: Record<string, any>;
}

export async function syncToSheet({ table, data }: SyncPayload): Promise<void> {
  // Non-blocking fire-and-forget wrapper
  syncProcess({ table, data }).catch((error) => {
    console.error(`[Google Sheets Sync Failed] Table: ${table}, Record ID: ${data.id || 'N/A'}. Error:`, error);
  });
}

async function syncProcess({ table, data }: SyncPayload): Promise<void> {
  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.warn(`[Google Sheets Sync Warning] Missing credentials/Sheet ID. Sync skipped for table: ${table}`);
    return;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // Map data fields to strings/numbers suitable for Sheet values
  const flattenedData: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      flattenedData[key] = value.toISOString();
    } else if (value && typeof value === 'object') {
      flattenedData[key] = JSON.stringify(value);
    } else if (value !== null && value !== undefined) {
      flattenedData[key] = String(value);
    } else {
      flattenedData[key] = '';
    }
  }

  let rangeValues: any[][] = [];
  let tabExists = true;
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${table}!A:Z`,
    });
    rangeValues = response.data.values || [];
  } catch (err: any) {
    if (err.message?.includes('Unable to parse range') || err.code === 400) {
      // Tab doesn't exist — create it
      tabExists = false;
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: table } } }],
          },
        });
        console.log(`[Google Sheets Sync] Created new tab: ${table}`);
        rangeValues = [];
      } catch (createErr: any) {
        console.error(`[Google Sheets Sync] Failed to create tab ${table}:`, createErr.message);
        return;
      }
    } else {
      console.error(`[Google Sheets Sync] Error reading sheet range for ${table}:`, err.message);
      return;
    }
  }

  // Ensure headers exist in the sheet. If sheet is empty, write header row.
  let headers = rangeValues[0] || [];
  const incomingKeys = Object.keys(flattenedData);

  if (headers.length === 0) {
    headers = incomingKeys;
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${table}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
      rangeValues = [headers];
    } catch (err: any) {
      console.error(`[Google Sheets Sync] Failed to create headers for ${table}:`, err.message);
      return;
    }
  }

  // Find if ID column exists (usually 'id')
  const idColIndex = headers.indexOf('id');
  if (idColIndex === -1) {
    console.error(`[Google Sheets Sync] Column 'id' not found in headers for ${table}. Sync aborted.`);
    return;
  }

  // Build the row array in the exact order of headers
  const rowValues = headers.map((header) => flattenedData[header] ?? '');

  // Search if ID exists in the fetched rows
  let existingRowNumber = -1;
  const idToFind = flattenedData['id'];

  for (let i = 1; i < rangeValues.length; i++) {
    if (rangeValues[i][idColIndex] === idToFind) {
      existingRowNumber = i + 1; // 1-indexed row number in Sheets
      break;
    }
  }

  if (existingRowNumber !== -1) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${table}!A${existingRowNumber}:${getColLetter(headers.length)}${existingRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowValues],
      },
    });
    console.log(`[Google Sheets Sync] Updated row ${existingRowNumber} in ${table}`);
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${table}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });
    console.log(`[Google Sheets Sync] Appended new row to ${table}`);
  }
}

// Convert 0-indexed column index to Google Sheets letter (A, B, C...)
function getColLetter(colCount: number): string {
  let temp = colCount;
  let letter = '';
  while (temp > 0) {
    const current = (temp - 1) % 26;
    letter = String.fromCharCode(65 + current) + letter;
    temp = Math.floor((temp - current) / 26);
  }
  return letter || 'A';
}

export async function deleteFromSheet({ table, id }: { table: string; id: string }): Promise<void> {
  deleteProcess({ table, id }).catch((error) => {
    console.error(`[Google Sheets Delete Failed] Table: ${table}, Record ID: ${id}. Error:`, error);
  });
}

async function deleteProcess({ table, id }: { table: string; id: string }): Promise<void> {
  if (!clientEmail || !privateKey || !spreadsheetId) return;

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  let rangeValues: any[][] = [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${table}!A:Z`,
    });
    rangeValues = response.data.values || [];
  } catch (err: any) {
    return; // Tab likely doesn't exist, nothing to delete
  }

  if (rangeValues.length === 0) return;
  const headers = rangeValues[0];
  const idColIndex = headers.indexOf('id');
  if (idColIndex === -1) return;

  let rowIndexToDelete = -1; // 0-indexed for batchUpdate
  for (let i = 1; i < rangeValues.length; i++) {
    if (rangeValues[i][idColIndex] === id) {
      rowIndexToDelete = i;
      break;
    }
  }

  if (rowIndexToDelete === -1) return; // Not found

  // To delete a row, we need the specific sheetId (tab ID)
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === table);
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId === undefined) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndexToDelete,
              endIndex: rowIndexToDelete + 1,
            },
          },
        },
      ],
    },
  });
  console.log(`[Google Sheets Delete] Deleted row index ${rowIndexToDelete} in ${table}`);
}
