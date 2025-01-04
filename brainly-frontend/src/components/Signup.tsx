import { useRef } from "react";
import Button from "./Button";
import { Input } from "./Input";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";


export default function Register() {

    const usernameRef = useRef<HTMLInputElement>();
    const passwordRef = useRef<HTMLInputElement>();
    const navigate = useNavigate();

    async function register() {

        const username = usernameRef.current?.value;
        const password = passwordRef.current?.value;

        await axios.post(`${BACKEND_URL}/api/v1/signup`, {
            username,
            password
        })

        alert("Signed up!");
        navigate("/login");
    }

    return (
        <div className="h-screen w-screen flex justify-center items-center bg-blue-200">
            <div className="bg-white-100/50 backdrop-blur-lg rounded-md border-blue-300 min-w-48 p-6">
                <div className="p-4">
                    <div className="flex flex-col pt-2">
                        <label>Username</label>
                        <Input reference={usernameRef} placeholder="eg. priyaksin" />
                    </div>
                    <div className="flex flex-col pt-2">
                        <label>Password</label>
                        <Input reference={passwordRef} placeholder="8 to 20 characters" password={true} />
                    </div>
                </div>
                <div className="flex justify-center">
                    <Button onClick={register} variant="primary" text="Register" fullWidth={true} />
                </div>

            </div>
        </div>
    )
}
