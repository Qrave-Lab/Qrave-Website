export function processDashboardData(initialData: any) {
  if (!initialData) return null;
  const { tablesRes, ordersRes, sessionsRes, takeawayRes, serviceRes, salesRes, waitlistRes } = initialData;

  const ordersList = ordersRes?.orders || [];
  const sessionsList = sessionsRes?.sessions || [];
  const takeawayOrdersList = takeawayRes?.orders || [];
  const tablesApi = tablesRes || [];

  for (const tw of takeawayOrdersList) {
    if (tw.status === "completed" || tw.status === "cancelled") continue;
    let tableNum = parseInt(String(tw.table_number || ""), 10);
    const notes = String(tw.notes || "");
    if (isNaN(tableNum) && notes.includes("[RECEPTION_DINEIN]")) {
      const m = notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
      if (m) tableNum = parseInt(m[1], 10);
    }
    
    if (!isNaN(tableNum) && tableNum > 0) {
      const matchingTable = tablesApi.find((t: any) => t.table_number === tableNum);
      ordersList.push({
        id: tw.id,
        order_id: tw.id,
        status: "accepted",
        created_at: tw.created_at,
        session_id: tw.id,
        table_id: matchingTable ? matchingTable.id : "",
        table_number: tableNum,
        order_number: tw.order_number || null,
        daily_order_number: tw.daily_order_number || null,
        items: (tw.items || []).map((i: any) => ({
          menu_item_id: i.menu_item_id || "",
          variant_id: i.variant_id || "",
          quantity: i.quantity || 1,
          price: i.unit_price || 0,
          menu_item_name: i.menu_item_name || "",
          variant_label: i.variant_label || null,
        })),
        is_takeaway: true
      });
    }
  }

  const activeOrders = ordersList;

  // Build pending orders
  const pendingOrdersMap = new Map<string, any>();
  for (const order of ordersList) {
    if (order.status === "pending" || order.status === "accepted") {
      const key = `${order.table_number}-${order.status}`;
      const existing = pendingOrdersMap.get(key);
      const itemsCount = order.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
      if (existing) {
        existing.itemsCount += itemsCount;
        existing.orderIds.push(order.order_id || order.id);
        if (order.created_at && new Date(order.created_at) > existing.latestTime) {
          existing.latestTime = new Date(order.created_at);
        }
      } else {
        pendingOrdersMap.set(key, {
          tableCode: `T${order.table_number}`,
          status: order.status,
          itemsCount,
          latestTime: order.created_at ? new Date(order.created_at) : new Date(),
          orderIds: [order.order_id || order.id],
        });
      }
    }
  }
  const pendingOrders = Array.from(pendingOrdersMap.values()).sort((a, b) => b.latestTime.getTime() - a.latestTime.getTime());

  // Build tables
  const occupancyByTable = new Map<number, { sessionId: string; seatedAt?: Date }>();
  for (const s of sessionsList) {
    occupancyByTable.set(s.table_number, {
      sessionId: s.session_id,
      seatedAt: s.started_at ? new Date(s.started_at) : undefined,
    });
  }

  const totalsByTable = new Map<number, { total: number; count: number; sessionId?: string; seatedAt?: Date }>();
  for (const order of ordersList) {
    const existing = totalsByTable.get(order.table_number) || { total: 0, count: 0, sessionId: order.session_id, seatedAt: undefined };
    const orderCreatedAt = order.created_at ? new Date(order.created_at) : undefined;
    const orderTotal = order.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    totalsByTable.set(order.table_number, {
      total: existing.total + orderTotal,
      count: existing.count + order.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      sessionId: order.session_id || existing.sessionId,
      seatedAt: existing.seatedAt && orderCreatedAt
          ? (existing.seatedAt < orderCreatedAt ? existing.seatedAt : orderCreatedAt)
          : (existing.seatedAt || orderCreatedAt),
    });
  }

  for (const tw of takeawayOrdersList) {
    if (tw.status === "completed" || tw.status === "cancelled") continue;
    let tableNum = parseInt(String(tw.table_number || ""), 10);
    const notes = String(tw.notes || "");
    if (isNaN(tableNum) && notes.includes("[RECEPTION_DINEIN]")) {
      const m = notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
      if (m) tableNum = parseInt(m[1], 10);
    }
    if (!isNaN(tableNum) && tableNum > 0) {
       const existing = totalsByTable.get(tableNum) || { total: 0, count: 0, sessionId: tw.id, seatedAt: undefined };
       const orderTotal = Number(tw.total) || 0;
       const orderCount = Array.isArray(tw.items) ? tw.items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) : 1;
       totalsByTable.set(tableNum, {
         total: existing.total + orderTotal,
         count: existing.count + orderCount,
         sessionId: existing.sessionId || tw.id,
         seatedAt: existing.seatedAt || (tw.created_at ? new Date(tw.created_at) : undefined),
       });
    }
  }

  const tables = tablesApi.map((t: any) => {
    const occ = occupancyByTable.get(t.table_number);
    const meta = totalsByTable.get(t.table_number);
    const hasActiveOrders = Boolean(meta && meta.count > 0);
    return {
      id: t.id,
      tableCode: `T${t.table_number}`,
      restaurantName: "",
      isOccupied: Boolean(occ) || hasActiveOrders,
      activeSessionId: occ?.sessionId || meta?.sessionId,
      isTakeaway: !occ && hasActiveOrders,
      currentTotal: meta?.total,
      itemsCount: meta?.count,
      seatedAt: occ?.seatedAt || meta?.seatedAt,
      isEnabled: t.is_enabled,
      floorName: t.floor_name || "Main Floor",
    };
  });

  const occupiedTableCodes = new Set(tables.filter((t: any) => t.isOccupied).map((t: any) => t.tableCode));
  const serviceCalls = (serviceRes || [])
    .filter((c: any) => c.status !== "done")
    .filter((c: any) => occupiedTableCodes.has(`T${c.table_number}`))
    .map((c: any) => ({
      id: c.id,
      tableCode: `T${c.table_number}`,
      type: c.type,
      status: c.status,
      createdAt: new Date(c.created_at),
      rating: c.rating,
      comment: c.comment,
    }));

  let todaySales = 0;
  if (typeof salesRes?.total === "number") {
    todaySales = salesRes.total;
  }

  let waitlistCount = 0;
  if (waitlistRes && Array.isArray(waitlistRes.waitlist)) {
    waitlistCount = waitlistRes.waitlist.filter((w: any) => w.status === "waiting").length;
  }

  return {
    activeOrders,
    orders: pendingOrders,
    tables,
    serviceCalls,
    todaySales,
    takeawaySummary: takeawayRes || null,
    waitlistCount
  };
}
