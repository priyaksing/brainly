import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Input } from "./Input";
import Logo from "../icons/Logo";
import { api, getErrorMessage } from "../lib/api";

export default function Login() {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function login() {
    const username = usernameRef.current?.value?.trim();
    const password = passwordRef.current?.value;

    if (!username || !password) {
      toast.error("Username and password are required");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post<{ token: string }>("/api/v1/signin", { username, password });
      if (!response.data?.token) {
        toast.error("No token returned from server.");
        return;
      }
      localStorage.setItem("token", response.data.token);
      navigate("/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error, "Sign-in failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-300 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center pb-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-500">
              <Logo />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-800 pb-1">Welcome back</h1>
          <p className="text-center text-gray-500 text-sm pb-6">Log in to your Brainly</p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Username</label>
              <Input reference={usernameRef} placeholder="eg. priyaksin" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input reference={passwordRef} placeholder="your password" password />
            </div>
          </div>

          <button
            onClick={login}
            disabled={loading}
            className="w-full mt-6 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white-100 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </div>

        <p className="text-center text-gray-700 text-sm pt-4">
          Don't have an account?{" "}
          <span
            className="text-blue-700 font-medium cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}
