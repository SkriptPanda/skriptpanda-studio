import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EarlyAccessAuth } from "@/components/auth/EarlyAccessAuth";
import { useEarlyAccess } from "@/hooks/useEarlyAccess";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Import testing utilities (available in browser console)
import "@/utils/auth-test";
import "@/utils/last-file-test";
import "@/utils/theme-debug";

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, authenticate } = useEarlyAccess();

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return <EarlyAccessAuth onAuthenticated={authenticate} />;
  }

  // Show main application if authenticated
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
