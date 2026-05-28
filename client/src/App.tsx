import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CreateSession } from "./pages/CreateSession";
import { Home } from "./pages/Home";
import { JoinSession } from "./pages/JoinSession";
import { SessionRoom } from "./pages/SessionRoom";

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/crear" element={<CreateSession />} />
          <Route path="/unirse" element={<JoinSession />} />
          <Route path="/partida/:code" element={<SessionRoom />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
