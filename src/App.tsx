import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import RankingsPage from "@/pages/RankingsPage";
import ChartsPage from "@/pages/ChartsPage";
import SnapshotsPage from "@/pages/SnapshotsPage";
import KvKPage from "@/pages/KvKPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/snapshots" element={<SnapshotsPage />} />
            <Route path="/kvk" element={<KvKPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
