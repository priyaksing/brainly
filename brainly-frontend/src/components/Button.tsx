import { ReactElement } from "react"

interface ButtonProps {
    variant: 'primary' | 'secondary' | 'tertiary',
    text: string,
    startIcon?: ReactElement,
    onClick?: () => void,
    fullWidth?: boolean
}

const variantStyles = {
    "primary": "bg-blue-500 text-blue-100 hover:bg-blue-600",
    "secondary": "bg-blue-100 text-blue-500 hover:bg-blue-500 hover:text-blue-100",
    "tertiary": "bg-red-500 text-blue-100 hover:bg-red-700"
}

const defaultStyles = "m-2 px-4 py-2 rounded-md flex items-center justify-center";

function Button({ variant, text, startIcon, onClick, fullWidth }: ButtonProps) {

    return (
        <button onClick={onClick} className={variantStyles[variant] + " " + defaultStyles + `${fullWidth ? " w-full" : ""}`}>
            <div className="pr-2">
                {startIcon}
            </div>
            {text}
        </button>
    )
}

export default Button
