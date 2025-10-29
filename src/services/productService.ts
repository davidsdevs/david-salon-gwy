import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  supplier: string;
  imageUrl: string;
  otcPrice: number;
  salonUsePrice: number;
  unitCost: number;
  upc: string;
  shelfLife: string;
  variants: string;
  status: string;
  branches: string[];
  createdAt: string;
  updatedAt: string;
}

export class ProductService {
  private static readonly PRODUCTS_COLLECTION = 'products';

  // Get products for a specific branch
  static async getProductsByBranch(branchId: string): Promise<Product[]> {
    try {
      console.log('🔄 Fetching products for branch:', branchId);
      
      const productsRef = collection(db, this.PRODUCTS_COLLECTION);
      const querySnapshot = await getDocs(productsRef);
      
      const products: Product[] = [];
      let totalProducts = 0;
      let activeProducts = 0;
      let branchMatchedProducts = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalProducts++;
        
        console.log('🔍 Product data:', {
          id: doc.id,
          name: data.name,
          branches: data.branches,
          status: data.status,
          branchId: branchId
        });
        
        // Check if product is active
        if (data.status === 'Active') {
          activeProducts++;
          console.log('✅ Product is active:', data.name);
          
          // Check if product is available for this branch
          if (data.branches && Array.isArray(data.branches)) {
            console.log('🔍 Checking branches array:', data.branches, 'for branchId:', branchId);
            if (data.branches.includes(branchId)) {
              branchMatchedProducts++;
              console.log('✅ Branch match found for product:', data.name);
              
              products.push({
                id: doc.id,
                name: data.name || 'Unknown Product',
                description: data.description || '',
                brand: data.brand || '',
                category: data.category || '',
                supplier: data.supplier || '',
                imageUrl: data.imageUrl || '',
                otcPrice: data.otcPrice || 0,
                salonUsePrice: data.salonUsePrice || 0,
                unitCost: data.unitCost || 0,
                upc: data.upc || '',
                shelfLife: data.shelfLife || '',
                variants: data.variants || '',
                status: data.status || 'Active',
                branches: data.branches || [],
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
              });
            } else {
              console.log('❌ Branch mismatch for product:', data.name, 'branches:', data.branches, 'looking for:', branchId);
            }
          } else {
            console.log('❌ No branches array for product:', data.name);
          }
        } else {
          console.log('❌ Product is not active:', data.name, 'status:', data.status);
        }
      });
      
      console.log('📊 Product filtering summary:');
      console.log('  - Total products:', totalProducts);
      console.log('  - Active products:', activeProducts);
      console.log('  - Branch matched products:', branchMatchedProducts);
      console.log('  - Final products returned:', products.length);
      
      console.log('✅ Found products for branch:', products.length);
      console.log('📋 Products:', products.map(p => ({ id: p.id, name: p.name, branches: p.branches })));
      
      return products;
      
    } catch (error) {
      console.error('❌ Error fetching products for branch:', error);
      return [];
    }
  }

  // Get all products (for admin purposes)
  static async getAllProducts(): Promise<Product[]> {
    try {
      console.log('🔄 Fetching all products');
      
      const productsRef = collection(db, this.PRODUCTS_COLLECTION);
      const querySnapshot = await getDocs(productsRef);
      
      const products: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.status === 'Active') {
          products.push({
            id: doc.id,
            name: data.name || 'Unknown Product',
            description: data.description || '',
            brand: data.brand || '',
            category: data.category || '',
            supplier: data.supplier || '',
            imageUrl: data.imageUrl || '',
            otcPrice: data.otcPrice || 0,
            salonUsePrice: data.salonUsePrice || 0,
            unitCost: data.unitCost || 0,
            upc: data.upc || '',
            shelfLife: data.shelfLife || '',
            variants: data.variants || '',
            status: data.status || 'Active',
            branches: data.branches || [],
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
          });
        }
      });
      
      console.log('✅ Found all products:', products.length);
      return products;
      
    } catch (error) {
      console.error('❌ Error fetching all products:', error);
      return [];
    }
  }

  // Search products by name within a branch
  static async searchProductsByBranch(branchId: string, searchTerm: string): Promise<Product[]> {
    try {
      console.log('🔍 Searching products for branch:', branchId, 'with term:', searchTerm);
      
      const allProducts = await this.getProductsByBranch(branchId);
      
      if (!searchTerm.trim()) {
        return allProducts;
      }
      
      const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      console.log('🔍 Search results:', filteredProducts.length);
      return filteredProducts;
      
    } catch (error) {
      console.error('❌ Error searching products:', error);
      return [];
    }
  }
}

export default ProductService;
