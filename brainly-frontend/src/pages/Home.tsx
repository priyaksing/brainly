import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

export default function Home() {

    const navigate = useNavigate();

    function toRegister() {
        navigate("/register");
    }

    function toLogin() {
        navigate("/login")
    }

    return (
        <div className="h-screen w-screen flex flex-col justify-evenly items-center bg-blue-200">
            <h1 className="text-center text-4xl font-extrabold tracking-tighter uppercase text-blue-100">
                Welcome to <span className="bg-gradient-to-r from-sky-500 to-indigo-900 text-transparent bg-clip-text">Brainly!</span>
            </h1>
            <div className="min-w-72 p-6 rounded-md bg-white-100/50 backdrop-blur-lg">
                <div className="flex flex-col justify-center p-4">
                    <Button variant="secondary" text="Register" onClick={toRegister} />
                    <Button variant="primary" text="Login" onClick={toLogin} />
                </div>
            </div>
        </div>
    )
}
