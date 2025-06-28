// src/pages/orders/OrderDetailPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  fetchOrderOverview,
  fetchSignageItems,
  fetchBoqItems,
  updateSignageItem,
  addBoqItem,
  updateBoqItem,
  deleteBoqItem,
  updateOrderOverview,
  deleteSignageItem,
  fetchInvoiceDetails
} from "./services/orderDetailsService";
import { calculateOrderAll } from "../../services/orderCalculations";
import OrderHeader from "./components/OrderHeader";
import TabNav from "./components/TabNav";
// import SignageItemsTab from "./tabs/SignageItemsTab";
import ItemsTab from "./tabs/ItemsTab";
import EstimateTab from "./tabs/EstimateTab";
import InvoiceTab from "./tabs/InvoiceTab";
import BoqTab from "./tabs/BoqTab";
import TimelineTab from "./tabs/TimelineTab";
import ProcurementTab from "./tabs/ProcurementTab";
import FilesTab from "./tabs/FilesTab";
import NotesTab from "./tabs/NotesTab";
import PaymentsTab from "./tabs/PaymentsTab";
import MiscellaneousTab from "./tabs/MiscellaneousTab";
import "./OrderDetailPage.css";

const tabMap = {
  // items: SignageItemsTab,
  "items-refactored": ItemsTab,
  estimate: EstimateTab,
  invoice: InvoiceTab,
  boq: BoqTab,
  timeline: TimelineTab,
  procurement: ProcurementTab,
  payments: PaymentsTab,
  files: FilesTab,
  notes: NotesTab,
  miscellaneous: MiscellaneousTab,
};

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const currentTab = new URLSearchParams(useLocation().search).get("tab") || "items-refactored";
  const TabComponent = tabMap[currentTab] || SignageItemsTab;

  // ─── Metadata ───────────────────────────────────────────────────────────────
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerPan, setCustomerPan]       = useState("");
  const [gstBillablePercent, setGstBillablePercent] = useState("");
  // ─── Invoice payload ─────────────────────────────────────────────────────────
  const [invoiceData, setInvoiceData] = useState({});
  // ─── Central order data ─────────────────────────────────────────────────────
  const [orderData, setOrderData] = useState({
    name:"",
    signageItems:    [],
    signageBoqItems: [],
    totalBoqCost:    0,
    total:           0,
    netTotal:        0,
    gst:             0,
    grandTotal:      0,
    igst:            0,
    cgst:            0,
    sgst:            0,
    costToCompany:   0,
    margin:          0,
    discount:        0,
    gstSummary:      {},
    igstSummary:     {},
    cgstSummary:     {},
    sgstSummary:     {},
  });

  const [overview,setOverview] = useState({
    customer_name: "",
    jobName: "",
  });

  // ─── Local unsaved overrides ─────────────────────────────────────────────────
  const [localOverrides, setLocalOverrides] = useState({});

  // ─── Feedback & refs ──────────────────────────────────────────────────────────
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const feedbackTimeout = useRef(null);
  const didFetchOverview = useRef(false);

  // ─── Merge helper for live preview ────────────────────────────────────────────
  const mergeOverrides = (savedItems, savedBoqs, overrides) => {
    let effectiveBoqs = [...savedBoqs];
    const effectiveItems = savedItems.map(si =>
      overrides[si.id]
        ? { ...si, margin_percent: overrides[si.id].marginPercent }
        : si
    );
    Object.entries(overrides).forEach(([sid, { boqs }]) => {
      boqs.forEach(row => {
        if (!row.id) effectiveBoqs.push({ ...row, signage_item_id: sid });
        else effectiveBoqs = effectiveBoqs.map(b => b.id === row.id ? row : b);
      });
    });
    return { effectiveItems, effectiveBoqs };
  };
 
  // // ─── ❶ Fetch & recalc saved data ─────────────────────────────────────────────
  // const fetchAndRecalc = useCallback(
  //   async (overrideDiscount) => {
  //     const [items, boqs,overview] = await Promise.all([
  //       fetchSignageItems(orderId),
  //       fetchBoqItems(orderId),
  //       fetchOrderOverview(orderId),
  //     ]);
  //   // pull invoice row too
  //   const invoice = await fetchInvoiceDetails(orderId);
  //   setInvoiceData(invoice);
  //     const discountValue = overrideDiscount != null
  //       ? overrideDiscount
  //       : orderData.discount;
  //     const calc = calculateOrderAll({
  //       signageItems:    items,
  //       signageBoqItems: boqs,
  //       discount:        discountValue,
  //       customerGstin,
  //       gstBillablePercent,
  //     });
  //     console.log(overview,orderData)
  //     setOverview(overview);
  //     setOrderData({ ...calc,
  //        signageBoqItems: boqs, customer_name:  overview.customer_name,   name:        overview.name || overview.job_name, });
  //     setLocalOverrides({});
  //   },
  //   [orderId, customerGstin, gstBillablePercent, orderData.discount]
  // );


// ─── ❶ Fetch & recalc saved data ─────────────────────────────────────────────
const fetchAndRecalc = useCallback(
  async (overrideDiscount) => {
    /* ------------------------------------------------------
       1. Pull the three “master” entities in parallel
    ------------------------------------------------------ */
    let [items, boqs, overview] = await Promise.all([
      fetchSignageItems(orderId),
      fetchBoqItems(orderId),
      fetchOrderOverview(orderId),
    ]);

    /* ------------------------------------------------------
       2. Guarantee every signage item has *at least one*
          persisted BOQ row (all empty fields)
    ------------------------------------------------------ */
    const itemsNeedingBoq = items.filter(
      si => !boqs.some(bq => bq.signage_item_id === si.id)
    );

    if (itemsNeedingBoq.length) {
      await Promise.all(
        itemsNeedingBoq.map(si =>
          addBoqItem(si.id, {
            signage_item_id: si.id,
            item: "",
            material: "",
            unit: "",
            quantity: 1,
            cost_per_unit: 0,
          })
        )
      );
      // Re-fetch BOQs so we have the DB-generated IDs
      boqs = await fetchBoqItems(orderId);
    }

    /* ------------------------------------------------------
       3. Pull invoice row (already separate in the original)
    ------------------------------------------------------ */
    const invoice = await fetchInvoiceDetails(orderId);
    setInvoiceData(invoice);

    /* ------------------------------------------------------
       4. Run the master calculation & update React state
    ------------------------------------------------------ */
    const discountValue =
      overrideDiscount != null ? overrideDiscount : orderData.discount;

    const calc = calculateOrderAll({
      signageItems:    items,
      signageBoqItems: boqs,
      discount:        discountValue,
      customerGstin,
      gstBillablePercent,
    });

    setOverview(overview);
    setOrderData({
      ...calc,
      signageBoqItems: boqs,
      customer_name:   overview.customer_name,
      name:            overview.name || overview.job_name,
    });

    /* ------------------------------------------------------
       5. Reset local overrides so the UI is in sync
    ------------------------------------------------------ */
    setLocalOverrides({});
  },
  [orderId, customerGstin, gstBillablePercent, orderData.discount]
);



// ♻️ Move a signage item up or down in the list
 const handleMoveSignageItem = useCallback(
   async (signageItemId, direction) => {
     // get current array
     const arr = [...orderData.signageItems];
     const idx = arr.findIndex(i => i.id === signageItemId);
     if (idx < 0) return;
     const swapIdx = direction === "up" ? idx - 1 : idx + 1;
     if (swapIdx < 0 || swapIdx >= arr.length) return;

     // swap in-memory
     [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
     // optimistically update UI
     setOrderData(d => ({ ...d, signageItems: arr }));

     // TODO: persist new sort_order if you have a column for it.
    //  Example:
     await updateSignageItem(arr[idx].id, { sort_order: swapIdx });
     await updateSignageItem(arr[swapIdx].id, { sort_order: idx });
    console.log(`Moved signage item ${signageItemId} ${direction}`);
     // then re-calc everything
     await fetchAndRecalc();
   },
   [orderData.signageItems, fetchAndRecalc]);

  // ─── ❷ Initial load: overview + recalc ───────────────────────────────────────
  useEffect(() => {
    if (!orderId || didFetchOverview.current) return;
    didFetchOverview.current = true;
    (async () => {
      const overview = await fetchOrderOverview(orderId);
      setCustomerGstin(overview.customer?.gstin || "");
      setCustomerPan(overview.customer?.pan || "");
      setGstBillablePercent(overview.gst_billable_percent ?? "");
      setOrderData(prev => ({ ...prev,  }));
      await fetchAndRecalc(overview.discount || 0);
    })();
  }, [orderId, fetchAndRecalc]);

  // ─── ❸ Persist discount & recalc ─────────────────────────────────────────────
  const handleDiscountChange = useCallback(
    async (newDiscount) => {
      await updateOrderOverview(orderId, { discount: newDiscount });
      setOrderData(prev => ({ ...prev, discount: newDiscount }));
      await fetchAndRecalc(newDiscount);
    },
    [orderId, fetchAndRecalc]
  );

  // ─── ❹ Live preview: recalc with overrides ──────────────────────────────────
  const recalcWithOverrides = useCallback((overrides) => {
    const { effectiveItems, effectiveBoqs } = mergeOverrides(
      orderData.signageItems,
      orderData.signageBoqItems,
      overrides
    );
    const calc = calculateOrderAll({
      signageItems:    effectiveItems,
      signageBoqItems: effectiveBoqs,
      discount:        orderData.discount,
      customerGstin,
      gstBillablePercent,
    });
    setOrderData({ ...calc, signageBoqItems: effectiveBoqs });
  }, [orderData, customerGstin, gstBillablePercent]);

  const handleLocalBoqChange = useCallback((signageItemId, boqs, marginPct) => {
    setLocalOverrides(prev => {
      const next = { ...prev, [signageItemId]: { boqs, marginPercent: marginPct } };
      recalcWithOverrides(next);
      return next;
    });
  }, [recalcWithOverrides]);

  // ─── ❺ Add BOQ row → feedback + recalc ─────────────────────────────────────
  const handleAddBoqRow = useCallback(
    async (signageItemId) => {
      try {
        await addBoqItem(signageItemId, {
          signage_item_id: signageItemId,
          item: "",
          material: "",
          unit: "",
          quantity: 1,
          cost_per_unit: 0,
        });
        setFeedbackMsg("BOQ row added");
        clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = setTimeout(() => setFeedbackMsg(""), 2000);
        await fetchAndRecalc();
        const liveRegion = document.getElementById("boq-live-region");
        if (liveRegion) liveRegion.textContent = "BOQ row added";
      } catch {
        setFeedbackMsg("Failed to add BOQ row");
        clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = setTimeout(() => setFeedbackMsg(""), 3000);
        const liveRegion = document.getElementById("boq-live-region");
        if (liveRegion) liveRegion.textContent = "Failed to add BOQ row";
      }
    },
    [fetchAndRecalc]
  );

  // ─── ❻ Save BOQ edits → DB + recalc ─────────────────────────────────────────
  const handleSaveBoq = useCallback(
    async (signageItemId, editedBoqs = [], { marginPct, toDelete = [] }) => {
      if (marginPct != null) {
        await updateSignageItem(signageItemId, { margin_percent: marginPct });
      }
      for (const id of toDelete) {
        await deleteBoqItem(id);
      }
      for (const row of editedBoqs) {
        if (!row.id) await addBoqItem(signageItemId, row);
        else         await updateBoqItem(row.id, row);
      }
      await fetchAndRecalc();
    },
    [fetchAndRecalc]
  );

  const handleDeleteSignageItem = useCallback(
  async signageItemId => {
    if (!window.confirm("Are you sure you want to delete this signage item?")) return;
    await deleteSignageItem(signageItemId);
    await fetchAndRecalc();
  },
  [fetchAndRecalc]
);
        // console.log("Rendering OrderDetailPage with orderId:", orderData,overview);


  return (
    <div className="min-h-screen flex flex-col items-center bg-[#fffbe6]">
      <div className="w-full max-w-[1000px] mx-auto px-4 py-6 bg-white">
        <OrderHeader
          orderId={orderId}
          customerGstin={customerGstin}
          setCustomerGstin={setCustomerGstin}
          customerPan={customerPan}
          setCustomerPan={setCustomerPan}
        />
        <TabNav
          currentTab={currentTab}
          onTabChange={t => navigate(`?tab=${t}`)}
        />
        <div className="mt-6">
          <TabComponent
            orderId={orderId}
            orderData={orderData}
            overview={overview}
            invoiceData={invoiceData}
            onDiscountChange={handleDiscountChange}
            onLocalBoqChange={handleLocalBoqChange}
            onMoveSignageItem={handleMoveSignageItem}
            onDeleteSignageItem={handleDeleteSignageItem}
            onSaveBoq={handleSaveBoq}
            onAddBoqRow={handleAddBoqRow}
            setOrderData={setOrderData}
            customerGstin={customerGstin}
            setCustomerGstin={setCustomerGstin}
            customerPan={customerPan}
            setCustomerPan={setCustomerPan}
            gstBillablePercent={gstBillablePercent}
            setGstBillablePercent={setGstBillablePercent}
          />

          {/* ARIA live region */}
          <div
            id="boq-live-region"
            aria-live="polite"
            style={{
              position: "absolute",
              left: "-9999px",
              width: "1px",
              height: "1px",
              overflow: "hidden",
            }}
          />

          {/* Feedback toast */}
          {feedbackMsg && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded shadow z-50">
              {feedbackMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}