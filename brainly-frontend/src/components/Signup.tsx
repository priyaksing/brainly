import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Input } from "./Input";
import Logo from "../icons/Logo";
import { api, getErrorMessage } from "../lib/api";

export default function Register() {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function register() {
    const username = usernameRef.current?.value?.trim();
    const password = passwordRef.current?.value;

    if (!username || !password) {
      toast.error("Username and password are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/signup", { username, password });
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (error) {
      toast.error(getErrorMessage(error, "Sign up failed"));
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

          <h1 className="text-3xl font-bold text-center text-gray-800 pb-1">Create your account</h1>
          <p className="text-center text-gray-500 text-sm pb-6">Start building your second brain</p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Username</label>
              <Input reference={usernameRef} placeholder="3-10 characters" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input reference={passwordRef} placeholder="8 to 20 characters" password />
              <p className="text-xs text-gray-500 pt-1">
                Must include an uppercase, lowercase, number, and special character.
              </p>
            </div>
          </div>

          <button
            onClick={register}
            disabled={loading}
            className="w-full mt-6 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white-100 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </div>

        <p className="text-center text-gray-700 text-sm pt-4">
          Already have an account?{" "}
          <span
            className="text-blue-700 font-medium cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}
