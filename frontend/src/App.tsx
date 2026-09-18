import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DepartmentDashboard } from "@/components/DepartmentDashboard";
import { NAV } from "@/lib/navigation";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/sugar360">
        <Routes>
          <Route path="/" element={<Navigate to="/management" replace />} />
          {NAV.map((item) => (
            <Route key={item.id} path={item.to} element={<DepartmentDashboard department={item.id} />} />
          ))}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
