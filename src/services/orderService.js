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
