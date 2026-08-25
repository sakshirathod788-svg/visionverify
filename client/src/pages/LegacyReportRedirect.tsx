import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";

export default function LegacyReportRedirect() {
  const [, params] = useRoute("/workspace/history/:id");
  const [, setLocation] = useLocation();
  useEffect(() => { if (params?.id) setLocation(`/workspace/report/${params.id}`, { replace: true }); }, [params?.id, setLocation]);
  return null;
}
