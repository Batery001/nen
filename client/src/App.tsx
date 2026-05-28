import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CreateSession } from "./pages/CreateSession";
import { Home } from "./pages/Home";
import { JoinSession } from "./pages/JoinSession";
import { HubPage } from "./pages/HubPage";

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/crear" element={<CreateSession />} />
          <Route path="/unirse" element={<JoinSession />} />
          <Route path="/hub/:code" element={<HubPage />} />
          <Route path="/partida/:code" element={<HubPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
