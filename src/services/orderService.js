import supabase from "../supabaseClient";

// Fetch full order details: order, customer, and steps
export async function getOrderById(orderId) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Order not found");

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("name")
    .eq("id", order.customer_id)
    .single();

  const { data: steps, error: stepsError } = await supabase
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId)
    .order("start_date", { ascending: true });

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

export async function deleteOrderFiles(orderId) {
  const bucket = supabase.storage.from("crm");

  // Delete files directly under orders/{orderId}/
  const { data: baseFiles, error: baseError } = await bucket.list(`orders/${orderId}`, { recursive: false });
  if (baseError) throw baseError;
  const basePaths = baseFiles?.map(f => `orders/${orderId}/${f.name}`) || [];

  // Fetch step folders inside orders/{orderId}/steps/
  const { data: stepFolders, error: stepsError } = await bucket.list(`orders/${orderId}/steps`, { recursive: false });
  if (stepsError) throw stepsError;

  let stepPaths = [];
  for (const folder of stepFolders || []) {
    const { data: stepFiles } = await bucket.list(`orders/${orderId}/steps/${folder.name}`, { recursive: true });
    const paths = stepFiles?.map(f => `orders/${orderId}/steps/${folder.name}/${f.name}`) || [];
    stepPaths = stepPaths.concat(paths);
  }

  const allPaths = [...basePaths, ...stepPaths];
  if (allPaths.length > 0) {
    const { error: removeError } = await bucket.remove(allPaths);
    if (removeError) throw removeError;
  }
}
