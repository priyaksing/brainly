import { BrowserRouter, Route, Routes } from "react-router-dom";
import Signup from "./components/Signup";
import Dashboard from "./pages/Dashboard";
import Signin from "./components/Signin";
import SharePage from "./pages/SharePage";
import Home from "./pages/Home";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}></Route>
        <Route path="/register" element={<Signup />}></Route>
        <Route path="/login" element={<Signin />}></Route>
        <Route path="/dashboard" element={<Dashboard />}></Route>
        <Route path="/brain/:shareUrl" element={<SharePage />}></Route>
      </Routes>
    </BrowserRouter >
  )
}
