import supabase from "../../../supabaseClient";

// Overview tab
export async function fetchOrderOverview(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, customer:customer_id(id, name, gstin, pan, address)")
    .eq("id", orderId)
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  console.log("Fetched order overview:", data);
  // Attach customer_name for convenience
  // return { ...data,jobName:data.name ,customer_name: data.customer?.name || "" };
  return {
    ...data,
    jobName: data.name,
    customer_name: data.customer?.name || "",
    customer_gstin: data.customer?.gstin || "",
    customer_pan:   data.customer?.pan   || ""
  };
}
export async function fetchInvoiceDetails(orderId) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}
export async function updateOrderOverview(orderId, changes) {
  const { data, error } = await supabase
    .from("orders")
    .update(changes)
    .eq("id", orderId);
  if (error) throw error;
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

// Update customer details (GSTIN, PAN, etc.)
export async function updateCustomerDetails(customerId, updates) {
  // Convert empty strings to null for date fields
  const processedUpdates = { ...updates };
  
  // List of date fields that might be empty
  const dateFields = ['follow_up_on'];
  
  dateFields.forEach(field => {
    if (processedUpdates[field] === '') {
      processedUpdates[field] = null;
    }
  });

  const { data, error } = await supabase
    .from("customers")
    .update(processedUpdates)
    .eq("id", customerId)
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
    .from('signage_items')
    .select('*')
    .eq('order_id', orderId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
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
  console.log("Updating signage item", itemId, "with data", updates);
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

export async function insertDefaultOrderSteps(orderId) {
  const defaultSteps = [
    { type: "design", description: "Design", duration: 3 },
    { type: "procurement", description: "Procurement", duration: 2 },
    { type: "fabrication", description: "Fabrication", duration: 4 },
    { type: "installation", description: "Installation", duration: 2 }
  ];

  const now = new Date();
  let currentDate = new Date(now);

  const stepsWithOrderId = defaultSteps.map(step => {
    const start = new Date(currentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + step.duration - 1); // inclusive of start date

    const stepEntry = {
      ...step,
      order_id: orderId,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      status: "not started",
      delayed: false,
      files: [],
      comments: [],
      dependency_ids: []
    };

    currentDate = new Date(end);
    currentDate.setDate(currentDate.getDate() + 1); // move to day after this step ends
    return stepEntry;
  });

  const { data, error } = await supabase
    .from("order_steps")
    .insert(stepsWithOrderId)
    .select();

  if (error) {
    console.error("Error inserting default order steps:", error);
    throw error;
  }

  return data;
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

export async function markProcurementTaskOrdered(taskId) {
  const { data, error } = await supabase
    .from("procurement_tasks")
    .update({ status: "ordered" })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
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

export async function markProcurementTaskReceivedAndUpdateInventory(taskId) {
  // 1. Mark procurement task as received
  const { data: task, error: taskError } = await supabase
    .from("procurement_tasks")
    .update({ status: "received", actual_date: new Date().toISOString() })
    .eq("id", taskId)
    .select()
    .single();
  if (taskError) throw taskError;
  // 2. Fetch related BOQ item
  const { data: boq, error: boqError } = await supabase
    .from("boq_items")
    .select("material, quantity, unit")
    .eq("id", task.boq_item_id)
    .single();
  if (boqError) throw boqError;
  // 3. Fetch inventory row
  const { data: inv, error: invError } = await supabase
    .from("inventory")
    .select("id, available_qty")
    .eq("material", boq.material)
    .single();
  if (invError) throw invError;
  // 4. Update inventory
  const newQty = Number(inv.available_qty) + Number(boq.quantity);
  const { error: updError } = await supabase
    .from("inventory")
    .update({ available_qty: newQty, last_updated: new Date().toISOString() })
    .eq("id", inv.id);
  if (updError) throw updError;
  return { ...task, inventory_updated: true };
}

export async function createProcurementTaskAndLinkBoq(boqId, vendorId, status, inventory_status) {
  // 1. Create procurement_task
  const { data: task, error: taskError } = await supabase.from("procurement_tasks").insert({
    boq_item_id: boqId,
    vendor_id: vendorId,
    status,
    inventory_status
  }).select().single();
  if (taskError) throw taskError;
  // 2. Update boq_items.procurement_task_id
  const { error: boqError } = await supabase.from("boq_items").update({ procurement_task_id: task.id }).eq("id", boqId);
  if (boqError) throw boqError;
  return task;
}

export async function ensureProcurementStepsForOrder(orderId) {
  // 1. Fetch all procurement tasks for the order
  const tasks = await fetchProcurementTasks(orderId);
  if (!tasks.length) return;
  // 2. Fetch all order_steps of type 'procurement' for this order
  const { data: steps, error: stepError } = await supabase
    .from("order_steps")
    .select("id, procurement_task_id, type")
    .eq("order_id", orderId)
    .eq("type", "procurement");
  if (stepError) throw stepError;
  const existingTaskIds = new Set((steps || []).map(s => s.procurement_task_id));
  // 3. For each procurement_task without a matching step, create one
  for (const task of tasks) {
    if (!existingTaskIds.has(task.id)) {
      // Fetch BOQ for material name
      const { data: boq, error: boqError } = await supabase
        .from("boq_items")
        .select("material")
        .eq("id", task.boq_item_id)
        .single();
      const description = boq && boq.material ? `Procurement: ${boq.material}` : "Procurement";
      const startDate = new Date().toISOString().slice(0, 10);
      const duration = 1;
      const endDate = startDate; // For now, 1 day duration
      await supabase.from("order_steps").insert({
        order_id: orderId,
        type: "procurement",
        description,
        status: "pending",
        start_date: startDate,
        end_date: endDate,
        duration,
        procurement_task_id: task.id
      });
    }
  }
}

// Fetch order_step by procurement_task_id
export async function fetchOrderStepByProcurementTaskId(procurementTaskId) {
  const { data, error } = await supabase
    .from("order_steps")
    .select("*")
    .eq("procurement_task_id", procurementTaskId)
    .single();
  if (error) return null;
  return data;
}

// Fetch procurement_task by id
export async function fetchProcurementTaskById(procurementTaskId) {
  const { data, error } = await supabase
    .from("procurement_tasks")
    .select("*")
    .eq("id", procurementTaskId)
    .single();
  if (error) return null;
  return data;
}

// Fetch boq_item by id
export async function fetchBoqItemById(boqId) {
  const { data, error } = await supabase
    .from("boq_items")
    .select("*")
    .eq("id", boqId)
    .single();
  if (error) return null;
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

// Delete a note
export async function deleteNote(noteId) {
  const { error } = await supabase
    .from("order_notes")
    .delete()
    .eq("id", noteId);
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

// Vendors
export async function fetchVendors() {
  const { data, error } = await supabase.from("vendors").select("*");
  if (error) throw error;
  return data || [];
}

export async function addVendor(name) {
  const { data, error } = await supabase.from("vendors").insert([{ name }]).select().single();
  if (error) throw error;
  return data;
}

// Fetch vendor details by IDs
export async function fetchVendorsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase.from("vendors").select("id, name").in("id", ids);
  if (error) throw error;
  return data || [];
}

// Inventory
export async function fetchInventory() {
  const { data, error } = await supabase.from("inventory").select("*");
  if (error) throw error;
  return data || [];
}

export async function addInventoryEntry(material, unit) {
  const { data, error } = await supabase.from("inventory").insert([{ material, available_qty: 0, unit, last_updated: new Date().toISOString() }]).select().single();
  if (error) throw error;
  return data;
}

// Fetch inventory for a set of materials
export async function fetchInventoryByMaterials(materials) {
  if (!materials || materials.length === 0) return [];
  const { data, error } = await supabase.from("inventory").select("material, available_qty, unit").in("material", materials);
  if (error) throw error;
  return data || [];
}

// Rebalance procurement tasks: update inventory_status for all open tasks
export async function rebalanceProcurementTasks(orderId) {
  // Fetch all procurement tasks for the order
  const tasks = await fetchProcurementTasks(orderId);
  if (!tasks.length) return [];
  // Get all related BOQ items
  const boqIds = tasks.map(t => t.boq_item_id);
  const { data: boqs, error: boqError } = await supabase.from("boq_items").select("id, material, quantity").in("id", boqIds);
  if (boqError) throw boqError;
  // Get all materials
  const materials = [...new Set(boqs.map(b => b.material))];
  const inventory = await fetchInventoryByMaterials(materials);
  // Map material to available_qty
  const invMap = {};
  for (const inv of inventory) invMap[inv.material] = Number(inv.available_qty);
  // Update each task's inventory_status
  for (const task of tasks) {
    const boq = boqs.find(b => b.id === task.boq_item_id);
    if (!boq) continue;
    const available = invMap[boq.material] || 0;
    let status = "shortage";
    if (available >= boq.quantity) status = "in_stock";
    else if (available > 0) status = "partial";
    await supabase.from("procurement_tasks").update({ inventory_status: status }).eq("id", task.id);
  }
  return true;
}

export async function ensureFabricationStepsForSignageItems(orderId) {
  // 1. Fetch all signage items for the order
  const { data: items, error: itemError } = await supabase
    .from("signage_items")
    .select("id, name")
    .eq("order_id", orderId);
  if (itemError) throw itemError;
  if (!items || items.length === 0) return;

  // 2. Fetch all production steps for the order
  const { data: steps, error: stepError } = await supabase
    .from("order_steps")
    .select("id, signage_item_id")
    .eq("order_id", orderId)
    .eq("type", "production");
  if (stepError) throw stepError;
  const existingSignageStepIds = new Set((steps || []).map(s => s.signage_item_id));

  // 3. For each signage item without a production step, create one
  const now = new Date();
  const missing = items.filter(item => !existingSignageStepIds.has(item.id));
  if (missing.length === 0) return;
  const newSteps = missing.map(item => ({
    order_id: orderId,
    type: "production",
    signage_item_id: item.id,
    description: `Fabrication: ${item.name}`,
    status: "pending",
    start_date: now.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
    duration: 1,
    delayed: false,
    files: [],
    comments: [],
    dependency_ids: []
  }));
  const { error: insertError } = await supabase.from("order_steps").insert(newSteps);
  if (insertError) throw insertError;
}

// After creating a procurement step, link the related fabrication step
export async function linkFabricationToProcurementForBoq(boqId, procurementStepId) {
  // 1. Find the signage_item_id for this BOQ item
  const { data: boq, error: boqError } = await supabase
    .from("boq_items")
    .select("signage_item_id")
    .eq("id", boqId)
    .single();
  if (boqError || !boq) return;
  // 2. Find the fabrication step for this signage_item_id
  const { data: step, error: stepError } = await supabase
    .from("order_steps")
    .select("id, dependency_ids")
    .eq("signage_item_id", boq.signage_item_id)
    .eq("type", "production")
    .single();
  if (stepError || !step) return;
  // 3. Add the procurement step id to dependency_ids if not present
  let deps = step.dependency_ids || [];
  if (!deps.includes(procurementStepId)) {
    deps.push(procurementStepId);
    await supabase.from("order_steps").update({ dependency_ids: deps }).eq("id", step.id);
  }
}

// PAYMENTS SECTION
export async function fetchPayments(orderId) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("payment_date", { ascending: true });
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

export async function addPayment(orderId, paymentData) {
  const { data, error } = await supabase
    .from("payments")
    .insert([{ ...paymentData, order_id: orderId }])
    .select()
    .single();
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

  export async function updatePayment(paymentId, updates) {
    const { data, error } = await supabase
      .from("payments")
      .update(updates)
      .eq("id", paymentId)
      .select()
      .single();
    if (error) {
      console.error(error);
      throw error;
    }
    return data;
  }

// Delete payment
export async function deletePayment(paymentId) {
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) {
    console.error(error);
    throw error;
  }
}

// FEED NOTE UTILITY
/**
 * Insert a feed note for any entity action.
 * @param {Object} params - All possible keys for notes table.
 * @param {string} params.type - Should be 'feed'.
 * @param {string} params.content - Human readable description.
 * @param {string} params.created_by - User UUID.
 * @param {string} [params.created_by_name] - User name.
 * @param {string} [params.created_by_email] - User email.
 * @param {string} [params.enquiry_id]
 * @param {string} [params.order_id]
 * @param {string} [params.signage_item_id]
 * @param {string} [params.boq_item_id]
 * @param {string} [params.procurement_task_id]
 * @param {string} [params.inventory_id]
 * @param {string} [params.vendor_id]
 * @param {string} [params.invoice_id]
 * @returns {Promise}
 */
export async function addFeedNote({
  type = 'feed',
  content,
  created_by,
  created_by_name,
  created_by_email,
  enquiry_id,
  order_id,
  signage_item_id,
  boq_item_id,
  procurement_task_id,
  inventory_id,
  vendor_id,
  invoice_id
}) {
  return supabase.from('notes').insert([{
    type,
    content,
    created_by,
    created_by_name,
    created_by_email,
    enquiry_id,
    order_id,
    signage_item_id,
    boq_item_id,
    procurement_task_id,
    inventory_id,
    vendor_id,
    invoice_id,
    created_at: new Date().toISOString()
  }]);
}

// Get inventory items
export async function getInventoryItems() {
  const { data, error } = await supabase.from("inventory").select("*");
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}