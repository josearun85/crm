import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchOrderOverview } from "./services/orderDetailsService";
import OrderHeader from "./components/OrderHeader";
import TabNav from "./components/TabNav";
import SignageItemsTab from "./tabs/SignageItemsTab";
import BoqTab from "./tabs/BoqTab";
import TimelineTab from "./tabs/TimelineTab";
import ProcurementTab from "./tabs/ProcurementTab";
import FilesTab from "./tabs/FilesTab";
import NotesTab from "./tabs/NotesTab";
import PaymentsTab from "./tabs/PaymentsTab";
import MiscellaneousTab from "./tabs/MiscellaneousTab";
import './OrderDetailPage.css';

const tabMap = {
  items: SignageItemsTab,
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
  const location = useLocation();
  const navigate = useNavigate();
  // Default to 'items' tab
  const tab = new URLSearchParams(location.search).get("tab") || "items";
  const TabComponent = tabMap[tab] || SignageItemsTab;

  // GSTIN and PAN state lifted up
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerPan, setCustomerPan] = useState("");
  const [gstBillablePercent, setGstBillablePercent] = useState("");

  // Fetch GST billable percent and customer info
  useEffect(() => {
    if (!orderId) return;
    fetchOrderOverview(orderId).then(order => {
      setCustomerGstin(order?.customer?.gstin || "");
      setCustomerPan(order?.customer?.pan || "");
      setGstBillablePercent(order?.gst_billable_percent != null ? order.gst_billable_percent : "");
    });
  }, [orderId]);

  // Ensure a draft invoice exists for the order
  useEffect(() => {
    if (!orderId) return;
    async function ensureDraftInvoice() {
      const supabase = (await import("../../supabaseClient")).default;
      // Fetch order to get customer_id
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_id')
        .eq('id', orderId)
        .single();
      if (orderError || !order) return;
      // Only check for existing draft invoice for this order
      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select('id, order_id, status')
        .eq('order_id', orderId)
        .eq('status', 'Draft');
      if (fetchError) return;
      if (!invoices || invoices.length === 0) {
        await supabase
          .from('invoices')
          .insert([{ order_id: orderId, customer_id: order.customer_id, status: 'Draft', created_at: new Date().toISOString() }]);
      }
    }
    ensureDraftInvoice();
  }, [orderId]);

  // Handler to update GST billable percent and persist to backend
  const handleGstBillableChange = async (_amount, percent) => {
    setGstBillablePercent(percent);
    if (orderId) {
      const { updateOrderDetails, fetchOrderOverview, fetchPayments, addPayment, updatePayment, deletePayment } = await import("./services/orderDetailsService");
      await updateOrderDetails(orderId, {
        gst_billable_percent: percent === "" ? null : Number(percent),
      });
      // Refetch from DB to ensure UI is in sync with DB
      const order = await fetchOrderOverview(orderId);
      let newPercent = order?.gst_billable_percent != null ? order.gst_billable_percent : "";
      setGstBillablePercent(newPercent);
      // Auto-create or delete auto-cash-non-gst payment
      const payments = await fetchPayments(orderId);
      // Use a unique note to identify the auto payment
      const autoCash = payments.find(p => p.notes === "auto-cash-non-gst" && p.payment_mode === "cash");
      const signageValue = Number(order?.signage_items_value) || 0;
      const gstPortion = (Number(newPercent) / 100) * signageValue;
      const nonGstAmount = signageValue - gstPortion;
      if (Number(newPercent) === 100) {
        // Delete the auto payment if it exists
        if (autoCash) await deletePayment(autoCash.id);
      } else if (Number(newPercent) < 100 && nonGstAmount > 0) {
        // Create or update the auto payment
        if (autoCash) {
          await updatePayment(autoCash.id, { amount: nonGstAmount });
        } else {
          await addPayment(orderId, {
            payment_date: new Date().toISOString().slice(0, 10),
            amount: nonGstAmount,
            payment_mode: "cash",
            reference: "",
            type: "",
            notes: "auto-cash-non-gst",
            paid: false
          });
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#fffbe6]">
      <div className="w-full flex-1 flex flex-col items-center">
        <div className="w-full max-w-[1000px] mx-auto px-4 py-6 bg-white">
          {/* Always show overview, never hide on scroll */}
          <div>
            <OrderHeader orderId={orderId} customerGstin={customerGstin} setCustomerGstin={setCustomerGstin} customerPan={customerPan} setCustomerPan={setCustomerPan} />
          </div>
          <div className="tabnav-wrapper">
            <TabNav currentTab={tab} onTabChange={(t) => navigate(`?tab=${t}`)} />
          </div>
          <div className="mt-6">
            <TabComponent
              orderId={orderId}
              customerGstin={customerGstin}
              setCustomerGstin={setCustomerGstin}
              customerPan={customerPan}
              setCustomerPan={setCustomerPan}
              gstBillablePercent={gstBillablePercent}
              setGstBillablePercent={percent => setGstBillablePercent(percent)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}