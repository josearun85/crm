import { useParams, useLocation, useNavigate } from "react-router-dom";
import OrderHeader from "./components/OrderHeader";
import TabNav from "./components/TabNav";
import SignageItemsTab from "./tabs/SignageItemsTab";
import BoqTab from "./tabs/BoqTab";
import TimelineTab from "./tabs/TimelineTab";
import ProcurementTab from "./tabs/ProcurementTab";
import FilesTab from "./tabs/FilesTab";
import NotesTab from "./tabs/NotesTab";

const tabMap = {
  items: SignageItemsTab,
  boq: BoqTab,
  timeline: TimelineTab,
  procurement: ProcurementTab,
  files: FilesTab,
  notes: NotesTab,
};

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Default to 'items' tab
  const tab = new URLSearchParams(location.search).get("tab") || "items";
  const TabComponent = tabMap[tab] || SignageItemsTab;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#fffbe6]">
      <div className="w-full flex-1 flex flex-col items-center">
        <div className="w-full max-w-[1000px] mx-auto px-4 py-6 bg-white">
          <OrderHeader orderId={orderId} />
          <TabNav currentTab={tab} onTabChange={(t) => navigate(`?tab=${t}`)} />
          <div className="mt-6">
            <TabComponent orderId={orderId} />
          </div>
        </div>
      </div>
    </div>
  );
}