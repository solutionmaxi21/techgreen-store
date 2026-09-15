// Automated refactoring script to replace mockAdminApi imports with apiService
// This script updates all Admin panel files to import directly from apiService.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_SRC = path.join(__dirname, 'src');

// Files to update (from grep search results)
const filesToUpdate = [
    'pages/ProductsListPage.jsx',
    'pages/OrdersListPage.jsx',
    'pages/UsersListPage.jsx',
    'pages/ReviewsPage.jsx',
    'pages/DashboardPage.jsx',
    'pages/OrderDetailPage.jsx',
    'pages/OrderFormPage.jsx',
    'pages/UserDetailPage.jsx',
    'pages/UserFormPage.jsx',
    'pages/ReturnDetailPage.jsx',
    'pages/ReturnsListPage.jsx',
    'pages/QuickReceiveProductsPage.jsx',
    'pages/IncompleteProductsPage.jsx',
    'pages/BarcodeScannerPage.jsx',
    'pages/TrashPage.jsx',
    'pages/SettingsPage.jsx',
    'pages/LoginPage.jsx',
    'pages/CategoriesListPage.jsx',
    'pages/CategoryFormPage.jsx',
    'pages/InventoryListPage.jsx',
    'pages/ProductFormPage.jsx',
    'pages/ProductDetailsPage.jsx',
    'pages/PromotionFormPage.jsx',
    'pages/PromotionsListPage.jsx',
    'pages/StockAdjustmentPage.jsx',
    'pages/SupplierFormPage.jsx',
    'pages/SuppliersListPage.jsx',
    'hooks/useProducts.js',
    'hooks/useMetadata.js',
    'hooks/useSkuValidation.js',
    'components/BarcodeManager.jsx',
    'components/forms/ProductWizard/Step1BasicInfo.jsx',
    'components/forms/ProductWizard/Step2PricingInventory.jsx',
    'components/forms/ProductWizard/Step3DetailsMedia.jsx',
    'components/forms/ProductWizard/Step4Review.jsx',
];

let updatedCount = 0;
let errorCount = 0;

console.log('🔄 Starting import path refactoring...\n');

filesToUpdate.forEach((relPath) => {
    const filePath = path.join(ADMIN_SRC, relPath);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${relPath}`);
        errorCount++;
        return;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Replace mockAdminApi imports with apiService
        content = content.replace(
            /from ['"]\.\.\/services\/mockAdminApi['"]/g,
            "from '../services/apiService'"
        );
        content = content.replace(
            /from ['"]\.\.\/\.\.\/services\/mockAdminApi['"]/g,
            "from '../../services/apiService'"
        );
        content = content.replace(
            /from ['"]\.\.\/\.\.\/\.\.\/services\/mockAdminApi['"]/g,
            "from '../../../services/apiService'"
        );

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated: ${relPath}`);
            updatedCount++;
        } else {
            console.log(`⏭️  No changes needed: ${relPath}`);
        }
    } catch (error) {
        console.error(`❌ Error updating ${relPath}:`, error.message);
        errorCount++;
    }
});

console.log(`\n📊 Refactoring complete!`);
console.log(`   ✅ Updated: ${updatedCount} files`);
console.log(`   ❌ Errors: ${errorCount} files`);
console.log(`   ⏭️  Skipped: ${filesToUpdate.length - updatedCount - errorCount} files`);

if (updatedCount > 0) {
    console.log('\n✨ Next steps:');
    console.log('   1. Test the Admin panel: cd admin && npm run dev');
    console.log('   2. Verify all pages load correctly');
    console.log('   3. If everything works, delete mockAdminApi.js');
}
