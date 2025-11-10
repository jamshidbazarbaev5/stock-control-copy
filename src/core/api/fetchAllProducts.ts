import api from "./api";
import type { Product } from "./product";

interface FetchProductsParams {
  barcode?: string;
  product_name?: string;
  page?: number;
  [key: string]: any;
}

interface ProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export async function fetchAllProducts(
  params: FetchProductsParams = {},
): Promise<Product[]> {
  // If barcode is provided, fetch single product by barcode
  if (params.barcode) {
    console.log("🔍 Fetching products with barcode:", params.barcode);

    try {
      const response = await api.get<ProductsResponse>("/items/product/", {
        params: {
          barcode: params.barcode,
          non_zero: 1,
        },
      });

      console.log("✅ Products API Response:", response.data);
      // Return results array even for single barcode search
      return response.data.results || [];
    } catch (error: any) {
      console.error("❌ Error fetching products:", {
        params,
        error: error.message || error,
        response: error.response?.data,
        status: error.response?.status,
      });
      return [];
    }
  }

  // Otherwise, fetch all products with pagination
  let page = 1;
  let allResults: Product[] = [];
  let hasNext = true;

  while (hasNext) {
    try {
      const response = await api.get<ProductsResponse>("/items/product/", {
        params: { ...params, page, non_zero: 1 },
      });

      const data = response.data;
      allResults = allResults.concat(data.results || []);

      hasNext = data.next !== null;
      page++;
    } catch (error) {
      console.error("Error fetching products:", error);
      hasNext = false;
    }
  }

  return allResults;
}

export async function fetchProductByBarcode(
  barcode: string,
): Promise<Product | null> {
  console.log("🔍 Fetching product by barcode:", barcode);
  console.log("📡 API URL:", `/api/v1/items/product/?barcode=${barcode}`);

  try {
    const response = await api.get<ProductsResponse>("/items/product/", {
      params: { barcode, non_zero: 1 },
    });

    console.log("✅ API Response:", response.data);
    const products = response.data.results || [];

    if (products.length > 0) {
      console.log("✅ Product found:", products[0]);
      return products[0];
    } else {
      console.log("⚠️ No products found for barcode:", barcode);
      return null;
    }
  } catch (error: any) {
    console.error("❌ Error fetching product by barcode:", {
      barcode,
      error: error.message || error,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      fullURL: error.config?.baseURL + error.config?.url,
      params: error.config?.params,
    });
    return null;
  }
}

export async function fetchFirstPageProducts(
  params: FetchProductsParams = {},
): Promise<Product[]> {
  try {
    const response = await api.get<ProductsResponse>("/items/product/", {
      params: { ...params, non_zero: 1 },
    });
    return response.data.results || [];
  } catch (error) {
    console.error("Error fetching first page products:", error);
    return [];
  }
}
