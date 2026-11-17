import pdfParse from 'pdf-parse';

export class PDFExtractionService {
  /**
   * Extracts text from a PDF Buffer
   */
  static async extractText(buffer) {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  /**
   * Parses contract terms and Schedule A lines from extracted contract PDF text
   */
  static parseContractText(text) {
    // 1. Contract No.
    const contractNoMatch = text.match(/Contract\s+No\.?\s*([A-Z0-9-]+)/i);
    const contract_id = contractNoMatch ? contractNoMatch[1].trim() : 'RC-NEW';

    // 2. Supplier ID and Name
    const supplierIdMatch = text.match(/\(Supplier\s+ID\s+([A-Z0-9]+)\)/i);
    const supplier_id = supplierIdMatch ? supplierIdMatch[1].trim() : '';

    // "between Corvo Engineering ... and <Supplier Name>, <City>"
    const supplierNameMatch = text.match(/and\s+([^,]+),\s*[^(\n]*\(Supplier\s+ID/i);
    const supplier_name = supplierNameMatch ? supplierNameMatch[1].trim() : '';

    // 3. Term / Dates
    const termMatch = text.match(/valid\s+from\s+([0-9]{4}-[0-9]{2}-[0-9]{2})\s+to\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const start_date = termMatch ? termMatch[1] : '';
    const end_date = termMatch ? termMatch[2] : '';

    // 4. Value ceiling
    const ceilingMatch = text.match(/not\s+exceed\s+INR\s+([0-9,]+)/i);
    let value_cap = 0;
    if (ceilingMatch) {
      const cleanNum = ceilingMatch[1].replace(/,/g, '');
      value_cap = parseFloat(cleanNum);
    }

    // 5. Schedule A: Items and rates
    // Table rows typically: # Item code Description UoM Rate (INR)
    // 1 ITM-1036 Pneumatic cylinder 50x100 NOS 3,537.76
    const lines = [];
    const lineRegex = /([0-9]+)\s+(ITM-[0-9]{4})\s+(.+?)\s+(NOS|BKT|KG|LTR|MTR|JOB|BRL)\s+([0-9,]+\.?[0-9]*)/g;
    let match;
    while ((match = lineRegex.exec(text)) !== null) {
      const item_code = match[2];
      const description = match[3].trim();
      const uom = match[4];
      const rate = parseFloat(match[5].replace(/,/g, ''));
      lines.push({ item_code, description, uom, rate });
    }

    return {
      contract_id,
      supplier_id,
      supplier_name,
      start_date,
      end_date,
      value_cap,
      lines,
    };
  }
}
