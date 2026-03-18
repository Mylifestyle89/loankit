// Types and error classes for the DOCX engine

export type AliasSpec =
  | string
  | string[]
  | {
    literal?: unknown;
    from?: string | string[];
  };

export type FlatTemplateData = Record<string, unknown>;
export type AliasMap = Record<string, AliasSpec>;
export type DocxTemplateData<TFlat extends FlatTemplateData = FlatTemplateData> =
  | {
    flat: TFlat;
    aliasMap?: AliasMap;
  }
  | Record<string, unknown>;

export class TemplateNotFoundError extends Error {
  constructor(public readonly templatePath: string) {
    super(`Template not found: ${templatePath}`);
    this.name = "TemplateNotFoundError";
  }
}

export class DataPlaceholderMismatchError extends Error {
  constructor(public readonly templatePath: string, public readonly details: unknown) {
    super(`Template placeholders do not match data: ${templatePath}`);
    this.name = "DataPlaceholderMismatchError";
  }
}

export class CorruptedTemplateError extends Error {
  constructor(public readonly templatePath: string, public readonly details?: unknown) {
    super(`Template is corrupted or invalid DOCX: ${templatePath}`);
    this.name = "CorruptedTemplateError";
  }
}
