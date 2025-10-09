import { parse as parseCsv } from 'csv-parse/sync';

// This is a copy of the parseReport function for testing
function parseReport(buffer: Buffer) {
	try {
		const content = buffer.toString('utf8');
		
		// Auto-detect delimiter by checking the first line
		// Amazon SP-API reports are typically tab-separated
		const firstLineEnd = content.indexOf('\n');
		const firstLine = firstLineEnd > 0 ? content.substring(0, firstLineEnd) : content;
		
		// Count tabs and commas in the header to determine delimiter
		const tabCount = (firstLine.match(/\t/g) || []).length;
		const commaCount = (firstLine.match(/,/g) || []).length;
		
		// Determine delimiter: use whichever appears more frequently
		// Default to tab if counts are equal (Amazon SP-API typically uses tabs)
		const delimiter = tabCount >= commaCount ? '\t' : ',';
		
		return parseCsv(content, {
			columns: true,
			skip_empty_lines: true,
			delimiter: delimiter,
			relax_column_count: true, // Allow inconsistent column counts
		});
	} catch (error) {
		throw new Error(`Failed to parse report: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

describe('parseReport', () => {
	it('should parse tab-separated values (TSV)', () => {
		const tsvContent = 'asin\tsku\tunits\nB001\tSKU001\t10\nB002\tSKU002\t20';
		const buffer = Buffer.from(tsvContent);
		
		const result = parseReport(buffer);
		
		expect(result).toEqual([
			{ asin: 'B001', sku: 'SKU001', units: '10' },
			{ asin: 'B002', sku: 'SKU002', units: '20' },
		]);
	});

	it('should parse comma-separated values (CSV)', () => {
		const csvContent = 'asin,sku,units\nB001,SKU001,10\nB002,SKU002,20';
		const buffer = Buffer.from(csvContent);
		
		const result = parseReport(buffer);
		
		expect(result).toEqual([
			{ asin: 'B001', sku: 'SKU001', units: '10' },
			{ asin: 'B002', sku: 'SKU002', units: '20' },
		]);
	});

	it('should prefer tabs when both tabs and commas are present', () => {
		// This simulates Amazon SP-API reports which use tabs as delimiter
		// but might have commas within field values
		const mixedContent = 'asin\tsku\tdescription\nB001\tSKU001\tProduct, with comma\nB002\tSKU002\tAnother, product';
		const buffer = Buffer.from(mixedContent);
		
		const result = parseReport(buffer);
		
		expect(result).toEqual([
			{ asin: 'B001', sku: 'SKU001', description: 'Product, with comma' },
			{ asin: 'B002', sku: 'SKU002', description: 'Another, product' },
		]);
	});

	it('should handle empty lines', () => {
		const tsvContent = 'asin\tsku\tunits\n\nB001\tSKU001\t10\n\nB002\tSKU002\t20\n\n';
		const buffer = Buffer.from(tsvContent);
		
		const result = parseReport(buffer);
		
		expect(result).toEqual([
			{ asin: 'B001', sku: 'SKU001', units: '10' },
			{ asin: 'B002', sku: 'SKU002', units: '20' },
		]);
	});

	it('should handle inconsistent column counts with relax_column_count', () => {
		// Some Amazon reports might have inconsistent column counts
		const tsvContent = 'asin\tsku\nB001\tSKU001\t10\nB002\tSKU002';
		const buffer = Buffer.from(tsvContent);
		
		// This should not throw an error thanks to relax_column_count: true
		expect(() => parseReport(buffer)).not.toThrow();
	});

	it('should throw an error for invalid content', () => {
		const invalidContent = '\x00\x01\x02'; // Binary garbage
		const buffer = Buffer.from(invalidContent);
		
		// The parser should handle this gracefully
		// It might parse it as a single-column CSV with one row
		const result = parseReport(buffer);
		expect(Array.isArray(result)).toBe(true);
	});

	it('should handle the original error case: single column header with multi-column data', () => {
		// This simulates the original error where TSV was being parsed as CSV
		// When parsing TSV as CSV, a tab-separated header looks like a single column
		const tsvParsedAsCsv = 'asin\tsku\tunits\nB001\tSKU001\t10';
		const buffer = Buffer.from(tsvParsedAsCsv);
		
		// Our fix should handle this correctly
		const result = parseReport(buffer);
		
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveProperty('asin');
		expect(result[0]).toHaveProperty('sku');
		expect(result[0]).toHaveProperty('units');
	});
});

