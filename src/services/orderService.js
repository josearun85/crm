import supabase from "../supabaseClient";

// Fetch full order details: order, customer, and steps
export async function getOrderById(orderId) {
  console.log("[getOrderById] Fetching order", orderId);
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("[getOrderById] Order fetch failed", orderError, order);
    throw new Error("Order not found");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("name")
    .eq("id", order.customer_id)
    .single();

  if (customerError) {
    console.warn("[getOrderById] Customer fetch failed", customerError);
  }

  const { data: steps, error: stepsError } = await supabase
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId)
    .order("start_date", { ascending: true });

  if (stepsError) {
    console.warn("[getOrderById] Steps fetch failed", stepsError);
  }

  return {
    ...order,
    customer_name: customer?.name || "",
    steps: steps || []
  };
}

// Update a specific step (partial update)
export async function updateStep(stepId, patch) {
  const { error } = await supabase
    .from("order_steps")
    .update(patch)
    .eq("id", stepId);

  if (error) throw error;
}

// Update entire order
export async function updateOrder(orderId, patch) {
  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId);

  if (error) throw error;
}

// Upload file to Supabase Storage (bucket: crm)
export async function uploadFile(file, folder = "orders") {
  const fileName = `${folder}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("crm").upload(fileName, file);

  if (error) throw error;
  return fileName;
}

// Delete file from Supabase Storage
export async function deleteFile(filePath) {
  const { error } = await supabase.storage.from("crm").remove([filePath]);
  if (error) throw error;
}

// Get public URL for viewing files
export function getPublicUrl(filePath) {
  const { data } = supabase.storage.from("crm").getPublicUrl(filePath);
  return data.publicUrl;
}

export { deleteFile as deleteSupabaseFile };

export async function deleteOrder(orderId) {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (error) throw error;
}

export async function deleteOrderFiles(orderId) {
  const bucket = supabase.storage.from("crm");

  const pathsToDelete = [];

  // Attempt to list files directly under orders/{orderId}/
  try {
    const { data: baseFiles } = await bucket.list(`orders/${orderId}`, { recursive: false });
    const basePaths = baseFiles?.map(f => `orders/${orderId}/${f.name}`) || [];
    pathsToDelete.push(...basePaths);
  } catch {}

  // Attempt to list files inside step folders
  try {
    const { data: stepFolders } = await bucket.list(`orders/${orderId}/steps`, { recursive: false });

    for (const folder of stepFolders || []) {
      try {
        const { data: stepFiles } = await bucket.list(`orders/${orderId}/steps/${folder.name}`, { recursive: true });
        const paths = stepFiles?.map(f => `orders/${orderId}/steps/${folder.name}/${f.name}`) || [];
        pathsToDelete.push(...paths);
      } catch {}
    }
  } catch {}

  // Attempt to delete files if any found
  if (pathsToDelete.length > 0) {
    try {
      await bucket.remove(pathsToDelete);
    } catch (removeError) {
      console.warn("Some files may not have been removed:", removeError.message);
    }
  }
}

// Calculate grand total for an order, matching SignageItemsTab logic
export function calculateOrderGrandTotal({ signageItems, boqs, discount = 0, gstBillablePercent, gstBillableAmount }) {
  // Helper: scaling factor for GST-billable
  function getGstBillableScaling(items) {
    if (gstBillablePercent !== undefined && gstBillablePercent !== null && gstBillablePercent !== '' && Number(gstBillablePercent) !== 100) {
      return Number(gstBillablePercent) / 100;
    }
    const billable = Number(gstBillableAmount);
    if (!billable || !items.length) return 1;
    const originalTotal = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    if (!originalTotal || billable === originalTotal) return 1;
    return billable / originalTotal;
  }

  // Calculate scaled cost for each signage item
  const scaling = getGstBillableScaling(signageItems);
  const itemsWithCost = signageItems.map(item => {
    const itemBoqs = (boqs[item.id] || []);
    const totalCost = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0) * scaling;
    const qty = Number(item.quantity) || 1;
    const rate = totalCost / qty;
    const amount = rate * qty;
    const gstPercent = Number(item.gst_percent) || 0;
    const gstAmount = amount * gstPercent / 100;
    return { ...item, amount, gstPercent, gstAmount, costAfterTax: amount + gstAmount };
  });

  const total = itemsWithCost.reduce((sum, i) => sum + i.amount, 0);
  const netTotal = total - (Number(discount) || 0);
  const gst = itemsWithCost.reduce((sum, i) => sum + i.gstAmount, 0);
  const grandTotal = netTotal + gst;

  return {
    total: Number(total.toFixed(2)),
    netTotal: Number(netTotal.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    items: itemsWithCost
  };
}

// Utility: Calculate signage item total with margin
export function getSignageItemTotalWithMargin({ boqs, signageItem, scaling = 1 }) {
  // Calculate raw BOQ total
  const itemBoqs = (boqs[signageItem.id] || []);
  const boqTotal = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0) * scaling;
  // Margin logic
  if (signageItem.total_with_margin && Number(signageItem.total_with_margin) > 0) {
    return Number(signageItem.total_with_margin) * scaling;
  } else if (signageItem.margin_percent && Number(signageItem.margin_percent) > 0) {
    return boqTotal * (1 + Number(signageItem.margin_percent) / 100);
  } else {
    return boqTotal;
  }
}
