
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { statsApi } from "@/lib/api";

const queryClient = new QueryClient();

const trackCache: Record<string, number> = {};
const TRACK_TTL = 5 * 60 * 1000;

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    const now = Date.now();
    const last = trackCache[location.pathname] || 0;
    if (now - last < TRACK_TTL) return;
    trackCache[location.pathname] = now;
    statsApi.track(location.pathname);
  }, [location.pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <PageTracker />
          <Routes>

            <Route path="/" element={<Index />} />
            <Route path="/unit/:unitId" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;