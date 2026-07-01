import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Signup from "./components/Signup";
import Dashboard from "./pages/Dashboard";
import Signin from "./components/Signin";
import SharePage from "./pages/SharePage";
import Home from "./pages/Home";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/login" element={<Signin />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="/brain/:shareUrl" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  );
}