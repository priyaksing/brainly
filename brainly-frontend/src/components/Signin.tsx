import { useRef } from "react";
import Button from "./Button";
import { Input } from "./Input";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";


export default function Login() {

    const usernameRef = useRef<HTMLInputElement>();
    const passwordRef = useRef<HTMLInputElement>();
    const navigate = useNavigate();

    async function login() {

        const username = usernameRef.current?.value;
        const password = passwordRef.current?.value;

        const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
            username,
            password
        })

        const jwt = response.data.token;
        localStorage.setItem("token", jwt);

        navigate("/dashboard");
    }

    return (
        <div className="h-screen w-screen flex flex-col justify-center items-center bg-blue-200">
            <div className="bg-white-100/50 backdrop-blur-lg rounded-md border-blue-300 min-w-48 p-6">
                <div className="p-4">
                    <div className="flex flex-col pt-2">
                        <label>Username</label>
                        <Input reference={usernameRef} placeholder="eg. priyaksin" />
                    </div>
                    <div className="flex flex-col pt-2">
                        <label>Password</label>
                        <Input reference={passwordRef} placeholder="your password" password={true} />
                    </div>
                </div>
                <div className="flex justify-center">
                    <Button onClick={login} variant="primary" text="Login" fullWidth={true} />
                </div>

            </div>
            <p className="text-gray-500 p-2">Don't have an account?
                <span className="pl-1 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => navigate("/register")}>
                    Register
                </span>
            </p>
        </div>
    )
}
