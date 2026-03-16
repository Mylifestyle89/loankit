// Type definitions for .APC (template schema) file format

export interface ApcAttribute {
  Title: string;
  DataType: number; // 0=text, 1=number, 2=richtext, 3=date
  Color: string | null;
  Formular: string | null;
  IsSearch: boolean;
  IsShow: boolean;
  Position: number;
  FontColor: string | null;
  IsPrimary: boolean;
  AutoFormular: string | null;
  AttrReferenceName: string | null;
}

export interface ApcAssetAttribute {
  Title: string;
  DataType: number;
  Color: string | null;
  Formular: string | null;
  ShowTotal: boolean;
  TotalExt: string;
  IsShow: boolean;
  Position: number;
  FontColor: string | null;
  AutoFormular: string | null;
  AttrReferenceName: string | null;
}

export interface ApcAssetCategory {
  Category: string;
  Code: string;
  IsShow: boolean;
  Attributes: ApcAssetAttribute[];
}

export interface ApcDocument {
  FileId: string;
  ButtonName: string;
  FileName: string;
  IsPdf: boolean;
  IsShow: boolean;
  Color: string;
  Note: string;
  Position: number;
  FromFileType: number;
  IsShowBreakLine: boolean;
  IsMultiPrint: boolean;
  MultiPrintAssetCode: string;
  GeneralFiles: unknown;
}

export interface ApcJsonFile {
  IsApcEnter: boolean;
  Title: string;
  IsShowAssetButton: boolean;
  IsShowProjectButton: boolean;
  IsShow: boolean;
  Position: number;
  Attributes: ApcAttribute[];
  Documents: ApcDocument[];
  AssetCategories: ApcAssetCategory[];
}

export interface ApcParseResult {
  status: "success" | "error";
  message: string;
  title: string;
  attributes: Array<{
    name: string;
    dataType: string;
    isPrimary: boolean;
    isSearch: boolean;
    position: number;
  }>;
  assetCategories: Array<{
    name: string;
    code: string;
    fields: Array<{ name: string; dataType: string; position: number }>;
  }>;
  documents: Array<{
    fileId: string;
    buttonName: string;
    fileName: string;
    position: number;
  }>;
}
