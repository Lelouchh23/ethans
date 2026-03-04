const API_URL = "php/app.php";

export function createDB(table) {
	 return {
	 add: async (data) => {
		 console.log(`[usersDB.add] Sending:`, { ...data, table });
		 try {
			 const res = await fetch(API_URL, {
				 method: "POST",
				 headers: {
					 "Content-Type": "application/json",
					 "Accept": "application/json",
					 "X-Requested-With": "XMLHttpRequest"
				 },
				 body: JSON.stringify({ ...data, table })
			 });
			 console.log(`[usersDB.add] Response status:`, res.status);
			 const text = await res.text();
			 try {
				 const json = JSON.parse(text);
				 console.log(`[usersDB.add] Response JSON:`, json);
				 if (!res.ok) throw new Error(`HTTP ${res.status}`);
				 return json;
			 } catch (parseErr) {
				 console.error(`[usersDB.add] Response not JSON:`, text);
				 throw parseErr;
			 }
		 } catch (err) {
			 console.error(`Add failed [${table}]:`, err);
			 return { error: err.message };
		 }
	 },
	 show: async (filters = {}) => {
		 console.log(`[${table}DB.show] Filters:`, filters);
		 try {
			 const params = new URLSearchParams({ ...filters, table }).toString();
			 const res = await fetch(`${API_URL}?${params}`, {
				 headers: {
					 "Accept": "application/json",
					 "X-Requested-With": "XMLHttpRequest"
				 }
			 });
			 console.log(`[${table}DB.show] Response status:`, res.status);
			 const text = await res.text();
			 try {
				 const json = JSON.parse(text);
				 console.log(`[${table}DB.show] Response JSON:`, json);
				 if (!res.ok) throw new Error(`HTTP ${res.status}`);
				 return json;
			 } catch (parseErr) {
				 console.error(`[${table}DB.show] Response not JSON:`, text);
				 throw parseErr;
			 }
		 } catch (err) {
			 console.error(`Show failed [${table}]:`, err);
			 return [];
		 }
	 },
	 edit: async (data) => {
		 console.log(`[${table}DB.edit] Data:`, data);
		 try {
			 if (!data.id && !data.key) throw new Error("Missing id/key for update");
			 const res = await fetch(API_URL, {
				 method: "PUT",
				 headers: {
					 "Content-Type": "application/json",
					 "Accept": "application/json",
					 "X-Requested-With": "XMLHttpRequest"
				 },
				 body: JSON.stringify({ ...data, table })
			 });
			 console.log(`[${table}DB.edit] Response status:`, res.status);
			 const text = await res.text();
			 try {
				 const json = JSON.parse(text);
				 console.log(`[${table}DB.edit] Response JSON:`, json);
				 if (!res.ok) throw new Error(`HTTP ${res.status}`);
				 return json;
			 } catch (parseErr) {
				 console.error(`[${table}DB.edit] Response not JSON:`, text);
				 throw parseErr;
			 }
		 } catch (err) {
			 console.error(`Edit failed [${table}]:`, err);
			 return { error: err.message };
		 }
	 },
	 delete: async (idOrKey) => {
		 console.log(`[${table}DB.delete] Key:`, idOrKey);
		 try {
			 const keyName = typeof idOrKey === 'object' ? Object.keys(idOrKey)[0] : (table === 'system_settings' ? 'key' : 'id');
			 const keyValue = typeof idOrKey === 'object' ? Object.values(idOrKey)[0] : idOrKey;
			 const res = await fetch(API_URL, {
				 method: "DELETE",
				 headers: {
					 "Content-Type": "application/json",
					 "Accept": "application/json",
					 "X-Requested-With": "XMLHttpRequest"
				 },
				 body: JSON.stringify({ [keyName]: keyValue, table })
			 });
			 console.log(`[${table}DB.delete] Response status:`, res.status);
			 const text = await res.text();
			 try {
				 const json = JSON.parse(text);
				 console.log(`[${table}DB.delete] Response JSON:`, json);
				 if (!res.ok) throw new Error(`HTTP ${res.status}`);
				 return json;
			 } catch (parseErr) {
				 console.error(`[${table}DB.delete] Response not JSON:`, text);
				 throw parseErr;
			 }
		 } catch (err) {
			 console.error(`Delete failed [${table}]:`, err);
			 return { error: err.message };
		 }
	 }
	 };
}

// Ready-to-use DB objects for each table
export const rolesDB = createDB('roles');
export const usersDB = createDB('users');
export const accountRequestsDB = createDB('account_requests');
export const menuCategoriesDB = createDB('menu_categories');
export const menuItemsDB = createDB('menu_items');
export const ingredientCategoriesDB = createDB('ingredient_categories');
export const unitsDB = createDB('units');
export const ingredientsDB = createDB('ingredients');
export const recipesDB = createDB('recipes');
export const salesDB = createDB('sales');
export const saleItemsDB = createDB('sale_items');
export const inventoryTransactionsDB = createDB('inventory_transactions');
export const activityLogsDB = createDB('activity_logs');
export const requestsTblDB = createDB('requests_tbl');
export const backupsDB = createDB('backups');
export const systemSettingsDB = createDB('system_settings');
