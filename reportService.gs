var ReportService = {

  createInventorySheet: function(ss) {
    let sheet = ss.getSheetByName('Inventory');
    if (!sheet) {
      sheet = ss.insertSheet('Inventory');
      const headers = [['id', 'name', 'category', 'unit', 'currentStock', 'minStock', 'maxStock', 'costPerUnit', 'lastUpdated', 'supplier', 'location']];
      sheet.getRange('A1:K1').setValues(headers);
      sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
      
      const now = new Date();
      const sampleData = [
        ['INV001', 'เส้นเล็ก', 'เส้น', 'kg', 15, 5, 50, 25, now, 'บริษัท เส้นสด จำกัด', 'โซน A-01'],
        // ... sampleData ที่เหลือ
      ];
      sheet.getRange(2, 1, sampleData.length, 11).setValues(sampleData);
    }
    sheet.setFrozenRows(1);
    Logger.log('✓ Inventory sheet ready');
  },

  getInventoryStatusData: function() {
    try {
      const ss = Utils.getSpreadsheet();
      let sheet = ss.getSheetByName('Inventory');
      if (!sheet) {
        this.createInventorySheet(ss);
        sheet = ss.getSheetByName('Inventory');
      }
      
      const data = sheet.getDataRange().getValues();
      const rows = data.slice(1);
      
      const inventory = rows.map(row => ({
        id: row[0],
        name: row[1],
        category: row[2],
        unit: row[3],
        currentStock: Number(row[4]) || 0,
        minStock: Number(row[5]) || 0,
        maxStock: Number(row[6]) || 0,
        costPerUnit: Number(row[7]) || 0,
        lastUpdated: row[8],
        supplier: row[9] || '',
        location: row[10] || '',
        status: Utils.getStockStatus(Number(row[4]) || 0, Number(row[5]) || 0)
      }));
      
      const lowStock = inventory.filter(item => item.currentStock <= item.minStock);
      const outOfStock = inventory.filter(item => item.currentStock <= 0);
      
      return {
        success: true,
        data: {
          all: inventory,
          lowStock: lowStock,
          lowStockCount: lowStock.length,
          outOfStock: outOfStock,
          outOfStockCount: outOfStock.length,
          totalValue: inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0)
        }
      };
    } catch (error) {
      throw error;
    }
  },

  getDashboardStatsData: function() {
    try {
      const ss = Utils.getSpreadsheet();
      const ordersSheet = ss.getSheetByName('Orders');
      if (!ordersSheet) throw new Error('Orders sheet not found');
      
      const data = ordersSheet.getDataRange().getValues();
      const rows = data.slice(1);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const stats = {
        totalOrders: 0,
        totalRevenue: 0,
        todayOrders: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        preparingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        averageOrderValue: 0
      };
      
      rows.forEach(row => {
        const orderDate = new Date(row[7]);
        const status = row[6] || 'Pending';
        const totalPrice = Number(row[3]) || 0;
        
        stats.totalOrders++;
        stats.totalRevenue += totalPrice;
        
        if (status === 'Pending') stats.pendingOrders++;
        else if (status === 'Preparing' || status === 'Confirmed') stats.preparingOrders++;
        else if (status === 'Completed') stats.completedOrders++;
        else if (status === 'Cancelled') stats.cancelledOrders++;
        
        if (orderDate >= today) {
          stats.todayOrders++;
          stats.todayRevenue += totalPrice;
        }
      });
      
      stats.averageOrderValue = stats.totalOrders > 0
        ? Math.round(stats.totalRevenue / stats.totalOrders)
        : 0;
      
      return { success: true, data: stats };
    } catch (error) {
      throw error;
    }
  },

  getBestSellingItems: function() {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Orders');
      if (!sheet) {
        return { success: true, data: { all: [] } };
      }
      
      const data = sheet.getDataRange().getValues();
      const rows = data.slice(1);
      
      const itemCounts = {};
      const itemRevenue = {};
      
      rows.forEach(row => {
        const items = JSON.parse(row[2] || '[]');
        items.forEach(item => {
          const key = item.menuId + '|' + item.menuName;
          itemCounts[key] = (itemCounts[key] || 0) + item.quantity;
          itemRevenue[key] = (itemRevenue[key] || 0) + item.totalPrice;
        });
      });
      
      const bestSelling = Object.entries(itemCounts)
        .map(([key, quantity]) => {
          const [id, name] = key.split('|');
          return {
            id,
            name,
            quantity,
            revenue: itemRevenue[key] || 0
          };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20);
      
      return { success: true, data: { all: bestSelling } };
    } catch (error) {
      Utils.logAction('BEST_SELLING_ERROR', error.message, 'SYSTEM');
      return { success: false, error: error.message };
    }
  },

  adminUpdateInventory: function(itemId, newQuantity, adminId) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Inventory');
      if (!sheet) throw new Error('ไม่พบชีต Inventory');
      
      const data = sheet.getDataRange().getValues();
      let foundRow = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === itemId) {
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow === -1) throw new Error(`ไม่พบสินค้า: ${itemId}`);
      
      sheet.getRange(foundRow, 5).setValue(newQuantity);
      sheet.getRange(foundRow, 9).setValue(new Date());
      
      Utils.logAction('ADMIN_UPDATE_INVENTORY', `Item ${itemId} updated to ${newQuantity}`, adminId);
      return { success: true };
    } catch (error) {
      Utils.logAction('ADMIN_UPDATE_INVENTORY_ERROR', error.message, adminId);
      throw error;
    }
  },

  adminAddInventoryItem: function(itemData, adminId) {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Inventory');
      if (!sheet) throw new Error('ไม่พบชีต Inventory');
      
      const newId = 'INV' + String(Date.now()).slice(-6);
      
      sheet.appendRow([
        newId,
        itemData.name,
        itemData.category,
        itemData.unit,
        itemData.currentStock || 0,
        itemData.minStock || 5,
        itemData.maxStock || 50,
        itemData.costPerUnit || 0,
        new Date(),
        itemData.supplier || '',
        itemData.location || ''
      ]);
      
      Utils.logAction('ADMIN_ADD_INVENTORY', `Added ${itemData.name}`, adminId);
      return { success: true, data: { itemId: newId } };
    } catch (error) {
      Utils.logAction('ADMIN_ADD_INVENTORY_ERROR', error.message, adminId);
      throw error;
    }
  },

  adminQuickAdjustInventory: function(itemId, change, adminId = 'ADMIN') {
    try {
      const ss = Utils.getSpreadsheet();
      const sheet = ss.getSheetByName('Inventory');
      if (!sheet) throw new Error('ไม่พบชีต Inventory');
      
      const data = sheet.getDataRange().getValues();
      let foundRow = -1;
      let currentStock = 0;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === itemId) {
          foundRow = i + 1;
          currentStock = Number(data[i][4]) || 0;
          break;
        }
      }
      
      if (foundRow === -1) throw new Error(`ไม่พบสินค้า: ${itemId}`);
      
      const newStock = Math.max(0, currentStock + change);
      
      sheet.getRange(foundRow, 5).setValue(newStock);
      sheet.getRange(foundRow, 9).setValue(new Date());
      
      Utils.logAction('ADMIN_QUICK_INVENTORY', `Item ${itemId}: ${currentStock} -> ${newStock} (${change})`, adminId);
      return {
        success: true,
        data: {
          itemId: itemId,
          oldStock: currentStock,
          newStock: newStock,
          change: change
        }
      };
    } catch (error) {
      Utils.logAction('ADMIN_QUICK_INVENTORY_ERROR', error.message, adminId);
      return { success: false, error: error.message };
    }
  }
};
