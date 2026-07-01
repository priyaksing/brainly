import { useNavigate } from "react-router-dom";
import Logo from "../icons/Logo";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-300 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <div className="flex justify-center pb-6">
          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur text-blue-500 shadow-lg">
            <Logo />
          </div>
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight uppercase pb-4">
          <span className="bg-gradient-to-r from-sky-500 to-indigo-900 text-transparent bg-clip-text">Brainly</span>
        </h1>

        <p className="text-2xl md:text-3xl font-medium text-gray-700 pb-3">Your second brain, online.</p>

        <p className="text-lg text-gray-600 pb-8 max-w-md mx-auto">
          Save the links, videos, and articles you find worth remembering and share your whole collection with a single
          link.
        </p>

        <ul className="text-left inline-block pb-10 text-gray-700">
          <li className="flex items-start gap-3 py-1">
            <span className="text-green-600 font-bold">✓</span>
            <span>Save any URL - YouTube, Twitter, Images, Articles</span>
          </li>
          <li className="flex items-start gap-3 py-1">
            <span className="text-green-600 font-bold">✓</span>
            <span>Filter your collection by type</span>
          </li>
          <li className="flex items-start gap-3 py-1">
            <span className="text-green-600 font-bold">✓</span>
            <span>Share your entire brain with your friends</span>
          </li>
        </ul>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate("/register")}
            className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white-100 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Get Started →
          </button>
          <p className="text-gray-600 text-sm">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-blue-700 font-medium cursor-pointer hover:underline"
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
