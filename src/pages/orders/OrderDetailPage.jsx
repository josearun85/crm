import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
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
      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select('id, order_id, status')
        .eq('order_id', orderId);
      if (fetchError) return;
      if (!invoices || invoices.length === 0) {
        await supabase
          .from('invoices')
          .insert([{ order_id: orderId, status: 'Draft', created_at: new Date().toISOString() }]);
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

  const overviewRef = useRef(null);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const [tabsHeight, setTabsHeight] = useState(0);
  const tabsContainerRef = useRef(null);

  // Scroll logic to hide overview and make tabs sticky
  useEffect(() => {
    const handleScroll = () => {
      if (overviewRef.current && tabsContainerRef.current) {
        const overviewRect = overviewRef.current.getBoundingClientRect();
        // Only set sticky if the bottom of the overview is above the top of the viewport
        if (overviewRect.bottom <= 0) {
          if (!isTabsSticky) {
            setTabsHeight(tabsContainerRef.current.offsetHeight);
            setIsTabsSticky(true);
          }
        } else {
          if (isTabsSticky) {
            setIsTabsSticky(false);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isTabsSticky]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#fffbe6]">
      <div className="w-full flex-1 flex flex-col items-center">
        <div className="w-full max-w-[1000px] mx-auto px-4 py-6 bg-white">
          <div
            ref={overviewRef}
            className={isTabsSticky ? 'overview-hidden' : ''}
            style={isTabsSticky ? { display: 'none' } : {}}
          >
            <OrderHeader orderId={orderId} customerGstin={customerGstin} setCustomerGstin={setCustomerGstin} customerPan={customerPan} setCustomerPan={setCustomerPan} />
          </div>
          {/* TabNav should always be visible, only sticky when isTabsSticky */}
          <div
            ref={tabsContainerRef}
            className={`tabnav-wrapper${isTabsSticky ? ' sticky-tabs-styling' : ''}`}
            style={isTabsSticky ? { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, background: '#fffbe6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } : {}}
          >
            <TabNav currentTab={tab} onTabChange={(t) => navigate(`?tab=${t}`)} />
          </div>
          {/* Spacer to prevent content jump when sticky */}
          {isTabsSticky && <div style={{ height: tabsHeight }} />}
          <div className="mt-6">
            <TabComponent
              orderId={orderId}
              customerGstin={customerGstin}
              setCustomerGstin={setCustomerGstin}
              customerPan={customerPan}
              setCustomerPan={setCustomerPan}
              gstBillablePercent={gstBillablePercent}
              setGstBillablePercent={percent => handleGstBillableChange(null, percent)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}