import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { SpApiRequest } from '../helpers/SpApiRequest';
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


export async function executePricesOperation(
    this: IExecuteFunctions,
    operation: string,
    index: number,
): Promise<INodeExecutionData[]> {
    if (operation === 'getPrices') {
        return await getPrices.call(this, index);
    }
    throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
async function getPrices(
    this: IExecuteFunctions,
    index: number
): Promise<INodeExecutionData[]> {
    let asin = this.getNodeParameter('asin', index) as string | string[];
    const marketplaceIds = this.getNodeParameter('marketplaceIds', index) as string[];
    console.log(marketplaceIds); // how get reqion marketplace
    console.log(index);
    if (typeof asin === 'string') {
        asin = asin.split(',').map(a => a.trim()).filter(a => a.length > 0);
    }
    
    if (asin.length === 0) {
        throw new NodeOperationError(
            this.getNode(), 
            'At least one ASIN is required'
        );
    }
    
    const returnData: INodeExecutionData[] = [];
    

    for (const singleAsin of asin) {
        try {
            const response = await SpApiRequest.makeRequest<any>(this, {
                method: 'GET',
                endpoint: `/products/pricing/v0/items/${singleAsin}/offers`,
                query: {
                    MarketplaceId: marketplaceIds,
                    ItemCondition: 'New',
                    CustomerType: 'Consumer'
                }
            });

            returnData.push({
                json: response.data.payload as any,
                pairedItem: index
            });
            
        } catch (error) {

            returnData.push({
                json: {
                    ASIN: singleAsin,
                    error: error instanceof Error ? error.message : 'Unknown error'
                } as any,
                pairedItem: index
            });
        }
    }
    
    return returnData;
}