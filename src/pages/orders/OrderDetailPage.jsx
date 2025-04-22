import { useParams, useLocation, useNavigate } from "react-router-dom";
import OrderHeader from "./components/OrderHeader";
import TabNav from "./components/TabNav";
import OverviewTab from "./tabs/OverviewTab";
import SignageItemsTab from "./tabs/SignageItemsTab";
import BoqTab from "./tabs/BoqTab";
import TimelineTab from "./tabs/TimelineTab";
import ProcurementTab from "./tabs/ProcurementTab";
import FilesTab from "./tabs/FilesTab";
import NotesTab from "./tabs/NotesTab";

const tabMap = {
  overview: OverviewTab,
  items: SignageItemsTab,
  boq: BoqTab,
  timeline: TimelineTab,
  procurement: ProcurementTab,
  files: FilesTab,
  notes: NotesTab,
};

export default function OrderDetailPage() {
  const { orderId: orderIdRaw } = useParams();
  const orderId = Number(orderIdRaw);
  const location = useLocation();
  const navigate = useNavigate();
  const tab = new URLSearchParams(location.search).get("tab") || "overview";
  const TabComponent = tabMap[tab] || OverviewTab;

  return (
    <div className="p-6">
      <OrderHeader orderId={orderId} />
      <TabNav currentTab={tab} onTabChange={(t) => navigate(`?tab=${t}`)} />
      <div className="mt-6">
        <TabComponent orderId={orderId} />
      </div>
    </div>
  );
}