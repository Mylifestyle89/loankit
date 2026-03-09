declare module "docx-merger" {
  class DocxMerger {
    constructor(options: { pageBreak?: boolean }, files: Buffer[]);
    save(type: "nodebuffer", callback: (data: Buffer | null) => void): void;
  }

  export default DocxMerger;
}
