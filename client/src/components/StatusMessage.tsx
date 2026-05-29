export function StatusMessage({
  message,
  variant = "success",
}: {
  message: string;
  variant?: "success" | "error";
}) {
  return (
    <p
      className={`text-center text-sm ${
        variant === "error" ? "text-red-300" : "text-emerald-400"
      }`}
    >
      {message}
    </p>
  );
}
