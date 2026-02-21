const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  const data = JSON.parse(fs.readFileSync('data_export_1771635167510.json', 'utf-8'));
  
  for (const customer of data.customers) {
    console.log('Inserting', customer.customer_code);
    try {
        const existing = await prisma.customer.findUnique({
            where: { customer_code: customer.customer_code }
        });
        
        if (existing) {
            await prisma.customer.update({
                where: { id: existing.id },
                data: {
                    customer_name: customer.customer_name,
                    address: customer.address,
                    main_business: customer.main_business,
                    charter_capital: customer.charter_capital,
                    legal_representative_name: customer.legal_representative_name,
                    legal_representative_title: customer.legal_representative_title,
                    organization_type: customer.organization_type,
                    data_json: customer.data_json
                }
            });
        } else {
            await prisma.customer.create({
                data: {
                    customer_code: customer.customer_code,
                    customer_name: customer.customer_name,
                    address: customer.address,
                    main_business: customer.main_business,
                    charter_capital: customer.charter_capital,
                    legal_representative_name: customer.legal_representative_name,
                    legal_representative_title: customer.legal_representative_title,
                    organization_type: customer.organization_type,
                    data_json: customer.data_json
                }
            });
        }
        console.log('Inserted/Updated successfully');
    } catch(err) {
        console.error('ERROR ON', customer.customer_code, err);
    }
  }
}
main();
