import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import About from "./pages/About";
import AnalysisDetail from "./pages/AnalysisDetail";
import AnalysisHistory from "./pages/AnalysisHistory";
import AnalyzeImage from "./pages/AnalyzeImage";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Technology from "./pages/Technology";
import WorkspaceDashboard from "./pages/WorkspaceDashboard";
import VerificationResult from "./pages/VerificationResult";
import LegacyReportRedirect from "./pages/LegacyReportRedirect";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/technology" component={Technology} />
    <Route path="/about" component={About} />
    <Route path="/workspace" component={WorkspaceDashboard} />
    <Route path="/workspace/analyze" component={AnalyzeImage} />
    <Route path="/workspace/result/:id" component={VerificationResult} />
    <Route path="/workspace/report/:id" component={AnalysisDetail} />
    <Route path="/workspace/history" component={AnalysisHistory} />
    <Route path="/workspace/history/:id" component={LegacyReportRedirect} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
