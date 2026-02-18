This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Report Mapping Pipeline (Draft)

This repository now includes a Python pipeline for building and validating report draft data from:

- `data.bk`
- `Cong ty TNHH Thuong mai Dien tu Y_File excel phan tich BCTC va xac dinh HMTD_2024-09-23 (1).xlsm`

### Run end-to-end

```bash
python run_pipeline.py
```

### Outputs

- `report_draft.json`: nested draft object + resolution log
- `report_draft_flat.json`: flat key-value form for UI mapping
- `validation_report.json`: required-field and business-rule validation

### Core modules

- `report_pipeline/resolver.py`: source path resolvers (`data.bk` + `.xlsm`)
- `report_pipeline/builder.py`: build normalized report draft
- `report_pipeline/validator.py`: validation rules (required fields + basic risk checks)

## Template Export Stub

To test mapping into a DOCX template using placeholders like `{{A.general.customer_name}}`:

```bash
python export_template_stub.py
```

Outputs:

- `report_preview.docx`: copied template with placeholder replacement
- `template_export_report.json`: replacement summary (replaced/missing placeholders)
