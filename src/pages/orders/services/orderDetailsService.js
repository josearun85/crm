import supabase from "../../../supabaseClient";

// Overview tab
export async function fetchOrderOverview(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function updateOrderStatus(orderId, newStatus) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

// Signage Items tab
export async function fetchSignageItems(orderId) {
  const { data, error } = await supabase
    .from("signage_items")
    .select("*")
    .eq("order_id", orderId);
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function addSignageItem(orderId, itemData) {
  console.log("Inserting signage item with order_id", orderId, "and data", itemData);
  const { data, error } = await supabase
    .from("signage_items")
    .insert([{ ...itemData, order_id: orderId }])
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function updateSignageItem(itemId, updates) {
  const { data, error } = await supabase
    .from("signage_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function deleteSignageItem(itemId) {
  const { error } = await supabase.from("signage_items").delete().eq("id", itemId);
  if (error) {
    console.error(error);
    throw error;
  }
}

// BOQ tab
export async function fetchBoqItems(orderId) {
  const { data: items, error: itemError } = await supabase
    .from("signage_items")
    .select("id")
    .eq("order_id", orderId);
  if (itemError) {
    console.error(itemError);
    throw itemError;
  }

  const itemIds = items.map(i => i.id);
  const { data, error } = await supabase
    .from("boq_items")
    .select("*")
    .in("signage_item_id", itemIds);
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function addBoqItem(signage_item_id, boqData) {
  const { data, error } = await supabase
    .from("boq_items")
    .insert([{ ...boqData, signage_item_id }])
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function updateBoqItem(boqId, updates) {
  const { data, error } = await supabase
    .from("boq_items")
    .update(updates)
    .eq("id", boqId)
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function deleteBoqItem(boqId) {
  const { error } = await supabase.from("boq_items").delete().eq("id", boqId);
  if (error) {
    console.error(error);
    throw error;
  }
}

// Timeline tab
export async function fetchOrderSteps(orderId) {
  const { data, error } = await supabase
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId);
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function updateOrderStep(stepId, updates) {
  const { data, error } = await supabase
    .from("order_steps")
    .update(updates)
    .eq("id", stepId)
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function addOrderStep(orderId, stepData) {
  const { data, error } = await supabase
    .from("order_steps")
    .insert([{ ...stepData, order_id: orderId }])
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function deleteOrderStep(stepId) {
  const { error } = await supabase.from("order_steps").delete().eq("id", stepId);
  if (error) {
    console.error(error);
    throw error;
  }
}

// Procurement tab
export async function fetchProcurementTasks(orderId) {
  const { data: items, error: itemError } = await supabase
    .from("signage_items")
    .select("id")
    .eq("order_id", orderId);
  if (itemError) {
    console.error(itemError);
    throw itemError;
  }

  const itemIds = items.map(i => i.id);
  const { data: boqs, error: boqError } = await supabase
    .from("boq_items")
    .select("id")
    .in("signage_item_id", itemIds);
  if (boqError) {
    console.error(boqError);
    throw boqError;
  }

  const boqIds = boqs.map(b => b.id);
  const { data, error } = await supabase
    .from("procurement_tasks")
    .select("*")
    .in("boq_item_id", boqIds);
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function updateProcurementTask(taskId, updates) {
  const { data, error } = await supabase
    .from("procurement_tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function markProcurementTaskReceived(taskId) {
  const { data, error } = await supabase
    .from("procurement_tasks")
    .update({ actual_date: new Date().toISOString() })
    .eq("id", taskId)
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

// Files tab
export async function fetchOrderFiles(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("files")
    .eq("id", orderId)
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data.files || [];
}

export async function uploadOrderFile(orderId, newFile) {
  const { data, error } = await supabase
    .from("orders")
    .select("files")
    .eq("id", orderId)
    .single();
  if (error) {
    console.error(error);
    throw error;
  }

  const existingFiles = data.files || [];
  const updatedFiles = [...existingFiles, newFile];

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ files: updatedFiles })
    .eq("id", orderId)
    .select()
    .single();
  if (updateError) {
    console.error(updateError);
    throw updateError;
  }
  return updated.files;
}

export async function deleteOrderFile(orderId, fileIndex) {
  const { data, error } = await supabase
    .from("orders")
    .select("files")
    .eq("id", orderId)
    .single();
  if (error) {
    console.error(error);
    throw error;
  }

  const files = data.files || [];
  files.splice(fileIndex, 1);

  const { error: updateError } = await supabase
    .from("orders")
    .update({ files })
    .eq("id", orderId);
  if (updateError) {
    console.error(updateError);
    throw updateError;
  }
}

// Notes tab
export async function fetchOrderNotes(orderId) {
  const { data, error } = await supabase
    .from("order_notes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function addOrderNote(orderId, noteContent) {
  const { data, error } = await supabase
    .from("order_notes")
    .insert([{ order_id: orderId, content: noteContent }])
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function deleteOrderNote(noteId) {
  const { error } = await supabase.from("order_notes").delete().eq("id", noteId);
  if (error) {
    console.error(error);
    throw error;
  }
}
// Generic update for order details
export async function updateOrderDetails(orderId, updates) {
  const { data, error } = await supabase
    .from("orders")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}
// Update all BOQ items in an order by material
export async function updateBoqItemsByMaterial(orderId, material, updates) {
  const { data: items, error: itemError } = await supabase
    .from("signage_items")
    .select("id")
    .eq("order_id", orderId);
  if (itemError) {
    console.error(itemError);
    throw itemError;
  }

  const itemIds = items.map(i => i.id);
  const { error } = await supabase
    .from("boq_items")
    .update(updates)
    .in("signage_item_id", itemIds)
    .eq("material", material);

  if (error) {
    console.error(error);
    throw error;
  }
}