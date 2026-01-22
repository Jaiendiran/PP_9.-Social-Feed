import { useEffect } from "react";

export default function useAutosizeTextarea(ref, value) {
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = "auto";
            ref.current.style.height = ref.current.scrollHeight + "px";
        }
    }, [value]);
}
