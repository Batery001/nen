import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CreateSession } from "./pages/CreateSession";
import { Home } from "./pages/Home";
import { JoinSession } from "./pages/JoinSession";
import { HubPage } from "./pages/HubPage";
import { LoginPage } from "./pages/LoginPage";
import { WaitingApprovalPage } from "./pages/WaitingApprovalPage";

function RedirectPartida() {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/hub/${code ?? ""}`} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/crear" element={<CreateSession />} />
          <Route path="/unirse" element={<JoinSession />} />
          <Route path="/espera/:code" element={<WaitingApprovalPage />} />
          <Route path="/hub/:code" element={<HubPage />} />
          <Route path="/partida/:code" element={<RedirectPartida />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
