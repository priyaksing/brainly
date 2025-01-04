
interface InputProp {
    placeholder: string,
    reference: any,
    password?: boolean
}
export function Input({ placeholder, reference, password }: InputProp) {

    return (
        <input
            ref={reference}
            placeholder={placeholder}
            type={password ? "password" : "text"}
            className="px-4 py-2 rounded border border-blue-200 focus:outline-none focus:border-blue-500"
        />
    )
}