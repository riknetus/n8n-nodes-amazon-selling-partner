"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executePricesOperation = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
// interface MoneyType {
// 	CurrencyCode: string;
// 	Amount: number;
// }
// interface Price {
// 	LandedPrice: MoneyType;
// 	ListingPrice: MoneyType;
// 	Shipping: MoneyType;
// }
// interface CompetitivePrice {
// 	CompetitivePriceId: string;
// 	Price: Price;
// 	condition: string;
// 	belongsToRequester: boolean;
// }
// interface ProductPriceItem {
// 	status: string;
// 	SellerSKU: string;
// 	ASIN: string;
// 	Product: {
// 		Identifiers: {
// 			MarketplaceASIN: {
// 				MarketplaceId: string;
// 				ASIN: string;
// 			};
// 		};
// 		CompetitivePricing: {
// 			CompetitivePrices: CompetitivePrice[];
// 		};
// 		Offers: Array<{
// 			BuyingPrice: Price;
// 			FulfillmentChannel: string;
// 			ItemCondition: string;
// 		}>;
// 	};
// }
// interface GetPricesResponse {
// 	payload: ProductPriceItem[];
// }
async function executePricesOperation(operation, index) {
    if (operation === 'getPrices') {
        return await getPrices.call(this, index);
    }
    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
exports.executePricesOperation = executePricesOperation;
async function getPrices(index) {
    let asin = this.getNodeParameter('asin', index);
    const marketplaceIds = this.getNodeParameter('marketplaceIds', index);
    console.log(marketplaceIds);
    console.log(index);
    if (typeof asin === 'string') {
        asin = asin.split(',').map(a => a.trim()).filter(a => a.length > 0);
    }
    if (asin.length === 0) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'At least one ASIN is required');
    }
    const returnData = [];
    for (const singleAsin of asin) {
        try {
            const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                method: 'GET',
                endpoint: `/products/pricing/v0/items/${singleAsin}/offers`,
                query: {
                    MarketplaceId: marketplaceIds,
                    ItemCondition: 'New',
                    CustomerType: 'Consumer'
                }
            });
            returnData.push({
                json: response.data.payload,
                pairedItem: index
            });
        }
        catch (error) {
            returnData.push({
                json: {
                    ASIN: singleAsin,
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                pairedItem: index
            });
        }
    }
    return returnData;
}
