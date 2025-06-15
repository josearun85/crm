/**
 * Centralised order-level calculations for signage BOQ.
 * No React imports here — this file is 100 % pure functions.
 */

// ---------- Helper functions ----------
const toNum = v => Number(v) || 0;

const calcBoqTotal = boqs =>
  boqs.reduce(
    (sum, row) => sum + toNum(row.quantity) * toNum(row.cost_per_unit),
    0
  );

const applyMargin = (boqTotal, marginPercent) =>
  boqTotal * (1 + (toNum(marginPercent) || 0) / 100);

// ---------- Main utility ----------
/**
 * @param {Object} params
 * @param {Array} params.signageItems  – rows from `signage_items` (objects may already contain qty/gst_percent/margin_percent)
 * @param {Array} params.signageBoqItems – rows from `signage_boq_items`
 * @param {number} [params.discount]   – order-level discount
 * @param {number} [params.gstBillablePercent] – optional order-level GST billing %
 * @param {number} [params.gstBillableAmount]  – optional order-level GST billing amount
 * @param {string} [params.customerGstin]      – customer GSTIN for intra-/inter-state tax split
 * @returns {Object} calculated fields (signageItems array + order totals)
 */
export function calculateOrderAll({
  signageItems = [],
  signageBoqItems = [],
  discount = 0,
  gstBillablePercent,
  gstBillableAmount,
  customerGstin = "",
} = {}) {
  // Group BOQ rows by signage_item_id
  const boqMap = {};
  signageBoqItems.forEach((row) => {
    if (!boqMap[row.signage_item_id]) boqMap[row.signage_item_id] = [];
    boqMap[row.signage_item_id].push(row);
  });

  // First pass – per-item maths
  let totalBoqCost = 0;
  const enrichedItems = signageItems.map((item) => {
    const boqs = boqMap[item.id] || [];
    const boqTotal = calcBoqTotal(boqs);
    totalBoqCost += boqTotal;

    const totalWithMargin = applyMargin(boqTotal, item.margin_percent);
    const quantity = toNum(item.quantity) || 1; // avoid /0
    const rate = totalWithMargin / quantity;
    const amount = rate * quantity;

    const gstPercent = toNum(item.gst_percent) || 18;
    const gstAmount = (amount * gstPercent) / 100;
    const costAfterTax = amount + gstAmount;

    return {
      ...item,
      boqs,
      quantity,
      boqTotal,
      totalWithMargin,
      rate,
      amount,
      gstPercent,
      gstAmount,
      costAfterTax,
    };
  });

  // Optional GST billable scaling
  const scaling =
    gstBillablePercent != null &&
    gstBillablePercent !== "" &&
    gstBillablePercent !== 100
      ? toNum(gstBillablePercent) / 100
      : gstBillableAmount != null &&
        gstBillableAmount !== "" &&
        totalBoqCost &&
        toNum(gstBillableAmount) !== totalBoqCost
      ? toNum(gstBillableAmount) / totalBoqCost
      : 1;

  if (scaling !== 1) {
    enrichedItems.forEach((it) => {
      it.rate *= scaling;
      it.amount *= scaling;
      it.gstAmount *= scaling;
      it.costAfterTax *= scaling;
      it.scaled = true;
    });
  }

  // Order-level totals
  const total = enrichedItems.reduce((s, i) => s + i.amount, 0);
  const netTotal = total - toNum(discount);
  const gst = enrichedItems.reduce((s, i) => s + i.gstAmount, 0);
  const grandTotal = netTotal + gst;

  // Tax split – treat blank or KA GSTIN as intra-state
  const isKA =
    !customerGstin ||
    customerGstin.toString().toUpperCase().startsWith("29");
  const igst = isKA ? 0 : gst;
  const cgst = isKA ? gst / 2 : 0;
  const sgst = isKA ? gst / 2 : 0;

  // Cost to company & margin
  const costToCompany = signageBoqItems.reduce(
    (sum, row) => sum + toNum(row.quantity) * toNum(row.cost_per_unit),
    0
  );
  const margin = netTotal - costToCompany;

  // GST summary table
  const gstSummary = {};
  enrichedItems.forEach((i) => {
    gstSummary[i.gstPercent] = (gstSummary[i.gstPercent] || 0) + i.gstAmount;
  });

  // Detailed split by GST% into IGST / CGST / SGST
  const igstSummary = {};
  const cgstSummary = {};
  const sgstSummary = {};
  enrichedItems.forEach((i) => {
    const pct = i.gstPercent;
    const tax = i.gstAmount;
    const igstAmt = isKA ? 0 : tax;
    const halfTax = isKA ? tax / 2 : 0;
    igstSummary[pct] = (igstSummary[pct] || 0) + igstAmt;
    cgstSummary[pct] = (cgstSummary[pct] || 0) + halfTax;
    sgstSummary[pct] = (sgstSummary[pct] || 0) + halfTax;
  });

  return {
    signageItems: enrichedItems,
    totalBoqCost,
    totalSignageCost: totalBoqCost, // backward-compat alias
    total,
    netTotal,
    gst,
    grandTotal,
    igst,
    cgst,
    sgst,
    costToCompany,
    margin,
    discount,
    gstSummary,
    igstSummary,
    cgstSummary,
    sgstSummary,
  };
}