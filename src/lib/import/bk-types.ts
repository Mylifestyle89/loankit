// Type definitions for .BK file format and import results

export interface BkAttribute {
  Key: string;
  Value: string;
}

export interface BkClient {
  ClientId: string;
  Title: string;
  ClientAttributes: BkAttribute[];
}

export interface BkJsonFile {
  IsApcEnter: boolean;
  Clients: BkClient[];
}

export interface BkImportResult {
  status: 'success' | 'error' | 'partial';
  message: string;
  values: Record<string, string>;           // { "A.general.customer_name": "Ut Huy Inc.", ... }
  metadata: {
    sourceFile: string;
    importedAt: string;
    attributesMapped: number;
    assetsMapped: number;
    skippedFields: string[];
  };
}

export interface BkNormalizationRules {
  placeholderValues: string[];
  dateFormat: 'dd/mm/yyyy' | 'dd-mm-yyyy';
  numberFormat: 'vietnamese' | 'standard';  // vietnamese = 1.000.000, standard = 1000000
}
