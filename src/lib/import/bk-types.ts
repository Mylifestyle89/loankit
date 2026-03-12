// Type definitions for .BK file format and import results

export interface BkAttribute {
  Key: string;
  Value: string;
}

export interface BkAssetProperty {
  Key: string;
  Value: string;
}

export interface BkAsset {
  Title: string;
  Code: string;
  ChangedTitle: string;
  AssetProperties: BkAssetProperty[];
}

export interface BkClient {
  ClientId: string;
  Title: string;
  ClientAttributes: BkAttribute[];
  ClientAssets?: BkAsset[];
}

export interface BkJsonFile {
  IsApcEnter: boolean;
  Clients: BkClient[];
}

export interface BkImportResult {
  status: 'success' | 'error' | 'partial';
  message: string;
  values: Record<string, string>;           // { "A.general.customer_name": "Ut Huy Inc.", ... }
  /** Grouped asset instances — each code maps to array of property maps (supports multi-asset) */
  assetGroups: Record<string, Record<string, string>[]>;
  detectedCustomerType?: 'corporate' | 'individual';
  metadata: {
    sourceFile: string;
    importedAt: string;
    attributesMapped: number;
    assetsMapped: number;
    skippedFields: string[];
  };
}

/** Result for multi-client BK import */
export interface BkMultiImportResult {
  status: 'success' | 'error' | 'partial';
  message: string;
  clients: BkImportResult[];
  totalClients: number;
}

export interface BkNormalizationRules {
  placeholderValues: string[];
  dateFormat: 'dd/mm/yyyy' | 'dd-mm-yyyy';
  numberFormat: 'vietnamese' | 'standard';  // vietnamese = 1.000.000, standard = 1000000
}
