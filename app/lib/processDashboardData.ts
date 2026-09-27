export function processDashboardData(initialData: any) {
  if (!initialData) return null;
  const { tablesRes, ordersRes, sessionsRes, takeawayRes, serviceRes, salesRes, waitlistRes } = initialData;

  // Clone so we don't mutate the cached API response object
  const ordersList = [...(ordersRes?.orders || [])];
  const sessionsList = sessionsRes?.sessions || [];
  const takeawayOrdersList = takeawayRes?.orders || [];
  const tablesApi = tablesRes || [];

  // Inject reception dine-in takeaway orders as fake active orders (once only)
  for (const tw of takeawayOrdersList) {
    if (tw.status === "completed" || tw.status === "cancelled" || tw.status === "ready") continue;
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
        is_takeaway: true,
      });
    }
  }

  const activeOrders = ordersList;

  // Build pending orders list
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
  const pendingOrders = Array.from(pendingOrdersMap.values()).sort(
    (a, b) => b.latestTime.getTime() - a.latestTime.getTime()
  );

  // Build tables — use table_id (UUID) as key to avoid merging tables
  // with the same number across different floors
  const occupancyByTable = new Map<string, { sessionId: string; seatedAt?: Date }>();
  for (const s of sessionsList) {
    if (!s.table_id) continue;
    occupancyByTable.set(s.table_id, {
      sessionId: s.session_id,
      seatedAt: s.started_at ? new Date(s.started_at) : undefined,
    });
  }

  // ordersList has injection-skipped "ready" status takeaway orders — iterate once, no separate loop for pending/preparing
  const totalsByTable = new Map<string, { total: number; count: number; sessionId?: string; seatedAt?: Date }>();
  for (const order of ordersList) {
    if (!order.table_id) continue;
    const existing = totalsByTable.get(order.table_id) || {
      total: 0,
      count: 0,
      sessionId: order.session_id,
      seatedAt: undefined,
    };
    const orderCreatedAt = order.created_at ? new Date(order.created_at) : undefined;
    const orderTotal = order.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    totalsByTable.set(order.table_id, {
      total: existing.total + orderTotal,
      count: existing.count + order.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      sessionId: order.session_id || existing.sessionId,
      seatedAt:
        existing.seatedAt && orderCreatedAt
          ? existing.seatedAt < orderCreatedAt
            ? existing.seatedAt
            : orderCreatedAt
          : existing.seatedAt || orderCreatedAt,
    });
  }

  // Also count "ready" (served-but-not-freed) takeaway orders so the table stays occupied
  for (const tw of takeawayOrdersList) {
    if (tw.status === "completed" || tw.status === "cancelled") continue;
    // Only include "ready" orders here — pending/preparing are already in ordersList via injection
    if (tw.status !== "ready") continue;
    let tableNum = parseInt(String(tw.table_number || ""), 10);
    const notes = String(tw.notes || "");
    if (isNaN(tableNum) && notes.includes("[RECEPTION_DINEIN]")) {
      const m = notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
      if (m) tableNum = parseInt(m[1], 10);
    }
    if (isNaN(tableNum) || tableNum <= 0) continue;
    const matchingTable = tablesApi.find((t: any) => t.table_number === tableNum);
    if (!matchingTable) continue;
    if (totalsByTable.has(matchingTable.id)) continue; // already covered by real order
    const twTotal = Number(tw.total) || (tw.items || []).reduce((s: number, i: any) => s + (i.unit_price || 0) * (i.quantity || 1), 0);
    const twCount = (tw.items || []).reduce((s: number, i: any) => s + (i.quantity || 1), 0);
    if (twTotal > 0 || twCount > 0) {
      totalsByTable.set(matchingTable.id, {
        total: twTotal,
        count: twCount,
        sessionId: tw.id,
        seatedAt: tw.created_at ? new Date(tw.created_at) : undefined,
      });
    }
  }

  const tables = tablesApi.map((t: any) => {
    const occ = occupancyByTable.get(t.id);
    const meta = totalsByTable.get(t.id);
    const hasActiveOrders = Boolean(meta && meta.count > 0);
    
    // Determine takeaway status for Reception Dine-In tracking
    let twStatus: string | undefined;
    for (const tw of takeawayOrdersList) {
      if (tw.status === "completed" || tw.status === "cancelled") continue;
      let tableNum = parseInt(String(tw.table_number || ""), 10);
      const notes = String(tw.notes || "");
      if (isNaN(tableNum) && notes.includes("[RECEPTION_DINEIN]")) {
        const m = notes.match(/\[RECEPTION_DINEIN\]\s*T(\d+)/i);
        if (m) tableNum = parseInt(m[1], 10);
      }
      if (tableNum === t.table_number) {
        twStatus = tw.status;
        break;
      }
    }

    return {
      id: t.id,
      tableCode: `T${t.table_number}`,
      restaurantName: "",
      isOccupied: Boolean(occ) || hasActiveOrders,
      activeSessionId: occ?.sessionId || meta?.sessionId,
      isTakeaway: !occ && hasActiveOrders,
      takeawayStatus: twStatus,
      currentTotal: meta?.total,
      itemsCount: meta?.count,
      seatedAt: occ?.seatedAt || meta?.seatedAt,
      isEnabled: t.is_enabled,
      floorName: t.floor_name || "Main Floor",
    };
  });

  const occupiedTableCodes = new Set(
    tables.filter((t: any) => t.isOccupied).map((t: any) => t.tableCode)
  );
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
    waitlistCount,
  };
}
