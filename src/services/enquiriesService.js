// src/services/enquiryService.js
import supabase from "../supabaseClient";

export async function uploadEnquiryFile(file, enquiryId) {
  const fileName = `enquiries/${enquiryId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("crm").upload(fileName, file);
  if (error) throw error;
  
  const filePath = fileName;
  const { data: signedData, error: signedError } = await supabase.storage
    .from("crm")
    .createSignedUrl(filePath, 3600); // 1 hour
  
  if (signedError) throw signedError;
  return { filePath, fileUrl: signedData.signedUrl };
}

export async function deleteEnquiryFile(filePath) {
  const { error } = await supabase.storage.from("crm").remove([filePath]);
  if (error) throw error;
}
export async function getEnquiryFileUrl(filePath) {
  const { data, error } = await supabase.storage.from("crm").createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function getEnquiryById(enquiryId) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", enquiryId)
    .single();

  if (error) throw error;
  return data;
}
export async function updateEnquiry(enquiryId, patch) {
  const { error } = await supabase
    .from("enquiries")
    .update(patch)
    .eq("id", enquiryId);

  if (error) throw error;
}
export async function deleteEnquiry(enquiryId) {
  const { error } = await supabase
    .from("enquiries")
    .delete()
    .eq("id", enquiryId);

  if (error) throw error;
}
export async function createEnquiry(enquiry) {
  const { data, error } = await supabase
    .from("enquiries")
    .insert([enquiry])
    .select()
    .single();

  if (error) throw error;
  return data;
}
export async function getEnquiriesByCustomerId(customerId) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("customer_id", customerId);

  if (error) throw error;
  return data;
}
export async function getEnquiriesByStatus(status) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("status", status);

  if (error) throw error;
  return data;
}
export async function getEnquiriesByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) throw error;
  return data;
}

export async function createFileNote(enquiryId, fileName, filePath, userId, userEmail, fileUrl) {
  const { error } = await supabase.from('notes').insert({
    enquiry_id: enquiryId,
    content: `File uploaded: ${fileName}`,
    file_url: fileUrl,
    file_path: filePath,
    type: 'file',
    created_by: userId,
    created_by_email: userEmail
  });
  if (error) throw error;
}
 
 
 
 
 
 
 
 